"""Fills the database in DATABASE_URL with the sample accounts and posts (only if it has none yet).

    DATABASE_URL=postgresql://... python -m scripts.seed_sample_data

Used by CI to give the backup round-trip check real data to back up. Never run it against the live database.
"""
import asyncio

from app.db.seed import seed_demo_data
from app.db.session import AsyncSessionLocal, engine


async def main() -> None:
    async with AsyncSessionLocal() as session:
        added = await seed_demo_data(session)
    await engine.dispose()
    print("Sample data added." if added else "The database already has data; nothing added.")


if __name__ == "__main__":
    asyncio.run(main())
