"""
Database migration v2
Run on HK server: python3 /tmp/migrate_v2.py
"""
import asyncio
import os
from dotenv import load_dotenv
import asyncpg

load_dotenv()

async def main():
    conn = await asyncpg.connect(os.getenv("DATABASE_URL"))
    try:
        print("Running migration v2...")
        await conn.execute("""
            ALTER TABLE demands
            ADD COLUMN IF NOT EXISTS vendor_id BIGINT REFERENCES vendors(id) ON DELETE SET NULL;
        """)
        print("  ✓ demands.vendor_id")

        await conn.execute("""
            ALTER TABLE demands
            ADD COLUMN IF NOT EXISTS is_visible BOOLEAN NOT NULL DEFAULT true;
        """)
        print("  ✓ demands.is_visible")

        await conn.execute("""
            ALTER TABLE gpu_resources
            ADD COLUMN IF NOT EXISTS is_visible BOOLEAN NOT NULL DEFAULT true;
        """)
        print("  ✓ gpu_resources.is_visible")

        print("Migration complete.")
    finally:
        await conn.close()

asyncio.run(main())
