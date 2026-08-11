import logging

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import PermissionName, require_permission
from app.database.session import get_db
from app.dependencies import get_current_user
from app.models.activity_log import ActionType, EntityType
from app.models.user import User
from app.schemas.import_job import (
    ImportExecuteResponse,
    ImportJobDetail,
    ImportJobOut,
    ImportPreviewResponse,
)
from app.services.activity_log_service import ActivityLogService
from app.services.import_service import ImportService
from app.repositories.import_repository import ImportRepository

logger = logging.getLogger(__name__)

_ALLOWED_MIME = {
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "application/octet-stream",   # some browsers send this for xlsx
}

router = APIRouter(prefix="/products/import", tags=["Catalog – Import"])


@router.post(
    "/preview",
    response_model=ImportPreviewResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Upload Excel and get import preview",
)
async def preview_import(
    file: UploadFile = File(..., description="DKLAO Excel workbook (.xlsx)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.MANAGE_CATALOG),
):
    """
    Phase 1 — parse and validate the workbook.
    Returns a preview of what will be created/updated, plus a *job_id* to confirm.
    No products are written to the database yet.
    """
    if not (file.filename or "").endswith(".xlsx"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Only .xlsx files are accepted.",
        )
    content = await file.read()
    result = await ImportService(db).preview(
        file_content=content,
        filename=file.filename or "upload.xlsx",
        created_by=current_user.id,
    )
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.CATALOG_IMPORT_PREVIEWED,
        entity_type=EntityType.CATALOG_IMPORT,
        entity_id=result.job_id,
        details={
            "filename": file.filename,
            "total_valid": result.total_valid,
            "total_errors": result.total_errors,
        },
    )
    return result


@router.post(
    "/{job_id}/execute",
    response_model=ImportExecuteResponse,
    summary="Execute a previewed import job",
)
async def execute_import(
    job_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.MANAGE_CATALOG),
):
    """
    Phase 2 — commit the import stored in the PREVIEW job.
    Products are upserted; the job status is updated to COMPLETED / PARTIAL / FAILED.
    """
    result = await ImportService(db).execute(job_id, executed_by=current_user.id)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.CATALOG_IMPORT_EXECUTED,
        entity_type=EntityType.CATALOG_IMPORT,
        entity_id=job_id,
        details={
            "status": result.status,
            "success_rows": result.success_rows,
            "error_rows": result.error_rows,
        },
    )
    return result


@router.post(
    "/",
    response_model=ImportExecuteResponse,
    status_code=status.HTTP_200_OK,
    summary="Upload and immediately import (one-shot)",
)
async def import_now(
    file: UploadFile = File(...),
    preview_only: bool = Query(
        default=False, description="If true, only parse and return preview without importing"
    ),
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.MANAGE_CATALOG),
):
    """
    Convenience endpoint that wraps preview + execute in a single call.
    Set *preview_only=true* to get a dry-run without writing products.
    """
    if not (file.filename or "").endswith(".xlsx"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Only .xlsx files are accepted.",
        )
    content = await file.read()
    svc = ImportService(db)

    preview = await svc.preview(
        file_content=content,
        filename=file.filename or "upload.xlsx",
        created_by=current_user.id,
    )

    if preview_only:
        return ImportExecuteResponse(
            job_id=preview.job_id,
            status="preview",
            success_rows=preview.total_valid,
            error_rows=preview.total_errors,
        )

    result = await svc.execute(preview.job_id, executed_by=current_user.id)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.CATALOG_IMPORT_EXECUTED,
        entity_type=EntityType.CATALOG_IMPORT,
        entity_id=preview.job_id,
        details={
            "filename": file.filename,
            "status": result.status,
            "success_rows": result.success_rows,
            "error_rows": result.error_rows,
        },
    )
    return result


# ── Job management ────────────────────────────────────────────────────────────

@router.get("/jobs", response_model=list[ImportJobOut], summary="List import jobs")
async def list_jobs(
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    _: User = require_permission(PermissionName.MANAGE_CATALOG),
):
    return await ImportRepository(db).get_all(skip=skip, limit=limit)


@router.get("/jobs/{job_id}", response_model=ImportJobDetail, summary="Get import job detail")
async def get_job(
    job_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = require_permission(PermissionName.MANAGE_CATALOG),
):
    job = await ImportRepository(db).get_detail(job_id)
    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Import job not found"
        )
    return job


@router.delete(
    "/jobs/{job_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete import job record",
)
async def delete_job(
    job_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = require_permission(PermissionName.MANAGE_CATALOG),
):
    repo = ImportRepository(db)
    job = await repo.get_by_id(job_id)
    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Import job not found"
        )
    await repo.delete(job)
    await db.commit()
