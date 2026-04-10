-- =============================================================================
-- GPU·MARKET 算力租赁平台 — PostgreSQL Schema
-- 版本要求: PostgreSQL 13+
-- =============================================================================

-- 启用扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =============================================================================
-- ENUM 类型定义
-- =============================================================================
CREATE TYPE user_role     AS ENUM ('buyer', 'vendor', 'admin');
CREATE TYPE user_status   AS ENUM ('active', 'suspended', 'pending');
CREATE TYPE vendor_status AS ENUM ('pending', 'active', 'suspended');
CREATE TYPE order_status  AS ENUM ('pending', 'confirmed', 'running', 'completed', 'cancelled', 'refunded');
CREATE TYPE pay_method    AS ENUM ('alipay', 'wechat', 'bank_transfer', 'balance');
CREATE TYPE pay_status    AS ENUM ('pending', 'success', 'failed', 'refunded');

-- =============================================================================
-- 表定义
-- =============================================================================

-- 1. users — 平台用户
CREATE TABLE users (
    id                UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    email             VARCHAR(255) UNIQUE,
    phone             VARCHAR(20)  UNIQUE,
    password_hash     VARCHAR(255) NOT NULL DEFAULT '',
    username          VARCHAR(100) NOT NULL UNIQUE,
    display_name      VARCHAR(100),
    role              user_role    NOT NULL DEFAULT 'buyer',
    status            user_status  NOT NULL DEFAULT 'pending',
    email_verified_at TIMESTAMPTZ,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_users_contact CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

-- 2. vendors — 供应商（user_id 可为空，支持未关联账号的供应商）
CREATE TABLE vendors (
    id            BIGSERIAL      PRIMARY KEY,
    user_id       UUID           REFERENCES users(id) ON DELETE SET NULL,
    company_name  VARCHAR(200)   NOT NULL,
    location      VARCHAR(100),
    contact_name  VARCHAR(100),
    contact_phone VARCHAR(50),
    email         VARCHAR(200),
    share_token   VARCHAR(50)    UNIQUE,
    rating        NUMERIC(2, 1)  NOT NULL DEFAULT 5.0,
    review_count  INT            NOT NULL DEFAULT 0,
    status        vendor_status  NOT NULL DEFAULT 'active',
    joined_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    created_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_vendors_rating CHECK (rating >= 0 AND rating <= 5)
);

-- 3. tags — 资源标签
CREATE TABLE tags (
    id   SERIAL      PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

-- 4. gpu_resources — GPU 算力资源
CREATE TABLE gpu_resources (
    id               BIGSERIAL      PRIMARY KEY,
    vendor_id        BIGINT         NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    gpu_model        VARCHAR(200)   NOT NULL,
    gpu_count        SMALLINT       NOT NULL,
    price_per_hour   NUMERIC(10, 4) NOT NULL,
    memory_size      VARCHAR(50),
    memory_bandwidth VARCHAR(50),
    region           VARCHAR(50)    NOT NULL DEFAULT '国内',    -- 国内 / 海外
    delivery_type    VARCHAR(50)    NOT NULL DEFAULT '裸金属',  -- 裸金属 / 云平台
    description      TEXT,
    is_available     BOOLEAN        NOT NULL DEFAULT TRUE,
    is_visible       BOOLEAN        NOT NULL DEFAULT TRUE,
    available_quantity INTEGER,
    resource_status  VARCHAR(20)    NOT NULL DEFAULT '在线',
    created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_gpu_count      CHECK (gpu_count > 0),
    CONSTRAINT chk_price_positive CHECK (price_per_hour > 0)
);

-- 5. resource_tag_map — 资源 ↔ 标签（多对多）
CREATE TABLE resource_tag_map (
    resource_id BIGINT NOT NULL REFERENCES gpu_resources(id) ON DELETE CASCADE,
    tag_id      INT    NOT NULL REFERENCES tags(id)          ON DELETE CASCADE,
    PRIMARY KEY (resource_id, tag_id)
);

-- 6. demands — 采购需求
CREATE TABLE demands (
    id               BIGSERIAL      PRIMARY KEY,
    -- 基础租赁信息
    gpu              VARCHAR(200)   NOT NULL,
    gpu_brand        VARCHAR(100)   NOT NULL DEFAULT '',
    gpu_other        TEXT           NOT NULL DEFAULT '',
    gpu_count        SMALLINT       NOT NULL,
    count_unit       VARCHAR(10)    NOT NULL DEFAULT '卡',
    dc_location      VARCHAR(200)   NOT NULL DEFAULT '',
    rental_months    SMALLINT       NOT NULL DEFAULT 1,
    -- 交付与合同
    delivery_type    VARCHAR(50)    NOT NULL DEFAULT '裸金属服务器',
    delivery_other   TEXT           NOT NULL DEFAULT '',
    contract_type    VARCHAR(50)    NOT NULL DEFAULT '',
    payment_type     VARCHAR(50)    NOT NULL DEFAULT '',
    payment_other    TEXT           NOT NULL DEFAULT '',
    -- 配置与资源要求
    config_req       TEXT           NOT NULL DEFAULT '',
    storage_req      TEXT           NOT NULL DEFAULT '',
    bandwidth_req    VARCHAR(200)   NOT NULL DEFAULT '',
    public_ip_req    VARCHAR(200)   NOT NULL DEFAULT '',
    need_extra_cpu   BOOLEAN        NOT NULL DEFAULT FALSE,
    extra_cpu_config TEXT           NOT NULL DEFAULT '',
    -- 联系人信息
    contact_name     VARCHAR(100)   NOT NULL DEFAULT '',
    contact_phone    VARCHAR(50)    NOT NULL DEFAULT '',
    company          VARCHAR(200)   NOT NULL DEFAULT '',
    contact_email    VARCHAR(200)   NOT NULL DEFAULT '',
    notes            TEXT           NOT NULL DEFAULT '',
    -- 旧字段（向后兼容）
    budget           NUMERIC(10, 4),
    tags             TEXT[]         NOT NULL DEFAULT '{}',
    region           VARCHAR(50)    NOT NULL DEFAULT '',
    description      TEXT           NOT NULL DEFAULT '',
    contact          VARCHAR(200)   NOT NULL DEFAULT '',
    created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_demand_gpu_count CHECK (gpu_count > 0)
);

-- 7. subscribers — 订阅用户
CREATE TABLE subscribers (
    id         BIGSERIAL    PRIMARY KEY,
    email      VARCHAR(255) NOT NULL UNIQUE,
    topics     TEXT[]       NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 8. orders — 租用订单
CREATE TABLE orders (
    id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    buyer_id        UUID          NOT NULL REFERENCES users(id)         ON DELETE RESTRICT,
    resource_id     BIGINT        NOT NULL REFERENCES gpu_resources(id) ON DELETE RESTRICT,
    vendor_id       BIGINT        NOT NULL REFERENCES vendors(id)       ON DELETE RESTRICT,
    gpu_count       SMALLINT      NOT NULL,
    price_per_hour  NUMERIC(10,4) NOT NULL,
    started_at      TIMESTAMPTZ,
    ended_at        TIMESTAMPTZ,
    actual_ended_at TIMESTAMPTZ,
    total_hours     NUMERIC(10, 4),
    total_amount    NUMERIC(12, 4),
    status          order_status  NOT NULL DEFAULT 'pending',
    notes           TEXT,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_order_time CHECK (ended_at IS NULL OR ended_at > started_at)
);

-- 9. payments — 支付记录
CREATE TABLE payments (
    id             UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id       UUID          NOT NULL UNIQUE REFERENCES orders(id) ON DELETE RESTRICT,
    amount         NUMERIC(12,4) NOT NULL,
    currency       CHAR(3)       NOT NULL DEFAULT 'CNY',
    payment_method pay_method,
    transaction_id VARCHAR(200)  UNIQUE,
    status         pay_status    NOT NULL DEFAULT 'pending',
    paid_at        TIMESTAMPTZ,
    refunded_at    TIMESTAMPTZ,
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_payment_amount CHECK (amount > 0)
);

-- =============================================================================
-- 索引
-- =============================================================================
CREATE INDEX idx_vendors_status      ON vendors(status);
CREATE INDEX idx_vendors_rating      ON vendors(rating DESC);

CREATE INDEX idx_resources_vendor    ON gpu_resources(vendor_id);
CREATE INDEX idx_resources_region    ON gpu_resources(region);
CREATE INDEX idx_resources_available ON gpu_resources(is_available);
CREATE INDEX idx_resources_price     ON gpu_resources(price_per_hour);
CREATE INDEX idx_resources_model_trgm ON gpu_resources USING GIN (gpu_model gin_trgm_ops);

CREATE INDEX idx_resource_tag_tag    ON resource_tag_map(tag_id);

CREATE INDEX idx_demands_created     ON demands(created_at DESC);
CREATE INDEX idx_subscribers_email   ON subscribers(email);

CREATE INDEX idx_orders_buyer        ON orders(buyer_id);
CREATE INDEX idx_orders_vendor       ON orders(vendor_id);
CREATE INDEX idx_orders_status       ON orders(status);

-- =============================================================================
-- 自动更新 updated_at
-- =============================================================================
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_vendors
    BEFORE UPDATE ON vendors FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at_gpu_resources
    BEFORE UPDATE ON gpu_resources FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at_orders
    BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at_payments
    BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- =============================================================================
-- 种子数据
-- =============================================================================

-- 标签
INSERT INTO tags (name) VALUES
    ('训练'),('推理'),('大模型'),('NVLink'),('渲染'),
    ('微调'),('入门'),('多模态'),('大内存');

-- 供应商（强制 ID 以匹配原型数据）
INSERT INTO vendors (id, company_name, location, rating, review_count, status, joined_at) OVERRIDING SYSTEM VALUE VALUES
    (1, '算力云 CloudPower',    '北京', 4.9, 312, 'active', '2022-03-01'),
    (2, '极速算力 TurboGPU',    '上海', 4.7, 189, 'active', '2021-11-01'),
    (3, '深算科技 DeepCompute', '深圳', 4.5,  76, 'active', '2023-06-01'),
    (4, '星辰算力 StarAI',      '杭州', 4.8, 254, 'active', '2022-08-01'),
    (5, '极光算力 AuroraAI',    '成都', 4.6, 143, 'active', '2023-01-01'),
    (6, '鲸算科技 WhaleCompute','广州', 4.8, 201, 'active', '2022-05-01'),
    (7, '腾云算力 TenCloud',    '武汉', 4.4,  58, 'active', '2024-02-01');
SELECT setval('vendors_id_seq', (SELECT MAX(id) FROM vendors));

-- GPU 资源
INSERT INTO gpu_resources
    (id, vendor_id, gpu_model, gpu_count, price_per_hour,
     memory_size, memory_bandwidth, region, delivery_type, description, is_available)
OVERRIDING SYSTEM VALUE VALUES
    ( 1, 1, 'NVIDIA H100 80G SXM5',  8, 28.0, '80GB HBM3',   '900GB/s', '国内', '裸金属', '8卡互联，NVSwitch全互联，适合大模型训练', TRUE),
    ( 2, 1, 'NVIDIA A100 40G PCIe',  4, 12.0, '40GB HBM2e',  '400GB/s', '国内', '裸金属', '高性价比A100，适合中等规模训练任务',    TRUE),
    ( 3, 2, 'NVIDIA H800 80G SXM',   8, 22.0, '80GB HBM3',   '800GB/s', '国内', '裸金属', '国内合规H800，8卡集群，稳定高效',        TRUE),
    ( 4, 2, 'NVIDIA RTX 4090 24G',  16,  4.5, '24GB GDDR6X', '192GB/s', '国内', '云平台', '消费级旗舰，适合推理部署和模型微调',      TRUE),
    ( 5, 3, 'NVIDIA A800 80G SXM',   4, 18.0, '80GB HBM2e',  '800GB/s', '国内', '裸金属', '国内定制A800，目前暂时售罄，可预约',      FALSE),
    ( 6, 4, 'NVIDIA L40S 48G',       8,  9.0, '48GB GDDR6',  '864GB/s', '国内', '裸金属', 'Ada Lovelace架构，适合视频、多模态推理',  TRUE),
    ( 7, 5, 'NVIDIA H100 80G SXM5',  4, 26.0, '80GB HBM3',   '900GB/s', '国内', '裸金属', '成都节点，低延迟接入，适合西南地区用户',  TRUE),
    ( 8, 6, 'NVIDIA H100 80G SXM5', 16, 30.0, '80GB HBM3',   '900GB/s', '海外', '裸金属', '新加坡节点，16卡超大集群，支持跨境业务',  TRUE),
    ( 9, 3, 'NVIDIA RTX 4090 24G',   8,  4.2, '24GB GDDR6X', '192GB/s', '国内', '云平台', '低价4090，适合小批量推理和轻量微调',      TRUE),
    (10, 5, 'NVIDIA A100 40G PCIe',  8, 11.0, '40GB HBM2e',  '400GB/s', '国内', '裸金属', '性价比首选，西南区域资源充足',            TRUE),
    (11, 6, 'NVIDIA H800 80G SXM',   4, 20.0, '80GB HBM3',   '800GB/s', '海外', '云平台', '香港节点H800，低延迟出海，合规稳定',      TRUE),
    (12, 7, 'NVIDIA A800 80G SXM',   8, 17.0, '80GB HBM2e',  '800GB/s', '国内', '裸金属', '华中区域A800，现货充足，可长期租用',      TRUE),
    (13, 4, 'NVIDIA RTX 4090 24G',  32,  4.8, '24GB GDDR6X', '192GB/s', '国内', '云平台', '32卡大规模推理集群，支持按小时弹性计费',  TRUE),
    (14, 7, 'NVIDIA L40S 48G',       4,  8.5, '48GB GDDR6',  '864GB/s', '国内', '裸金属', '华中L40S，适合多模态模型部署',            TRUE);
SELECT setval('gpu_resources_id_seq', (SELECT MAX(id) FROM gpu_resources));

-- 资源-标签关联
INSERT INTO resource_tag_map (resource_id, tag_id) SELECT  1, id FROM tags WHERE name IN ('训练','推理','NVLink');
INSERT INTO resource_tag_map (resource_id, tag_id) SELECT  2, id FROM tags WHERE name IN ('训练','推理');
INSERT INTO resource_tag_map (resource_id, tag_id) SELECT  3, id FROM tags WHERE name IN ('训练','大模型');
INSERT INTO resource_tag_map (resource_id, tag_id) SELECT  4, id FROM tags WHERE name IN ('推理','微调','渲染');
INSERT INTO resource_tag_map (resource_id, tag_id) SELECT  5, id FROM tags WHERE name IN ('训练','大模型');
INSERT INTO resource_tag_map (resource_id, tag_id) SELECT  6, id FROM tags WHERE name IN ('推理','多模态','渲染');
INSERT INTO resource_tag_map (resource_id, tag_id) SELECT  7, id FROM tags WHERE name IN ('训练','大模型','NVLink');
INSERT INTO resource_tag_map (resource_id, tag_id) SELECT  8, id FROM tags WHERE name IN ('训练','推理','NVLink');
INSERT INTO resource_tag_map (resource_id, tag_id) SELECT  9, id FROM tags WHERE name IN ('推理','微调');
INSERT INTO resource_tag_map (resource_id, tag_id) SELECT 10, id FROM tags WHERE name IN ('训练','推理');
INSERT INTO resource_tag_map (resource_id, tag_id) SELECT 11, id FROM tags WHERE name IN ('训练','大模型');
INSERT INTO resource_tag_map (resource_id, tag_id) SELECT 12, id FROM tags WHERE name IN ('训练','大模型');
INSERT INTO resource_tag_map (resource_id, tag_id) SELECT 13, id FROM tags WHERE name IN ('推理','渲染','大内存');
INSERT INTO resource_tag_map (resource_id, tag_id) SELECT 14, id FROM tags WHERE name IN ('推理','多模态');

-- 需求示例
INSERT INTO demands (gpu, gpu_count, budget, tags, region, delivery_type, description, contact, created_at) VALUES
    ('NVIDIA H100 80G SXM5',  8, 25, '{"训练","大模型"}', '国内', '裸金属', '用于 LLM 预训练，需连续租用 30 天，要求 NVLink 互联', 'zha**@example.com', '2026-03-12'),
    ('NVIDIA A100 40G PCIe',  4, 10, '{"推理","微调"}',   '国内', '云平台', '模型推理服务，弹性计费，按小时结算，随时可终止',       'li***@startup.ai',  '2026-03-13'),
    ('NVIDIA H800 80G SXM',  16, 20, '{"训练","大模型"}', '海外', '裸金属', '跨境业务，需新加坡或香港节点，合规要求较高',           'wang*@corp.com',    '2026-03-13'),
    ('NVIDIA RTX 4090 24G',  32,  4, '{"推理","渲染"}',   '国内', '云平台', '视频渲染集群，高并发，需稳定 QoS 保障',               'che**@media.cn',    '2026-03-14'),
    ('NVIDIA L40S 48G',       8,  8, '{"推理","多模态"}', '国内', '裸金属', '多模态模型部署，长期租用优先，需配套存储资源',         'xio**@ailab.cn',    '2026-03-14');

-- 10. related_links — 相关链接
CREATE TABLE related_links (
    id         SERIAL       PRIMARY KEY,
    title      VARCHAR(100) NOT NULL,
    url        VARCHAR(500) NOT NULL,
    sort_order INT          NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 订阅用户示例
INSERT INTO subscribers (email, topics) VALUES
    ('ai**@openai.com',   '{"resources","demands"}'),
    ('dev**@baidu.com',   '{"resources"}'),
    ('res**@zhipu.ai',    '{"demands"}'),
    ('ml***@tencent.com', '{"resources","demands"}'),
    ('data*@alibaba.com', '{"resources"}');

-- =============================================================================
-- Migration: 为现有 demands 表添加新字段（对已部署数据库执行）
-- =============================================================================
ALTER TABLE demands
    ADD COLUMN IF NOT EXISTS gpu_other        TEXT           NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS count_unit       VARCHAR(10)    NOT NULL DEFAULT '卡',
    ADD COLUMN IF NOT EXISTS dc_location      VARCHAR(200)   NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS rental_months    SMALLINT       NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS delivery_other   TEXT           NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS contract_type    VARCHAR(50)    NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS payment_type     VARCHAR(50)    NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS payment_other    TEXT           NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS config_req       TEXT           NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS storage_req      TEXT           NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS bandwidth_req    VARCHAR(200)   NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS public_ip_req    VARCHAR(200)   NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS need_extra_cpu   BOOLEAN        NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS extra_cpu_config TEXT           NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS contact_name     VARCHAR(100)   NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS contact_phone    VARCHAR(50)    NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS company          VARCHAR(200)   NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS contact_email    VARCHAR(200)   NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS notes            TEXT           NOT NULL DEFAULT '';


-- =============================================================================
-- 文档模块 (docs + doc_comments)
-- =============================================================================

CREATE TABLE IF NOT EXISTS docs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  category    VARCHAR(50) NOT NULL,        -- 'roadmap' | 'guide'
  title       VARCHAR(255) NOT NULL,
  content     TEXT,                        -- Markdown
  sort_order  INT         NOT NULL DEFAULT 0,
  is_published BOOLEAN    NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS doc_comments (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_id     UUID        NOT NULL REFERENCES docs(id) ON DELETE CASCADE,
  user_id    UUID        REFERENCES users(id) ON DELETE SET NULL,
  nickname   VARCHAR(100),
  content    TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 初始数据 ──────────────────────────────────────────────────────────────────
INSERT INTO docs (category, title, content, sort_order) VALUES
('roadmap', '开发计划与历史版本',
'## 已完成
- 供应商注册与分享链接
- 资源发布与管理
- 需求发布与管理
- 资源/需求列表展示
- 移动端适配

## 进行中
- 文档模块
- 用户需求管理后台

## 计划中
- 消息通知功能
- 供应商评级系统
- 资源对比功能', 0),

('guide', '网站使用说明',
'## 访客
- 浏览资源列表，查看各供应商 GPU 资源
- 浏览需求列表，查看采购需求
- 查看供应商联系方式，直接联系洽谈

## 注册用户
- 注册登录后可发布资源和需求
- 在用户后台管理自己发布的资源和需求
- 需求支持在线/完成/放弃状态管理

## 供应商分享
- 在用户后台生成专属分享链接
- 分享给客户后，客户无需登录即可查看所有对外可见资源', 0)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- Migration: gpu_resources 补充字段
-- =============================================================================
ALTER TABLE gpu_resources
    ADD COLUMN IF NOT EXISTS billing_unit     VARCHAR(20)  NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS contact_name     VARCHAR(100),
    ADD COLUMN IF NOT EXISTS dc_location      VARCHAR(200) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS config_req       TEXT         NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS storage_req      TEXT         NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS bandwidth_req    VARCHAR(200) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS public_ip_req    VARCHAR(200) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS need_extra_cpu   BOOLEAN      NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS extra_cpu_config TEXT         NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS count_unit       VARCHAR(10)  NOT NULL DEFAULT '卡';
