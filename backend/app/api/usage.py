from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, insert
from pathlib import Path
import sys

current_file = Path(__file__).resolve()
project_root = current_file.parent.parent.parent
sys.path.append(str(project_root))

from app.core.database import get_db
from app.core.security import get_current_user, require_admin
from app.models.usage import UsageCounter, UsageTask
from app.models.user import User

router = APIRouter()


@router.get("/usage")
async def get_usage(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(UsageCounter).where(UsageCounter.user_id == current_user.id))
    row = result.scalar_one_or_none()
    used = int(row.used_count) if row else 0
    
    # 用户类型配置
    USER_TYPE_CONFIG = {
        "founder": {"name": "创始人", "maxUsage": float('inf'), "color": "#FF6B6B"},
        "time_master": {"name": "时光主理人", "maxUsage": 100, "color": "#4A90E2"},
        "spark_partner": {"name": "星火合伙人", "maxUsage": 7, "color": "#7ED321"}
    }
    
    user_type = current_user.user_type or "spark_partner"
    config = USER_TYPE_CONFIG.get(user_type, USER_TYPE_CONFIG["spark_partner"])
    
    # 计算剩余次数
    if config["maxUsage"] == float('inf'):
        remaining = float('inf')
    else:
        remaining = max(0, config["maxUsage"] - used)

    # 将 inf 值转换为 JSON 兼容的值
    config_json = config.copy()
    if config_json["maxUsage"] == float('inf'):
        config_json["maxUsage"] = None  # 使用 None 表示无限
    
    remaining_json = remaining if remaining != float('inf') else None

    result = {
        "used": used,
        "user_type": user_type,
        "config": config_json,
        "remaining": remaining_json,
        "can_use": config["maxUsage"] == float('inf') or remaining > 0
    }
    
    # 调试信息
    print(f"User {current_user.username} usage data: {result}")
    
    return result


@router.post("/usage/increment")
async def increment_usage(payload: dict, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    task_id = (payload.get("task_id") or "").strip()
    service_type = (payload.get("service_type") or "").strip()
    if not task_id or not service_type:
        raise HTTPException(status_code=400, detail="task_id 和 service_type 必填")

    # 1) 先尝试记录任务（幂等：task_id 唯一约束）
    try:
        await db.execute(insert(UsageTask).values(user_id=current_user.id, task_id=task_id, service_type=service_type))
        await db.commit()
    except Exception:
        # 已记录则不重复计数
        await db.rollback()
        return {"ok": True, "dedup": True}

    # 2) 更新使用次数（不存在则插入 0 再 +1）
    result = await db.execute(select(UsageCounter).where(UsageCounter.user_id == current_user.id))
    row = result.scalar_one_or_none()
    if not row:
        await db.execute(insert(UsageCounter).values(user_id=current_user.id, used_count=1))
        await db.commit()
        return {"ok": True, "used": 1}
    else:
        old_count = int(row.used_count or 0)
        row.used_count = old_count + 1
        await db.commit()
        print(f"User {current_user.username} usage incremented: {old_count} -> {row.used_count}")
        return {"ok": True, "used": row.used_count}


@router.put("/usage/user-type")
async def update_user_type(payload: dict, db: AsyncSession = Depends(get_db), current_user: User = Depends(require_admin)):
    """更新用户类型（仅管理员可用）"""
    target_username = payload.get("username", "").strip()
    new_user_type = payload.get("user_type", "").strip()
    
    # 验证用户类型
    valid_types = ["founder", "time_master", "spark_partner"]
    if new_user_type not in valid_types:
        raise HTTPException(status_code=400, detail="无效的用户类型")
    
    # 如果没有指定用户名，则更新当前用户
    if not target_username:
        target_user = current_user
    else:
        # 查找目标用户
        result = await db.execute(select(User).where(User.username == target_username))
        target_user = result.scalar_one_or_none()
        if not target_user:
            raise HTTPException(status_code=404, detail="用户不存在")
    
    # 更新用户类型
    target_user.user_type = new_user_type
    await db.commit()
    try:
        await db.refresh(target_user)
    except Exception:
        pass
    
    # 标准日志，避免使用 print 被进程管理器吞掉
    try:
        from app.core.logger import get_logger
        logger = get_logger("usage_api")
        logger.info(f"User {target_user.username} type updated to: {new_user_type} by {current_user.username}")
    except Exception:
        pass
    
    return {"ok": True, "user_type": target_user.user_type, "username": target_user.username}



