"""Smoke-test for dashboard schema and service helpers."""
from app.schemas.dashboard import DashboardSummary, LeadMetrics, TrendPoint
from app.services.dashboard_service import _month_range, _cutoff_from_months, _rate

# _month_range
months = _month_range(6)
assert len(months) == 6, months
assert months[-1] > months[0], "should be oldest first"
for m in months:
    assert len(m) == 7 and m[4] == "-", f"bad format: {m}"
print("_month_range(6):", months)

# _cutoff_from_months
cutoff = _cutoff_from_months(6)
print("cutoff:", cutoff)

# _rate
assert _rate(0, 0) == 0.0
assert _rate(10, 100) == 10.0
assert _rate(1, 3) == 33.3
print("_rate: OK")

# TrendPoint
tp = TrendPoint(month="2026-06", count=5)
assert tp.month == "2026-06"
print("TrendPoint:", tp.model_dump())

# LeadMetrics
lm = LeadMetrics(
    total=10,
    conversion_rate=20.0,
    win_rate=40.0,
    lost_rate=60.0,
    by_status={"new": 4, "contacted": 2, "qualified": 1, "proposal": 1, "won": 2, "lost": 0},
    by_source={"website": 5, "referral": 5},
)
print("LeadMetrics:", lm.model_dump())

# DashboardSummary
ds = DashboardSummary(
    total_customers=5, active_customers=3, prospect_customers=2,
    total_leads=10, new_leads=4, contacted_leads=2, qualified_leads=2,
    proposal_leads=1, won_leads=1, lost_leads=0,
    leads_by_source={"website": 6, "referral": 4},
    conversion_rate=10.0, win_rate=100.0, lost_rate=0.0,
)
print("DashboardSummary rates:", ds.conversion_rate, ds.win_rate, ds.lost_rate)
print("\nAll schema checks passed.")
