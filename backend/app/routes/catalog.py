"""
Catalog router — currently just brands (forklift makes).

Mounted in main.py as:
    app.include_router(catalog_router, prefix="/api/v1/catalog")

Resulting base path:
    /api/v1/catalog/brands/
"""
from fastapi import APIRouter

from app.routes import brands

router = APIRouter()

router.include_router(brands.router)
