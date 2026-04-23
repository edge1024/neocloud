"""migrate_v10: 为 gpu_resources 表添加商务条款字段"""
import asyncio, asyncpg, os
from dotenv import load_dotenv

load_dotenv()

SQL = """
ALTER TABLE gpu_resources
ADD COLUMN IF NOT EXISTS contract_type varchar,
ADD COLUMN IF NOT EXISTS payment_type varchar;
"""

async def main():
    conn = await asyncpg.connect(os.getenv("DATABASE_URL"))
    await conn.execute(SQL)
    await conn.close()
    print("migrate_v10 done: gpu_resources 添加 contract_type, payment_type 字段")

asyncio.run(main())
