"""Server酱推送工具"""
import httpx, asyncio

SERVERCHAN_URL = "https://sctapi.ftqq.com/{send_key}.send"

async def push_wechat(send_key: str, title: str, desp: str = "") -> bool:
    """推送一条消息到 Server酱，返回是否成功"""
    url = SERVERCHAN_URL.format(send_key=send_key)
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            r = await client.post(url, data={"title": title, "desp": desp})
            return r.status_code == 200
    except Exception:
        return False

async def push_wechat_batch(send_keys: list[str], title: str, desp: str = ""):
    """并发推送给多个 send_key"""
    if not send_keys:
        return
    await asyncio.gather(*[push_wechat(k, title, desp) for k in send_keys], return_exceptions=True)

def match_subscription(filters: dict, item: dict) -> bool:
    """判断 item 是否匹配订阅条件，filters 为空则全匹配"""
    if not filters:
        return True
    # GPU 关键词（资源/需求）
    gpu_kw = filters.get("gpu", "")
    if gpu_kw:
        gpu_val = str(item.get("gpu") or item.get("gpu_model") or "")
        if gpu_kw.lower() not in gpu_val.lower():
            return False
    # 地区
    region = filters.get("region", "")
    if region:
        item_region = str(item.get("region") or item.get("location") or "")
        if region not in item_region:
            return False
    # 标签（资源的 tags 字段）
    tags = filters.get("tags", [])
    if tags:
        item_tags = item.get("tags") or []
        if not any(t in item_tags for t in tags):
            return False
    return True
