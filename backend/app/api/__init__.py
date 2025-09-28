from fastapi import APIRouter
from app.api.auth import router as auth_router
from app.api.project import router as project_router
from app.api.config import router as config_router
from app.api.file_management import router as file_management_router
from app.api.usage import router as usage_router
from app.api.admin import router as admin_router

# 创建主路由，所有可用的参数：https://fastapi.tiangolo.com/reference/apirouter/?h=apirouter#fastapi.APIRouter--example
api_router = APIRouter()

# 注册所有子路由
api_router.include_router(auth_router, tags=["authentication"])
api_router.include_router(project_router, tags=["projects"])
api_router.include_router(config_router, tags=["config"])
api_router.include_router(file_management_router, prefix="/files", tags=["file_management"])
api_router.include_router(usage_router, tags=["usage"])
api_router.include_router(admin_router, tags=["admin"])