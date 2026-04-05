"""
Database migration v4 — add billing_unit, contact_name to gpu_resources
Run on HK server: python3 /www/aihub-backend/migrate_v4.py
"""
import asyncio
import os
from dotenv import load_dotenv
import asyncpg

load_dotenv()

async def main():
    conn = await asyncpg.connect(os.getenv("DATABASE_URL"))
    try:
        print("Running migration v4...")
        await conn.execute("ALTER TABLE gpu_resources ADD COLUMN IF NOT EXISTS billing_unit VARCHAR;")
        print("  ✓ gpu_resources.billing_unit")
        await conn.execute("ALTER TABLE gpu_resources ADD COLUMN IF NOT EXISTS contact_name VARCHAR;")
        print("  ✓ gpu_resources.contact_name")
        print("Migration complete.")
    finally:
        await conn.close()

asyncio.run(main())
