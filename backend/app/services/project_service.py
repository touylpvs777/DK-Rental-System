import math
import time

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.customer import Customer
from app.models.project import BOQItem, MilestoneStatus, Project, ProjectMilestone, ProjectStatus
from app.models.spare_part import SparePart
from app.schemas.project import (
    BOQItemCreate, BOQItemUpdate,
    MilestoneCreate, MilestoneStatusUpdate, MilestoneUpdate,
    ProjectCreate, ProjectDetail, ProjectListResponse, ProjectOut, ProjectUpdate,
)

_VALID_SORTS = {"created_at", "start_date", "end_date", "name", "status"}
_VALID_ORDERS = {"asc", "desc"}


class ProjectService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ── Projects ─────────────────────────────────────────────────────────────

    async def create_project(self, data: ProjectCreate, created_by: int | None) -> Project:
        customer = await self.db.get(Customer, data.customer_id)
        if customer is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")

        project = Project(
            project_number=await self._gen_project_number(),
            name=data.name,
            customer_id=data.customer_id,
            start_date=data.start_date,
            end_date=data.end_date,
            notes=data.notes,
            created_by=created_by,
        )
        self.db.add(project)
        await self.db.commit()
        await self.db.refresh(project)
        return project

    async def list_projects(
        self,
        status_filter: str | None = None,
        customer_id: int | None = None,
        page: int = 1,
        page_size: int = 20,
        sort: str = "created_at",
        order: str = "desc",
    ) -> ProjectListResponse:
        page = max(1, page)
        page_size = min(max(1, page_size), 100)
        sort = sort if sort in _VALID_SORTS else "created_at"
        order = order if order in _VALID_ORDERS else "desc"

        query = select(Project).options(
            selectinload(Project.milestones), selectinload(Project.customer),
        )
        count_query = select(func.count()).select_from(Project)
        if status_filter is not None:
            query = query.where(Project.status == status_filter)
            count_query = count_query.where(Project.status == status_filter)
        if customer_id is not None:
            query = query.where(Project.customer_id == customer_id)
            count_query = count_query.where(Project.customer_id == customer_id)

        total = (await self.db.execute(count_query)).scalar_one()

        sort_col = getattr(Project, sort)
        query = query.order_by(sort_col.desc() if order == "desc" else sort_col.asc())
        query = query.offset((page - 1) * page_size).limit(page_size)

        projects = (await self.db.execute(query)).scalars().unique().all()
        pages = math.ceil(total / page_size) if page_size else 1

        items = []
        for p in projects:
            obj = ProjectOut.model_validate(p)
            obj.milestone_total = len(p.milestones)
            obj.milestone_completed = sum(
                1 for m in p.milestones if m.status == MilestoneStatus.COMPLETED.value
            )
            obj.customer_name = f"{p.customer.first_name} {p.customer.last_name}" if p.customer else ""
            items.append(obj)

        return ProjectListResponse(items=items, total=total, page=page, page_size=page_size, pages=pages)

    async def get_project(self, project_id: int) -> ProjectDetail:
        project = await self._get_project_with_relations(project_id)
        obj = ProjectDetail.model_validate(project)
        obj.milestone_total = len(project.milestones)
        obj.milestone_completed = sum(
            1 for m in project.milestones if m.status == MilestoneStatus.COMPLETED.value
        )
        obj.customer_name = f"{project.customer.first_name} {project.customer.last_name}" if project.customer else ""
        return obj

    async def update_project(
        self, project_id: int, data: ProjectUpdate, updated_by: int | None,
    ) -> Project:
        project = await self._get_project_or_404(project_id)
        changes = data.model_dump(exclude_unset=True)
        if "status" in changes and changes["status"] is not None:
            changes["status"] = changes["status"].value
        for field, value in changes.items():
            setattr(project, field, value)
        project.updated_by = updated_by
        await self.db.commit()
        await self.db.refresh(project)
        return project

    async def delete_project(self, project_id: int) -> None:
        project = await self._get_project_or_404(project_id)
        await self.db.delete(project)
        await self.db.commit()

    async def approve_boq(self, project_id: int, approved_by: int | None) -> Project:
        project = await self._get_project_or_404(project_id)
        project.status = ProjectStatus.BOQ_APPROVED.value
        project.updated_by = approved_by
        await self.db.commit()
        await self.db.refresh(project)
        return project

    # ── Milestones ───────────────────────────────────────────────────────────

    async def list_milestones(self, project_id: int) -> list[ProjectMilestone]:
        await self._get_project_or_404(project_id)
        result = await self.db.execute(
            select(ProjectMilestone)
            .where(ProjectMilestone.project_id == project_id)
            .order_by(ProjectMilestone.due_date)
        )
        return list(result.scalars().all())

    async def get_milestone(self, project_id: int, milestone_id: int) -> ProjectMilestone:
        return await self._get_milestone_or_404(project_id, milestone_id)

    async def create_milestone(self, project_id: int, data: MilestoneCreate) -> ProjectMilestone:
        await self._get_project_or_404(project_id)
        milestone = ProjectMilestone(
            project_id=project_id,
            name=data.name,
            due_date=data.due_date,
            status=data.status.value,
        )
        self.db.add(milestone)
        await self.db.commit()
        await self.db.refresh(milestone)
        return milestone

    async def update_milestone(
        self, project_id: int, milestone_id: int, data: MilestoneUpdate,
    ) -> ProjectMilestone:
        milestone = await self._get_milestone_or_404(project_id, milestone_id)
        changes = data.model_dump(exclude_unset=True)
        for field, value in changes.items():
            setattr(milestone, field, value)
        await self.db.commit()
        await self.db.refresh(milestone)
        return milestone

    async def update_milestone_status(
        self, project_id: int, milestone_id: int, data: MilestoneStatusUpdate,
    ) -> ProjectMilestone:
        milestone = await self._get_milestone_or_404(project_id, milestone_id)
        milestone.status = data.status.value
        await self.db.commit()
        await self.db.refresh(milestone)
        return milestone

    async def delete_milestone(self, project_id: int, milestone_id: int) -> None:
        milestone = await self._get_milestone_or_404(project_id, milestone_id)
        await self.db.delete(milestone)
        await self.db.commit()

    # ── BOQ items ────────────────────────────────────────────────────────────

    async def list_boq_items(self, project_id: int) -> list[BOQItem]:
        await self._get_project_or_404(project_id)
        result = await self.db.execute(
            select(BOQItem).where(BOQItem.project_id == project_id).order_by(BOQItem.id)
        )
        return list(result.scalars().all())

    async def get_boq_item(self, project_id: int, item_id: int) -> BOQItem:
        return await self._get_boq_item_or_404(project_id, item_id)

    async def create_boq_item(self, project_id: int, data: BOQItemCreate) -> BOQItem:
        await self._get_project_or_404(project_id)
        if data.spare_part_id is not None:
            spare_part = await self.db.get(SparePart, data.spare_part_id)
            if spare_part is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Spare part not found")

        item = BOQItem(
            project_id=project_id,
            spare_part_id=data.spare_part_id,
            description=data.description,
            quantity=data.quantity,
            unit_price=data.unit_price,
            total_price=round(data.quantity * data.unit_price, 2),
            currency=data.currency,
        )
        self.db.add(item)
        await self.db.commit()
        await self.db.refresh(item)
        return item

    async def update_boq_item(
        self, project_id: int, item_id: int, data: BOQItemUpdate,
    ) -> BOQItem:
        item = await self._get_boq_item_or_404(project_id, item_id)
        changes = data.model_dump(exclude_unset=True)
        if "spare_part_id" in changes and changes["spare_part_id"] is not None:
            spare_part = await self.db.get(SparePart, changes["spare_part_id"])
            if spare_part is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Spare part not found")
        for field, value in changes.items():
            setattr(item, field, value)
        if "quantity" in changes or "unit_price" in changes:
            item.total_price = round(item.quantity * item.unit_price, 2)
        await self.db.commit()
        await self.db.refresh(item)
        return item

    async def delete_boq_item(self, project_id: int, item_id: int) -> None:
        item = await self._get_boq_item_or_404(project_id, item_id)
        await self.db.delete(item)
        await self.db.commit()

    # ── Helpers ──────────────────────────────────────────────────────────────

    async def _gen_project_number(self) -> str:
        year = time.strftime("%Y")
        base = f"PRJ-{year}"
        seq = 1
        while True:
            candidate = f"{base}-{seq:05d}"
            result = await self.db.execute(
                select(Project.id).where(Project.project_number == candidate)
            )
            if result.scalar_one_or_none() is None:
                return candidate
            seq += 1

    async def _get_project_or_404(self, project_id: int) -> Project:
        project = await self.db.get(Project, project_id)
        if project is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
        return project

    async def _get_project_with_relations(self, project_id: int) -> Project:
        result = await self.db.execute(
            select(Project)
            .where(Project.id == project_id)
            .options(
                selectinload(Project.milestones),
                selectinload(Project.boq_items),
                selectinload(Project.customer),
            )
        )
        project = result.scalar_one_or_none()
        if project is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
        return project

    async def _get_milestone_or_404(self, project_id: int, milestone_id: int) -> ProjectMilestone:
        result = await self.db.execute(
            select(ProjectMilestone).where(
                ProjectMilestone.id == milestone_id,
                ProjectMilestone.project_id == project_id,
            )
        )
        milestone = result.scalar_one_or_none()
        if milestone is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Milestone not found")
        return milestone

    async def _get_boq_item_or_404(self, project_id: int, item_id: int) -> BOQItem:
        result = await self.db.execute(
            select(BOQItem).where(BOQItem.id == item_id, BOQItem.project_id == project_id)
        )
        item = result.scalar_one_or_none()
        if item is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="BOQ item not found")
        return item
