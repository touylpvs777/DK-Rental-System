from fastapi import APIRouter, UploadFile, File, HTTPException
from sqlalchemy import select
import pandas as pd

from app.database.session import AsyncSessionLocal
from app.models.customer import Customer, CustomerStatus

router = APIRouter()


@router.post("/customers")
async def import_customers(
    file: UploadFile = File(...)
):
    try:

        if not file.filename.endswith((".xlsx", ".xls")):
            raise HTTPException(
                status_code=400,
                detail="Only Excel files are allowed"
            )

        df = pd.read_excel(file.file)

        required_columns = [
            "first_name",
            "last_name",
            "email",
            "phone",
            "company",
            "status",
            "notes"
        ]

        missing_columns = [
            col for col in required_columns
            if col not in df.columns
        ]

        if missing_columns:
            raise HTTPException(
                status_code=400,
                detail=f"Missing columns: {', '.join(missing_columns)}"
            )

        imported = 0
        duplicates = 0
        failed = 0

        async with AsyncSessionLocal() as db:

            for _, row in df.iterrows():

                try:

                    email = str(
                        row.get("email", "")
                    ).strip()

                    if email and email.lower() != "nan":

                        result = await db.execute(
                            select(Customer).where(
                                Customer.email == email
                            )
                        )

                        existing = result.scalar_one_or_none()

                        if existing:
                            duplicates += 1
                            continue

                    status_value = str(
                        row.get("status", "prospect")
                    ).lower()

                    try:
                        customer_status = CustomerStatus(
                            status_value
                        )
                    except Exception:
                        customer_status = CustomerStatus.PROSPECT

                    customer = Customer(
                        first_name=str(
                            row.get("first_name", "")
                        ).strip(),

                        last_name=str(
                            row.get("last_name", "")
                        ).strip(),

                        email=email if email else None,

                        phone=str(
                            row.get("phone", "")
                        ).strip(),

                        company=str(
                            row.get("company", "")
                        ).strip(),

                        status=customer_status,

                        notes=str(
                            row.get("notes", "")
                        ).strip()
                    )

                    db.add(customer)

                    imported += 1

                except Exception:
                    failed += 1

            await db.commit()

        return {
            "success": True,
            "imported": imported,
            "duplicates": duplicates,
            "failed": failed
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )