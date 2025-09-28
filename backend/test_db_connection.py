# 正确的测试代码
import sys
sys.path.append('.')
from app.core.config import settings
from app.core.database import engine
import asyncio
from sqlalchemy import text

async def test_connection():
    try:
        async with engine.begin() as conn:
            result = await conn.execute(text('SELECT 1'))
            print('✅ 后端连接 Docker MySQL 成功！')
            print(f'数据库配置: {settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}')
    except Exception as e:
        print(f'❌ 后端连接失败: {e}')

asyncio.run(test_connection())