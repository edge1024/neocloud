"""migrate_v12: align vendor share fields and create GPU model library tables."""
import asyncio
import os

import asyncpg
from dotenv import load_dotenv

load_dotenv()

SQL = """
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS slug varchar(50),
ADD COLUMN IF NOT EXISTS wechat text;

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
    price_valid_until   varchar,
    is_visible          boolean DEFAULT true,
    created_at          timestamptz DEFAULT now(),
    updated_at          timestamptz DEFAULT now(),
    user_id             uuid
);

ALTER TABLE memory_listings
ADD COLUMN IF NOT EXISTS price_valid_until varchar;

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

UPDATE vendors
SET slug = share_token
WHERE slug IS NULL
  AND share_token IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_vendors_slug_unique
ON vendors(slug)
WHERE slug IS NOT NULL;

CREATE TABLE IF NOT EXISTS gpu_brands (
    id         serial       PRIMARY KEY,
    name       varchar(100) NOT NULL UNIQUE,
    logo_url   text,
    sort_order int          NOT NULL DEFAULT 0,
    created_at timestamptz  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gpu_series (
    id         serial       PRIMARY KEY,
    brand_id   int          NOT NULL REFERENCES gpu_brands(id) ON DELETE CASCADE,
    name       varchar(100) NOT NULL,
    sort_order int          NOT NULL DEFAULT 0,
    created_at timestamptz  NOT NULL DEFAULT now(),
    UNIQUE (brand_id, name)
);

CREATE TABLE IF NOT EXISTS gpu_models (
    id           serial       PRIMARY KEY,
    series_id    int          NOT NULL REFERENCES gpu_series(id) ON DELETE CASCADE,
    brand_id     int          NOT NULL REFERENCES gpu_brands(id) ON DELETE CASCADE,
    name         varchar(200) NOT NULL,
    vram_gb      numeric(8, 2),
    tdp_w        int,
    architecture varchar(100),
    sort_order   int          NOT NULL DEFAULT 0,
    is_active    boolean      NOT NULL DEFAULT true,
    created_at   timestamptz  NOT NULL DEFAULT now(),
    updated_at   timestamptz  NOT NULL DEFAULT now(),
    UNIQUE (series_id, name)
);

INSERT INTO gpu_brands (name, sort_order) VALUES
    ('NVIDIA', 10),
    ('华为昇腾', 20),
    ('其他', 99)
ON CONFLICT (name) DO NOTHING;

INSERT INTO gpu_series (brand_id, name, sort_order)
SELECT id, 'H 系列', 10 FROM gpu_brands WHERE name = 'NVIDIA'
ON CONFLICT (brand_id, name) DO NOTHING;
INSERT INTO gpu_series (brand_id, name, sort_order)
SELECT id, 'A 系列', 20 FROM gpu_brands WHERE name = 'NVIDIA'
ON CONFLICT (brand_id, name) DO NOTHING;
INSERT INTO gpu_series (brand_id, name, sort_order)
SELECT id, 'RTX 系列', 30 FROM gpu_brands WHERE name = 'NVIDIA'
ON CONFLICT (brand_id, name) DO NOTHING;
INSERT INTO gpu_series (brand_id, name, sort_order)
SELECT id, 'L 系列', 40 FROM gpu_brands WHERE name = 'NVIDIA'
ON CONFLICT (brand_id, name) DO NOTHING;
INSERT INTO gpu_series (brand_id, name, sort_order)
SELECT id, 'B 系列', 50 FROM gpu_brands WHERE name = 'NVIDIA'
ON CONFLICT (brand_id, name) DO NOTHING;
INSERT INTO gpu_series (brand_id, name, sort_order)
SELECT id, '910 系列', 10 FROM gpu_brands WHERE name = '华为昇腾'
ON CONFLICT (brand_id, name) DO NOTHING;

INSERT INTO gpu_models (series_id, brand_id, name, vram_gb, sort_order)
SELECT s.id, b.id, m.name, m.vram_gb, m.sort_order
FROM gpu_brands b
JOIN gpu_series s ON s.brand_id = b.id
JOIN (VALUES
    ('H 系列', 'H100 SXM5 80GB', 80::numeric, 10),
    ('H 系列', 'H100 PCIe 80GB', 80::numeric, 20),
    ('H 系列', 'H100 NVL 94GB', 94::numeric, 30),
    ('H 系列', 'H200 SXM5 141GB', 141::numeric, 40),
    ('H 系列', 'H800 SXM 80GB', 80::numeric, 50),
    ('H 系列', 'H20 96GB', 96::numeric, 60),
    ('A 系列', 'A100 SXM4 80GB', 80::numeric, 10),
    ('A 系列', 'A100 PCIe 40GB', 40::numeric, 20),
    ('A 系列', 'A800 SXM 80GB', 80::numeric, 30),
    ('RTX 系列', 'RTX 4090 24GB', 24::numeric, 10),
    ('RTX 系列', 'RTX 5090 32GB', 32::numeric, 20),
    ('L 系列', 'L40S 48GB', 48::numeric, 10),
    ('B 系列', 'B100 192GB', 192::numeric, 10),
    ('B 系列', 'B200 192GB', 192::numeric, 20),
    ('B 系列', 'B300 288GB', 288::numeric, 30)
) AS m(series_name, name, vram_gb, sort_order)
ON s.name = m.series_name
WHERE b.name = 'NVIDIA'
ON CONFLICT (series_id, name) DO NOTHING;

INSERT INTO gpu_models (series_id, brand_id, name, vram_gb, sort_order)
SELECT s.id, b.id, m.name, 64::numeric, m.sort_order
FROM gpu_brands b
JOIN gpu_series s ON s.brand_id = b.id AND s.name = '910 系列'
JOIN (VALUES
    ('910B 64GB', 10),
    ('910C 64GB', 20),
    ('910B Pro 64GB', 30)
) AS m(name, sort_order)
ON TRUE
WHERE b.name = '华为昇腾'
ON CONFLICT (series_id, name) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_gpu_series_brand ON gpu_series(brand_id);
CREATE INDEX IF NOT EXISTS idx_gpu_models_series ON gpu_models(series_id);
CREATE INDEX IF NOT EXISTS idx_gpu_models_brand ON gpu_models(brand_id);
CREATE INDEX IF NOT EXISTS idx_gpu_models_active ON gpu_models(is_active);
CREATE INDEX IF NOT EXISTS idx_memory_listings_visible ON memory_listings(is_visible);
CREATE INDEX IF NOT EXISTS idx_memory_listings_user ON memory_listings(user_id);
CREATE INDEX IF NOT EXISTS idx_memory_listings_created ON memory_listings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_server_listings_visible ON server_listings(is_visible);
CREATE INDEX IF NOT EXISTS idx_server_listings_user ON server_listings(user_id);
CREATE INDEX IF NOT EXISTS idx_server_listings_created ON server_listings(created_at DESC);

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_gpu_models ON gpu_models;
CREATE TRIGGER set_updated_at_gpu_models
    BEFORE UPDATE ON gpu_models FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_memory_listings ON memory_listings;
CREATE TRIGGER set_updated_at_memory_listings
    BEFORE UPDATE ON memory_listings FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_server_listings ON server_listings;
CREATE TRIGGER set_updated_at_server_listings
    BEFORE UPDATE ON server_listings FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE memory_listings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS memory_anon_read ON memory_listings;
CREATE POLICY memory_anon_read ON memory_listings
    FOR SELECT USING (is_visible = true);
DROP POLICY IF EXISTS memory_user_insert ON memory_listings;
CREATE POLICY memory_user_insert ON memory_listings
    FOR INSERT WITH CHECK (true);

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
    print("migrate_v12 done: vendor slug/wechat and GPU model library aligned")


asyncio.run(main())
