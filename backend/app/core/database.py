import logging
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import text
from app.core.config import settings
from app.core.hashing import get_password_hash

# 设置 SQLAlchemy 日志级别为 WARNING，这样就不会显示 INFO 级别的 SQL 查询日志
logging.getLogger('sqlalchemy.engine').setLevel(logging.WARNING)

# 创建异步引擎
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,  # 设置为 False 也可以关闭 SQL 日志
    pool_pre_ping=True,  # 自动检测断开的连接
    pool_size=5,  # 连接池大小， 保持 5 个连接处于可用状态。在高并发情况下，最多可以同时处理 5 个数据库请求，而不需要每次都去创建新的连接。
    max_overflow=10  # 最大溢出连接数，如果连接池中的连接都被占用，最多可以再创建 10 个额外的连接。因此，最多可以同时处理 15 个请求（5 个常规连接 + 10 个溢出连接）。超出这个数量的请求将会被阻塞，直到有连接可用。
)

# 创建异步会话工厂
AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# 创建基类
Base = declarative_base()

# 获取数据库会话的依赖函数
async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close() 


async def ensure_database_and_tables():
    """
    确保目标数据库存在，并在启动时创建缺失的数据表。
    1) 连接到服务器级别（不指定数据库），执行 CREATE DATABASE IF NOT EXISTS
    2) 使用目标数据库的 engine 创建所有表
    """
    # 1) 连接到服务器级别
    server_url = f"mysql+aiomysql://{settings.DB_USER}:{settings.DB_PASSWORD}@{settings.DB_HOST}:{settings.DB_PORT}/"
    server_engine = create_async_engine(server_url, echo=False, pool_pre_ping=True)
    try:
        async with server_engine.begin() as conn:
            db_name = settings.DB_NAME
            await conn.execute(text(
                f"CREATE DATABASE IF NOT EXISTS `{db_name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
            ))
    finally:
        await server_engine.dispose()

    # 2) 确保模型已导入，从而 Base.metadata 包含所有表
    # 仅导入一次，避免循环依赖
    from app.models import user as user_model  # noqa: F401
    from app.models import project as project_model  # noqa: F401
    from app.models import usage as usage_model  # noqa: F401

    # 3) 在目标数据库中创建表（如不存在）
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # 4) 临时迁移：如果 users 表仍存在旧的 email 列，则删除之
    async with engine.begin() as conn:
        try:
            check_sql = text(
                """
                SELECT COUNT(*) AS cnt
                FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = :db
                  AND TABLE_NAME = 'users'
                  AND COLUMN_NAME = 'email'
                """
            )
            result = await conn.execute(check_sql, {"db": settings.DB_NAME})
            cnt = result.scalar_one()
            if cnt and int(cnt) > 0:
                # 删除列（相关唯一索引会随列一起删除）
                await conn.execute(text("ALTER TABLE users DROP COLUMN email"))
        except Exception:
            # 忽略迁移失败，不阻断启动
            pass

    # 5) 临时迁移：允许 user_type 为空（未分配时不可登录）
    async with engine.begin() as conn:
        try:
            await conn.execute(text(
                """
                ALTER TABLE users 
                MODIFY COLUMN user_type VARCHAR(20) NULL
                """
            ))
        except Exception:
            # 已经为可空或列不存在时忽略
            pass

    # 6) 种子/修复管理员账户：确保 Lihan 存在且为 founder
    async with engine.begin() as conn:
        try:
            result = await conn.execute(text("SELECT id, user_type FROM users WHERE username = :u"), {"u": "Lihan"})
            row = result.first()
            if row is None:
                # 不存在则创建
                hashed = get_password_hash("Lihan13230118")
                await conn.execute(
                    text(
                        """
                        INSERT INTO users (username, password_hash, user_type, status)
                        VALUES (:u, :p, :t, :s)
                        """
                    ),
                    {"u": "Lihan", "p": hashed, "t": "founder", "s": "active"}
                )
            else:
                # 存在则确保为 founder，必要时更新密码，避免因旧数据导致无法验证
                hashed = get_password_hash("Lihan13230118")
                await conn.execute(
                    text(
                        """
                        UPDATE users
                        SET user_type = 'founder', password_hash = :p, status = 'active'
                        WHERE username = :u
                        """
                    ),
                    {"u": "Lihan", "p": hashed}
                )
        except Exception:
            # 不阻断启动
            pass