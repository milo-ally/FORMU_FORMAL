from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from pathlib import Path
import sys

current_file = Path(__file__).resolve()
project_root = current_file.parent.parent.parent
sys.path.append(str(project_root))

from app.models.project import Project
from app.schemas.project import ProjectCreate, ProjectUpdate


class ProjectService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_project(self, user_id: int, data: ProjectCreate) -> Project:
        project = Project(
            user_id=user_id,
            title=data.title,
            style=data.style,
            image_url=data.image_url,
            analysis_text=data.analysis_text,
            prompt_text=data.prompt_text,
        )
        self.db.add(project)
        await self.db.commit()
        await self.db.refresh(project)
        return project

    async def list_projects(self, user_id: int) -> List[Project]:
        stmt = select(Project).where(Project.user_id == user_id).order_by(Project.created_at.desc())
        res = await self.db.execute(stmt)
        return list(res.scalars().all())

    async def get_project(self, user_id: int, project_id: int) -> Optional[Project]:
        stmt = select(Project).where(Project.user_id == user_id, Project.id == project_id)
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()

    async def update_project(self, user_id: int, project_id: int, data: ProjectUpdate) -> Optional[Project]:
        project = await self.get_project(user_id, project_id)
        if not project:
            return None
        for field in ["title", "style", "image_url", "analysis_text", "prompt_text"]:
            value = getattr(data, field)
            if value is not None:
                setattr(project, field, value)
        await self.db.commit()
        await self.db.refresh(project)
        return project

    async def delete_project(self, user_id: int, project_id: int) -> bool:
        project = await self.get_project(user_id, project_id)
        if not project:
            return False
        await self.db.delete(project)
        await self.db.commit()
        return True


