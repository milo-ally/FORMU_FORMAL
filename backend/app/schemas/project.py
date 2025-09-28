from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class ProjectCreate(BaseModel):
    title: str
    style: str
    image_url: Optional[str] = None
    analysis_text: Optional[str] = None
    prompt_text: Optional[str] = None


class ProjectResponse(ProjectCreate):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    style: Optional[str] = None
    image_url: Optional[str] = None
    analysis_text: Optional[str] = None
    prompt_text: Optional[str] = None


