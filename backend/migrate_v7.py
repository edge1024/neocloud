"""migrate_v7: 创建 subscriptions 表"""
import asyncio, asyncpg, os
from dotenv import load_dotenv

load_dotenv()

SQL = """
CREATE TABLE IF NOT EXISTS subscriptions (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  send_key   text NOT NULL,
  filters    jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_created_at ON subscriptions(created_at);
"""

async def main():
    conn = await asyncpg.connect(os.getenv("DATABASE_URL"))
    await conn.execute(SQL)
    await conn.close()
    print("migrate_v7 done: subscriptions table created")

asyncio.run(main())
