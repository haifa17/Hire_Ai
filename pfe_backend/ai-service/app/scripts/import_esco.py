"""Populates `skills_taxonomy` with ESCO concepts (esco_uri, esco_type,
preferred_label_en/fr) from the CSV files under data/esco/ (see
data/esco/README.md for how to obtain them). Existing custom rows
(canonical_name without an esco_uri) are left untouched — this only adds
new ESCO-backed rows / enriches existing ones matched by preferred label.

Usage:
    python -m app.scripts.import_esco
"""
from __future__ import annotations

import asyncio
import logging

from sqlalchemy import select

from app.agents.matching.rule_based.esco_taxonomy import EscoTaxonomy
from app.config.settings import get_settings
from app.db.models import SkillTaxonomy
from app.db.session import AsyncSessionLocal

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("import_esco")


async def import_esco() -> None:
    settings = get_settings()
    esco = EscoTaxonomy(settings.esco_data_dir)
    if not esco.available:
        logger.warning(
            f"No ESCO CSV files found under {settings.esco_data_dir}. "
            "See data/esco/README.md to download them first. Nothing imported."
        )
        return

    async with AsyncSessionLocal() as db:
        res = await db.execute(select(SkillTaxonomy))
        existing_by_name = {row.canonical_name.lower(): row for row in res.scalars().all()}

        created = 0
        updated = 0
        # `esco.concepts` can itself contain two concepts whose preferred
        # labels collapse to the same case-insensitive key (e.g. an English
        # and a French ESCO entry, or two near-duplicate skill concepts).
        # `existing_by_name` only reflects rows already committed to the DB
        # *before* this run, so without tracking keys newly added within
        # this same loop, two such concepts would both get `db.add()`-ed as
        # "new" rows and violate the `canonical_name` unique constraint at
        # commit time — exactly what happened before this fix.
        for concept in esco.concepts:
            key = concept.preferred_label.lower()
            row = existing_by_name.get(key)
            if row:
                row.aliases = sorted(set((row.aliases or []) + concept.alt_labels))
                row.esco_uri = concept.uri
                row.esco_type = concept.concept_type
                row.preferred_label_en = concept.preferred_label
                updated += 1
            else:
                new_row = SkillTaxonomy(
                    canonical_name=concept.preferred_label,
                    aliases=concept.alt_labels,
                    category=concept.concept_type,
                    esco_uri=concept.uri,
                    esco_type=concept.concept_type,
                    preferred_label_en=concept.preferred_label,
                )
                db.add(new_row)
                existing_by_name[key] = new_row
                created += 1

        await db.commit()
        logger.info(f"ESCO import complete: {created} new rows, {updated} enriched rows.")


if __name__ == "__main__":
    asyncio.run(import_esco())
