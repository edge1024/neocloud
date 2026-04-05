"""
Database migration v3 — add delivery_time, budget_text to demands
Run on HK server: python3 /tmp/migrate_v3.py
"""
import asyncio
import os
from dotenv import load_dotenv
import asyncpg

load_dotenv()

async def main():
    conn = await asyncpg.connect(os.getenv("DATABASE_URL"))
    try:
        print("Running migration v3...")
        await conn.execute("ALTER TABLE demands ADD COLUMN IF NOT EXISTS delivery_time VARCHAR;")
        print("  ✓ demands.delivery_time")
        await conn.execute("ALTER TABLE demands ADD COLUMN IF NOT EXISTS budget_text VARCHAR;")
        print("  ✓ demands.budget_text")
        print("Migration complete.")
    finally:
        await conn.close()

asyncio.run(main())
