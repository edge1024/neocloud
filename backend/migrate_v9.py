"""migrate_v9: 为 memory_listings 表添加 price_valid_until 字段"""
import asyncio, asyncpg, os
from dotenv import load_dotenv

load_dotenv()

SQL = "ALTER TABLE memory_listings ADD COLUMN IF NOT EXISTS price_valid_until varchar;"

async def main():
    conn = await asyncpg.connect(os.getenv("DATABASE_URL"))
    await conn.execute(SQL)
    await conn.close()
    print("migrate_v9 done: memory_listings.price_valid_until column added")

asyncio.run(main())
