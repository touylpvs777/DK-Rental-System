"""
Main catalog router — aggregates brands, categories, products, and import.

Mounted in main.py as:
    app.include_router(catalog_router, prefix="/api/v1/catalog")

Resulting base paths:
    /api/v1/catalog/brands/
    /api/v1/catalog/categories/
    /api/v1/catalog/products/
    /api/v1/catalog/products/import/
"""
from fastapi import APIRouter

from app.routes import brands, categories, products
from app.routes.import_catalog import router as import_router

router = APIRouter()

# Import routes must be included BEFORE the generic /{product_id} route
# to prevent FastAPI from matching "import" as an integer path parameter.
router.include_router(import_router)
router.include_router(products.router)
router.include_router(brands.router)
router.include_router(categories.router)
