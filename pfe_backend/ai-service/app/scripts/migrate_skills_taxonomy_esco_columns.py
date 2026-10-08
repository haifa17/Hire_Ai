"""One-off schema migration for the ESCO columns on `skills_taxonomy`.

This project doesn't have Alembic actually initialized yet (no alembic.ini /
env.py despite being a listed dependency — schema is managed via
`Base.metadata.create_all`, which only creates missing *tables*, not missing
*columns* on tables that already exist). Until a proper Alembic setup is
added, run this idempotent raw-SQL migration once to add the new columns:

    python -m app.scripts.migrate_skills_taxonomy_esco_columns
"""
from __future__ import annotations

import asyncio
import logging

from sqlalchemy import text

from app.db.session import AsyncSessionLocal

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("migrate_skills_taxonomy_esco_columns")

STATEMENTS = [
    "ALTER TABLE skills_taxonomy ADD COLUMN IF NOT EXISTS esco_uri VARCHAR(255)",
    "ALTER TABLE skills_taxonomy ADD COLUMN IF NOT EXISTS esco_type VARCHAR(50)",
    "ALTER TABLE skills_taxonomy ADD COLUMN IF NOT EXISTS preferred_label_en VARCHAR(255)",
    "ALTER TABLE skills_taxonomy ADD COLUMN IF NOT EXISTS preferred_label_fr VARCHAR(255)",
]


async def migrate() -> None:
    async with AsyncSessionLocal() as db:
        for statement in STATEMENTS:
            await db.execute(text(statement))
        await db.commit()
    logger.info("skills_taxonomy ESCO columns are up to date.")


if __name__ == "__main__":
    asyncio.run(migrate())
