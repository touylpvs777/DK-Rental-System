"""Quick import and schema smoke-test for the enhanced Lead module."""
import asyncio


async def main():
    from app.models.lead import Lead, LeadSource, LeadStatus, VALID_TRANSITIONS
    from app.models.lead_note import LeadNote
    from app.schemas.lead import (
        LeadCreate, LeadDetail, LeadNoteCreate, LeadNoteOut, LeadOut, LeadUpdate
    )
    from app.services.lead_service import LeadService
    from app.schemas.dashboard import DashboardSummary
    from app.services.dashboard_service import DashboardService

    print("Imports: OK")
    print("LeadSource:", [s.value for s in LeadSource])
    print("LeadStatus:", [s.value for s in LeadStatus])
    print("Status transitions:")
    for k, v in VALID_TRANSITIONS.items():
        targets = [s.value for s in v] or ["(terminal)"]
        print(f"  {k.value:12s} -> {targets}")

    # Schema round-trip
    lc = LeadCreate(title="Test lead", value=5000, source=LeadSource.REFERRAL)
    print("\nLeadCreate dump:", lc.model_dump())

    lu = LeadUpdate(status=LeadStatus.CONTACTED, source=LeadSource.WEBSITE)
    print("LeadUpdate dump:", lu.model_dump())

    note = LeadNoteCreate(content="Called client, interested.")
    print("LeadNoteCreate dump:", note.model_dump())

    ds = DashboardSummary(
        total_customers=5, active_customers=3, prospect_customers=2,
        total_leads=10, new_leads=4, contacted_leads=2, qualified_leads=2,
        proposal_leads=1, won_leads=1, lost_leads=0,
        leads_by_source={"website": 3, "referral": 7},
    )
    print("DashboardSummary leads_by_source:", ds.leads_by_source)
    print("\nAll checks passed.")


asyncio.run(main())
