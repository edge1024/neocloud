"""
Database migration v5 — add status to demands
Run: python3 /www/aihub-backend/migrate_v5.py
"""
import asyncio, os
from dotenv import load_dotenv
import asyncpg

load_dotenv()

async def main():
    conn = await asyncpg.connect(os.getenv("DATABASE_URL"))
    try:
        print("Running migration v5...")
        await conn.execute("""
            ALTER TABLE demands
            ADD COLUMN IF NOT EXISTS status VARCHAR NOT NULL DEFAULT 'online'
        """)
        print("  ✓ demands.status (default: online)")
        print("Migration complete.")
    finally:
        await conn.close()

asyncio.run(main())
