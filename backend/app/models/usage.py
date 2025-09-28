from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import relationship
from pathlib import Path
import sys

current_file = Path(__file__).resolve()
project_root = current_file.parent.parent.parent
sys.path.append(str(project_root))

from app.core.database import Base


class UsageCounter(Base):
    __tablename__ = "user_usage"

    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    used_count = Column(Integer, nullable=False, server_default="0")
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class UsageTask(Base):
    __tablename__ = "usage_tasks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    task_id = Column(String(128), nullable=False)
    service_type = Column(String(32), nullable=False)  # 'sora' or 'tripo'
    created_at = Column(DateTime, server_default=func.now())

    __table_args__ = (
        UniqueConstraint('task_id', name='uq_usage_tasks_task_id'),
    )
