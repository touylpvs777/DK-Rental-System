import enum
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database.base import Base


class ActionType(str, enum.Enum):
    # ── Authentication ─────────────────────────────────────────────────────
    USER_LOGIN = "user_login"
    USER_LOGOUT = "user_logout"
    # ── Users ──────────────────────────────────────────────────────────────
    USER_CREATED = "user_created"
    USER_UPDATED = "user_updated"
    USER_DELETED = "user_deleted"
    # ── Customers ──────────────────────────────────────────────────────────
    CUSTOMER_CREATED = "customer_created"
    CUSTOMER_UPDATED = "customer_updated"
    CUSTOMER_DELETED = "customer_deleted"
    CUSTOMER_STATUS_CHANGED = "customer_status_changed"
    # ── Leads ──────────────────────────────────────────────────────────────
    LEAD_CREATED = "lead_created"
    LEAD_UPDATED = "lead_updated"
    LEAD_DELETED = "lead_deleted"
    LEAD_STATUS_CHANGED = "lead_status_changed"
    LEAD_NOTE_ADDED = "lead_note_added"
    LEAD_NOTE_DELETED = "lead_note_deleted"
    # ── Catalog ────────────────────────────────────────────────────────────────
    CATALOG_PRODUCT_CREATED = "catalog_product_created"
    CATALOG_PRODUCT_UPDATED = "catalog_product_updated"
    CATALOG_PRODUCT_DELETED = "catalog_product_deleted"
    CATALOG_BRAND_CREATED = "catalog_brand_created"
    CATALOG_BRAND_UPDATED = "catalog_brand_updated"
    CATALOG_BRAND_DELETED = "catalog_brand_deleted"
    CATALOG_CATEGORY_CREATED = "catalog_category_created"
    CATALOG_CATEGORY_UPDATED = "catalog_category_updated"
    CATALOG_CATEGORY_DELETED = "catalog_category_deleted"
    CATALOG_IMPORT_PREVIEWED = "catalog_import_previewed"
    CATALOG_IMPORT_EXECUTED = "catalog_import_executed"
    # ── Forklifts ──────────────────────────────────────────────────────────
    FORKLIFT_CREATED = "forklift_created"
    FORKLIFT_UPDATED = "forklift_updated"
    FORKLIFT_DELETED = "forklift_deleted"
    FORKLIFT_STATUS_CHANGED = "forklift_status_changed"
    # ── Quotations ─────────────────────────────────────────────────────────
    QUOTATION_CREATED = "quotation_created"
    QUOTATION_UPDATED = "quotation_updated"
    QUOTATION_DELETED = "quotation_deleted"
    QUOTATION_SUBMITTED = "quotation_submitted"
    QUOTATION_APPROVED = "quotation_approved"
    QUOTATION_REVISION_REQUESTED = "quotation_revision_requested"
    QUOTATION_SENT = "quotation_sent"
    QUOTATION_ACCEPTED = "quotation_accepted"
    QUOTATION_DECLINED = "quotation_declined"
    QUOTATION_CONVERTED = "quotation_converted"
    QUOTATION_CANCELLED = "quotation_cancelled"
    QUOTATION_REACTIVATED = "quotation_reactivated"
    # ── Sales Orders ───────────────────────────────────────────────
    SALES_ORDER_CREATED = "sales_order_created"
    SALES_ORDER_UPDATED = "sales_order_updated"
    SALES_ORDER_DELETED = "sales_order_deleted"
    SALES_ORDER_CONFIRMED = "sales_order_confirmed"
    SALES_ORDER_COMPLETED = "sales_order_completed"
    SALES_ORDER_CANCELLED = "sales_order_cancelled"
    # ── Delivery Notes ─────────────────────────────────────────────
    DELIVERY_NOTE_CREATED = "delivery_note_created"
    DELIVERY_NOTE_UPDATED = "delivery_note_updated"
    DELIVERY_NOTE_DELETED = "delivery_note_deleted"
    DELIVERY_NOTE_DISPATCHED = "delivery_note_dispatched"
    DELIVERY_NOTE_DELIVERED = "delivery_note_delivered"
    DELIVERY_NOTE_CANCELLED = "delivery_note_cancelled"
    # ── Receipts ───────────────────────────────────────────────────
    RECEIPT_CREATED = "receipt_created"
    RECEIPT_UPDATED = "receipt_updated"
    RECEIPT_DELETED = "receipt_deleted"
    RECEIPT_CONFIRMED = "receipt_confirmed"
    RECEIPT_CANCELLED = "receipt_cancelled"
    # ── Rental Contracts ──────────────────────────────────────────
    RENTAL_CONTRACT_CREATED = "rental_contract_created"
    RENTAL_CONTRACT_UPDATED = "rental_contract_updated"
    RENTAL_CONTRACT_DELETED = "rental_contract_deleted"
    RENTAL_CONTRACT_SUBMITTED = "rental_contract_submitted"
    RENTAL_CONTRACT_APPROVED = "rental_contract_approved"
    RENTAL_CONTRACT_REVISION = "rental_contract_revision"
    RENTAL_CONTRACT_ACTIVATED = "rental_contract_activated"
    RENTAL_CONTRACT_CANCELLED = "rental_contract_cancelled"
    RENTAL_CONTRACT_CLOSED = "rental_contract_closed"
    RENTAL_RETURN_REQUESTED = "rental_return_requested"
    RENTAL_RETURN_PICKED_UP = "rental_return_picked_up"
    RENTAL_RETURN_RECEIVED = "rental_return_received"
    RENTAL_RETURN_COMPLETED = "rental_return_completed"
    RENTAL_DAMAGE_ASSESSED = "rental_damage_assessed"
    RENTAL_DAMAGE_DISPUTED = "rental_damage_disputed"
    RENTAL_DAMAGE_RESOLVED = "rental_damage_resolved"
    RENTAL_EXTENSION_REQUESTED = "rental_extension_requested"
    RENTAL_EXTENSION_APPROVED = "rental_extension_approved"
    RENTAL_EXTENSION_REJECTED = "rental_extension_rejected"
    RENTAL_BILLING_CREATED = "rental_billing_created"
    # ── Billing & Payments ─────────────────────────────────────────
    INVOICE_CREATED = "invoice_created"
    INVOICE_UPDATED = "invoice_updated"
    INVOICE_ISSUED = "invoice_issued"
    INVOICE_SENT = "invoice_sent"
    INVOICE_CANCELLED = "invoice_cancelled"
    INVOICE_VOIDED = "invoice_voided"
    PAYMENT_RECORDED = "payment_recorded"
    PAYMENT_CONFIRMED = "payment_confirmed"
    PAYMENT_REJECTED = "payment_rejected"
    PAYMENT_ALLOCATED = "payment_allocated"
    DEPOSIT_CREATED = "deposit_created"
    DEPOSIT_RECEIVED = "deposit_received"
    DEPOSIT_REFUNDED = "deposit_refunded"
    DEPOSIT_FORFEITED = "deposit_forfeited"
    DEPOSIT_APPLIED = "deposit_applied"
    REVENUE_RECOGNIZED = "revenue_recognized"
    REVENUE_REVERSED = "revenue_reversed"
    # ── Warehouse Projects ─────────────────────────────────────────
    PROJECT_CREATED = "project_created"
    PROJECT_UPDATED = "project_updated"
    PROJECT_DELETED = "project_deleted"
    PROJECT_MILESTONE_STATUS_CHANGED = "project_milestone_status_changed"
    # ── Global Settings ────────────────────────────────────────────
    SETTING_UPDATED = "setting_updated"
    # ── Inventory Import ───────────────────────────────────────────
    INVENTORY_IMPORT_EXECUTED = "inventory_import_executed"
    # ── Purchase Orders ─────────────────────────────────────────────
    PURCHASE_ORDER_CREATED = "purchase_order_created"
    PURCHASE_ORDER_SUBMITTED = "purchase_order_submitted"
    PURCHASE_ORDER_RECEIVED = "purchase_order_received"
    PURCHASE_ORDER_UPDATED = "purchase_order_updated"
    PURCHASE_ORDER_CANCELLED = "purchase_order_cancelled"
    PURCHASE_ORDER_APPROVALS_UPDATED = "purchase_order_approvals_updated"
    PURCHASE_ORDER_EXCEL_EXPORTED = "purchase_order_excel_exported"
    PURCHASE_ORDER_EXCEL_IMPORTED = "purchase_order_excel_imported"
    # ── Notification Preferences ────────────────────────────────────
    NOTIFICATION_PREFERENCE_CREATED = "notification_preference_created"
    NOTIFICATION_PREFERENCE_UPDATED = "notification_preference_updated"
    NOTIFICATION_PREFERENCE_DELETED = "notification_preference_deleted"


class EntityType(str, enum.Enum):
    USER = "user"
    CUSTOMER = "customer"
    LEAD = "lead"
    NOTE = "note"
    CATALOG_PRODUCT = "catalog_product"
    CATALOG_BRAND = "catalog_brand"
    CATALOG_CATEGORY = "catalog_category"
    CATALOG_IMPORT = "catalog_import"
    FORKLIFT = "forklift"
    QUOTATION = "quotation"
    SALES_ORDER = "sales_order"
    DELIVERY_NOTE = "delivery_note"
    RECEIPT = "receipt"
    RENTAL_CONTRACT = "rental_contract"
    INVOICE = "invoice"
    PAYMENT = "payment"
    DEPOSIT = "deposit"
    REVENUE_RECOGNITION = "revenue_recognition"
    PROJECT = "project"
    PROJECT_MILESTONE = "project_milestone"
    SETTING = "setting"
    INVENTORY_IMPORT = "inventory_import"
    NOTIFICATION_PREFERENCE = "notification_preference"
    PURCHASE_ORDER = "purchase_order"
    PARTNER = "partner"


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    # String columns — no CHECK constraint, so new ActionType values never break existing tables.
    action: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_type: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    entity_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    # Arbitrary metadata: {"from": "new", "to": "contacted"}, {"changed_fields": ["title"]}…
    details: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )

    user: Mapped["User | None"] = relationship("User")
