"""migrate_v6: 创建 memory_listings 表"""
import asyncio, asyncpg, os
from dotenv import load_dotenv

load_dotenv()

SQL = """
CREATE TABLE IF NOT EXISTS memory_listings (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title               varchar NOT NULL,
  listing_type        varchar NOT NULL,
  brand               varchar NOT NULL,
  generation          varchar NOT NULL,
  capacity_per_stick  varchar NOT NULL,
  quantity            integer NOT NULL,
  frequency           varchar NOT NULL,
  condition           varchar NOT NULL,
  warranty            varchar,
  description         text,
  price_per_stick     numeric,
  tax_included        varchar,
  invoice_one_to_one  boolean DEFAULT true,
  payment_method      varchar,
  shipping_method     varchar,
  location            varchar NOT NULL,
  contact_name        varchar NOT NULL,
  contact_info        varchar NOT NULL,
  is_visible          boolean DEFAULT true,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now(),
  user_id             uuid
);

-- RLS
ALTER TABLE memory_listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS memory_anon_read ON memory_listings;
CREATE POLICY memory_anon_read ON memory_listings
  FOR SELECT USING (is_visible = true);

DROP POLICY IF EXISTS memory_user_insert ON memory_listings;
CREATE POLICY memory_user_insert ON memory_listings
  FOR INSERT WITH CHECK (true);
"""

async def main():
    conn = await asyncpg.connect(os.getenv("DATABASE_URL"))
    await conn.execute(SQL)
    await conn.close()
    print("migrate_v6 done: memory_listings table created")

asyncio.run(main())
