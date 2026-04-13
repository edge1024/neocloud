"""migrate_v8: 为 vendors 表添加 wechat 字段"""
import asyncio, asyncpg, os
from dotenv import load_dotenv

load_dotenv()

SQL = """
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS wechat text;
"""

async def main():
    conn = await asyncpg.connect(os.getenv("DATABASE_URL"))
    await conn.execute(SQL)
    await conn.close()
    print("migrate_v8 done: vendors.wechat column added")

asyncio.run(main())
