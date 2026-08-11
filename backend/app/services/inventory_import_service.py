"""
Autonomous, self-healing bulk CSV/Excel importer for spare-part inventory.

Design principles:
  - Never returns a 500. Catastrophic failures (corrupt file, unreadable
    encoding, unexpected driver errors) are caught and converted into a
    well-formed 4xx HTTPException; everything else degrades to a per-row
    error entry rather than aborting the batch.
  - Column names are matched case-insensitively against an alias table so
    common header variants (SKU, "Part Number", part_number, ...) all
    resolve to the same canonical field, regardless of file formatting.
  - Missing dependencies (default warehouse, brand) are auto-provisioned on
    the fly instead of forcing the import to fail — see `_ensure_default_warehouse`
    and `_resolve_brand_id`.
  - Each row is its own commit/rollback boundary: a failure on row N rolls
    back only row N's writes (via `db.rollback()`, since every prior row is
    already committed) and the loop continues — the session stays usable for
    subsequent rows. This is functionally equivalent to a per-row SAVEPOINT
    without the added complexity of nesting `begin_nested()` inside a loop
    that also needs to auto-provision shared dependencies (brand/warehouse)
    on some rows but not others.
"""
from __future__ import annotations

import io
import logging
import math
import re
from typing import Any

import pandas as pd
from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.brand import Brand
from app.models.spare_part import PartCategory, SparePart
from app.models.warehouse import Warehouse
from app.repositories.inventory_repository import InventoryRepository
from app.schemas.inventory_import import InventoryImportResult, InventoryImportRowError
from app.services.inventory_service import InventoryService
from app.services.notification_service import ADMIN_ROLE, NotificationService, resolve_actor_name

logger = logging.getLogger(__name__)

# canonical field -> accepted header aliases (lowercased, spaces/dashes -> underscore)
_HEADER_ALIASES: dict[str, str] = {
    "part_number": "part_number", "partnumber": "part_number", "sku": "part_number",
    "part_no": "part_number", "code": "part_number",
    "name": "name", "part_name": "name", "item_name": "name", "product_name": "name",
    "description": "description", "desc": "description",
    "part_category": "part_category", "category": "part_category",
    "brand_id": "brand_id",
    "brand": "brand_name", "brand_name": "brand_name", "manufacturer": "brand_name",
    "unit": "unit", "uom": "unit",
    "unit_price": "unit_price", "price": "unit_price",
    "currency": "currency",
    "min_stock_level": "min_stock_level", "min_stock": "min_stock_level", "min_qty": "min_stock_level",
    "reorder_quantity": "reorder_quantity", "reorder_qty": "reorder_quantity",
    "lead_time_days": "lead_time_days", "lead_time": "lead_time_days",
    "quantity": "quantity", "qty": "quantity", "stock": "quantity", "stock_quantity": "quantity",
    "on_hand": "quantity",
}

_ALLOWED_EXTENSIONS = {".csv", ".xlsx"}
_MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
_DEFAULT_WAREHOUSE_CODE = "WH-MAIN"
_DEFAULT_WAREHOUSE_NAME = "Main Warehouse"


def _normalize_header(raw: str) -> str | None:
    key = raw.strip().lower().replace(" ", "_").replace("-", "_")
    return _HEADER_ALIASES.get(key)


def _is_missing(value: Any) -> bool:
    """True for None, NaN, NaT, and +/-inf — the values pandas leaves behind
    for blank/malformed cells. These must never leak into row data as the
    literal text "nan" or "inf"."""
    if value is None:
        return True
    if isinstance(value, float) and (math.isnan(value) or math.isinf(value)):
        return True
    try:
        return bool(pd.isna(value))
    except (TypeError, ValueError):
        return False


def _slugify(text: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", text.strip().lower()).strip("-")
    return slug or "brand"


class InventoryImportService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self._repo = InventoryRepository(db)
        self._inventory = InventoryService(db)

    async def import_file(self, content: bytes, filename: str, user_id: int | None = None) -> InventoryImportResult:
        try:
            if len(content) > _MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail="File exceeds the 10 MB limit.",
                )

            ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
            if ext not in _ALLOWED_EXTENSIONS:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail="Only .csv or .xlsx files are accepted.",
                )

            df = self._read_dataframe(content, ext)
            rows = self._dataframe_to_rows(df)
            default_warehouse = await self._ensure_default_warehouse()
        except HTTPException:
            raise
        except Exception as exc:  # catastrophic — never surface a 500 for a bad upload
            logger.exception("Catastrophic failure preparing inventory import (file=%s)", filename)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Could not process import file: {exc}",
            )

        created_count = 0
        updated_count = 0
        errors: list[InventoryImportRowError] = []

        for row_number, row in rows:
            try:
                part, created = await self._upsert_row(row)

                if "quantity" in row:
                    try:
                        qty = float(row["quantity"])
                    except ValueError:
                        raise ValueError(f"Invalid numeric value for 'quantity': {row['quantity']!r}")
                    if qty < 0:
                        raise ValueError(f"Quantity cannot be negative: {row['quantity']!r}")
                    if qty > 0:
                        # Goods Receipt semantics: imported quantity is stock that
                        # has arrived and is ADDED to whatever is already on hand
                        # (e.g. two partial-shipment imports for the same SKU both
                        # count), not an absolute overwrite. A row reporting 0 is
                        # a legitimate "nothing received" and creates no transaction.
                        await self._inventory.receive_stock(
                            part_id=part.id, warehouse_id=default_warehouse.id, quantity=qty,
                            user_id=user_id, reference_type="inventory_import",
                            notes=f"Goods receipt via bulk import — row {row_number}",
                        )

                await self.db.commit()
                if created:
                    created_count += 1
                else:
                    updated_count += 1
            except Exception as exc:
                # Row-level isolation: roll back only this row's uncommitted
                # writes (every previously-imported row is already committed)
                # and keep the session alive for the rows that follow.
                logger.warning("Inventory import row %s failed: %s", row_number, exc)
                await self.db.rollback()
                errors.append(InventoryImportRowError(row_number=row_number, error_message=str(exc)))

        if created_count + updated_count > 0:
            # Enterprise Audit & Alert: a bulk import is a "major operational
            # movement" — one summary notification for the whole batch (not
            # per-row, which would flood the admin feed for a large file).
            try:
                actor_name = await resolve_actor_name(self.db, user_id)
                await NotificationService(self.db).notify_role(
                    role=ADMIN_ROLE,
                    subject="Inventory Import Completed",
                    message=(
                        f"{actor_name} imported inventory into {default_warehouse.name}: "
                        f"{created_count} new part(s), {updated_count} updated, "
                        f"{len(errors)} row error(s)."
                    ),
                    event_type="inventory.import_completed",
                    entity_type="warehouse",
                    entity_id=default_warehouse.id,
                )
            except Exception:
                logger.exception("Failed to notify admins of inventory import completion")

        return InventoryImportResult(
            success=True,
            rows_imported=created_count,
            rows_updated=updated_count,
            errors=errors,
        )

    # ── Parsing / cleaning ───────────────────────────────────────────────────

    def _read_dataframe(self, content: bytes, ext: str) -> pd.DataFrame:
        buf = io.BytesIO(content)
        try:
            if ext == ".csv":
                df = pd.read_csv(buf, encoding="utf-8-sig")
            else:
                df = pd.read_excel(buf, engine="openpyxl")
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot read file: {exc}",
            )
        # Standardize headers up front so downstream alias matching is stable
        # regardless of how the source file capitalized/spaced its columns.
        df.columns = [str(c).strip().lower() for c in df.columns]
        return df

    def _dataframe_to_rows(self, df: pd.DataFrame) -> list[tuple[int, dict[str, str]]]:
        field_map: dict[str, str] = {}
        for col in df.columns:
            canon = _normalize_header(str(col))
            if canon and canon not in field_map.values():
                field_map[str(col)] = canon

        rows: list[tuple[int, dict[str, str]]] = []
        for offset, record in enumerate(df.to_dict(orient="records")):
            row_number = offset + 2  # row 1 is the header
            row: dict[str, str] = {}
            for col, canon in field_map.items():
                value = record.get(col)
                if _is_missing(value):
                    continue
                # pandas upcasts numeric columns with blanks to float64, so an
                # integer quantity like 15 arrives as 15.0 — print it as "15".
                if isinstance(value, float) and value.is_integer():
                    text = str(int(value))
                else:
                    text = str(value).strip()
                if text:
                    row[canon] = text
            if row:  # skip fully empty rows
                rows.append((row_number, row))
        return rows

    # ── Self-healing dependency provisioning ────────────────────────────────

    async def _ensure_default_warehouse(self) -> Warehouse:
        warehouse = await self._repo.get_default_warehouse()
        if warehouse is not None:
            return warehouse
        try:
            warehouse = await self._repo.create_warehouse(
                Warehouse(code=_DEFAULT_WAREHOUSE_CODE, name=_DEFAULT_WAREHOUSE_NAME, is_active=True)
            )
            await self.db.commit()
            logger.info("Auto-provisioned default warehouse %s (id=%s)", _DEFAULT_WAREHOUSE_CODE, warehouse.id)
            return warehouse
        except IntegrityError:
            # Lost a race with a concurrent import — it exists now, use it.
            await self.db.rollback()
            warehouse = await self._repo.get_default_warehouse()
            if warehouse is None:
                raise
            return warehouse

    async def _resolve_brand_id(self, raw_name: str) -> int:
        name = raw_name.strip()
        if not name:
            raise ValueError("Brand name cannot be blank")

        existing = await self._repo.get_brand_by_name(name)
        if existing:
            return existing.id

        base_slug = _slugify(name)
        for suffix in ("", "-2", "-3", "-4"):
            slug = f"{base_slug}{suffix}"
            if await self._repo.get_brand_by_slug(slug):
                continue
            try:
                brand = await self._repo.create_brand(Brand(name=name, slug=slug))
                logger.info("Auto-provisioned brand %r (id=%s, slug=%s)", name, brand.id, slug)
                return brand.id
            except IntegrityError:
                await self.db.rollback()
                # Another row/request created it concurrently — reuse it.
                existing = await self._repo.get_brand_by_name(name)
                if existing:
                    return existing.id
                continue  # slug collided concurrently with a different name; try next suffix
        raise ValueError(f"Could not auto-provision brand '{name}' (name/slug collision)")

    @staticmethod
    def _resolve_category(raw: str) -> str:
        """Known categories map to their canonical enum value; anything else
        is accepted as-is (self-healing — no fixed category table exists to
        insert into, so a novel label is simply stored, truncated to the
        column's 20-char limit rather than rejected)."""
        key = raw.strip().lower().replace(" ", "_").replace("-", "_")
        if not key:
            return PartCategory.GENERAL.value
        try:
            return PartCategory(key).value
        except ValueError:
            return key[:20]

    # ── Row upsert ───────────────────────────────────────────────────────────

    async def _upsert_row(self, row: dict[str, str]) -> tuple[SparePart, bool]:
        """Returns (part, created) — created=True if a new SparePart was made."""
        part_number = row.get("part_number", "").strip()
        name = row.get("name", "").strip()
        if not part_number:
            raise ValueError("Missing required column 'part_number' (or SKU)")
        if not name:
            raise ValueError("Missing required column 'name'")

        fields = await self._coerce_fields(row)
        existing = await self._repo.get_part_by_number(part_number)

        if existing:
            fields.pop("part_number", None)  # never move an existing row to a different key
            part = await self._repo.update_part(existing, fields)
            return part, False

        part = SparePart(part_number=part_number, name=name, **{k: v for k, v in fields.items() if k != "name"})
        part = await self._repo.create_part(part)
        return part, True

    async def _coerce_fields(self, row: dict[str, str]) -> dict[str, Any]:
        fields: dict[str, Any] = {}
        if "name" in row:
            fields["name"] = row["name"].strip()
        if "description" in row:
            fields["description"] = row["description"].strip()
        if "unit" in row:
            fields["unit"] = row["unit"].strip()
        if "currency" in row:
            fields["currency"] = row["currency"].strip().upper()

        if "part_category" in row:
            fields["part_category"] = self._resolve_category(row["part_category"])

        if "brand_name" in row:
            fields["brand_id"] = await self._resolve_brand_id(row["brand_name"])
        elif "brand_id" in row:
            try:
                fields["brand_id"] = int(float(row["brand_id"]))
            except ValueError:
                raise ValueError(f"Invalid integer value for 'brand_id': {row['brand_id']!r}")

        for key in ("min_stock_level", "reorder_quantity", "lead_time_days"):
            if key in row:
                try:
                    fields[key] = int(float(row[key]))
                except ValueError:
                    raise ValueError(f"Invalid integer value for '{key}': {row[key]!r}")

        if "unit_price" in row:
            try:
                fields["unit_price"] = float(row["unit_price"])
            except ValueError:
                raise ValueError(f"Invalid numeric value for 'unit_price': {row['unit_price']!r}")

        # "quantity" is deliberately excluded — it's stock (InventoryBalance),
        # applied separately in import_file(), not a SparePart column.
        return fields
