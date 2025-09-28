import sys
import argparse
import asyncio
from pathlib import Path

# 添加项目根目录到 PYTHONPATH（backend/）
ROOT_DIR = Path(__file__).parent.parent
sys.path.append(str(ROOT_DIR))

from app.core.logger import get_logger
from app.core.database import engine, Base, AsyncSessionLocal, ensure_database_and_tables
from app.core.hashing import get_password_hash
from app.models.user import User
from sqlalchemy import select

logger = get_logger(service="init_db")


async def reset_schema() -> None:
    logger.info("Dropping and recreating all tables…")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Schema reset completed.")


async def seed_default_admin(username: str, email: str, password: str) -> None:
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.email == email))
        existing = result.scalar_one_or_none()
        if existing:
            logger.info("Admin user already exists: %s", email)
            return

        user = User(
            username=username,
            email=email.lower().strip(),
            password_hash=get_password_hash(password),
            user_type="founder",  # 默认管理员为创始人类型
            status="active",
        )
        session.add(user)
        await session.commit()
        logger.info("Seeded admin user: %s (username=%s)", email, username)


async def main(reset: bool, seed: bool, admin_username: str, admin_email: str, admin_password: str) -> None:
    try:
        logger.info("Ensuring database and schema…")
        if reset:
            await reset_schema()
        else:
            await ensure_database_and_tables()

        if seed:
            await seed_default_admin(admin_username, admin_email, admin_password)

        logger.info("Initialization finished successfully.")
    except Exception as exc:
        logger.error(f"Initialization failed: {exc}")
        raise


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Initialize FORMU database")
    parser.add_argument("--reset", action="store_true", help="Drop and recreate all tables (DANGEROUS)")
    parser.add_argument("--seed", action="store_true", help="Seed default admin user")
    parser.add_argument("--admin-username", default="admin", help="Seed admin username")
    parser.add_argument("--admin-email", default="admin@example.com", help="Seed admin email")
    parser.add_argument("--admin-password", default="Admin@123456", help="Seed admin password (raw)")
    args = parser.parse_args()

    asyncio.run(
        main(
            reset=args.reset,
            seed=args.seed,
            admin_username=args.admin_username,
            admin_email=args.admin_email,
            admin_password=args.admin_password,
        )
    )
