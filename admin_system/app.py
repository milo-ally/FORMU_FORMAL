#!/usr/bin/env python3
"""
FORMU 独立管理员系统
功能：用户类型分配和管理
端口：8001
"""

from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import aiomysql
import asyncio
import uvicorn
from typing import List
import traceback

# 数据库配置 - 使用与主系统相同的数据库
DB_CONFIG = {
    'host': 'localhost',
    'port': 3306,
    'user': 'root',
    'password': 'milo_2357',
    'db': 'FORMU',
    'charset': 'utf8mb4'
}

app = FastAPI(title="FORMU Admin System", version="1.0.0")

# CORS配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 数据模型
class AdminLoginRequest(BaseModel):
    username: str
    password: str

class UserTypeAssignRequest(BaseModel):
    admin_username: str
    admin_password: str
    target_username: str
    user_type: str

class UserInfo(BaseModel):
    username: str
    user_type: str = None
    created_at: str = None

# 创建数据库连接的函数
async def create_db_connection():
    """创建新的数据库连接"""
    try:
        connection = await aiomysql.connect(**DB_CONFIG)
        return connection
    except Exception as e:
        print(f"❌ 数据库连接失败: {e}")
        raise HTTPException(status_code=500, detail=f"Database connection failed: {str(e)}")

# 管理员验证
def verify_admin(username: str, password: str) -> bool:
    """验证管理员凭据"""
    return username == "Lihan" and password == "Lihan13230118"

# API路由
@app.post("/api/admin/login")
async def admin_login(request: AdminLoginRequest):
    """管理员登录验证"""
    is_valid = verify_admin(request.username, request.password)
    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    return {"success": True, "message": "Login successful"}

@app.post("/api/admin/assign-user-type")
async def assign_user_type(request: UserTypeAssignRequest):
    """分配用户类型"""
    # 验证管理员
    is_valid = verify_admin(request.admin_username, request.admin_password)
    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid admin credentials")
    
    # 验证用户类型
    valid_types = ["founder", "time_master", "spark_partner"]
    if request.user_type not in valid_types:
        raise HTTPException(status_code=400, detail="Invalid user type")
    
    connection = None
    try:
        # 创建新连接
        connection = await create_db_connection()
        cursor = await connection.cursor()
        
        # 检查目标用户是否存在
        await cursor.execute("SELECT id FROM users WHERE username = %s", (request.target_username,))
        user = await cursor.fetchone()
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # 更新用户类型
        await cursor.execute(
            "UPDATE users SET user_type = %s WHERE username = %s",
            (request.user_type, request.target_username)
        )
        await connection.commit()
        
        return {
            "success": True,
            "message": f"Successfully assigned {request.user_type} to {request.target_username}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ 分配用户类型失败: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        if connection:
            connection.close()

@app.get("/api/admin/users")
async def get_all_users():
    """获取所有用户列表"""
    print("🔍 API调用: 获取用户列表")
    connection = None
    try:
        # 创建新连接
        connection = await create_db_connection()
        cursor = await connection.cursor(aiomysql.DictCursor)
        
        # 查询用户信息
        await cursor.execute("""
            SELECT username, user_type, created_at 
            FROM users 
            ORDER BY created_at DESC
        """)
        rows = await cursor.fetchall()
        print(f"📊 查询到 {len(rows)} 个用户")
        
        user_list = []
        for row in rows:
            user_data = {
                "username": row["username"],
                "user_type": row["user_type"],
                "created_at": row["created_at"].isoformat() if row["created_at"] else None
            }
            user_list.append(user_data)
            print(f"👤 用户: {row['username']}, 类型: {row['user_type']}")
        
        print(f"✅ 成功返回 {len(user_list)} 个用户")
        return user_list
        
    except Exception as e:
        print(f"❌ 获取用户列表失败: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        if connection:
            connection.close()

# API专用服务器 - 不提供前端页面

async def test_database_connection():
    """测试数据库连接"""
    connection = None
    try:
        connection = await aiomysql.connect(**DB_CONFIG)
        cursor = await connection.cursor()
        
        await cursor.execute("SELECT 1")
        await cursor.fetchone()
        print("✅ 数据库连接成功！")
        print(f"📊 数据库地址: mysql://{DB_CONFIG['user']}@{DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['db']}")
        
        # 测试获取用户数量
        await cursor.execute("SELECT COUNT(*) as count FROM users")
        result = await cursor.fetchone()
        user_count = result[0]
        print(f"👥 数据库中共有 {user_count} 个用户")
        
    except Exception as e:
        print(f"❌ 数据库连接失败: {e}")
        print(f"🔧 请检查数据库配置: {DB_CONFIG}")
    finally:
        if connection:
            connection.close()

if __name__ == "__main__":
    print("🚀 启动 FORMU 管理员系统...")
    print("📍 访问地址: http://localhost:8001")
    print("👤 管理员账号: Lihan")
    print("🔑 管理员密码: Lihan13230118")
    print("-" * 50)
    
    # 测试数据库连接
    asyncio.run(test_database_connection())
    
    print("-" * 50)
    print("🌟 管理员系统启动中...")
    
    uvicorn.run(app, host="0.0.0.0", port=8001)