"""migrate_v11: 创建 server_listings 表"""
import asyncio, asyncpg, os
from dotenv import load_dotenv

load_dotenv()

SQL = """
CREATE TABLE IF NOT EXISTS server_listings (
  id                    uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_type          varchar NOT NULL,
  gpu_model             varchar NOT NULL,
  brand                 varchar,
  stock_type            varchar NOT NULL,
  quantity              integer NOT NULL,
  min_batch_quantity    integer,
  condition             varchar NOT NULL,
  delivery_date         varchar,
  config_requirements   text,
  budget_per_unit       varchar,
  tax_included          boolean DEFAULT true,
  payment_method        varchar,
  other_requirements    text,
  contact_name          varchar NOT NULL,
  contact_info          varchar NOT NULL,
  is_visible            boolean DEFAULT true,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now(),
  user_id               uuid
);

-- RLS
ALTER TABLE server_listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS server_anon_read ON server_listings;
CREATE POLICY server_anon_read ON server_listings
  FOR SELECT USING (is_visible = true);

DROP POLICY IF EXISTS server_user_insert ON server_listings;
CREATE POLICY server_user_insert ON server_listings
  FOR INSERT WITH CHECK (true);
"""

async def main():
    conn = await asyncpg.connect(os.getenv("DATABASE_URL"))
    await conn.execute(SQL)
    await conn.close()
    print("migrate_v11 done: server_listings table created")

asyncio.run(main())
