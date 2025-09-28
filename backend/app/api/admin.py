from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.services.user_service import UserService
from app.models.user import User
from app.core.logger import get_logger
from app.core.security import require_admin

router = APIRouter(prefix="/admin")
logger = get_logger("admin_api")


class AdminAssignRequest(BaseModel):
    admin_username: str
    admin_password: str
    username: str
    user_type: str


@router.post("/assign")
async def admin_assign_user_type(payload: AdminAssignRequest, db: AsyncSession = Depends(get_db)):
    """
    使用管理员账户凭据在一次请求中为目标用户分配用户类型。
    管理员需要具备 founder 权限。
    """
    logger.info(f"Admin assign request received: admin={payload.admin_username}, target={payload.username}, type={payload.user_type}")
    
    # 1) 验证管理员身份（使用专用方法，不检查 user_type 是否为空）
    admin_service = UserService(db)
    try:
        admin_user = await admin_service.authenticate_admin_user(payload.admin_username.strip(), payload.admin_password)
        logger.info(f"Admin authentication result: {admin_user.username if admin_user else 'Failed'}")
    except Exception as e:
        logger.error(f"Admin authentication error: {e}")
        raise
    
    if not admin_user:
        raise HTTPException(status_code=403, detail="管理员凭据无效")
    
    # 检查管理员权限：必须是 founder，但如果是 NULL 且用户名是 Lihan 则允许（自动提权）
    if admin_user.user_type != "founder":
        if admin_user.username == "Lihan" and not admin_user.user_type:
            # 自动为 Lihan 设置 founder 权限
            admin_user.user_type = "founder"
            await db.commit()
            logger.info(f"Auto-promoted Lihan to founder")
        else:
            raise HTTPException(status_code=403, detail="管理员无权限")

    # 2) 校验 user_type 合法
    valid_types = ["founder", "time_master", "spark_partner"]
    desired_type = payload.user_type.strip()
    if desired_type not in valid_types:
        raise HTTPException(status_code=400, detail="无效的用户类型")

    # 3) 查询目标用户
    result = await db.execute(select(User).where(User.username == payload.username.strip()))
    target_user = result.scalar_one_or_none()
    if not target_user:
        raise HTTPException(status_code=404, detail="目标用户不存在")

    # 4) 分配并提交
    target_user.user_type = desired_type
    await db.commit()
    try:
        await db.refresh(target_user)
    except Exception:
        pass

    logger.info(f"Admin assigned user_type: {target_user.username} -> {target_user.user_type} by {admin_user.username}")
    return {"ok": True, "username": target_user.username, "user_type": target_user.user_type}


@router.get("/users")
async def get_all_users(current_user: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    """
    获取所有用户列表（仅管理员可访问）
    """
    result = await db.execute(select(User))
    users = result.scalars().all()
    
    return [
        {
            "username": user.username,
            "user_type": user.user_type,
            "created_at": user.created_at.isoformat() if user.created_at else None
        }
        for user in users
    ]


