# app/utils/file_utils.py

from datetime import datetime, timedelta
from pathlib import Path
from fastapi import UploadFile, HTTPException
import os
import logging

logger = logging.getLogger(__name__)

# 定义上传目录并确保存在
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

async def save_upload_file(file: UploadFile) -> Path:
    """
    验证并保存上传的图片文件，返回保存后的路径。

    Args:
        file: 从 FastAPI 接收的 UploadFile 对象。

    Returns:
        保存文件的 Path 对象。

    Raises:
        HTTPException: 如果文件不是图片或保存失败。
    """
    content_type = (file.content_type or "").lower()
    if not content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="仅支持图片文件上传")

    # 生成不重复文件名：时间戳_原始文件名
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_name = Path(file.filename).name
    save_name = f"{timestamp}_{safe_name}"
    save_path = UPLOAD_DIR / save_name

    # 保存文件
    try:
        data = await file.read()
        save_path.write_bytes(data)
    except Exception as e:
        # 在服务端记录详细错误，但只给客户端返回通用错误
        # logger.error(f"Failed to save file to {save_path}: {e}")
        raise HTTPException(status_code=500, detail="文件保存失败")

    return save_path


def cleanup_old_files(days: int = 30) -> dict:
    """
    清理超过指定天数的文件
    
    Args:
        days: 保留天数，默认30天
        
    Returns:
        清理结果统计
    """
    if not UPLOAD_DIR.exists():
        return {"deleted": 0, "total_size": 0, "errors": []}
    
    cutoff_date = datetime.now() - timedelta(days=days)
    deleted_count = 0
    total_size = 0
    errors = []
    
    try:
        for file_path in UPLOAD_DIR.iterdir():
            if file_path.is_file():
                try:
                    # 获取文件创建时间
                    file_time = datetime.fromtimestamp(file_path.stat().st_ctime)
                    file_size = file_path.stat().st_size
                    
                    if file_time < cutoff_date:
                        file_path.unlink()  # 删除文件
                        deleted_count += 1
                        total_size += file_size
                        logger.info(f"删除过期文件: {file_path.name}")
                        
                except Exception as e:
                    error_msg = f"删除文件 {file_path.name} 失败: {e}"
                    errors.append(error_msg)
                    logger.error(error_msg)
                    
    except Exception as e:
        error_msg = f"清理文件时发生错误: {e}"
        errors.append(error_msg)
        logger.error(error_msg)
    
    result = {
        "deleted": deleted_count,
        "total_size": total_size,
        "errors": errors
    }
    
    logger.info(f"文件清理完成: 删除 {deleted_count} 个文件，释放 {total_size} 字节")
    return result


def get_uploads_stats() -> dict:
    """
    获取uploads目录统计信息
    
    Returns:
        统计信息字典
    """
    if not UPLOAD_DIR.exists():
        return {"total_files": 0, "total_size": 0, "oldest_file": None, "newest_file": None}
    
    total_files = 0
    total_size = 0
    oldest_time = None
    newest_time = None
    oldest_file = None
    newest_file = None
    
    try:
        for file_path in UPLOAD_DIR.iterdir():
            if file_path.is_file():
                total_files += 1
                file_size = file_path.stat().st_size
                total_size += file_size
                
                file_time = datetime.fromtimestamp(file_path.stat().st_ctime)
                
                if oldest_time is None or file_time < oldest_time:
                    oldest_time = file_time
                    oldest_file = file_path.name
                    
                if newest_time is None or file_time > newest_time:
                    newest_time = file_time
                    newest_file = file_path.name
                    
    except Exception as e:
        logger.error(f"获取uploads统计信息失败: {e}")
    
    return {
        "total_files": total_files,
        "total_size": total_size,
        "oldest_file": oldest_file,
        "newest_file": newest_file,
        "oldest_time": oldest_time.isoformat() if oldest_time else None,
        "newest_time": newest_time.isoformat() if newest_time else None
    }