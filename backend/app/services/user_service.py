from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from sqlalchemy import select
from datetime import datetime
from typing import Optional
from pathlib import Path 
import sys

current_file = Path(__file__).resolve()
project_root = current_file.parent.parent.parent
sys.path.append(str(project_root))

from app.models.user import User
from app.schemas.user import UserCreate
from app.core.hashing import get_password_hash, verify_password
from app.core.logger import get_logger

logger = get_logger(service="user_service")

class UserService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_user(self, user_data: UserCreate) -> User:
        # 检查用户名是否已存在
        query = select(User).where(User.username == user_data.username)
        result = await self.db.execute(query)
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            raise ValueError("用户名已被占用！")
        
        # 创建新用户
        db_user = User(
            username=user_data.username,
            password_hash=get_password_hash(user_data.password)
        )
        self.db.add(db_user)
        try:
            await self.db.commit()
        except IntegrityError:
            # 冗余保护：数据库层唯一性冲突
            await self.db.rollback()
            raise ValueError("用户名已存在")
        await self.db.refresh(db_user)
        return db_user

    async def authenticate_user(self, username: str, password: str) -> Optional[User]:
        """
        验证用户
        password: 前端传来的 SHA256 哈希密码
        """
        query = select(User).where(User.username == username)
        result = await self.db.execute(query)
        user = result.scalar_one_or_none()  # 获取查询结果中的第一个用户，如果存在则返回，否则返回 None
        
        if not user:
            logger.warning(f"User not found: {username}")
            return None
            
        if not verify_password(password, user.password_hash):
            logger.warning(f"Invalid password for user: {username}")
            return None

        # 阻止未分配用户类型的用户登录（需要管理员分配）
        if not user.user_type:
            logger.warning(f"User type not assigned for user: {username}")
            raise ValueError("您的账户尚未由管理员分配用户类型，请联系管理员")
            
        # 更新最后登录时间
        user.last_login = datetime.utcnow()
        await self.db.commit()
        
        return user

    async def authenticate_admin_user(self, username: str, password: str) -> Optional[User]:
        """
        管理员专用验证：不检查 user_type 是否为空，仅验证用户名密码
        用于管理员分配用户类型的场景
        """
        query = select(User).where(User.username == username)
        result = await self.db.execute(query)
        user = result.scalar_one_or_none()
        
        if not user:
            logger.warning(f"Admin user not found: {username}")
            return None
            
        if not verify_password(password, user.password_hash):
            logger.warning(f"Invalid password for admin user: {username}")
            return None
            
        # 不检查 user_type，直接返回用户
        return user

    async def get_user_by_id(self, user_id: int) -> Optional[User]:
        query = select(User).where(User.id == user_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_user_by_username(self, username: str) -> Optional[User]:
        query = select(User).where(User.username == username)
        result = await self.db.execute(query)
        return result.scalar_one_or_none() 