from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from app.utils.file_utils import cleanup_old_files, get_uploads_stats
from app.core.security import require_admin
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

class CleanupRequest(BaseModel):
    days: int = 30

class CleanupResponse(BaseModel):
    success: bool
    message: str
    deleted_count: int
    total_size: int
    errors: list

class StatsResponse(BaseModel):
    success: bool
    total_files: int
    total_size: int
    oldest_file: Optional[str]
    newest_file: Optional[str]
    oldest_time: Optional[str]
    newest_time: Optional[str]

@router.get("/stats", response_model=StatsResponse)
async def get_file_stats(current_user = Depends(require_admin)):
    """获取uploads目录统计信息"""
    try:
        stats = get_uploads_stats()
        return StatsResponse(
            success=True,
            **stats
        )
    except Exception as e:
        logger.error(f"获取文件统计失败: {e}")
        raise HTTPException(status_code=500, detail="获取统计信息失败")

@router.post("/cleanup", response_model=CleanupResponse)
async def cleanup_files(request: CleanupRequest, current_user = Depends(require_admin)):
    """清理过期文件"""
    try:
        if request.days < 1:
            raise HTTPException(status_code=400, detail="保留天数必须大于0")
        
        result = cleanup_old_files(request.days)
        
        return CleanupResponse(
            success=True,
            message=f"清理完成，删除了 {result['deleted']} 个文件",
            deleted_count=result['deleted'],
            total_size=result['total_size'],
            errors=result['errors']
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"清理文件失败: {e}")
        raise HTTPException(status_code=500, detail="清理文件失败")
