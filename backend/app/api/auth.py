from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import timedelta
from pathlib import Path 
import sys 

current_file = Path(__file__).resolve()
project_root = current_file.parent.parent.parent
sys.path.append(str(project_root))


from app.core.database import get_db
from app.core.security import create_access_token, get_current_user
from app.schemas.user import UserCreate, UserResponse, Token, UserLogin
from app.services.user_service import UserService
from app.core.config import settings
from app.models.user import User

router = APIRouter()

# response_model 就是 声明响应的类型，简单理解就是执行完函数后，返回的结果，需要和 UserResponse 类型一致
# 详细文档可以看：https://fastapi.tiangolo.com/tutorial/response-model/?h=
@router.post("/register", response_model=UserResponse)
# Depends(get_db) 表示 db 参数是一个依赖项，它会调用 get_db 函数来获取一个数据库会话（AsyncSession）。
# FastAPI 会在处理请求时自动执行 get_db 函数，并将返回的结果传递给 register 函数的 db 参数。
async def register(user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    try:
        # 基础校验与规范化
        username = user_data.username.strip()
        password = user_data.password.strip()

        if len(username) < 3:
            raise ValueError("用户名长度至少为3个字符")
        if len(password) < 6:
            raise ValueError("密码长度至少为6个字符")

        user_data.username = username
        user_data.password = password

        user_service = UserService(db)
        user = await user_service.create_user(user_data)
        return user
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/token", response_model=Token)
async def login(request: Request, db: AsyncSession = Depends(get_db)):
    """
    同时支持两种登录请求格式：
    1) application/x-www-form-urlencoded（OAuth2PasswordBearer）：username、password
    2) application/json：{"username": "...", "password": "..."}
    """
    content_type = (request.headers.get("content-type") or "").lower()

    if "application/x-www-form-urlencoded" in content_type or "multipart/form-data" in content_type:
        form = await request.form()
        username = (form.get("username") or "").strip()
        password = (form.get("password") or "").strip()
    else:
        body = await request.json()
        username = (body.get("username") or "").strip()
        password = (body.get("password") or "").strip()

    user_service = UserService(db)
    try:
        user = await user_service.authenticate_user(username, password)
    except ValueError as e:
        # 明确返回“需要管理员分配用户类型”的提示
        raise HTTPException(status_code=403, detail=str(e))
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/users/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """获取当前登录用户的信息"""
    return current_user 


@router.put("/users/me", response_model=UserResponse)
async def update_current_user_info(
    payload: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    allowed = {"username"}
    for k in list(payload.keys()):
        if k not in allowed:
            payload.pop(k)
    if "username" in payload:
        current_user.username = payload["username"].strip()
    try:
        await db.commit()
        await db.refresh(current_user)
    except Exception:
        await db.rollback()
        raise HTTPException(status_code=400, detail="更新失败，可能与其他用户冲突")
    return current_user