"""add performance indexes for aggregation queries

Revision ID: a1b2c3d4e5f6
Revises: 0b24e4aaa242
Create Date: 2026-06-28 12:00:00.000000

ADDITIVE ONLY — no existing tables or columns are modified.
Adds composite and single-column indexes to accelerate:
  - Executive dashboard aggregation queries
  - Profitability calculations (revenue + cost per asset)
  - Billing aging reports
  - Fleet status filtering
"""
from typing import Sequence, Union

from alembic import op


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '0b24e4aaa242'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Invoice queries (billing aging, period reports) ──────────────
    op.create_index(
        'ix_invoices_issue_date',
        'invoices', ['issue_date'],
        unique=False,
    )
    op.create_index(
        'ix_invoices_status_customer',
        'invoices', ['status', 'customer_id'],
        unique=False,
    )

    # ── Payment date queries ─────────────────────────────────────────
    op.create_index(
        'ix_payments_payment_date',
        'payments', ['payment_date'],
        unique=False,
    )

    # ── Fleet status filtering ───────────────────────────────────────
    op.create_index(
        'ix_forklifts_status_active',
        'forklifts', ['status', 'is_active'],
        unique=False,
    )

    # ── Profitability: ownership cost queries per asset + date ───────
    op.create_index(
        'ix_forklift_ownership_costs_forklift_date',
        'forklift_ownership_costs', ['forklift_id', 'cost_date'],
        unique=False,
    )

    # ── Profitability: maintenance cost aggregation ──────────────────
    op.create_index(
        'ix_maintenance_costs_cost_type',
        'maintenance_costs', ['cost_type'],
        unique=False,
    )

    # ── Rental contract status + date range filtering ────────────────
    op.create_index(
        'ix_rental_contracts_status_dates',
        'rental_contracts', ['status', 'start_date', 'end_date'],
        unique=False,
    )

    # ── Revenue recognition period queries ───────────────────────────
    op.create_index(
        'ix_revenue_recognitions_recognition_date',
        'revenue_recognitions', ['recognition_date'],
        unique=False,
    )

    # ── Billing cycle payment status for overdue detection ───────────
    op.create_index(
        'ix_rental_billing_cycles_payment_status',
        'rental_billing_cycles', ['payment_status'],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index('ix_rental_billing_cycles_payment_status', table_name='rental_billing_cycles')
    op.drop_index('ix_revenue_recognitions_recognition_date', table_name='revenue_recognitions')
    op.drop_index('ix_rental_contracts_status_dates', table_name='rental_contracts')
    op.drop_index('ix_maintenance_costs_cost_type', table_name='maintenance_costs')
    op.drop_index('ix_forklift_ownership_costs_forklift_date', table_name='forklift_ownership_costs')
    op.drop_index('ix_forklifts_status_active', table_name='forklifts')
    op.drop_index('ix_payments_payment_date', table_name='payments')
    op.drop_index('ix_invoices_status_customer', table_name='invoices')
    op.drop_index('ix_invoices_issue_date', table_name='invoices')
