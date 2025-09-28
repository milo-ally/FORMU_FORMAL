from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Dict, Any
import json
import os
from pathlib import Path

from app.core.logger import get_logger
from app.core.security import require_admin

logger = get_logger(__name__)
router = APIRouter()

# 配置存储文件路径
CONFIG_FILE = Path(__file__).parent.parent.parent / "runtime_config.json"

class SystemConfig(BaseModel):
    coze: Dict[str, str]
    bots: Dict[str, str]
    tripo: Dict[str, str]
    sora: Dict[str, str]

class ConfigResponse(BaseModel):
    success: bool
    message: str
    config: Dict[str, Any] = None

def load_runtime_config() -> Dict[str, Any]:
    """加载运行时配置"""
    if CONFIG_FILE.exists():
        try:
            with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"加载运行时配置失败: {e}")
            return {}
    return {}

def save_runtime_config(config: Dict[str, Any]) -> bool:
    """保存运行时配置"""
    try:
        with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        logger.error(f"保存运行时配置失败: {e}")
        return False

@router.get("/config", response_model=ConfigResponse)
async def get_config(current_user = Depends(require_admin)):
    """获取当前系统配置"""
    try:
        config = load_runtime_config()
        return ConfigResponse(
            success=True,
            message="配置获取成功",
            config=config
        )
    except Exception as e:
        logger.error(f"获取配置失败: {e}")
        raise HTTPException(status_code=500, detail="获取配置失败")

@router.post("/config", response_model=ConfigResponse)
async def update_config(config_data: SystemConfig, current_user = Depends(require_admin)):
    """更新系统配置"""
    try:
        # 验证配置数据
        config_dict = config_data.dict()
        
        # 保存配置到文件
        if save_runtime_config(config_dict):
            logger.info("系统配置更新成功")
            return ConfigResponse(
                success=True,
                message="配置更新成功",
                config=config_dict
            )
        else:
            raise HTTPException(status_code=500, detail="配置保存失败")
            
    except Exception as e:
        logger.error(f"更新配置失败: {e}")
        raise HTTPException(status_code=500, detail=f"更新配置失败: {str(e)}")

@router.post("/config/reset", response_model=ConfigResponse)
async def reset_config(current_user = Depends(require_admin)):
    """重置配置为默认值"""
    try:
        # 删除配置文件
        if CONFIG_FILE.exists():
            CONFIG_FILE.unlink()
        
        logger.info("系统配置已重置")
        return ConfigResponse(
            success=True,
            message="配置已重置为默认值"
        )
    except Exception as e:
        logger.error(f"重置配置失败: {e}")
        raise HTTPException(status_code=500, detail="重置配置失败")

@router.get("/config/status", response_model=ConfigResponse)
async def get_config_status(current_user = Depends(require_admin)):
    """获取配置状态"""
    try:
        config = load_runtime_config()
        has_config = bool(config)
        
        return ConfigResponse(
            success=True,
            message="配置状态获取成功",
            config={"has_config": has_config, "config_exists": CONFIG_FILE.exists()}
        )
    except Exception as e:
        logger.error(f"获取配置状态失败: {e}")
        raise HTTPException(status_code=500, detail="获取配置状态失败")
