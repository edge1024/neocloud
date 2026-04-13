import { useState, useMemo, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import QRCode from "qrcode";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";


const TAG_COLORS = {
  "训练": "#2563eb", "推理": "#3b82f6", "大模型": "#1d4ed8",
  "NVLink": "#64748b", "渲染": "#64748b", "微调": "#3b82f6",
  "入门": "#94a3b8", "多模态": "#475569", "大内存": "#64748b",
};
const ALL_TAGS = ["训练", "推理", "大模型", "NVLink", "渲染", "微调", "入门", "多模态", "大内存"];

const GPU_MODELS = {
  "NVIDIA": [
    "H100 SXM5 80GB","H100 PCIe 80GB","H100 NVL 94GB",
    "H200 SXM5 141GB","H800 SXM 80GB","H20 96GB",
    "B100 192GB","B200 192GB","B300 288GB",
    "A100 SXM4 80GB","A100 PCIe 40GB","A800 SXM 80GB",
    "L40S 48GB","RTX 4090 24GB","RTX 5090 32GB",
  ],
  "华为昇腾": ["910B 64GB","910C 64GB","910B Pro 64GB"],
  "其他": [],
};
const GPU_BRAND_BY_MODEL = (() => {
  const m = {};
  Object.entries(GPU_MODELS).forEach(([brand, models]) => { models.forEach(model => { if(model) m[model] = brand; }); });
  return m;
})();
const getGpuBrand = gpu =>
  GPU_BRAND_BY_MODEL[gpu] ||
  (Object.keys(GPU_MODELS).find(brand => GPU_MODELS[brand].some(m => m && gpu.startsWith(m.split(" ")[0]))) || "—");

const VRAM_MAP = {
  "H100 SXM5 80GB":"80GB","H100 PCIe 80GB":"80GB","H100 NVL 94GB":"94GB",
  "H200 SXM5 141GB":"141GB","H800 SXM 80GB":"80GB","H20 96GB":"96GB",
  "B100 192GB":"192GB","B200 192GB":"192GB","B300 288GB":"288GB",
  "A100 SXM4 80GB":"80GB","A100 PCIe 40GB":"40GB","A800 SXM 80GB":"80GB",
  "L40S 48GB":"48GB","RTX 4090 24GB":"24GB",
  "910B 64GB":"64GB","910C 64GB":"64GB","910B Pro 64GB":"64GB",
};


// ─── Shared Styles ───────────────────────────────────────────────────────────
const inp = { width:"100%", boxSizing:"border-box", background:"#ffffff", border:"1px solid #e2e8f0", borderRadius:10, padding:"11px 14px", color:"#0f172a", fontSize:14, outline:"none", marginBottom:12 };
const primaryBtn = { padding:"11px 0", border:"none", borderRadius:10, fontWeight:600, fontSize:14, cursor:"pointer", background:"#2563eb", color:"#fff" };
const ghostBtn = { padding:"11px 0", border:"1px solid #d1d5db", borderRadius:10, fontWeight:600, fontSize:14, cursor:"pointer", background:"#ffffff", color:"#374151" };

// ─── Sub-components ──────────────────────────────────────────────────────────
function Tag({ t }) {
  const c = TAG_COLORS[t] || "#64748b";
  return <span style={{ fontSize:11, padding:"3px 9px", borderRadius:20, background:`${c}14`, color:c, border:`1px solid ${c}30` }}>{t}</span>;
}

function Avatar({ text, size=40 }) {
  return <div style={{ width:size, height:size, borderRadius:Math.round(size*0.3), background:"linear-gradient(135deg,#1d4ed8,#2563eb)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*0.36, fontWeight:700, color:"#fff", fontFamily:"'Bebas Neue',cursive", letterSpacing:1, flexShrink:0 }}>{text}</div>;
}

function Modal({ onClose, children, width=480 }) {
  return (
    <div style={{position:"fixed",inset:0,zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(15,23,42,0.55)",backdropFilter:"blur(6px)"}} onMouseDown={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={{background:"#ffffff",border:"1px solid #e2e8f0",borderRadius:20,padding:36,width:`min(${width}px,94vw)`,maxHeight:"90vh",overflowY:"auto",color:"#0f172a",boxShadow:"0 20px 60px rgba(0,0,0,0.12)"}}>
        {children}
      </div>
    </div>
  );
}

// ─── Contact Modal ────────────────────────────────────────────────────────────
function ContactModal({ vendor, onClose }) {
  const [sent, setSent] = useState(false);
  return (
    <Modal onClose={onClose}>
      {!sent ? <>
        <div style={{fontSize:20,fontWeight:700,marginBottom:4,fontFamily:"'Noto Serif SC',serif",color:"#0f172a"}}>联系商家</div>
        <div style={{fontSize:13,color:"#64748b",marginBottom:20}}>{vendor.name}</div>
        <input placeholder="您的姓名 / 公司名称" style={inp} />
        <input placeholder="联系方式（电话 / 微信 / 邮箱）" style={inp} />
        <textarea placeholder="描述需求：GPU型号、数量、用途、时长..." rows={3} style={{...inp,resize:"vertical",marginBottom:20}} />
        <div style={{display:"flex",gap:10}}>
          <button onClick={onClose} style={{...ghostBtn,flex:1}}>取消</button>
          <button onClick={()=>setSent(true)} style={{...primaryBtn,flex:2}}>发送询价</button>
        </div>
      </> : <div style={{textAlign:"center",padding:"24px 0"}}>
        <div style={{fontSize:44,marginBottom:12}}>✅</div>
        <div style={{fontSize:18,fontWeight:700,marginBottom:6,color:"#0f172a"}}>已发送！</div>
        <div style={{fontSize:13,color:"#64748b",marginBottom:24}}>商家将在 24 小时内联系您</div>
        <button onClick={onClose} style={{...primaryBtn,padding:"10px 32px"}}>完成</button>
      </div>}
    </Modal>
  );
}

// ─── Vendor Detail Modal ──────────────────────────────────────────────────────
function VendorModal({ vendor, resources, onClose, onContact }) {
  return (
    <Modal onClose={onClose} width={620}>
      <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:24}}>
        <Avatar text={vendor.name.slice(0,2)} size={52} />
        <div style={{flex:1}}>
          <div style={{fontSize:18,fontWeight:700,fontFamily:"'Noto Serif SC',serif",color:"#0f172a"}}>{vendor.name}</div>
          <div style={{fontSize:12,color:"#64748b",marginTop:3}}>{vendor.location} · 入驻 {vendor.joined} · ⭐ {vendor.rating}（{vendor.reviews} 评价）</div>
        </div>
        <button onClick={onClose} style={{background:"none",border:"none",color:"#94a3b8",fontSize:20,cursor:"pointer"}}>✕</button>
      </div>
      <div style={{fontSize:12,color:"#64748b",marginBottom:14}}>共 {resources.length} 个资源</div>
      {resources.length === 0 && <div style={{textAlign:"center",padding:"32px 0",color:"#94a3b8",fontSize:13}}>该供应商暂未发布资源</div>}
      {resources.map(r => (
        <div key={r.id} style={{background:"#f8fafc",borderRadius:12,padding:14,marginBottom:10,border:"1px solid #e2e8f0"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
            <span style={{fontWeight:600,fontSize:14,color:r.available?"#0f172a":"#94a3b8"}}>{r.gpu}</span>
            <span style={{color:"#2563eb",fontWeight:700}}>¥{r.price}<span style={{fontSize:11,fontWeight:400,color:"#64748b"}}>/卡/时</span></span>
          </div>
          <div style={{fontSize:12,color:"#64748b",marginBottom:8}}>{r.mem} · {r.bandwidth||"—"} · {r.count}卡 · {r.region}</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
            {r.tags.map(t=><Tag key={t} t={t} />)}
            <span style={{marginLeft:"auto",fontSize:11,color:r.available?"#2563eb":"#94a3b8"}}>{r.available?"● 可用":"● 售罄"}</span>
          </div>
        </div>
      ))}
      <button onClick={()=>{onClose();onContact(vendor);}} style={{...primaryBtn,width:"100%",marginTop:8}}>📩 联系商家</button>
    </Modal>
  );
}

// ─── Auth Modal（登录 / 供应商注册）──────────────────────────────────────────
function AuthModal({ defaultTab="login", onClose, onSuccess }) {
  const [tab, setTab] = useState(defaultTab);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [login, setLogin] = useState({ email:"", password:"" });
  const [reg, setReg] = useState({ email:"", password:"", confirm:"", company_name:"", location:"北京", contact_name:"", phone:"" });
  const setL = k => e => setLogin(f=>({...f,[k]:e.target.value}));
  const setR = k => e => setReg(f=>({...f,[k]:e.target.value}));
  const lbl = { display:"block", fontSize:12, color:"#64748b", marginBottom:5 };

  const handleLogin = async () => {
    setErr(""); setLoading(true);
    try {
      const r = await fetch(`${API}/auth/login`,{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(login) });
      const d = await r.json();
      if (!r.ok) { setErr(d.detail||"登录失败"); return; }
      onSuccess(d.vendor || null, d.token, d.role);
    } catch { setErr("网络错误，请稍后重试"); } finally { setLoading(false); }
  };

  const handleRegister = async () => {
    setErr("");
    if (reg.password !== reg.confirm) { setErr("两次密码不一致"); return; }
    if (reg.password.length < 6) { setErr("密码至少 6 位"); return; }
    setLoading(true);
    try {
      const r = await fetch(`${API}/auth/register`,{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(reg) });
      const d = await r.json();
      if (!r.ok) { setErr(d.detail||"注册失败"); return; }
      onSuccess(d.vendor, d.token);
    } catch { setErr("网络错误，请稍后重试"); } finally { setLoading(false); }
  };

  return (
    <Modal onClose={onClose} width={460}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
        <div style={{display:"flex",gap:0,background:"#f1f5f9",borderRadius:10,padding:3}}>
          {[["login","登录"],["register","注册"]].map(([k,l])=>(
            <button key={k} onClick={()=>{setTab(k);setErr("");}} style={{padding:"7px 18px",borderRadius:8,border:"none",fontSize:13,fontWeight:600,cursor:"pointer",background:tab===k?"#ffffff":"transparent",color:tab===k?"#0f172a":"#64748b",boxShadow:tab===k?"0 1px 3px rgba(0,0,0,0.08)":"none"}}>{l}</button>
          ))}
        </div>
        <button onClick={onClose} style={{background:"none",border:"none",color:"#94a3b8",fontSize:20,cursor:"pointer"}}>✕</button>
      </div>

      {tab==="login" ? <>
        <label style={lbl}>邮箱 / 手机号</label>
        <input value={login.email} onChange={setL("email")} placeholder="请输入邮箱或手机号" style={inp} />
        <label style={lbl}>密码</label>
        <input value={login.password} onChange={setL("password")} type="password" placeholder="请输入密码" style={{...inp,marginBottom:20}} />
        {err && <div style={{fontSize:12,color:"#ef4444",marginBottom:12}}>{err}</div>}
        <button onClick={handleLogin} disabled={loading} style={{...primaryBtn,width:"100%",opacity:loading?0.6:1}}>
          {loading?"登录中...":"登录"}
        </button>
        <div style={{textAlign:"center",marginTop:14,fontSize:12,color:"#64748b"}}>
          还没有账号？<span onClick={()=>{setTab("register");setErr("");}} style={{color:"#2563eb",cursor:"pointer",fontWeight:600}}>注册 →</span>
        </div>
      </> : <>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 14px"}}>
          <div style={{gridColumn:"span 2"}}><label style={lbl}>公司名称 *</label><input value={reg.company_name} onChange={setR("company_name")} placeholder="例：极光算力 AuroraAI" style={inp} /></div>
          <div><label style={lbl}>联系人姓名</label><input value={reg.contact_name} onChange={setR("contact_name")} placeholder="您的姓名" style={inp} /></div>
          <div><label style={lbl}>所在城市 *</label>
            <select value={reg.location} onChange={setR("location")} style={inp}>
              {["北京","上海","深圳","杭州","广州","成都","武汉","西安","南京","其他"].map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
          <div style={{gridColumn:"span 2"}}><label style={lbl}>邮箱 *</label><input value={reg.email} onChange={setR("email")} placeholder="作为登录账号" style={inp} /></div>
          <div><label style={lbl}>密码 *</label><input value={reg.password} onChange={setR("password")} type="password" placeholder="至少 6 位" style={inp} /></div>
          <div><label style={lbl}>确认密码 *</label><input value={reg.confirm} onChange={setR("confirm")} type="password" placeholder="再次输入密码" style={inp} /></div>
          <div style={{gridColumn:"span 2"}}><label style={lbl}>手机号</label><input value={reg.phone} onChange={setR("phone")} placeholder="选填" style={inp} /></div>
        </div>
        {err && <div style={{fontSize:12,color:"#ef4444",marginBottom:12}}>{err}</div>}
        <button onClick={handleRegister} disabled={loading||!reg.email||!reg.password||!reg.company_name} style={{...primaryBtn,width:"100%",opacity:(loading||!reg.email||!reg.password||!reg.company_name)?0.4:1}}>
          {loading?"提交中...":"立即入驻"}
        </button>
        <div style={{textAlign:"center",marginTop:14,fontSize:12,color:"#64748b"}}>
          已有账号？<span onClick={()=>{setTab("login");setErr("");}} style={{color:"#2563eb",cursor:"pointer",fontWeight:600}}>登录 →</span>
        </div>
      </>}
    </Modal>
  );
}

// ─── Register Modal ───────────────────────────────────────────────────────────
function RegisterModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({ name:"", contact:"", phone:"", location:"北京" });
  const set = k => e => setForm(f=>({...f,[k]:e.target.value}));
  const valid = form.name.trim() && form.contact.trim() && form.phone.trim();

  const handle = () => {
    if (!valid) return;
    const now = new Date();
    onSuccess({
      id: Date.now(), name: form.name, avatar: form.name.slice(0,2),
      rating: 5.0, reviews: 0, location: form.location,
      joined: `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`,
    });
  };

  return (
    <Modal onClose={onClose}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24}}>
        <div>
          <div style={{fontFamily:"'Noto Serif SC',serif",fontSize:22,fontWeight:700,color:"#0f172a"}}>注册</div>
          <div style={{fontSize:13,color:"#64748b",marginTop:6}}>填写信息后立即进入后台，开始发布资源</div>
        </div>
        <button onClick={onClose} style={{background:"none",border:"none",color:"#94a3b8",fontSize:20,cursor:"pointer",flexShrink:0}}>✕</button>
      </div>
      <label style={{display:"block",fontSize:12,color:"#64748b",marginBottom:6}}>商家名称 *</label>
      <input value={form.name} onChange={set("name")} placeholder="例：极光算力 AuroraAI" style={inp} />
      <label style={{display:"block",fontSize:12,color:"#64748b",marginBottom:6}}>联系人姓名 *</label>
      <input value={form.contact} onChange={set("contact")} placeholder="您的姓名" style={inp} />
      <label style={{display:"block",fontSize:12,color:"#64748b",marginBottom:6}}>手机号码 *</label>
      <input value={form.phone} onChange={set("phone")} placeholder="用于接收用户询价消息" style={inp} />
      <label style={{display:"block",fontSize:12,color:"#64748b",marginBottom:6}}>所在城市</label>
      <select value={form.location} onChange={set("location")} style={{...inp,marginBottom:28}}>
        {["北京","上海","深圳","杭州","广州","成都","武汉"].map(c=><option key={c}>{c}</option>)}
      </select>
      <button onClick={handle} disabled={!valid} style={{...primaryBtn,width:"100%",opacity:valid?1:0.4,cursor:valid?"pointer":"default"}}>
        立即入驻，进入后台 →
      </button>
    </Modal>
  );
}

// ─── Publish Resource Modal ───────────────────────────────────────────────────
function PublishModal({ vendor, onClose, onPublish }) {
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const empty = {
    brand:"", gpuModel:"", vram:"",
    delivery:"裸金属", count:"", billingUnit:"台/月", countUnit:"台",
    price:"", currency:"人民币",
    region:"国内", dcLocation:"",
    contract:"", paymentTerms:"",
    status:"可售", onlineTime:"",
    config:"", company:"", contactName:"", contact:"",
    storageReq:"", bandwidthReq:"", publicIpReq:"",
  };
  const [form, setForm] = useState(empty);
  const [gpuBrands, setGpuBrands] = useState([]);
  const [gpuSeriesList, setGpuSeriesList] = useState([]);
  const [gpuModelsList, setGpuModelsList] = useState([]);
  const [selBrandId, setSelBrandId] = useState(null);
  const [selSeriesId, setSelSeriesId] = useState(null);
  useEffect(()=>{
    fetch(`${API}/api/gpu-brands`).then(r=>r.json()).then(setGpuBrands).catch(()=>{});
  },[]);
  const set = k => e => setForm(f=>({...f,[k]:e.target.value}));

  const handleBrand = (brandId, brandName) => {
    setSelBrandId(brandId); setSelSeriesId(null); setGpuSeriesList([]); setGpuModelsList([]);
    setForm(f=>({...f, brand:brandName, gpuModel:"", vram:""}));
    fetch(`${API}/api/gpu-series?brand_id=${brandId}`).then(r=>r.json()).then(setGpuSeriesList).catch(()=>{});
  };
  const handleSeriesChange = (seriesId) => {
    setSelSeriesId(seriesId); setGpuModelsList([]);
    setForm(f=>({...f, gpuModel:"", vram:""}));
    fetch(`${API}/api/gpu-models?series_id=${seriesId}`).then(r=>r.json()).then(setGpuModelsList).catch(()=>{});
  };
  const handleModel = (modelId) => {
    const m = gpuModelsList.find(x=>x.id===modelId);
    if(m) setForm(f=>({...f, gpuModel:m.name, vram: m.vram_gb ? `${m.vram_gb}GB` : f.vram}));
  };

  const required = [form.brand, form.gpuModel, form.vram, form.delivery, form.count,
    form.billingUnit, form.price, form.currency, form.region, form.dcLocation,
    form.contract, form.paymentTerms, form.status, form.config, form.contact];
  const valid = required.every(v=>String(v).trim()!=="") && Number(form.count)>0 && Number(form.price)>0;

  const handle = async () => {
    if (!valid || saving) return;
    setSaving(true); setErr("");
    const gpuLabel = `${form.brand} ${form.gpuModel}`;
    const body = {
      vendorId: vendor.id,
      gpu: gpuLabel, mem: form.vram, bandwidth: "",
      count: Number(form.count), price: Number(form.price),
      delivery: form.delivery, region: form.region,
      available: form.status === "可售", tags: [], desc: form.config,
      billing_unit: form.billingUnit,
      contact_name: form.contactName || null,
      count_unit: form.countUnit || "卡",
      currency: form.currency || "人民币",
      dc_location: form.dcLocation || "",
      storage_req: form.storageReq || "",
      bandwidth_req: form.bandwidthReq || "",
      public_ip_req: form.publicIpReq || "",
      need_extra_cpu: false,
      extra_cpu_config: "",
    };
    try {
      const res = await fetch(`${API}/api/resources`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      const saved = await res.json();
      onPublish(saved);
      onClose();
    } catch(e) {
      setErr("发布失败：" + e.message);
      setSaving(false);
    }
  };

  const sl = { fontSize:11, fontWeight:700, color:"#2563eb", letterSpacing:1, marginBottom:12, marginTop:20, paddingBottom:8, borderBottom:"1px solid #e2e8f0" };
  const lbl = { display:"block", fontSize:12, color:"#64748b", marginBottom:5 };
  const row2 = { display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 14px" };

  return (
    <Modal onClose={onClose} width={680}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
        <div>
          <div style={{fontFamily:"'Noto Serif SC',serif",fontSize:20,fontWeight:700,color:"#0f172a"}}>发布资源</div>
          <div style={{fontSize:12,color:"#64748b",marginTop:4}}>* 为必填项</div>
        </div>
        <button onClick={onClose} style={{background:"none",border:"none",color:"#94a3b8",fontSize:20,cursor:"pointer"}}>✕</button>
      </div>

      {/* GPU 信息 */}
      <div style={sl}>GPU 信息</div>
      <div style={row2}>
        <div>
          <label style={lbl}>品牌 *</label>
          <select value={selBrandId||""} onChange={e=>{const b=gpuBrands.find(x=>x.id===parseInt(e.target.value));if(b)handleBrand(b.id,b.name);}} style={inp}>
            <option value="">请选择品牌</option>
            {gpuBrands.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>GPU 系列 *</label>
          <select value={selSeriesId||""} onChange={e=>handleSeriesChange(parseInt(e.target.value))} disabled={!selBrandId} style={inp}>
            <option value="">请选择系列</option>
            {gpuSeriesList.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>
      <div style={row2}>
        <div>
          <label style={lbl}>GPU 型号 *</label>
          <select value={gpuModelsList.find(m=>m.name===form.gpuModel)?.id||""} onChange={e=>handleModel(parseInt(e.target.value))} disabled={!selSeriesId} style={inp}>
            <option value="">请选择型号</option>
            {gpuModelsList.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>显存 *</label>
          <input value={form.vram} onChange={set("vram")} placeholder="自动填充或手动输入，如 80GB" style={inp} />
        </div>
      </div>
      <div>
        <label style={lbl}>配置说明 *</label>
        <textarea value={form.config} onChange={set("config")} placeholder="描述互联方式、网络带宽、存储配置等硬件规格" rows={2} style={{...inp,resize:"vertical"}} />
      </div>

      {/* 租赁条件 */}
      <div style={sl}>租赁条件</div>
      <div style={row2}>
        <div>
          <label style={lbl}>交付形式 *</label>
          <select value={form.delivery} onChange={set("delivery")} style={inp}>
            <option>裸金属</option><option>云平台</option>
          </select>
        </div>
        <div>
          <label style={lbl}>资源状态 *</label>
          <select value={form.status} onChange={set("status")} style={inp}>
            <option>可售</option><option>预售</option>
          </select>
        </div>
      </div>
      <div style={row2}>
        <div>
          <label style={lbl}>可租数量 *</label>
          <input value={form.count} onChange={set("count")} type="number" min="1" placeholder="256" style={inp} />
        </div>
        <div>
          <label style={lbl}>数量单位 *</label>
          <div style={{display:"flex",gap:16,alignItems:"center",height:40}}>
            <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:14}}>
              <input type="radio" name="countUnit" value="台" checked={form.countUnit==="台"} onChange={set("countUnit")} style={{cursor:"pointer"}} />
              台
            </label>
            <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:14}}>
              <input type="radio" name="countUnit" value="卡" checked={form.countUnit==="卡"} onChange={set("countUnit")} style={{cursor:"pointer"}} />
              卡
            </label>
          </div>
        </div>
      </div>
      <div style={row2}>
        <div>
          <label style={lbl}>计费单位 *</label>
          <select value={form.billingUnit} onChange={set("billingUnit")} style={inp}>
            <option>台/月</option><option>卡/时</option>
          </select>
        </div>
      </div>
      <div style={row2}>
        <div>
          <label style={lbl}>单价 *</label>
          <input value={form.price} onChange={set("price")} type="number" min="0" step="0.01" placeholder="75000" style={inp} />
        </div>
        <div>
          <label style={lbl}>货币 *</label>
          <select value={form.currency} onChange={set("currency")} style={inp}>
            <option>人民币</option><option>美金</option>
          </select>
        </div>
      </div>
      {form.status==="预售" && (
        <div>
          <label style={lbl}>预计上线时间</label>
          <input value={form.onlineTime} onChange={set("onlineTime")} placeholder="如：4月初、2026-Q2" style={inp} />
        </div>
      )}

      {/* 位置信息 */}
      <div style={sl}>位置信息</div>
      <div style={row2}>
        <div>
          <label style={lbl}>区域 *</label>
          <select value={form.region} onChange={set("region")} style={inp}>
            <option>国内</option><option>海外</option>
          </select>
        </div>
        <div>
          <label style={lbl}>机房位置 *</label>
          <input value={form.dcLocation} onChange={set("dcLocation")} placeholder="如：内蒙古、北京、新加坡" style={inp} />
        </div>
      </div>

      {/* 商务条款 */}
      <div style={sl}>商务条款</div>
      <div style={row2}>
        <div>
          <label style={lbl}>合同要求 *</label>
          <input value={form.contract} onChange={set("contract")} placeholder="如：3年闭口" style={inp} />
        </div>
        <div>
          <label style={lbl}>付款要求 *</label>
          <input value={form.paymentTerms} onChange={set("paymentTerms")} placeholder="如：押一付三" style={inp} />
        </div>
      </div>

      {/* 联系信息 */}
      <div style={sl}>联系信息</div>
      <div style={row2}>
        <div>
          <label style={lbl}>公司名称</label>
          <input value={form.company} onChange={set("company")} placeholder="选填" style={inp} />
        </div>
        <div>
          <label style={lbl}>联系人</label>
          <input value={form.contactName} onChange={set("contactName")} placeholder="选填" style={inp} />
        </div>
      </div>
      <div>
        <label style={lbl}>联系方式 *</label>
        <input value={form.contact} onChange={set("contact")} placeholder="手机 / 微信 / 邮箱" style={inp} />
      </div>

      {err && <div style={{color:"#ef4444",fontSize:13,marginBottom:8}}>{err}</div>}
      <div style={{display:"flex",gap:10,marginTop:8}}>
        <button type="button" onClick={onClose} style={{...ghostBtn,flex:1}}>取消</button>
        <button type="button" onClick={handle} disabled={saving} style={{...primaryBtn,flex:2,opacity:(valid&&!saving)?1:0.4,cursor:(valid&&!saving)?"pointer":"default"}}>{saving?"发布中...":"发布资源"}</button>
      </div>
    </Modal>
  );
}

// ─── Edit Resource Modal ──────────────────────────────���───────────────────────
function EditResourceModal({ resource, token, onClose, onSaved }) {
  const [form, setForm] = useState({
    gpu:           resource.gpu        || "",
    mem:           resource.mem        || "",
    bandwidth:     resource.bandwidth  || "",
    count:         String(resource.count ?? ""),
    countUnit:     resource.countUnit  || "卡",
    billingUnit:   resource.billingUnit|| "卡/时",
    price:         String(resource.price ?? ""),
    currency:      resource.currency   || "人民币",
    region:        resource.region     || "国内",
    delivery:      resource.delivery   || "裸金属",
    status:        resource.status     || "在线",
    isVisible:     resource.isVisible !== false,
    availableQuantity: resource.availableQuantity != null ? String(resource.availableQuantity) : "",
    dcLocation:    resource.dcLocation    || "",
    desc:          resource.desc          || "",
    configReq:     resource.configReq     || "",
    storageReq:    resource.storageReq    || "",
    bandwidthReq:  resource.bandwidthReq  || "",
    publicIpReq:   resource.publicIpReq   || "",
    needExtraCpu:  resource.needExtraCpu  ? "是" : "否",
    extraCpuConfig:resource.extraCpuConfig|| "",
    contactName:   resource.resContactName || "",
  });
  const [gpuBrands, setGpuBrands] = useState([]);
  const [gpuSeriesList, setGpuSeriesList] = useState([]);
  const [gpuModelsList, setGpuModelsList] = useState([]);
  const [selBrandId, setSelBrandId] = useState(null);
  const [selSeriesId, setSelSeriesId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(()=>{
    fetch(`${API}/api/gpu-brands`).then(r=>r.json()).then(setGpuBrands).catch(()=>{});
  },[]);

  const set = k => e => setForm(f=>({...f,[k]:e.target.value}));
  const setv = (k,v) => setForm(f=>({...f,[k]:v}));

  const handleBrand = (brandId) => {
    setSelBrandId(brandId); setSelSeriesId(null); setGpuSeriesList([]); setGpuModelsList([]);
    fetch(`${API}/api/gpu-series?brand_id=${brandId}`).then(r=>r.json()).then(setGpuSeriesList).catch(()=>{});
  };
  const handleSeries = (seriesId) => {
    setSelSeriesId(seriesId); setGpuModelsList([]);
    fetch(`${API}/api/gpu-models?series_id=${seriesId}`).then(r=>r.json()).then(setGpuModelsList).catch(()=>{});
  };
  const handleModel = (modelId) => {
    const m = gpuModelsList.find(x=>x.id===modelId);
    if (m) setForm(f=>({...f, gpu: m.name, mem: m.vram_gb ? `${m.vram_gb}GB` : f.mem}));
  };

  const handle = async () => {
    if (saving) return;
    if (!form.gpu.trim() || !form.count || !form.price) { setErr("GPU型号、数量、单价为必填项"); return; }
    setSaving(true); setErr("");
    try {
      const res = await fetch(`${API}/api/resources/${resource.id}`, {
        method: "PATCH",
        headers: {"Content-Type":"application/json", Authorization:`Bearer ${token}`},
        body: JSON.stringify({
          gpu:               form.gpu.trim(),
          mem:               form.mem.trim(),
          bandwidth:         form.bandwidth.trim(),
          count:             Number(form.count),
          count_unit:        form.countUnit,
          billing_unit:      form.billingUnit,
          currency:          form.currency,
          price:             Number(form.price),
          region:            form.region,
          delivery:          form.delivery,
          status:            form.status,
          is_visible:        form.isVisible,
          available_quantity: form.availableQuantity !== "" ? Number(form.availableQuantity) : null,
          dc_location:       form.dcLocation.trim(),
          desc:              form.desc.trim(),
          config_req:        form.configReq.trim(),
          storage_req:       form.storageReq.trim(),
          bandwidth_req:     form.bandwidthReq.trim(),
          public_ip_req:     form.publicIpReq.trim(),
          need_extra_cpu:    form.needExtraCpu === "是",
          extra_cpu_config:  form.extraCpuConfig.trim(),
          contact_name:      form.contactName.trim(),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      onSaved({
        ...resource,
        gpu: form.gpu.trim(), mem: form.mem.trim(), bandwidth: form.bandwidth.trim(),
        count: Number(form.count), countUnit: form.countUnit,
        billingUnit: form.billingUnit, currency: form.currency, price: Number(form.price),
        region: form.region, delivery: form.delivery, status: form.status,
        isVisible: form.isVisible,
        availableQuantity: form.availableQuantity !== "" ? Number(form.availableQuantity) : null,
        dcLocation: form.dcLocation.trim(),
        desc: form.desc.trim(), resContactName: form.contactName.trim(),
        configReq: form.configReq.trim(), storageReq: form.storageReq.trim(),
        bandwidthReq: form.bandwidthReq.trim(), publicIpReq: form.publicIpReq.trim(),
        needExtraCpu: form.needExtraCpu === "是", extraCpuConfig: form.extraCpuConfig.trim(),
        available: form.status !== "下架",
      });
      onClose();
    } catch(e) {
      setErr("保存失败：" + e.message);
      setSaving(false);
    }
  };

  const sl  = {fontSize:11,fontWeight:700,color:"#2563eb",letterSpacing:1,marginBottom:10,marginTop:18,paddingBottom:6,borderBottom:"1px solid #e2e8f0"};
  const lbl = {display:"block",fontSize:12,color:"#64748b",marginBottom:5};
  const row2= {display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 14px"};

  return (
    <Modal onClose={onClose} width={640}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
        <div>
          <div style={{fontFamily:"'Noto Serif SC',serif",fontSize:20,fontWeight:700,color:"#0f172a"}}>编辑资源</div>
          <div style={{fontSize:12,color:"#64748b",marginTop:4}}>{resource.gpu}</div>
        </div>
        <button onClick={onClose} style={{background:"none",border:"none",color:"#94a3b8",fontSize:20,cursor:"pointer"}}>✕</button>
      </div>

      {/* GPU 信息 */}
      <div style={sl}>GPU 信息</div>
      <div style={row2}>
        <div>
          <label style={lbl}>从品牌库选择（可选）</label>
          <select value={selBrandId||""} onChange={e=>{if(e.target.value) handleBrand(parseInt(e.target.value));}} style={inp}>
            <option value="">— 品牌 —</option>
            {gpuBrands.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>GPU 系列</label>
          <select value={selSeriesId||""} onChange={e=>{if(e.target.value) handleSeries(parseInt(e.target.value));}} disabled={!selBrandId} style={inp}>
            <option value="">— 系列 —</option>
            {gpuSeriesList.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>
      <div style={row2}>
        <div>
          <label style={lbl}>从型号库选择</label>
          <select value={gpuModelsList.find(m=>m.name===form.gpu)?.id||""} onChange={e=>{if(e.target.value) handleModel(parseInt(e.target.value));}} disabled={!selSeriesId} style={inp}>
            <option value="">— 型号 —</option>
            {gpuModelsList.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>GPU 型号 *</label>
          <input value={form.gpu} onChange={set("gpu")} placeholder="如：NVIDIA H100 80G SXM5" style={inp} />
        </div>
      </div>
      <div style={row2}>
        <div>
          <label style={lbl}>显存</label>
          <input value={form.mem} onChange={set("mem")} placeholder="如：80GB HBM3" style={inp} />
        </div>
        <div>
          <label style={lbl}>内存带宽</label>
          <input value={form.bandwidth} onChange={set("bandwidth")} placeholder="如：900GB/s" style={inp} />
        </div>
      </div>

      {/* 数量与计费 */}
      <div style={sl}>数量与计费</div>
      <div style={row2}>
        <div>
          <label style={lbl}>数量 *</label>
          <input value={form.count} onChange={set("count")} type="number" min="1" style={inp} />
        </div>
        <div>
          <label style={lbl}>数量单位</label>
          <select value={form.countUnit} onChange={set("countUnit")} style={inp}>
            <option>卡</option><option>台</option>
          </select>
        </div>
      </div>
      <div style={row2}>
        <div>
          <label style={lbl}>计费单位</label>
          <select value={form.billingUnit} onChange={set("billingUnit")} style={inp}>
            <option>卡/时</option><option>台/月</option>
          </select>
        </div>
        <div>
          <label style={lbl}>单价 *</label>
          <input value={form.price} onChange={set("price")} type="number" min="0" step="0.01" style={inp} />
        </div>
      </div>
      <div style={row2}>
        <div>
          <label style={lbl}>可租数量</label>
          <input value={form.availableQuantity} onChange={set("availableQuantity")} type="number" min="0" placeholder="不填则不限" style={inp} />
        </div>
        <div>
          <label style={lbl}>货币</label>
          <select value={form.currency} onChange={set("currency")} style={inp}>
            <option>人民币</option><option>美金</option>
          </select>
        </div>
      </div>

      {/* 位置与状态 */}
      <div style={sl}>位置与状态</div>
      <div style={row2}>
        <div>
          <label style={lbl}>区域</label>
          <select value={form.region} onChange={set("region")} style={inp}>
            <option>国内</option><option>海外</option>
          </select>
        </div>
        <div>
          <label style={lbl}>机房位置</label>
          <input value={form.dcLocation} onChange={set("dcLocation")} placeholder="如：北京、上海、新加坡" style={inp} />
        </div>
      </div>
      <div style={row2}>
        <div>
          <label style={lbl}>交付形式</label>
          <select value={form.delivery} onChange={set("delivery")} style={inp}>
            <option>裸金属</option><option>云平台</option>
          </select>
        </div>
        <div>
          <label style={lbl}>资源状态</label>
          <select value={form.status} onChange={set("status")} style={inp}>
            <option>在线</option><option>预租</option><option>下架</option>
          </select>
        </div>
      </div>
      <div style={row2}>
        <div>
          <label style={lbl}>对外可见</label>
          <div style={{display:"flex",alignItems:"center",gap:10,marginTop:4}}>
            <button onClick={()=>setv("isVisible",!form.isVisible)} style={{width:44,height:24,borderRadius:12,border:"none",background:form.isVisible?"#2563eb":"#e2e8f0",cursor:"pointer",position:"relative",transition:"background 0.2s",flexShrink:0}}>
              <span style={{position:"absolute",top:2,left:form.isVisible?22:2,width:20,height:20,borderRadius:"50%",background:"#fff",transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.2)"}} />
            </button>
            <span style={{fontSize:12,color:"#64748b"}}>{form.isVisible?"可见":"隐藏"}</span>
          </div>
        </div>
        <div />
      </div>

      {/* 配置要求 */}
      <div style={sl}>配置要求</div>
      <div style={row2}>
        <div>
          <label style={lbl}>存储要求</label>
          <textarea value={form.storageReq} onChange={set("storageReq")} rows={3} placeholder="SSD容量、IOPS等" style={{...inp,resize:"vertical"}} />
        </div>
        <div />
      </div>
      <div style={row2}>
        <div>
          <label style={lbl}>带宽要求</label>
          <input value={form.bandwidthReq} onChange={set("bandwidthReq")} placeholder="如：万兆上行、100Gbps" style={inp} />
        </div>
        <div>
          <label style={lbl}>公网 IP 要求</label>
          <input value={form.publicIpReq} onChange={set("publicIpReq")} placeholder="如：独立公网IP×4" style={inp} />
        </div>
      </div>
      <div style={row2}>
        <div>
          <label style={lbl}>额外 CPU 需求</label>
          <select value={form.needExtraCpu} onChange={set("needExtraCpu")} style={inp}>
            <option>否</option><option>是</option>
          </select>
        </div>
        {form.needExtraCpu === "是" && (
          <div>
            <label style={lbl}>CPU 配置补充</label>
            <input value={form.extraCpuConfig} onChange={set("extraCpuConfig")} placeholder="如：2×Intel Xeon 32C" style={inp} />
          </div>
        )}
      </div>

      {/* 补充信息 */}
      <div style={sl}>补充信息</div>
      <div>
        <label style={lbl}>描述 / 配置说明</label>
        <textarea value={form.desc} onChange={set("desc")} rows={3} placeholder="互联方式、带宽、存储配置等" style={{...inp,resize:"vertical"}} />
      </div>
      <div>
        <label style={lbl}>联系人姓名（选填，覆盖公司默认联系人）</label>
        <input value={form.contactName} onChange={set("contactName")} placeholder="选填" style={inp} />
      </div>

      {err && <div style={{color:"#ef4444",fontSize:13,marginBottom:8}}>{err}</div>}
      <div style={{display:"flex",gap:10,marginTop:8}}>
        <button onClick={onClose} style={{...ghostBtn,flex:1}}>取消</button>
        <button onClick={handle} disabled={saving} style={{...primaryBtn,flex:2,opacity:saving?0.5:1}}>{saving?"保存中...":"保存修改"}</button>
      </div>
    </Modal>
  );
}

// ─── Vendor Dashboard ─────────────────────────────────────────────────────────
function ResourceCard({ r, token, onUpdate, onDelete }) {
  const [status, setStatus] = useState(r.status || (r.available ? "在线" : "下架"));
  const [count, setCount] = useState(r.count);
  const [isVisible, setIsVisible] = useState(r.isVisible !== false);
  const [availableQuantity, setAvailableQuantity] = useState(r.availableQuantity ?? "");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  // track local copy so inline controls stay in sync after edit
  const [localR, setLocalR] = useState(r);

  const origStatus = r.status || (r.available?"在线":"下架");
  const dirty = status !== origStatus || Number(count) !== r.count ||
    isVisible !== (r.isVisible !== false) ||
    String(availableQuantity) !== String(r.availableQuantity ?? "");
  const sc = STATUS_COLORS[status] || STATUS_COLORS["下架"];

  const save = async () => {
    setSaving(true);
    try {
      await fetch(`${API}/api/resources/${r.id}`, {
        method: "PATCH",
        headers: {"Content-Type":"application/json","Authorization":`Bearer ${token}`},
        body: JSON.stringify({
          status, count: Number(count), is_visible: isVisible,
          available_quantity: availableQuantity !== "" ? Number(availableQuantity) : null,
        }),
      });
      onUpdate(r.id, {status, count: Number(count), available: status !== "下架", isVisible, availableQuantity: availableQuantity !== "" ? Number(availableQuantity) : null});
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    try {
      await fetch(`${API}/api/resources/${r.id}`, {
        method: "DELETE",
        headers: {"Authorization":`Bearer ${token}`},
      });
      onDelete(r.id);
    } finally { setDeleting(false); setConfirmDelete(false); }
  };

  const handleSaved = (updated) => {
    setLocalR(updated);
    setStatus(updated.status || (updated.available?"在线":"下架"));
    setCount(updated.count);
    setIsVisible(updated.isVisible !== false);
    setAvailableQuantity(updated.availableQuantity ?? "");
    onUpdate(updated.id, updated);
  };

  return (
    <>
      {showEdit && <EditResourceModal resource={localR} token={token} onClose={()=>setShowEdit(false)} onSaved={handleSaved} />}
      <div style={{background:"#ffffff",border:"1px solid #e2e8f0",borderRadius:14,padding:20,display:"flex",alignItems:"center",gap:16,flexWrap:"wrap",boxShadow:"0 1px 3px rgba(0,0,0,0.04)",opacity:isVisible?1:0.6}}>
        <div style={{flex:1,minWidth:200}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,flexWrap:"wrap"}}>
            <span style={{fontWeight:700,fontSize:14,fontFamily:"'Bebas Neue',cursive",letterSpacing:1,color:"#0f172a"}}>{localR.gpu}</span>
            {!isVisible && <span style={{fontSize:10,padding:"2px 7px",borderRadius:10,background:"#f1f5f9",color:"#94a3b8",fontWeight:600}}>不可见</span>}
          </div>
          <div style={{fontSize:12,color:"#64748b",marginBottom:8}}>{localR.mem}{localR.bandwidth?` · ${localR.bandwidth}`:""} · {localR.region}</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{(localR.tags||[]).map(t=><Tag key={t} t={t} />)}</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          <div>
            <div style={{fontSize:11,color:"#94a3b8",marginBottom:4}}>状态</div>
            <select value={status} onChange={e=>setStatus(e.target.value)} style={{fontSize:12,padding:"4px 8px",borderRadius:6,border:`1px solid ${sc.border}`,background:sc.bg,color:sc.color,cursor:"pointer"}}>
              {["在线","预租","下架"].map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <div style={{fontSize:11,color:"#94a3b8",marginBottom:4}}>数量（卡）</div>
            <input type="number" min={1} value={count} onChange={e=>setCount(e.target.value)} style={{width:70,fontSize:12,padding:"4px 8px",borderRadius:6,border:"1px solid #e2e8f0",textAlign:"center"}} />
          </div>
          <div>
            <div style={{fontSize:11,color:"#94a3b8",marginBottom:4}}>可租数量</div>
            <input type="number" min={0} value={availableQuantity} onChange={e=>setAvailableQuantity(e.target.value)} placeholder="—" style={{width:70,fontSize:12,padding:"4px 8px",borderRadius:6,border:"1px solid #e2e8f0",textAlign:"center"}} />
          </div>
          <div>
            <div style={{fontSize:11,color:"#94a3b8",marginBottom:4}}>对外可见</div>
            <button onClick={()=>setIsVisible(v=>!v)} style={{width:44,height:24,borderRadius:12,border:"none",background:isVisible?"#2563eb":"#e2e8f0",cursor:"pointer",position:"relative",transition:"background 0.2s"}}>
              <span style={{position:"absolute",top:2,left:isVisible?22:2,width:20,height:20,borderRadius:"50%",background:"#fff",transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.2)"}} />
            </button>
          </div>
          {dirty && <button onClick={save} disabled={saving} style={{...primaryBtn,padding:"6px 14px",fontSize:12,marginTop:18}}>{saving?"保存中":"保存"}</button>}
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:8,flexShrink:0}}>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:26,fontWeight:700,color:"#2563eb",fontFamily:"'Bebas Neue',cursive"}}>¥{localR.price}</div>
            <div style={{fontSize:11,color:"#94a3b8"}}>元/卡/时</div>
          </div>
          <button onClick={()=>setShowEdit(true)} style={{fontSize:11,padding:"4px 10px",borderRadius:6,border:"1px solid #93c5fd",color:"#2563eb",background:"none",cursor:"pointer"}}>编辑</button>
          <button onClick={handleDelete} disabled={deleting} style={{fontSize:11,padding:"4px 10px",borderRadius:6,border:`1px solid ${confirmDelete?"#ef4444":"#e2e8f0"}`,background:confirmDelete?"#fef2f2":"transparent",color:confirmDelete?"#ef4444":"#94a3b8",cursor:"pointer"}}>
            {deleting?"删除中...":confirmDelete?"确认删除":"删除"}
          </button>
          {confirmDelete && <button onClick={()=>setConfirmDelete(false)} style={{fontSize:11,color:"#94a3b8",background:"none",border:"none",cursor:"pointer"}}>取消</button>}
        </div>
      </div>
    </>
  );
}

const STATUS_COLORS = {
  "在线": {bg:"rgba(37,99,235,0.08)",color:"#2563eb",border:"rgba(37,99,235,0.2)"},
  "预租": {bg:"rgba(234,179,8,0.08)",color:"#ca8a04",border:"rgba(234,179,8,0.3)"},
  "下架": {bg:"#f8fafc",color:"#94a3b8",border:"#e2e8f0"},
};

function Dashboard({ vendor, resources, onPublish, onExit, onUpdateResource, onDeleteResource }) {
  const [showPublish, setShowPublish] = useState(false);
  const [shareToken, setShareToken] = useState(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareError, setShareError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [slug, setSlug] = useState(vendor.slug || "");
  const [slugSaving, setSlugSaving] = useState(false);
  const [slugMsg, setSlugMsg] = useState("");
  const [contact, setContact] = useState({ contactName: vendor.contactName||"", contactPhone: vendor.contactPhone||"", wechat: vendor.wechat||"", email: vendor.email||"" });
  const [contactSaving, setContactSaving] = useState(false);
  const [contactMsg, setContactMsg] = useState("");
  const [dashTab, setDashTab] = useState("resources"); // "resources" | "demands" | "memory"
  const [myDemands, setMyDemands] = useState([]);
  const [demLoading, setDemLoading] = useState(false);
  const [editingDemand, setEditingDemand] = useState(null);
  const [myMemory, setMyMemory] = useState([]);
  const [memLoading, setMemLoading] = useState(false);
  const [editingMemory, setEditingMemory] = useState(null);
  const myRes = resources.filter(r=>r.vendorId===vendor.id);
  const availCount = myRes.filter(r=>r.status==="在线"||r.available).length;

  useEffect(()=>{
    if (dashTab !== "demands") return;
    setDemLoading(true);
    fetch(`${API}/api/vendor/demands`, { headers:{ Authorization:`Bearer ${vendor._token}` } })
      .then(r=>r.ok?r.json():[]).then(setMyDemands).catch(()=>{}).finally(()=>setDemLoading(false));
  }, [dashTab]);

  useEffect(()=>{
    if (dashTab !== "memory") return;
    setMemLoading(true);
    fetch(`${API}/api/vendor/memory-listings`, { headers:{ Authorization:`Bearer ${vendor._token}` } })
      .then(r=>r.ok?r.json():[]).then(setMyMemory).catch(()=>{}).finally(()=>setMemLoading(false));
  }, [dashTab]);

  const patchDemand = async (id, data) => {
    await fetch(`${API}/api/demands/${id}`, {
      method:"PATCH", headers:{"Content-Type":"application/json", Authorization:`Bearer ${vendor._token}`},
      body: JSON.stringify(data),
    });
    setMyDemands(ds=>ds.map(d=>d.id===id?{...d,...data}:d));
  };

  const deleteDemand = async (id) => {
    if (!confirm("确定删除此需求吗？")) return;
    await fetch(`${API}/api/demands/${id}`, {
      method:"DELETE", headers:{ Authorization:`Bearer ${vendor._token}` },
    });
    setMyDemands(ds=>ds.filter(d=>d.id!==id));
  };

  const saveSlug = async () => {
    if (!slug.trim()) return;
    setSlugSaving(true); setSlugMsg("");
    try {
      const res = await fetch(`${API}/api/vendors/slug`, {
        method:"PATCH", headers:{"Content-Type":"application/json", Authorization:`Bearer ${vendor._token}`},
        body: JSON.stringify({slug: slug.trim()}),
      });
      const d = await res.json();
      if (res.ok) { setSlugMsg("✓ 已保存"); setShareToken(null); }
      else { setSlugMsg(d.detail || "保存失败"); }
    } catch { setSlugMsg("网络错误"); }
    finally { setSlugSaving(false); setTimeout(()=>setSlugMsg(""),3000); }
  };

  const saveContact = async () => {
    setContactSaving(true); setContactMsg("");
    try {
      const res = await fetch(`${API}/api/vendors/contact`, {
        method:"PATCH", headers:{"Content-Type":"application/json", Authorization:`Bearer ${vendor._token}`},
        body: JSON.stringify({ contact_name: contact.contactName, contact_phone: contact.contactPhone, wechat: contact.wechat, email: contact.email }),
      });
      setContactMsg(res.ok ? "✓ 已保存，分享页将显示联系方式" : "保存失败");
    } catch { setContactMsg("网络错误"); }
    finally { setContactSaving(false); setTimeout(()=>setContactMsg(""),4000); }
  };

  const handleShare = async () => {
    setShareLoading(true); setShareError(false);
    try {
      const res = await fetch(`${API}/api/vendors/share-token`, {
        method: "POST", headers: {Authorization:`Bearer ${vendor._token}`},
      });
      if (res.ok) { const d = await res.json(); setShareToken(d.share_token); }
      else { setShareError(true); }
    } catch { setShareError(true); }
    finally { setShareLoading(false); }
  };

  const shareUrl = shareToken ? `${window.location.origin}/vendor/${shareToken}` : null;

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(()=>{ setCopied(true); setTimeout(()=>setCopied(false),2000); });
  };

  return (
    <div style={{minHeight:"100vh",background:"#f1f5f9",color:"#0f172a",fontFamily:"'Noto Sans SC',system-ui,sans-serif"}}>
      <div style={{borderBottom:"1px solid #e2e8f0",padding:"0 24px",display:"flex",alignItems:"center",gap:16,height:60,background:"rgba(255,255,255,0.97)",backdropFilter:"blur(12px)"}}>
        <img src="/logo.svg" height="32" onClick={onExit} style={{cursor:"pointer",display:"block"}} alt="新云集市" />
        <span style={{fontSize:12,color:"#94a3b8",borderLeft:"1px solid #e2e8f0",paddingLeft:16}}>供应商后台</span>
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:12}}>
          <Avatar text={vendor.name.slice(0,2)} size={30} />
          <span style={{fontSize:13,color:"#374151"}}>{vendor.name}</span>
          <button onClick={onExit} style={{fontSize:12,color:"#64748b",background:"none",border:"1px solid #e2e8f0",borderRadius:6,padding:"4px 10px",cursor:"pointer"}}>退出后台</button>
        </div>
      </div>
      <div style={{maxWidth:900,margin:"0 auto",padding:"40px 24px"}}>
        <div style={{background:"#ffffff",border:"1px solid #e2e8f0",borderRadius:16,padding:"24px 28px",marginBottom:32,display:"flex",alignItems:"center",gap:20,flexWrap:"wrap",boxShadow:"0 1px 4px rgba(0,0,0,0.06)"}}>
          <Avatar text={vendor.name.slice(0,2)} size={52} />
          <div style={{flex:1,minWidth:120}}>
            <div style={{fontSize:20,fontWeight:700,fontFamily:"'Noto Serif SC',serif",marginBottom:4,color:"#0f172a"}}>欢迎，{vendor.name} 👋</div>
            <div style={{fontSize:13,color:"#64748b",marginBottom:10}}>{vendor.location} · 入驻于 {vendor.joined}</div>
            <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
              <span style={{fontSize:12,color:"#94a3b8",whiteSpace:"nowrap"}}>分享链接后缀</span>
              <div style={{display:"flex",alignItems:"center",background:"#f1f5f9",border:"1px solid #e2e8f0",borderRadius:8,padding:"4px 8px",fontSize:12,color:"#94a3b8"}}>
                <span>/vendor/</span>
                <input
                  value={slug}
                  onChange={e=>setSlug(e.target.value.replace(/[^a-zA-Z0-9\-]/g,""))}
                  placeholder="如 computable"
                  style={{border:"none",outline:"none",background:"transparent",fontSize:12,color:"#0f172a",width:120}}
                />
              </div>
              <button onClick={saveSlug} disabled={slugSaving||!slug.trim()} style={{fontSize:12,padding:"4px 12px",borderRadius:6,border:"1px solid #d1d5db",background:"#fff",cursor:"pointer",color:"#374151",opacity:slugSaving||!slug.trim()?0.5:1}}>
                {slugSaving?"保存中...":"保存"}
              </button>
              {slugMsg && <span style={{fontSize:12,color:slugMsg.startsWith("✓")?"#16a34a":"#dc2626"}}>{slugMsg}</span>}
            </div>
          </div>
          <div style={{display:"flex",gap:12}}>
            {[["资源总数",myRes.length,"#2563eb"],["可租",availCount,"#2563eb"],["草稿",myRes.length-availCount,"#64748b"]].map(([l,v,c])=>(
              <div key={l} style={{background:"#f8fafc",borderRadius:10,padding:"12px 20px",textAlign:"center",border:"1px solid #e2e8f0"}}>
                <div style={{fontSize:24,fontWeight:700,color:c,fontFamily:"'Bebas Neue',cursive"}}>{v}</div>
                <div style={{fontSize:11,color:"#94a3b8",marginTop:2}}>{l}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{background:"#ffffff",border:"1px solid #e2e8f0",borderRadius:14,padding:"20px 24px",marginBottom:24,boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
          <div style={{fontSize:11,fontWeight:700,color:"#2563eb",letterSpacing:1,marginBottom:14}}>联系方式（显示在分享页）</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
            <div style={{marginBottom:12}}>
              <div style={{fontSize:11,color:"#94a3b8",marginBottom:4}}>联系人姓名</div>
              <input value={contact.contactName} onChange={e=>setContact(c=>({...c,contactName:e.target.value}))} placeholder="如：张三" style={{...inp,fontSize:13}} />
            </div>
            <div style={{marginBottom:12}}>
              <div style={{fontSize:11,color:"#94a3b8",marginBottom:4}}>联系电话</div>
              <input value={contact.contactPhone} onChange={e=>setContact(c=>({...c,contactPhone:e.target.value}))} placeholder="手机号或固话" style={{...inp,fontSize:13}} />
            </div>
            <div style={{marginBottom:12}}>
              <div style={{fontSize:11,color:"#94a3b8",marginBottom:4}}>微信号</div>
              <input value={contact.wechat} onChange={e=>setContact(c=>({...c,wechat:e.target.value}))} placeholder="微信号（选填）" style={{...inp,fontSize:13}} />
            </div>
            <div style={{marginBottom:12,gridColumn:"1/-1"}}>
              <div style={{fontSize:11,color:"#94a3b8",marginBottom:4}}>电子邮箱</div>
              <input value={contact.email} onChange={e=>setContact(c=>({...c,email:e.target.value}))} placeholder="business@example.com" style={{...inp,fontSize:13}} />
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <button onClick={saveContact} disabled={contactSaving} style={{fontSize:13,padding:"7px 20px",borderRadius:8,border:"none",background:"#2563eb",color:"#fff",cursor:"pointer",opacity:contactSaving?0.6:1}}>
              {contactSaving?"保存中...":"保存联系方式"}
            </button>
            {contactMsg && <span style={{fontSize:12,color:contactMsg.startsWith("✓")?"#16a34a":"#dc2626"}}>{contactMsg}</span>}
          </div>
        </div>

        {/* Tab navigation */}
        <div style={{display:"flex",gap:0,marginBottom:20,borderBottom:"2px solid #e2e8f0"}}>
          {[["resources","我的资源"],["demands","我的需求"],["memory","内存条管理"]].map(([key,label])=>(
            <button key={key} onClick={()=>setDashTab(key)} style={{padding:"9px 20px",border:"none",background:"none",cursor:"pointer",fontSize:14,fontWeight:600,color:dashTab===key?"#2563eb":"#64748b",borderBottom:dashTab===key?"2px solid #2563eb":"2px solid transparent",marginBottom:-2,transition:"color 0.15s"}}>
              {label}
            </button>
          ))}
        </div>

        {dashTab==="resources" && <>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:10}}>
            <div>
              <div style={{fontSize:18,fontWeight:700,color:"#0f172a"}}>我的资源</div>
              <div style={{fontSize:12,color:"#64748b",marginTop:2}}>管理已发布的 GPU 资源</div>
            </div>
            <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
              {!shareToken ? (
                <>
                  <button onClick={handleShare} disabled={shareLoading} style={{fontSize:12,padding:"8px 16px",border:"1px solid #e2e8f0",borderRadius:8,background:"#fff",color:"#374151",cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
                    🔗 {shareLoading?"生成中...":"生成分享链接"}
                  </button>
                  {shareError && <span style={{fontSize:11,color:"#dc2626"}}>生成失败，请重试</span>}
                </>
              ) : (
                <div style={{display:"flex",alignItems:"center",gap:8,background:"#f0f9ff",border:"1px solid #bae6fd",borderRadius:8,padding:"6px 12px"}}>
                  <a href={shareUrl} target="_blank" rel="noopener noreferrer" style={{fontSize:11,color:"#0369a1",maxWidth:220,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",textDecoration:"none"}}>{shareUrl}</a>
                  <button onClick={copyLink} style={{fontSize:11,padding:"3px 10px",border:"1px solid #bae6fd",borderRadius:6,background:copied?"#0ea5e9":"#fff",color:copied?"#fff":"#0369a1",cursor:"pointer",flexShrink:0}}>
                    {copied?"已复制":"复制"}
                  </button>
                </div>
              )}
              <button onClick={()=>setShowPublish(true)} style={{...primaryBtn,padding:"10px 22px",display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:18,lineHeight:1}}>＋</span>发布新资源
              </button>
            </div>
          </div>
          {myRes.length===0 ? (
            <div style={{textAlign:"center",padding:"80px 0",border:"1px dashed #d1d5db",borderRadius:16,color:"#94a3b8"}}>
              <div style={{fontSize:40,marginBottom:12}}>🖥️</div>
              <div style={{fontSize:16,marginBottom:6,color:"#374151"}}>还没有发布任何资源</div>
              <div style={{fontSize:13,marginBottom:24,color:"#94a3b8"}}>点击「发布新资源」开始</div>
              <button onClick={()=>setShowPublish(true)} style={{...primaryBtn,padding:"10px 28px",display:"inline-block"}}>立即发布</button>
            </div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {myRes.map(r=><ResourceCard key={r.id} r={r} token={vendor._token} onUpdate={onUpdateResource} onDelete={onDeleteResource} />)}
            </div>
          )}
        </>}

        {dashTab==="demands" && <>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
            <div>
              <div style={{fontSize:18,fontWeight:700,color:"#0f172a"}}>我的需求</div>
              <div style={{fontSize:12,color:"#64748b",marginTop:2}}>管理您发布的 GPU 采购需求</div>
            </div>
          </div>
          {demLoading ? (
            <div style={{textAlign:"center",padding:"60px 0",color:"#94a3b8",fontSize:13}}>加载中...</div>
          ) : myDemands.length===0 ? (
            <div style={{textAlign:"center",padding:"80px 0",border:"1px dashed #d1d5db",borderRadius:16,color:"#94a3b8"}}>
              <div style={{fontSize:40,marginBottom:12}}>📋</div>
              <div style={{fontSize:16,marginBottom:6,color:"#374151"}}>还没有发布任何需求</div>
              <div style={{fontSize:13,color:"#94a3b8"}}>在首页点击「发布需求」即可创建</div>
            </div>
          ) : (
            <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:12,overflow:"hidden"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead>
                  <tr style={{background:"#f8fafc",borderBottom:"1px solid #e2e8f0"}}>
                    {[["GPU 型号",""],["数量",""],["发布时间",""],["状态",""],["操作",""]].map(([h])=>(
                      <th key={h} style={{padding:"10px 14px",fontSize:11,fontWeight:700,color:"#64748b",textAlign:"left",whiteSpace:"nowrap"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {myDemands.map(d=>{
                    const statusCfg = {
                      online:  {label:"在线",  bg:"#dcfce7", color:"#16a34a"},
                      completed: {label:"已完成",bg:"#dbeafe", color:"#2563eb"},
                      abandoned: {label:"已放弃",bg:"#f1f5f9", color:"#94a3b8"},
                    }[d.status||"online"] || {label:"在线",bg:"#dcfce7",color:"#16a34a"};
                    return (
                      <tr key={d.id} style={{borderBottom:"1px solid #f1f5f9"}}>
                        <td style={{padding:"12px 14px",fontSize:13,fontWeight:600,fontFamily:"'Bebas Neue',cursive",color:"#0f172a"}}>{d.gpu||"—"}</td>
                        <td style={{padding:"12px 14px",fontSize:13,color:"#374151"}}>{d.count||d.gpu_count||"—"} {d.count_unit||"卡"}</td>
                        <td style={{padding:"12px 14px",fontSize:12,color:"#94a3b8"}}>{(d.createdAt||d.created_at||"").slice(0,10)||"—"}</td>
                        <td style={{padding:"12px 14px"}}>
                          <span style={{display:"inline-block",padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:600,background:statusCfg.bg,color:statusCfg.color}}>{statusCfg.label}</span>
                        </td>
                        <td style={{padding:"12px 14px"}}>
                          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                            <button onClick={()=>setEditingDemand(d)} style={{fontSize:11,padding:"4px 10px",borderRadius:6,border:"1px solid #d1d5db",background:"#fff",color:"#374151",cursor:"pointer"}}>编辑</button>
                            {(d.status||"online")==="online" && <>
                              <button onClick={()=>patchDemand(d.id,{status:"completed"})} style={{fontSize:11,padding:"4px 10px",borderRadius:6,border:"1px solid #bae6fd",background:"#f0f9ff",color:"#2563eb",cursor:"pointer"}}>标为完成</button>
                              <button onClick={()=>patchDemand(d.id,{status:"abandoned"})} style={{fontSize:11,padding:"4px 10px",borderRadius:6,border:"1px solid #e2e8f0",background:"#f8fafc",color:"#94a3b8",cursor:"pointer"}}>放弃</button>
                            </>}
                            {(d.status||"online")!=="online" && (
                              <button onClick={()=>patchDemand(d.id,{status:"online"})} style={{fontSize:11,padding:"4px 10px",borderRadius:6,border:"1px solid #bbf7d0",background:"#f0fdf4",color:"#16a34a",cursor:"pointer"}}>重新在线</button>
                            )}
                            <button onClick={()=>deleteDemand(d.id)} style={{fontSize:11,padding:"4px 10px",borderRadius:6,border:"1px solid #fecaca",background:"#fff5f5",color:"#dc2626",cursor:"pointer"}}>删除</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>}

        {dashTab==="memory" && <>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
            <div>
              <div style={{fontSize:18,fontWeight:700,color:"#0f172a"}}>内存条管理</div>
              <div style={{fontSize:12,color:"#64748b",marginTop:2}}>管理您发布的内存条信息</div>
            </div>
          </div>
          {memLoading ? (
            <div style={{textAlign:"center",padding:"60px 0",color:"#94a3b8",fontSize:13}}>加载中...</div>
          ) : myMemory.length===0 ? (
            <div style={{textAlign:"center",padding:"80px 0",border:"1px dashed #d1d5db",borderRadius:16,color:"#94a3b8"}}>
              <div style={{fontSize:40,marginBottom:12}}>💾</div>
              <div style={{fontSize:16,marginBottom:6,color:"#374151"}}>还没有发布任何内存条</div>
              <div style={{fontSize:13,color:"#94a3b8"}}>在硬件页面点击「发布内存条」即可创建</div>
            </div>
          ) : (
            <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:12,overflow:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",minWidth:600}}>
                <thead>
                  <tr style={{background:"#f8fafc",borderBottom:"1px solid #e2e8f0"}}>
                    {["标题","品牌","代数","容量","数量","单价","状态","操作"].map(h=>(
                      <th key={h} style={{padding:"10px 14px",fontSize:11,fontWeight:700,color:"#64748b",textAlign:"left",whiteSpace:"nowrap"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {myMemory.map(m=>(
                    <tr key={m.id} style={{borderBottom:"1px solid #f1f5f9"}}>
                      <td style={{padding:"12px 14px",fontSize:13,fontWeight:600,color:"#0f172a",maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.title}</td>
                      <td style={{padding:"12px 14px",fontSize:13,color:"#374151"}}>{m.brand}</td>
                      <td style={{padding:"12px 14px",fontSize:13,color:"#374151"}}>{m.generation}</td>
                      <td style={{padding:"12px 14px",fontSize:13,color:"#374151"}}>{m.capacity_per_stick}</td>
                      <td style={{padding:"12px 14px",fontSize:13,color:"#374151"}}>{m.quantity}条</td>
                      <td style={{padding:"12px 14px",fontSize:13,color:"#2563eb",fontWeight:600}}>{m.price_per_stick?`¥${m.price_per_stick}/条`:"面议"}</td>
                      <td style={{padding:"12px 14px"}}>
                        <span style={{display:"inline-block",padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:600,background:m.is_visible?"#dcfce7":"#f1f5f9",color:m.is_visible?"#16a34a":"#94a3b8"}}>{m.is_visible?"显示":"隐藏"}</span>
                      </td>
                      <td style={{padding:"12px 14px"}}>
                        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                          <button onClick={()=>setEditingMemory(m)} style={{fontSize:11,padding:"4px 10px",borderRadius:6,border:"1px solid #d1d5db",background:"#fff",color:"#374151",cursor:"pointer"}}>编辑</button>
                          <button onClick={async()=>{
                            await fetch(`${API}/api/vendor/memory-listings/${m.id}`,{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:`Bearer ${vendor._token}`},body:JSON.stringify({is_visible:!m.is_visible})});
                            setMyMemory(ls=>ls.map(x=>x.id===m.id?{...x,is_visible:!x.is_visible}:x));
                          }} style={{fontSize:11,padding:"4px 10px",borderRadius:6,border:"1px solid #e2e8f0",background:"#f8fafc",color:"#64748b",cursor:"pointer"}}>{m.is_visible?"隐藏":"显示"}</button>
                          <button onClick={async()=>{
                            if(!window.confirm("确认删除此内存条？")) return;
                            await fetch(`${API}/api/vendor/memory-listings/${m.id}`,{method:"DELETE",headers:{Authorization:`Bearer ${vendor._token}`}});
                            setMyMemory(ls=>ls.filter(x=>x.id!==m.id));
                          }} style={{fontSize:11,padding:"4px 10px",borderRadius:6,border:"1px solid #fecaca",background:"#fff5f5",color:"#dc2626",cursor:"pointer"}}>删除</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>}
      </div>
      {showPublish && <PublishModal vendor={vendor} onClose={()=>setShowPublish(false)} onPublish={onPublish} />}
      {editingDemand && <PostRequirementModal vendor={vendor} initialDemand={editingDemand} onClose={()=>setEditingDemand(null)} onSuccess={data=>{ patchDemand(data.id, data); setEditingDemand(null); }} />}
      {editingMemory && <MemoryEditModal item={editingMemory} token={vendor._token} onClose={()=>setEditingMemory(null)} onSuccess={updated=>{ setMyMemory(ls=>ls.map(x=>x.id===updated.id?updated:x)); setEditingMemory(null); }} />}
    </div>
  );
}

// ─── ShareQrButton — inline button that opens QRCodeModal ─────────────────────
function ShareQrButton({ url, label }) {
  const [show, setShow] = useState(false);
  return <>
    <button onClick={e=>{e.stopPropagation();setShow(true);}} style={{padding:"4px 10px",background:"transparent",border:"1px solid #e2e8f0",borderRadius:6,color:"#64748b",fontSize:11,cursor:"pointer"}}>二维码</button>
    {show && <QRCodeModal url={url} label={label} onClose={()=>setShow(false)} />}
  </>;
}

// ─── QRCode Modal ─────────────────────────────────────────────────────────────
function QRCodeModal({ url, label, onClose }) {
  const canvasRef = useRef(null);

  useEffect(()=>{
    const canvas = canvasRef.current;
    if (canvas) QRCode.toCanvas(canvas, url, {width:256,margin:2,color:{dark:"#0f172a",light:"#ffffff"}}).catch(()=>{});
  },[url]);

  const download = async () => {
    try {
      const qrDataUrl = await QRCode.toDataURL(url, {width:256,margin:2,color:{dark:"#0f172a",light:"#ffffff"}});
      const img = new Image();
      img.onload = () => {
        const pad = 20;
        const textH = label ? 12 + 16 + 16 : 0; // gap + text + bottom pad
        const c = document.createElement("canvas");
        c.width = img.width + pad*2;
        c.height = img.height + pad*2 + textH;
        const ctx = c.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0,0,c.width,c.height);
        ctx.drawImage(img, pad, pad);
        if (label) {
          ctx.font = "16px 'Noto Sans SC',system-ui,sans-serif";
          ctx.fillStyle = "#333333";
          ctx.textAlign = "center";
          ctx.fillText(label, c.width/2, img.height + pad + 12 + 16);
        }
        c.toBlob(blob=>{
          const a = document.createElement("a");
          a.download = `${label||"qr"}.png`;
          a.href = URL.createObjectURL(blob);
          a.click();
          URL.revokeObjectURL(a.href);
        },"image/png");
      };
      img.src = qrDataUrl;
    } catch(e) { console.error(e); }
  };

  return (
    <Modal onClose={onClose} width={360}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div style={{fontSize:16,fontWeight:700,color:"#0f172a"}}>生成二维码</div>
        <button onClick={onClose} style={{background:"none",border:"none",color:"#94a3b8",fontSize:20,cursor:"pointer"}}>✕</button>
      </div>
      <div style={{textAlign:"center",padding:"4px 0 20px"}}>
        <div style={{display:"inline-block",background:"#ffffff",border:"1px solid #e2e8f0",borderRadius:16,padding:16,marginBottom:12}}>
          <canvas ref={canvasRef} style={{display:"block",borderRadius:6}} />
        </div>
        {label && <div style={{fontSize:13,color:"#374151",fontWeight:600,marginBottom:20}}>{label}</div>}
        <button onClick={download} style={{...ghostBtn,padding:"9px 32px",fontSize:13}}>下载图片</button>
      </div>
    </Modal>
  );
}

// ─── Share Sheet ──────────────────────────────────────────────────────────────
function ShareSheet({ title, shareText, shareUrl, onClose, qrLabel }) {
  const [copied, setCopied] = useState("");
  const [view, setView] = useState("main"); // "main" | "wechat" | "qr"
  const qrCanvasRef = useRef(null);

  useEffect(()=>{
    if (view==="wechat") {
      const canvas = qrCanvasRef.current;
      if (canvas) QRCode.toCanvas(canvas, shareUrl, {width:200,margin:2,color:{dark:"#0f172a",light:"#ffffff"}}).catch(()=>{});
    }
  },[view, shareUrl]);

  const copy = (text, label) => { navigator.clipboard?.writeText(text).catch(()=>{}); setCopied(label); setTimeout(()=>setCopied(""),2000); };

  if (view==="wechat") return <>
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
      <button onClick={()=>setView("main")} style={{background:"none",border:"none",color:"#94a3b8",fontSize:18,cursor:"pointer",padding:0}}>‹</button>
      <div style={{fontSize:16,fontWeight:700,color:"#0f172a"}}>微信分享</div>
      <button onClick={onClose} style={{background:"none",border:"none",color:"#94a3b8",fontSize:20,cursor:"pointer",marginLeft:"auto"}}>✕</button>
    </div>
    <div style={{textAlign:"center",padding:"8px 0 24px"}}>
      <div style={{display:"inline-block",background:"#ffffff",border:"1px solid #e2e8f0",borderRadius:16,padding:20,marginBottom:18}}>
        <canvas ref={qrCanvasRef} style={{display:"block",borderRadius:8}} />
      </div>
      <div style={{fontSize:14,fontWeight:600,color:"#0f172a",marginBottom:8}}>用微信扫一扫</div>
      <div style={{fontSize:12,color:"#64748b",marginBottom:16}}>扫描二维码后，点击右上角「…」即可转发分享</div>
      <div style={{fontSize:12,color:"#94a3b8",marginBottom:20}}>或截图后分享至微信</div>
      <button onClick={()=>copy(shareUrl,"wechat")} style={{...ghostBtn,padding:"9px 28px",fontSize:13,color:copied==="wechat"?"#2563eb":"#374151"}}>
        {copied==="wechat"?"✓ 已复制链接":"复制链接发给微信好友"}
      </button>
    </div>
  </>;

  if (view==="qr") return <QRCodeModal url={shareUrl} label={qrLabel} onClose={()=>setView("main")} />;

  return <>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
      <div style={{fontSize:16,fontWeight:700,color:"#0f172a"}}>分享</div>
      <button onClick={onClose} style={{background:"none",border:"none",color:"#94a3b8",fontSize:20,cursor:"pointer"}}>✕</button>
    </div>
    <div style={{background:"#f8fafc",borderRadius:10,padding:"14px 16px",marginBottom:20,fontSize:12,color:"#374151",lineHeight:1.8,whiteSpace:"pre-line",wordBreak:"break-word",border:"1px solid #e2e8f0"}}>
      {shareText}
    </div>
    <div style={{display:"flex",gap:10,marginBottom:12}}>
      <button onClick={()=>setView("wechat")} style={{...ghostBtn,flex:1,fontSize:13}}>微信</button>
      <button onClick={()=>copy(shareUrl,"link")} style={{...ghostBtn,flex:1,fontSize:13,color:copied==="link"?"#2563eb":"#374151"}}>{copied==="link"?"✓ 已复制":"复制链接"}</button>
      <button onClick={()=>setView("qr")} style={{...ghostBtn,flex:1,fontSize:13}}>生成二维码</button>
      {typeof navigator!=="undefined"&&navigator.share&&
        <button onClick={()=>navigator.share({title,text:shareText,url:shareUrl})} style={{...ghostBtn,flex:1,fontSize:13}}>系统分享</button>}
    </div>
  </>;
}

// ─── Resource Detail Modal ────────────────────────────────────────────────────
function ResourceDetailModal({ resource, vendor, onClose }) {
  const [showShare, setShowShare] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const brand = getGpuBrand(resource.gpu);
  const shareUrl = `${window.location.origin}/resources/${resource.id}`;
  const countUnit = resource.countUnit || "卡";
  const qrLabel = `${resource.availableQuantity??resource.count}${countUnit} ${resource.gpu} 租赁资源`;

  const vendorName     = resource.vendorName     || vendor?.name          || "";
  const contactName    = resource.resContactName || resource.contactName  || vendor?.contactName  || "";
  const contactPhone   = resource.contactPhone   || vendor?.contactPhone  || "";
  const contactEmail   = resource.contactEmail   || vendor?.email         || "";
  const contactWechat  = resource.contactWechat  || vendor?.wechat        || "";
  const vendorLocation = resource.vendorLocation || vendor?.location      || "";
  const shareToken     = resource.shareToken     || vendor?.shareToken    || "";

  const shareText = `【GPU 资源】${resource.gpu}\n供应商：${vendorName}  ${resource.region}\n数量：${resource.availableQuantity??resource.count} ${countUnit}\n状态：${resource.status||"在线"}\n来源：${shareUrl}`;

  // 资源基本信息 — 空值跳过
  const basicItems = [
    ["GPU 品牌",   brand],
    ["GPU 型号",   resource.gpu],
    ["数量",       `${resource.availableQuantity??resource.count} ${countUnit}`],
    ["单价",       resource.price != null ? `${resource.price}/${resource.countUnit||"卡"}/时` : null],
    ["货币",       resource.currency || null],
    ["区域",       resource.region],
    ["机房位置",   resource.dcLocation || vendorLocation],
    ["状态",       resource.status || (resource.available ? "在线" : null)],
    ["显存",       resource.mem],
    ["内存带宽",   resource.bandwidth],
    ["交付形式",   resource.delivery],
    ["可用数量",   resource.availableQuantity != null ? String(resource.availableQuantity) : null],
    ["发布时间",   resource.createdAt],
  ].filter(([, v]) => v);

  // 联系人信息 — 空值跳过
  const contactItems = [
    ["公司名称", vendorName],
    ["联系人",   contactName],
    ["联系电话", contactPhone],
    ["微信",     contactWechat],
    ["电子邮箱", contactEmail],
  ].filter(([, v]) => v);

  const SectionLabel = ({ children }) => (
    <div style={{fontSize:10,fontWeight:700,color:"#94a3b8",letterSpacing:1,textTransform:"uppercase",marginBottom:8,marginTop:4}}>
      {children}
    </div>
  );

  const InfoGrid = ({ items }) => (
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:14}}>
      {items.map(([k, v]) => (
        <div key={k} style={{background:"#f8fafc",borderRadius:8,padding:"9px 12px",border:"1px solid #e2e8f0",minWidth:0}}>
          <div style={{fontSize:10,color:"#94a3b8",marginBottom:2,fontWeight:700,letterSpacing:0.5}}>{k}</div>
          <div style={{fontSize:13,fontWeight:600,color:"#374151",wordBreak:"break-all"}}>{v}</div>
        </div>
      ))}
    </div>
  );

  return (
    <Modal onClose={onClose} width={560}>
      {showShare
        ? <ShareSheet title={resource.gpu} shareText={shareText} shareUrl={shareUrl} qrLabel={qrLabel} onClose={()=>setShowShare(false)} />
        : <>
          {/* Header */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18}}>
            <div>
              <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:22,letterSpacing:1.5,color:"#0f172a"}}>{resource.gpu}</div>
              <span style={{display:"inline-block",marginTop:4,padding:"2px 10px",borderRadius:20,fontSize:11,fontWeight:600,background:"rgba(37,99,235,0.08)",color:"#2563eb"}}>{brand}</span>
            </div>
            <button onClick={onClose} style={{background:"none",border:"none",color:"#94a3b8",fontSize:20,cursor:"pointer",lineHeight:1}}>✕</button>
          </div>

          {/* 资源信息 */}
          <SectionLabel>资源信息</SectionLabel>
          <InfoGrid items={basicItems} />

          {/* Tags */}
          {resource.tags?.length > 0 && (
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
              {resource.tags.map(t => <Tag key={t} t={t} />)}
            </div>
          )}

          {/* 描述 */}
          {resource.desc && (
            <div style={{fontSize:13,color:"#475569",lineHeight:1.7,borderLeft:"2px solid #bfdbfe",paddingLeft:12,marginBottom:14}}>
              {resource.desc}
            </div>
          )}

          {/* 联系方式 */}
          {contactItems.length > 0 && <>
            <SectionLabel>联系方式</SectionLabel>
            <div style={{background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:10,padding:"12px 14px",marginBottom:14}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px 16px"}}>
                {contactItems.map(([k, v]) => (
                  <div key={k} style={{fontSize:12,minWidth:0}}>
                    <span style={{color:"#60a5fa",fontWeight:600}}>{k}：</span>
                    <span style={{color:"#1e3a5f",wordBreak:"break-all"}}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </>}

          {/* 供应商入口 */}
          {vendorName && <>
            <SectionLabel>供应商</SectionLabel>
            <div style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:10,padding:"11px 14px",marginBottom:16,display:"flex",alignItems:"center",gap:10}}>
              <Avatar text={vendorName.slice(0,2)} size={32} />
              <div style={{flex:1,minWidth:0}}>
                {shareToken
                  ? <a href={`/vendor/${shareToken}`} target="_blank" rel="noopener noreferrer"
                      style={{fontSize:14,fontWeight:700,color:"#2563eb",textDecoration:"none"}}>
                      {vendorName} ↗
                    </a>
                  : <span style={{fontSize:14,fontWeight:700,color:"#0f172a"}}>{vendorName}</span>
                }
                {vendorLocation && <div style={{fontSize:11,color:"#94a3b8",marginTop:2}}>{vendorLocation}</div>}
              </div>
            </div>
          </>}

          <div style={{display:"flex",gap:10}}>
            <button onClick={()=>setShowShare(true)} style={{...ghostBtn,flex:1}}>分享</button>
            <button onClick={()=>setShowQr(true)} style={{...ghostBtn,flex:1}}>生成二维码</button>
            <button onClick={onClose} style={{...primaryBtn,flex:2}}>关闭</button>
          </div>
        </>
      }
      {showQr && <QRCodeModal url={shareUrl} label={qrLabel} onClose={()=>setShowQr(false)} />}
    </Modal>
  );
}

// ─── GPU Model Group ──────────────────────────────────────────────────────────
function GpuModelGroup({ gpu, items, vendors, onDetailClick }) {
  const [expanded, setExpanded] = useState(false);
  const prices = items.map(r=>r.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const allTags = [...new Set(items.flatMap(r=>r.tags))].slice(0,3);
  const availableCount = items.filter(r=>r.available).length;

  return (
    <div style={{border:"1px solid #e2e8f0",borderRadius:12,overflow:"hidden",marginBottom:8,background:"#ffffff",boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
      <div
        onClick={()=>setExpanded(e=>!e)}
        style={{display:"flex",alignItems:"center",gap:14,padding:"14px 18px",background:expanded?"#f0f6ff":"#ffffff",cursor:"pointer",userSelect:"none",transition:"background 0.15s"}}
        onMouseEnter={e=>e.currentTarget.style.background="#f0f6ff"}
        onMouseLeave={e=>e.currentTarget.style.background=expanded?"#f0f6ff":"#ffffff"}
      >
        <span style={{fontSize:13,fontWeight:700,color:"#2563eb",display:"inline-block",transition:"transform 0.2s",transform:expanded?"rotate(90deg)":"rotate(0deg)",flexShrink:0,lineHeight:1}}>▶</span>
        <span style={{fontFamily:"'Bebas Neue',cursive",fontSize:17,letterSpacing:1.2,color:"#0f172a",flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{gpu}</span>
        <div style={{display:"flex",alignItems:"center",gap:16,flexShrink:0}}>
          <span className="desk-only" style={{fontSize:12,color:"#94a3b8"}}>{items.length}个供应商</span>
          <span style={{fontSize:14,fontWeight:700,color:"#2563eb",fontFamily:"'Bebas Neue',cursive"}}>
            ¥{minPrice===maxPrice?minPrice:`${minPrice}~${maxPrice}`}<span style={{fontSize:10,fontWeight:400,color:"#94a3b8",fontFamily:"'Noto Sans SC',sans-serif"}}>/卡/时</span>
          </span>
          <div className="desk-only" style={{display:"flex",gap:4}}>{allTags.map(t=><Tag key={t} t={t} />)}</div>
          <span style={{fontSize:11,color:availableCount>0?"#2563eb":"#94a3b8",fontWeight:600,minWidth:46}}>{availableCount>0?`● ${availableCount}可用`:"● 售罄"}</span>
        </div>
      </div>
      {expanded && (
        <div style={{borderTop:"1px solid #f1f5f9"}}>
          {items.map(r=>{
            const vendor = vendors.find(v=>v.id===r.vendorId);
            return (
              <div key={r.id} onClick={()=>onDetailClick(r)} className="gpu-row"
                style={{display:"flex",alignItems:"center",gap:12,padding:"11px 18px 11px 44px",borderBottom:"1px solid #f1f5f9",cursor:"pointer",transition:"background 0.12s"}}
                onMouseEnter={e=>e.currentTarget.style.background="#eef4ff"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}
              >
                <Avatar text={vendor?.name.slice(0,2)||"??"} size={26} />
                <span
                  style={{flex:1,fontSize:13,fontWeight:600,color:"#2563eb",cursor:"pointer",textDecoration:"underline",textDecorationColor:"transparent",transition:"text-decoration-color 0.15s"}}
                  onMouseEnter={e=>e.currentTarget.style.textDecorationColor="#2563eb"}
                  onMouseLeave={e=>e.currentTarget.style.textDecorationColor="transparent"}
                  onClick={e=>{
                    e.stopPropagation();
                    if(vendor?.shareToken) window.location.href=`/vendor/${vendor.shareToken}`;
                  }}
                >{vendor?.name||"—"}</span>
                <span className="desk-only" style={{fontSize:11,color:"#94a3b8"}}>⭐ {vendor?.rating||"—"}</span>
                <span className="desk-only" style={{fontSize:12,color:"#64748b",minWidth:36}}>{r.count}卡</span>
                <span className="desk-only" style={{fontSize:12,color:"#64748b",minWidth:28}}>{r.region}</span>
                <span style={{fontSize:14,fontWeight:700,color:"#2563eb",fontFamily:"'Bebas Neue',cursive",minWidth:80,textAlign:"right"}}>¥{r.price}<span style={{fontSize:10,fontWeight:400,color:"#94a3b8",fontFamily:"'Noto Sans SC',sans-serif"}}>/卡/时</span></span>
                <span style={{fontSize:11,color:r.available?"#2563eb":"#94a3b8",minWidth:40}}>{r.available?"● 可用":"● 售罄"}</span>
                <span style={{fontSize:16,fontWeight:700,color:"#94a3b8",lineHeight:1}}>›</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Post Requirement Modal ───────────────────────────────────────────────────
const GPU_BRAND_OPTS = ["NVIDIA", "华为", "AMD", "其他"];
const GPU_MODEL_BY_BRAND = {
  "NVIDIA": ["A100", "H100", "H200", "H20", "RTX 4090", "RTX 5090", "B300", "V100", "其他"],
  "华为":   ["Ascend 910B", "Ascend 910C", "Ascend 310P", "其他"],
  "AMD":    ["MI300X", "MI250X", "RX 7900 XTX", "其他"],
  "其他":   [],
  "":       ["A100", "H100", "H200", "H20", "RTX 4090", "RTX 5090", "B300", "Ascend 910B", "MI300X", "其他"],
};

function PostRequirementModal({ onClose, onSuccess, subscriberCount=0, vendor=null, initialDemand=null }) {
  const editMode = !!initialDemand;
  const [sent, setSent] = useState(false);
  const getInitialState = () => {
    if (!initialDemand) return {
      gpuBrand:"", gpuBrandOther:"",
      gpu:"", gpuOther:"", count:"", countUnit:"台",
      dcLocation:"", region:"国内", rentalMonths:"12", deliveryTime:"",
      deliveryType:"裸金属服务器", deliveryOther:"",
      contractType:"开口合同", paymentType:"预付", paymentOther:"",
      configReq:"", storageReq:"", bandwidthReq:"", publicIpReq:"",
      needExtraCpu:"否", extraCpuConfig:"",
      contactName: vendor?.contactName || "",
      contactPhone: vendor?.contactPhone || "",
      company: vendor?.name || "",
      contactEmail: vendor?.email || "",
      budgetText:"", notes:"",
    };
    const brand = initialDemand.gpu_brand || "";
    const knownBrand = GPU_BRAND_OPTS.includes(brand) ? brand : (brand ? "其他" : "");
    const modelList = GPU_MODEL_BY_BRAND[knownBrand] ?? GPU_MODEL_BY_BRAND[""];
    const gpuModel = initialDemand.gpu || "";
    const knownGpu = modelList.includes(gpuModel) ? gpuModel : (gpuModel ? "其他" : "");
    return {
      gpuBrand: knownBrand,
      gpuBrandOther: knownBrand === "其他" ? brand : "",
      gpu: knownGpu,
      gpuOther: knownGpu === "其他" ? gpuModel : "",
      count: String(initialDemand.count || ""),
      countUnit: initialDemand.count_unit || "台",
      dcLocation: initialDemand.dc_location || "",
      region: initialDemand.region || "国内",
      rentalMonths: String(initialDemand.rental_months || "12"),
      deliveryTime: initialDemand.delivery_time || "",
      deliveryType: initialDemand.delivery_type || initialDemand.delivery || "裸金属服务器",
      deliveryOther: initialDemand.delivery_other || "",
      contractType: initialDemand.contract_type || "开口合同",
      paymentType: initialDemand.payment_type || "预付",
      paymentOther: initialDemand.payment_other || "",
      configReq: initialDemand.config_req || "",
      storageReq: initialDemand.storage_req || "",
      bandwidthReq: initialDemand.bandwidth_req || "",
      publicIpReq: initialDemand.public_ip_req || "",
      needExtraCpu: initialDemand.need_extra_cpu ? "是" : "否",
      extraCpuConfig: initialDemand.extra_cpu_config || "",
      contactName: initialDemand.contact_name || vendor?.contactName || "",
      contactPhone: initialDemand.contact_phone || vendor?.contactPhone || "",
      company: initialDemand.company || vendor?.name || "",
      contactEmail: initialDemand.contact_email || vendor?.email || "",
      budgetText: initialDemand.budget_text || "",
      notes: initialDemand.notes || "",
    };
  };
  const [form, setForm] = useState(getInitialState);
  const set = k => e => setForm(f=>({...f,[k]:e.target.value}));

  const gpuOpts = GPU_MODEL_BY_BRAND[form.gpuBrand] ?? GPU_MODEL_BY_BRAND[""];

  const valid = Number(form.count)>0 &&
    form.contactName.trim() && form.contactPhone.trim() &&
    form.company.trim() && form.contactEmail.trim() &&
    form.gpuBrand.trim() &&
    (form.gpuBrand !== "其他" || form.gpuBrandOther.trim()) &&
    (form.gpu !== "其他" ? form.gpu.trim() : form.gpuOther.trim());

  const handleSubmit = () => {
    if (!valid) return;
    const today = new Date().toISOString().slice(0,10);
    const gpuBrandFull = form.gpuBrand === "其他" ? form.gpuBrandOther.trim() : form.gpuBrand;
    const gpuFull = form.gpu === "其他" ? form.gpuOther.trim() : form.gpu;
    const data = {
      id: initialDemand?.id || Date.now(),
      gpu_brand:gpuBrandFull,
      gpu:gpuFull, gpu_other:form.gpuOther,
      count:Number(form.count), gpu_count:Number(form.count), count_unit:form.countUnit,
      dc_location:form.dcLocation, region:form.region,
      rental_months:Number(form.rentalMonths)||1, delivery_time:form.deliveryTime,
      delivery_type:form.deliveryType, delivery_other:form.deliveryOther,
      contract_type:form.contractType, payment_type:form.paymentType, payment_other:form.paymentOther,
      config_req:form.configReq, storage_req:form.storageReq,
      bandwidth_req:form.bandwidthReq, public_ip_req:form.publicIpReq,
      need_extra_cpu:form.needExtraCpu==="是", extra_cpu_config:form.extraCpuConfig,
      contact_name:form.contactName, contact_phone:form.contactPhone,
      company:form.company, contact_email:form.contactEmail,
      budget_text:form.budgetText, notes:form.notes,
      delivery:form.deliveryType, tags:[], desc:form.notes,
      budget:0, contact:form.contactName, createdAt:today,
    };
    onSuccess?.(data);
    if (editMode) { onClose?.(); } else { setSent(true); }
  };

  const sl = {fontSize:11,fontWeight:700,color:"#2563eb",letterSpacing:1,marginBottom:10,marginTop:20,paddingBottom:8,borderBottom:"1px solid #e2e8f0"};
  const lbl = {display:"block",fontSize:12,color:"#64748b",marginBottom:5};
  const row2 = {display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 14px"};
  const Radio = ({opts,val,onChange}) => (
    <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12}}>
      {opts.map(o=>(
        <button type="button" key={o} onClick={()=>onChange(o)} style={{
          padding:"5px 12px",borderRadius:20,cursor:"pointer",fontSize:13,
          border:val===o?"1px solid #2563eb":"1px solid #e2e8f0",
          background:val===o?"rgba(37,99,235,0.08)":"transparent",
          color:val===o?"#2563eb":"#64748b",fontWeight:val===o?600:400,
        }}>{o}</button>
      ))}
    </div>
  );

  return (
    <Modal onClose={onClose} width={620}>
      {!sent ? <>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
          <div>
            <div style={{fontFamily:"'Noto Serif SC',serif",fontSize:20,fontWeight:700,color:"#0f172a"}}>{editMode?"编辑需求":"发布需求"}</div>
            <div style={{fontSize:12,color:"#64748b",marginTop:4}}>{editMode?"修改后点击保存 · * 为必填项":"供应商将主动与您联系报价 · * 为必填项"}</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#94a3b8",fontSize:20,cursor:"pointer"}}>✕</button>
        </div>
        {!editMode&&<div style={{background:"rgba(37,99,235,0.05)",border:"1px solid rgba(37,99,235,0.15)",borderRadius:10,padding:"10px 14px",marginBottom:4,fontSize:12,color:"#2563eb",display:"flex",alignItems:"center",gap:8}}>
          <span>📢</span><span>发布后将同步至【需求列表】，并推送至 <strong>{subscriberCount}</strong> 位订阅用户</span>
        </div>}

        <div style={sl}>一、基础租赁信息</div>
        <label style={lbl}>GPU 品牌 *</label>
        <Radio opts={GPU_BRAND_OPTS} val={form.gpuBrand}
          onChange={v=>setForm(f=>({...f, gpuBrand:v, gpuBrandOther:"", gpu:"", gpuOther:""}))} />
        {form.gpuBrand==="其他"&&(
          <input value={form.gpuBrandOther} onChange={set("gpuBrandOther")}
            placeholder="请输入品牌名称" style={{...inp,marginBottom:10}} />
        )}
        <label style={lbl}>GPU 型号 *</label>
        {gpuOpts.length > 0 ? (
          <>
            <Radio opts={gpuOpts} val={form.gpu}
              onChange={v=>setForm(f=>({...f, gpu:v, gpuOther:""}))} />
            {form.gpu==="其他"&&(
              <input value={form.gpuOther} onChange={e=>{set("gpuOther")(e); setForm(f=>({...f,gpu:"其他"}));}}
                placeholder="请输入 GPU 型号" style={{...inp,marginBottom:10}} />
            )}
          </>
        ) : (
          <input value={form.gpuOther} onChange={e=>setForm(f=>({...f,gpu:"其他",gpuOther:e.target.value}))}
            placeholder="请输入 GPU 型号" style={{...inp,marginBottom:10}} />
        )}
        <div style={row2}>
          <div>
            <label style={lbl}>租赁数量 *</label>
            <input value={form.count} onChange={set("count")} type="number" min="1" placeholder="例：8" style={inp} />
          </div>
          <div>
            <label style={lbl}>数量单位</label>
            <Radio opts={["台","卡"]} val={form.countUnit} onChange={v=>setForm(f=>({...f,countUnit:v}))} />
          </div>
        </div>
        <div style={row2}>
          <div>
            <label style={lbl}>机房位置</label>
            <input value={form.dcLocation} onChange={set("dcLocation")} placeholder="例：北京、上海、新加坡" style={inp} />
          </div>
          <div>
            <label style={lbl}>区域</label>
            <Radio opts={["国内","海外"]} val={form.region} onChange={v=>setForm(f=>({...f,region:v}))} />
          </div>
        </div>
        <div style={row2}>
          <div>
            <label style={lbl}>租赁周期（月）</label>
            <input value={form.rentalMonths} onChange={set("rentalMonths")} type="number" min="1" max="60" placeholder="例：12" style={inp} />
          </div>
          <div>
            <label style={lbl}>交付时间</label>
            <input value={form.deliveryTime} onChange={set("deliveryTime")} placeholder="例：2周内、2025年Q2" style={inp} />
          </div>
        </div>

        <div style={sl}>二、交付与合同信息</div>
        <label style={lbl}>交付形式</label>
        <Radio opts={["裸金属服务器","云主机","放客户机房","其他"]} val={form.deliveryType} onChange={v=>setForm(f=>({...f,deliveryType:v}))} />
        {form.deliveryType==="其他"&&<input value={form.deliveryOther} onChange={set("deliveryOther")} placeholder="请描述交付形式" style={inp} />}
        <div style={row2}>
          <div>
            <label style={lbl}>合同形式</label>
            <Radio opts={["开口合同","闭口合同"]} val={form.contractType} onChange={v=>setForm(f=>({...f,contractType:v}))} />
          </div>
          <div>
            <label style={lbl}>付款方式</label>
            <Radio opts={["预付","后付","其他"]} val={form.paymentType} onChange={v=>setForm(f=>({...f,paymentType:v}))} />
          </div>
        </div>
        {form.paymentType==="其他"&&<input value={form.paymentOther} onChange={set("paymentOther")} placeholder="请描述付款方式" style={inp} />}

        <div style={sl}>三、配置与资源要求</div>
        <div style={row2}>
          <div>
            <label style={lbl}>配置要求</label>
            <textarea value={form.configReq} onChange={set("configReq")} placeholder="CPU、内存、互联方式等" rows={3} style={{...inp,resize:"vertical"}} />
          </div>
          <div>
            <label style={lbl}>存储要求</label>
            <textarea value={form.storageReq} onChange={set("storageReq")} placeholder="存储类型、容量等" rows={3} style={{...inp,resize:"vertical"}} />
          </div>
        </div>
        <div style={row2}>
          <div>
            <label style={lbl}>带宽要求</label>
            <input value={form.bandwidthReq} onChange={set("bandwidthReq")} placeholder="例：10Gbps 内网" style={inp} />
          </div>
          <div>
            <label style={lbl}>公网 IP 要求</label>
            <input value={form.publicIpReq} onChange={set("publicIpReq")} placeholder="例：需 4 个固定 IP" style={inp} />
          </div>
        </div>
        <label style={lbl}>额外 CPU 服务器需求</label>
        <Radio opts={["否","是"]} val={form.needExtraCpu} onChange={v=>setForm(f=>({...f,needExtraCpu:v}))} />
        {form.needExtraCpu==="是"&&<textarea value={form.extraCpuConfig} onChange={set("extraCpuConfig")} placeholder="请描述 CPU 服务器配置要求" rows={2} style={{...inp,resize:"vertical"}} />}

        <div style={sl}>四、联系人信息（必填）</div>
        <div style={row2}>
          <div>
            <label style={lbl}>联系人姓名 *</label>
            <input value={form.contactName} onChange={set("contactName")} placeholder="张三" style={inp} />
          </div>
          <div>
            <label style={lbl}>联系电话 *</label>
            <input value={form.contactPhone} onChange={set("contactPhone")} placeholder="138xxxx8888" style={inp} />
          </div>
        </div>
        <div style={row2}>
          <div>
            <label style={lbl}>公司名称 *</label>
            <input value={form.company} onChange={set("company")} placeholder="例：某某科技有限公司" style={inp} />
          </div>
          <div>
            <label style={lbl}>电子邮箱 *</label>
            <input value={form.contactEmail} onChange={set("contactEmail")} placeholder="example@company.com" style={inp} />
          </div>
        </div>
        <label style={lbl}>预算</label>
        <input value={form.budgetText} onChange={set("budgetText")} placeholder="例：160000.00/台/月" style={inp} />
        <label style={lbl}>备注说明</label>
        <textarea value={form.notes} onChange={set("notes")} placeholder="其他补充说明..." rows={2} style={{...inp,resize:"vertical"}} />

        <div style={{display:"flex",gap:10,marginTop:8}}>
          <button onClick={onClose} style={{...ghostBtn,flex:1}}>取消</button>
          <button onClick={handleSubmit} style={{...primaryBtn,flex:2,opacity:valid?1:0.4,cursor:valid?"pointer":"default"}}>{editMode?"保存修改":"发布需求"}</button>
        </div>
      </> : <div style={{textAlign:"center",padding:"28px 0"}}>
        <div style={{fontSize:44,marginBottom:12}}>📋</div>
        <div style={{fontSize:18,fontWeight:700,marginBottom:6,color:"#0f172a"}}>需求已发布！</div>
        <div style={{fontSize:13,color:"#64748b",marginBottom:4}}>已同步至【需求列表】</div>
        <div style={{fontSize:12,color:"#2563eb",marginBottom:24}}>已推送至 {subscriberCount} 位订阅用户</div>
        <button onClick={onClose} style={{...primaryBtn,padding:"10px 32px"}}>完成</button>
      </div>}
    </Modal>
  );
}

// ─── Post Resource From Demand Modal ─────────────────────────────────────────
function PostResourceFromDemandModal({ onClose, onSuccess, subscriberCount=0 }) {
  const [sent, setSent] = useState(false);
  const empty = {
    brand:"", gpuModel:"", vram:"",
    delivery:"裸金属", count:"", billingUnit:"台/月", countUnit:"台",
    price:"", currency:"人民币",
    region:"国内", dcLocation:"",
    contract:"", paymentTerms:"",
    status:"可售", onlineTime:"",
    config:"", company:"", contactName:"", contact:"",
  };
  const [form, setForm] = useState(empty);
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [gpuBrands, setGpuBrands] = useState([]);
  const [gpuSeriesList, setGpuSeriesList] = useState([]);
  const [gpuModelsList, setGpuModelsList] = useState([]);
  const [selBrandId, setSelBrandId] = useState(null);
  const [selSeriesId, setSelSeriesId] = useState(null);
  useEffect(()=>{
    fetch(`${API}/api/gpu-brands`).then(r=>r.json()).then(setGpuBrands).catch(()=>{});
  },[]);
  const set = k => e => setForm(f=>({...f,[k]:e.target.value}));
  const handleBrand = (brandId, brandName) => {
    setSelBrandId(brandId); setSelSeriesId(null); setGpuSeriesList([]); setGpuModelsList([]);
    setForm(f=>({...f, brand:brandName, gpuModel:"", vram:""}));
    fetch(`${API}/api/gpu-series?brand_id=${brandId}`).then(r=>r.json()).then(setGpuSeriesList).catch(()=>{});
  };
  const handleSeriesChange = (seriesId) => {
    setSelSeriesId(seriesId); setGpuModelsList([]);
    setForm(f=>({...f, gpuModel:"", vram:""}));
    fetch(`${API}/api/gpu-models?series_id=${seriesId}`).then(r=>r.json()).then(setGpuModelsList).catch(()=>{});
  };
  const handleModel = (modelId) => {
    const m = gpuModelsList.find(x=>x.id===modelId);
    if(m) setForm(f=>({...f, gpuModel:m.name, vram: m.vram_gb ? `${m.vram_gb}GB` : f.vram}));
  };

  const required = [form.brand,form.gpuModel,form.vram,form.delivery,form.count,
    form.billingUnit,form.price,form.currency,form.region,form.dcLocation,
    form.contract,form.paymentTerms,form.status,form.config,form.contact,form.company];
  const valid = required.every(v=>String(v).trim()!=="") && Number(form.count)>0 && Number(form.price)>0;

  const handleFileUpload = async (file) => {
    if (!file) return;
    setUploadedFile(file.name);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${API}/api/extract-info`, { method:"POST", body:fd });
      if (!res.ok) throw new Error(await res.text());
      const d = await res.json();
      setForm(f=>({
        ...f,
        ...(d.gpu_model          ? {gpuModel:     d.gpu_model}               : {}),
        ...(d.quantity != null   ? {count:         String(d.quantity)}        : {}),
        ...(d.quantity_unit      ? {billingUnit:   d.quantity_unit}           : {}),
        ...(d.location           ? {dcLocation:    d.location}                : {}),
        ...(d.delivery_type      ? {delivery:      d.delivery_type}           : {}),
        ...(d.contract_type      ? {contract:      d.contract_type}           : {}),
        ...(d.payment_type       ? {paymentTerms:  d.payment_type}            : {}),
        ...(d.config_requirements? {config:        d.config_requirements}     : {}),
        ...(d.company_name       ? {company:       d.company_name}            : {}),
        ...((d.contact_phone||d.contact_name)
          ? {contact: [d.contact_name, d.contact_phone].filter(Boolean).join(" ")} : {}),
      }));
    } catch(e) {
      alert("识别失败：" + e.message);
      setUploadedFile(null);
    } finally { setUploading(false); }
  };

  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState("");

  const handle = async () => {
    if (!valid || submitting) return;
    setSubmitting(true); setSubmitErr("");
    try {
      const gpuLabel = `${form.brand} ${form.gpuModel}`;

      // 1. 保存供应商
      const vRes = await fetch(`${API}/api/vendors`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ name:form.company, location:form.region||"国内" }),
      });
      if (!vRes.ok) throw new Error("供应商创建失败：" + await vRes.text());
      const savedVendor = await vRes.json();

      // 2. 保存资源
      const rRes = await fetch(`${API}/api/resources`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          vendorId: savedVendor.id,
          gpu: gpuLabel, mem: form.vram, bandwidth: "",
          count: Number(form.count), price: Number(form.price),
          delivery: form.delivery, region: form.region,
          available: form.status === "可售", tags: [], desc: form.config,
          billing_unit: form.billingUnit,
          contact_name: form.contactName || null,
          count_unit: form.countUnit || "台",
        }),
      });
      if (!rRes.ok) throw new Error("资源发布失败：" + await rRes.text());
      const savedResource = await rRes.json();

      onSuccess(savedVendor, savedResource);
      setSent(true);
    } catch(e) {
      setSubmitErr(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const sl = { fontSize:11, fontWeight:700, color:"#2563eb", letterSpacing:1, marginBottom:12, marginTop:20, paddingBottom:8, borderBottom:"1px solid #e2e8f0" };
  const lbl = { display:"block", fontSize:12, color:"#64748b", marginBottom:5 };
  const row2 = { display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 14px" };

  return (
    <Modal onClose={onClose} width={680}>
      {!sent ? <>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
          <div>
            <div style={{fontFamily:"'Noto Serif SC',serif",fontSize:20,fontWeight:700,color:"#0f172a"}}>发布资源</div>
            <div style={{fontSize:12,color:"#64748b",marginTop:4}}>* 为必填项</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#94a3b8",fontSize:20,cursor:"pointer"}}>✕</button>
        </div>
        <div style={{background:"rgba(37,99,235,0.05)",border:"1px solid rgba(37,99,235,0.15)",borderRadius:10,padding:"10px 14px",marginBottom:4,fontSize:12,color:"#2563eb",display:"flex",alignItems:"center",gap:8}}>
          <span>📢</span><span>发布后将同步至【资源列表】，并推送至 <strong>{subscriberCount}</strong> 位订阅用户</span>
        </div>

        {/* 上传区域 */}
        <div
          onDragOver={e=>e.preventDefault()}
          onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f)handleFileUpload(f);}}
          onClick={()=>!uploading&&document.getElementById("extract-file-input").click()}
          style={{border:"2px dashed #93c5fd",borderRadius:12,padding:"16px 20px",marginBottom:20,marginTop:12,
            cursor:uploading?"default":"pointer",background:"#eff6ff",
            display:"flex",alignItems:"center",gap:12}}
        >
          <input id="extract-file-input" type="file"
            accept=".png,.jpg,.jpeg,.pdf,.docx,.xlsx"
            style={{display:"none"}}
            onChange={e=>{const f=e.target.files?.[0];if(f)handleFileUpload(f);e.target.value="";}}
          />
          <span style={{fontSize:22,flexShrink:0}}>📎</span>
          <div style={{flex:1,minWidth:0}}>
            {uploading ? (
              <div style={{fontSize:14,color:"#2563eb",fontWeight:600}}>正在识别中，请稍候…</div>
            ) : uploadedFile ? (
              <div style={{fontSize:13,color:"#16a34a",fontWeight:600}}>✓ 已识别：{uploadedFile}，表单已自动填充，可手动修改</div>
            ) : (
              <>
                <div style={{fontSize:14,fontWeight:600,color:"#1d4ed8"}}>上传文件或截图，自动提取信息</div>
                <div style={{fontSize:12,color:"#64748b",marginTop:2}}>支持 PNG / JPG / PDF / DOCX / XLSX，拖拽或点击上传</div>
              </>
            )}
          </div>
        </div>

        <div style={sl}>GPU 信息</div>
        <div style={row2}>
          <div>
            <label style={lbl}>品牌 *</label>
            <select value={selBrandId||""} onChange={e=>{const b=gpuBrands.find(x=>x.id===parseInt(e.target.value));if(b)handleBrand(b.id,b.name);}} style={inp}>
              <option value="">请选择品牌</option>
              {gpuBrands.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>GPU 系列 *</label>
            <select value={selSeriesId||""} onChange={e=>handleSeriesChange(parseInt(e.target.value))} disabled={!selBrandId} style={inp}>
              <option value="">请选择系列</option>
              {gpuSeriesList.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
        <div style={row2}>
          <div>
            <label style={lbl}>GPU 型号 *</label>
            <select value={gpuModelsList.find(m=>m.name===form.gpuModel)?.id||""} onChange={e=>handleModel(parseInt(e.target.value))} disabled={!selSeriesId} style={inp}>
              <option value="">请选择型号</option>
              {gpuModelsList.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div><label style={lbl}>显存 *</label><input value={form.vram} onChange={set("vram")} placeholder="自动填充或手动输入，如 80GB" style={inp} /></div>
        </div>
        <div><label style={lbl}>配置说明 *</label><textarea value={form.config} onChange={set("config")} placeholder="描述互联方式、网络带宽、存储配置等硬件规格" rows={2} style={{...inp,resize:"vertical"}} /></div>

        <div style={sl}>租赁条件</div>
        <div style={row2}>
          <div><label style={lbl}>交付形式 *</label><select value={form.delivery} onChange={set("delivery")} style={inp}><option>裸金属</option><option>云平台</option></select></div>
          <div><label style={lbl}>资源状态 *</label><select value={form.status} onChange={set("status")} style={inp}><option>可售</option><option>预售</option></select></div>
        </div>
        <div style={row2}>
          <div><label style={lbl}>可租数量 *</label><input value={form.count} onChange={set("count")} type="number" min="1" placeholder="256" style={inp} /></div>
          <div>
            <label style={lbl}>数量单位 *</label>
            <div style={{display:"flex",gap:16,alignItems:"center",height:40}}>
              <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:14}}>
                <input type="radio" name="countUnit" value="台" checked={form.countUnit==="台"} onChange={set("countUnit")} style={{cursor:"pointer"}} />
                台
              </label>
              <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:14}}>
                <input type="radio" name="countUnit" value="卡" checked={form.countUnit==="卡"} onChange={set("countUnit")} style={{cursor:"pointer"}} />
                卡
              </label>
            </div>
          </div>
        </div>
        <div style={row2}>
          <div><label style={lbl}>计费单位 *</label><select value={form.billingUnit} onChange={set("billingUnit")} style={inp}><option>台/月</option><option>卡/时</option></select></div>
        <div style={row2}>
          <div><label style={lbl}>单价 *</label><input value={form.price} onChange={set("price")} type="number" min="0" step="0.01" placeholder="75000" style={inp} /></div>
          <div><label style={lbl}>货币 *</label><select value={form.currency} onChange={set("currency")} style={inp}><option>人民币</option><option>美金</option></select></div>
        </div>
        {form.status==="预售"&&<div><label style={lbl}>预计上线时间</label><input value={form.onlineTime} onChange={set("onlineTime")} placeholder="如：4月初、2026-Q2" style={inp} /></div>}

        <div style={sl}>位置信息</div>
        <div style={row2}>
          <div><label style={lbl}>区域 *</label><select value={form.region} onChange={set("region")} style={inp}><option>国内</option><option>海外</option></select></div>
          <div><label style={lbl}>机房位置 *</label><input value={form.dcLocation} onChange={set("dcLocation")} placeholder="如：内蒙古、北京、新加坡" style={inp} /></div>
        </div>

        <div style={sl}>商务条款</div>
        <div style={row2}>
          <div><label style={lbl}>合同要求 *</label><input value={form.contract} onChange={set("contract")} placeholder="如：3年闭口" style={inp} /></div>
          <div><label style={lbl}>付款要求 *</label><input value={form.paymentTerms} onChange={set("paymentTerms")} placeholder="如：押一付三" style={inp} /></div>
        </div>

        <div style={sl}>联系信息</div>
        <div style={row2}>
          <div><label style={lbl}>公司名称 *</label><input value={form.company} onChange={set("company")} placeholder="例：极光算力 AuroraAI" style={inp} /></div>
          <div><label style={lbl}>联系人</label><input value={form.contactName} onChange={set("contactName")} placeholder="选填" style={inp} /></div>
        </div>
        <div><label style={lbl}>联系方式 *</label><input value={form.contact} onChange={set("contact")} placeholder="手机 / 微信 / 邮箱" style={inp} /></div>

        {submitErr && <div style={{fontSize:12,color:"#dc2626",marginBottom:8}}>{submitErr}</div>}
        <div style={{display:"flex",gap:10,marginTop:8}}>
          <button onClick={onClose} style={{...ghostBtn,flex:1}}>取消</button>
          <button onClick={handle} disabled={!valid||submitting} style={{...primaryBtn,flex:2,opacity:(valid&&!submitting)?1:0.4,cursor:(valid&&!submitting)?"pointer":"default"}}>{submitting?"发布中...":"发布资源"}</button>
        </div>
      </> : <div style={{textAlign:"center",padding:"28px 0"}}>
        <div style={{fontSize:44,marginBottom:12}}>✅</div>
        <div style={{fontSize:18,fontWeight:700,marginBottom:6,color:"#0f172a"}}>资源已发布！</div>
        <div style={{fontSize:13,color:"#64748b",marginBottom:4}}>已同步至【资源列表】</div>
        <div style={{fontSize:12,color:"#2563eb",marginBottom:24}}>已推送至 {subscriberCount} 位订阅用户</div>
        <button onClick={onClose} style={{...primaryBtn,padding:"10px 32px"}}>完成</button>
      </div>}
    </Modal>
  );
}

// ─── Vendor Row ───────────────────────────────────────────────────────────────
function VendorRow({ vendor, resources, onDetailClick, onContactClick, autoExpand }) {
  const [expanded, setExpanded] = useState(autoExpand||false);
  const [showShare, setShowShare] = useState(false);
  const availableCount = resources.filter(r=>r.available).length;
  const minPrice = resources.length ? Math.min(...resources.map(r=>r.price)) : null;
  const shareUrl = `https://www.neocloud.market?vendor=${vendor.id}`;
  const shareText = `【GPU 供应商】${vendor.name}\n评分：⭐${vendor.rating}（${vendor.reviews} 评价）· ${vendor.location}\n资源：${resources.length} 个 · 最低 ¥${minPrice??"—"}/卡/时起\n入驻：${vendor.joined}\n来源：${shareUrl}`;

  return (
    <div style={{border:"1px solid #e2e8f0",borderRadius:12,overflow:"hidden",marginBottom:8,background:"#ffffff",boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
      <div onClick={()=>setExpanded(e=>!e)}
        style={{display:"flex",alignItems:"center",gap:14,padding:"14px 18px",background:expanded?"#f8fafc":"#ffffff",cursor:"pointer",userSelect:"none"}}
        onMouseEnter={e=>e.currentTarget.style.background="#f8fafc"}
        onMouseLeave={e=>e.currentTarget.style.background=expanded?"#f8fafc":"#ffffff"}
      >
        <span style={{fontSize:11,color:"#2563eb",display:"inline-block",transition:"transform 0.2s",transform:expanded?"rotate(90deg)":"rotate(0deg)",flexShrink:0}}>▶</span>
        <Avatar text={vendor.name.slice(0,2)} size={32} />
        <div style={{flex:1,minWidth:0}}>
          <span style={{fontWeight:700,fontSize:14,color:"#0f172a"}}>{vendor.name}</span>
          <span style={{fontSize:12,color:"#94a3b8",marginLeft:10}}>{vendor.location} · 入驻 {vendor.joined}</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:18,flexShrink:0}}>
          <span style={{fontSize:12,color:"#64748b"}}>⭐ {vendor.rating}（{vendor.reviews}评价）</span>
          <span style={{fontSize:12,color:"#94a3b8"}}>{resources.length}个资源</span>
          {minPrice!==null&&<span style={{fontSize:14,fontWeight:700,color:"#2563eb",fontFamily:"'Bebas Neue',cursive"}}>¥{minPrice}<span style={{fontSize:10,fontWeight:400,color:"#94a3b8",fontFamily:"'Noto Sans SC',sans-serif"}}>/卡/时起</span></span>}
          <span style={{fontSize:11,color:availableCount>0?"#2563eb":"#94a3b8",fontWeight:600,minWidth:46}}>{availableCount>0?`● ${availableCount}可用`:"● 无可用"}</span>
          <button onClick={e=>{e.stopPropagation();setShowShare(true);}} style={{padding:"5px 14px",background:"transparent",border:"1px solid #e2e8f0",borderRadius:6,color:"#64748b",fontSize:12,cursor:"pointer"}}>分享</button>
          <button onClick={e=>{e.stopPropagation();onContactClick(vendor);}} style={{padding:"5px 14px",background:"transparent",border:"1px solid rgba(37,99,235,0.3)",borderRadius:6,color:"#2563eb",fontSize:12,fontWeight:600,cursor:"pointer"}}>联系</button>
        </div>
      </div>
      {expanded && (
        <div style={{borderTop:"1px solid #f1f5f9"}}>
          {resources.length===0&&<div style={{padding:"20px 60px",color:"#94a3b8",fontSize:13}}>该供应商暂未发布资源</div>}
          {resources.map(r=>(
            <div key={r.id} onClick={()=>onDetailClick(r)}
              style={{display:"flex",alignItems:"center",gap:12,padding:"11px 18px 11px 60px",borderBottom:"1px solid #f1f5f9",cursor:"pointer"}}
              onMouseEnter={e=>e.currentTarget.style.background="#f8fafc"}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}
            >
              <span style={{fontFamily:"'Bebas Neue',cursive",fontSize:14,letterSpacing:1,color:"#0f172a",flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.gpu}</span>
              <div style={{display:"flex",gap:4}}>{r.tags.slice(0,2).map(t=><Tag key={t} t={t} />)}</div>
              <span style={{fontSize:12,color:"#64748b",minWidth:36}}>{r.count}卡</span>
              <span style={{fontSize:12,color:"#64748b",minWidth:28}}>{r.region}</span>
              <span style={{fontSize:14,fontWeight:700,color:"#2563eb",fontFamily:"'Bebas Neue',cursive",minWidth:80,textAlign:"right"}}>¥{r.price}<span style={{fontSize:10,fontWeight:400,color:"#94a3b8",fontFamily:"'Noto Sans SC',sans-serif"}}>/卡/时</span></span>
              <span style={{fontSize:11,color:r.available?"#2563eb":"#94a3b8",minWidth:40}}>{r.available?"● 可用":"● 售罄"}</span>
              <span style={{fontSize:13,color:"#94a3b8"}}>›</span>
            </div>
          ))}
        </div>
      )}
      {showShare&&<Modal onClose={()=>setShowShare(false)} width={420}><ShareSheet title={vendor.name} shareText={shareText} shareUrl={shareUrl} onClose={()=>setShowShare(false)} /></Modal>}
    </div>
  );
}

// ─── Subscribe Modal ──────────────────────────────────────────────────────────
function SubscribeModal({ onClose, onSuccess }) {
  const [tab, setTab] = useState("wechat");
  const [email, setEmail] = useState("");
  const [topics, setTopics] = useState(["resources","demands"]);
  const [sendKey, setSendKey] = useState("");
  const [gpuKw, setGpuKw] = useState("");
  const [region, setRegion] = useState("");
  const [selTags, setSelTags] = useState([]);
  const [done, setDone] = useState(false);
  const [doneTab, setDoneTab] = useState("wechat");

  const toggleTopic = t => setTopics(ts=>ts.includes(t)?ts.filter(x=>x!==t):[...ts,t]);
  const toggleTag   = t => setSelTags(ts=>ts.includes(t)?ts.filter(x=>x!==t):[...ts,t]);

  const emailValid  = email.trim().includes("@") && topics.length>0;
  const wechatValid = sendKey.trim().length>0;
  const valid = tab==="email" ? emailValid : wechatValid;

  const handle = () => {
    if (!valid) return;
    if (tab==="email") {
      onSuccess({ type:"email", email:email.trim(), topics });
    } else {
      const filters = {};
      if (gpuKw.trim()) filters.gpu = gpuKw.trim();
      if (region) filters.region = region;
      if (selTags.length>0) filters.tags = selTags;
      onSuccess({ type:"wechat", sendKey:sendKey.trim(), filters });
    }
    setDoneTab(tab);
    setDone(true);
  };

  return (
    <Modal onClose={onClose} width={440}>
      {!done ? <>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
          <div>
            <div style={{fontFamily:"'Noto Serif SC',serif",fontSize:20,fontWeight:700,color:"#0f172a"}}>订阅更新</div>
            <div style={{fontSize:12,color:"#64748b",marginTop:4}}>第一时间获取新资源上线和需求发布通知</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#94a3b8",fontSize:20,cursor:"pointer"}}>✕</button>
        </div>
        <div style={{display:"flex",gap:0,marginBottom:20,borderBottom:"1px solid #e2e8f0"}}>
          {[["email","📧 邮件订阅"],["wechat","📱 微信推送"]].map(([t,l])=>(
            <button key={t} onClick={()=>setTab(t)} style={{padding:"8px 16px",border:"none",background:"none",borderBottom:`2px solid ${tab===t?"#2563eb":"transparent"}`,color:tab===t?"#2563eb":"#64748b",cursor:"pointer",fontSize:13,fontWeight:tab===t?600:400,marginBottom:-1}}>
              {l}
            </button>
          ))}
        </div>
        {tab==="email" ? <>
          <label style={{display:"block",fontSize:12,color:"#64748b",marginBottom:6}}>邮箱地址 *</label>
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="your@email.com" type="email" style={inp} />
          <label style={{display:"block",fontSize:12,color:"#64748b",marginBottom:10}}>订阅内容</label>
          <div style={{display:"flex",gap:10,marginBottom:24}}>
            {[["resources","🖥️ 新资源上线"],["demands","📋 新需求发布"]].map(([t,l])=>(
              <button key={t} type="button" onClick={()=>toggleTopic(t)} style={{flex:1,padding:"12px 10px",borderRadius:10,border:`1px solid ${topics.includes(t)?"rgba(37,99,235,0.4)":"#e2e8f0"}`,background:topics.includes(t)?"rgba(37,99,235,0.06)":"transparent",color:topics.includes(t)?"#2563eb":"#64748b",cursor:"pointer",fontSize:13,fontWeight:topics.includes(t)?600:400}}>
                {topics.includes(t)?"✓ ":""}{l}
              </button>
            ))}
          </div>
        </> : <>
          <label style={{display:"block",fontSize:12,color:"#64748b",marginBottom:4}}>Server酱 SendKey *</label>
          <div style={{fontSize:11,color:"#94a3b8",marginBottom:6}}>前往 <a href="https://sct.ftqq.com" target="_blank" rel="noreferrer" style={{color:"#2563eb"}}>sct.ftqq.com</a> 获取 SendKey</div>
          <input value={sendKey} onChange={e=>setSendKey(e.target.value)} placeholder="SCT..." style={inp} />
          <label style={{display:"block",fontSize:12,color:"#64748b",marginBottom:6}}>GPU 关键词（选填，如 H100）</label>
          <input value={gpuKw} onChange={e=>setGpuKw(e.target.value)} placeholder="不填=全部" style={inp} />
          <label style={{display:"block",fontSize:12,color:"#64748b",marginBottom:6}}>地区</label>
          <select value={region} onChange={e=>setRegion(e.target.value)} style={{...inp,marginBottom:16}}>
            <option value="">全部</option>
            <option value="国内">国内</option>
            <option value="海外">海外</option>
          </select>
          <label style={{display:"block",fontSize:12,color:"#64748b",marginBottom:8}}>标签（不选=全部）</label>
          <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:24}}>
            {["训练","推理","大模型","微调","渲染","多模态"].map(t=>(
              <button key={t} type="button" onClick={()=>toggleTag(t)} style={{padding:"6px 14px",borderRadius:20,border:`1px solid ${selTags.includes(t)?"rgba(37,99,235,0.4)":"#e2e8f0"}`,background:selTags.includes(t)?"rgba(37,99,235,0.06)":"transparent",color:selTags.includes(t)?"#2563eb":"#64748b",cursor:"pointer",fontSize:12,fontWeight:selTags.includes(t)?600:400}}>
                {t}
              </button>
            ))}
          </div>
        </>}
        <button onClick={handle} disabled={!valid} style={{...primaryBtn,width:"100%",opacity:valid?1:0.4,cursor:valid?"pointer":"default"}}>立即订阅</button>
      </> : <div style={{textAlign:"center",padding:"28px 0"}}>
        <div style={{fontSize:44,marginBottom:12}}>🎉</div>
        <div style={{fontSize:18,fontWeight:700,marginBottom:6,color:"#0f172a"}}>订阅成功！</div>
        <div style={{fontSize:13,color:"#64748b",marginBottom:24}}>{doneTab==="email"?"我们将通过邮件第一时间通知您":"微信推送已开启，新资源/需求将实时通知您"}</div>
        <button onClick={onClose} style={{...primaryBtn,padding:"10px 32px"}}>完成</button>
      </div>}
    </Modal>
  );
}

// ─── Memory Publish Modal ─────────────────────────────────────────────────────
function MemoryPublishModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    title:"", listing_type:"出售", brand:"三星Samsung", generation:"DDR5",
    capacity_per_stick:"64GB", quantity:"", frequency:"4800MHz",
    condition:"全新", warranty:"1年", description:"",
    price_per_stick:"", tax_included:"含税", invoice_one_to_one:true,
    payment_method:"款齐发货", shipping_method:"快递（买家承担运费）",
    location:"", contact_name:"", contact_info:""
  });
  const [saving, setSaving] = useState(false);
  const set = k => e => setForm(f=>({...f,[k]:e.target.value}));
  const lbl = {display:"block",fontSize:12,color:"#64748b",marginBottom:4};
  const valid = form.title.trim()&&form.quantity&&form.location.trim()&&form.contact_name.trim()&&form.contact_info.trim();

  const handle = async () => {
    if (!valid||saving) return;
    setSaving(true);
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`${API}/api/memory-listings`,{
        method:"POST",
        headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},
        body:JSON.stringify({...form,quantity:Number(form.quantity),price_per_stick:form.price_per_stick?Number(form.price_per_stick):null,invoice_one_to_one:form.invoice_one_to_one})
      });
      if (res.ok) { const data=await res.json(); onSuccess(data); }
    } finally { setSaving(false); }
  };

  const sel = (k,opts) => (
    <select value={form[k]} onChange={set(k)} style={{...inp,marginBottom:12}}>
      {opts.map(o=><option key={o} value={o}>{o}</option>)}
    </select>
  );

  return (
    <Modal onClose={onClose} width={620}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
        <div>
          <div style={{fontFamily:"'Noto Serif SC',serif",fontSize:20,fontWeight:700,color:"#0f172a"}}>发布内存条</div>
          <div style={{fontSize:12,color:"#64748b",marginTop:4}}>硬件交易 · 内存条</div>
        </div>
        <button onClick={onClose} style={{background:"none",border:"none",color:"#94a3b8",fontSize:20,cursor:"pointer"}}>✕</button>
      </div>

      <div style={{fontSize:13,fontWeight:700,color:"#0f172a",marginBottom:12,paddingBottom:8,borderBottom:"1px solid #f1f5f9"}}>产品信息</div>
      <label style={lbl}>标题 *</label>
      <input value={form.title} onChange={set("title")} placeholder="例：三星 DDR5 64G 6400MHz 原条出售" style={inp} />
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <div><label style={lbl}>类型</label>{sel("listing_type",["出售","求购","出租"])}</div>
        <div><label style={lbl}>品牌</label>{sel("brand",["三星Samsung","海力士SK Hynix","镁光Micron","金士顿Kingston","其他"])}</div>
        <div><label style={lbl}>代数</label>{sel("generation",["DDR3","DDR4","DDR5"])}</div>
        <div><label style={lbl}>单条容量</label>{sel("capacity_per_stick",["8GB","16GB","32GB","64GB","96GB","128GB","其他"])}</div>
        <div><label style={lbl}>数量（条）*</label><input type="number" min="1" value={form.quantity} onChange={set("quantity")} placeholder="数量" style={inp} /></div>
        <div><label style={lbl}>频率</label>{sel("frequency",["2666MHz","3200MHz","4800MHz","5600MHz","6400MHz","其他"])}</div>
        <div><label style={lbl}>成色</label>{sel("condition",["全新","拆机"])}</div>
        <div><label style={lbl}>质保时间</label>{sel("warranty",["无","3个月","6个月","1年","2年","3年"])}</div>
      </div>
      <label style={lbl}>补充说明</label>
      <textarea value={form.description} onChange={set("description")} placeholder="使用时长、测试情况、附赠配件等..." rows={3} style={{...inp,resize:"vertical"}} />

      <div style={{fontSize:13,fontWeight:700,color:"#0f172a",marginBottom:12,paddingBottom:8,borderBottom:"1px solid #f1f5f9",marginTop:4}}>交易信息</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <div><label style={lbl}>单价（元/条）</label><input type="number" min="0" value={form.price_per_stick} onChange={set("price_per_stick")} placeholder="单价" style={inp} /></div>
        <div><label style={lbl}>含税</label>{sel("tax_included",["含税","不含税"])}</div>
        <div>
          <label style={lbl}>发票一对一</label>
          <div style={{display:"flex",gap:12,marginBottom:12}}>
            {[["是",true],["否",false]].map(([l,v])=>(
              <label key={l} style={{display:"flex",alignItems:"center",gap:6,fontSize:13,cursor:"pointer"}}>
                <input type="radio" checked={form.invoice_one_to_one===v} onChange={()=>setForm(f=>({...f,invoice_one_to_one:v}))} />
                {l}
              </label>
            ))}
          </div>
        </div>
        <div><label style={lbl}>交易方式</label>{sel("payment_method",["款齐发货","预付定金","货到付款","其他"])}</div>
        <div style={{gridColumn:"span 2"}}><label style={lbl}>发货方式</label>{sel("shipping_method",["快递（买家承担运费）","快递（卖家承担运费）","自提","其他"])}</div>
        <div style={{gridColumn:"span 2"}}><label style={lbl}>所在地 *</label><input value={form.location} onChange={set("location")} placeholder="请输入城市或地区，例：深圳" style={inp} /></div>
      </div>

      <div style={{fontSize:13,fontWeight:700,color:"#0f172a",marginBottom:12,paddingBottom:8,borderBottom:"1px solid #f1f5f9"}}>联系方式</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <div><label style={lbl}>联系人 *</label><input value={form.contact_name} onChange={set("contact_name")} placeholder="昵称或姓名" style={inp} /></div>
        <div><label style={lbl}>联系方式 *</label><input value={form.contact_info} onChange={set("contact_info")} placeholder="手机号 / 微信 / QQ" style={inp} /></div>
      </div>

      <button onClick={handle} disabled={!valid||saving} style={{...primaryBtn,width:"100%",opacity:(!valid||saving)?0.4:1}}>
        {saving?"发布中...":"发布"}
      </button>
    </Modal>
  );
}

// ─── Memory Edit Modal ────────────────────────────────────────────────────────
function MemoryEditModal({ item, token, onClose, onSuccess }) {
  const [form, setForm] = useState({
    title: item.title||"", listing_type: item.listing_type||"出售",
    brand: item.brand||"三星Samsung", generation: item.generation||"DDR5",
    capacity_per_stick: item.capacity_per_stick||"64GB", quantity: String(item.quantity||""),
    frequency: item.frequency||"4800MHz", condition: item.condition||"全新",
    warranty: item.warranty||"1年", description: item.description||"",
    price_per_stick: item.price_per_stick!=null?String(item.price_per_stick):"",
    tax_included: item.tax_included||"含税", invoice_one_to_one: item.invoice_one_to_one!==false,
    payment_method: item.payment_method||"款齐发货",
    shipping_method: item.shipping_method||"快递（买家承担运费）",
    location: item.location||"", contact_name: item.contact_name||"", contact_info: item.contact_info||""
  });
  const [saving, setSaving] = useState(false);
  const set = k => e => setForm(f=>({...f,[k]:e.target.value}));
  const lbl = {display:"block",fontSize:12,color:"#64748b",marginBottom:4};
  const sel = (k,opts) => (
    <select value={form[k]} onChange={set(k)} style={{...inp,marginBottom:12}}>
      {opts.map(o=><option key={o} value={o}>{o}</option>)}
    </select>
  );

  const handle = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/vendor/memory-listings/${item.id}`, {
        method:"PATCH",
        headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},
        body:JSON.stringify({...form,quantity:Number(form.quantity),price_per_stick:form.price_per_stick?Number(form.price_per_stick):null})
      });
      if (res.ok) onSuccess({...item,...form,quantity:Number(form.quantity),price_per_stick:form.price_per_stick?Number(form.price_per_stick):null});
    } finally { setSaving(false); }
  };

  return (
    <Modal onClose={onClose} width={620}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
        <div style={{fontFamily:"'Noto Serif SC',serif",fontSize:20,fontWeight:700,color:"#0f172a"}}>编辑内存条</div>
        <button onClick={onClose} style={{background:"none",border:"none",color:"#94a3b8",fontSize:20,cursor:"pointer"}}>✕</button>
      </div>
      <div style={{fontSize:13,fontWeight:700,color:"#0f172a",marginBottom:12,paddingBottom:8,borderBottom:"1px solid #f1f5f9"}}>产品信息</div>
      <label style={lbl}>标题 *</label>
      <input value={form.title} onChange={set("title")} style={inp} />
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <div><label style={lbl}>类型</label>{sel("listing_type",["出售","求购","出租"])}</div>
        <div><label style={lbl}>品牌</label>{sel("brand",["三星Samsung","海力士SK Hynix","镁光Micron","金士顿Kingston","其他"])}</div>
        <div><label style={lbl}>代数</label>{sel("generation",["DDR3","DDR4","DDR5"])}</div>
        <div><label style={lbl}>单条容量</label>{sel("capacity_per_stick",["8GB","16GB","32GB","64GB","96GB","128GB","其他"])}</div>
        <div><label style={lbl}>数量（条）</label><input type="number" min="1" value={form.quantity} onChange={set("quantity")} style={inp} /></div>
        <div><label style={lbl}>频率</label>{sel("frequency",["2666MHz","3200MHz","4800MHz","5600MHz","6400MHz","其他"])}</div>
        <div><label style={lbl}>成色</label>{sel("condition",["全新","拆机"])}</div>
        <div><label style={lbl}>质保时间</label>{sel("warranty",["无","3个月","6个月","1年","2年","3年"])}</div>
      </div>
      <label style={lbl}>补充说明</label>
      <textarea value={form.description} onChange={set("description")} rows={3} style={{...inp,resize:"vertical"}} />
      <div style={{fontSize:13,fontWeight:700,color:"#0f172a",marginBottom:12,paddingBottom:8,borderBottom:"1px solid #f1f5f9",marginTop:4}}>交易信息</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <div><label style={lbl}>单价（元/条）</label><input type="number" min="0" value={form.price_per_stick} onChange={set("price_per_stick")} style={inp} /></div>
        <div><label style={lbl}>含税</label>{sel("tax_included",["含税","不含税"])}</div>
        <div>
          <label style={lbl}>发票一对一</label>
          <div style={{display:"flex",gap:12,marginBottom:12}}>
            {[["是",true],["否",false]].map(([l,v])=>(
              <label key={l} style={{display:"flex",alignItems:"center",gap:6,fontSize:13,cursor:"pointer"}}>
                <input type="radio" checked={form.invoice_one_to_one===v} onChange={()=>setForm(f=>({...f,invoice_one_to_one:v}))} />{l}
              </label>
            ))}
          </div>
        </div>
        <div><label style={lbl}>交易方式</label>{sel("payment_method",["款齐发货","预付定金","货到付款","其他"])}</div>
        <div style={{gridColumn:"span 2"}}><label style={lbl}>发货方式</label>{sel("shipping_method",["快递（买家承担运费）","快递（卖家承担运费）","自提","其他"])}</div>
        <div style={{gridColumn:"span 2"}}><label style={lbl}>所在地</label><input value={form.location} onChange={set("location")} style={inp} /></div>
      </div>
      <div style={{fontSize:13,fontWeight:700,color:"#0f172a",marginBottom:12,paddingBottom:8,borderBottom:"1px solid #f1f5f9"}}>联系方式</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <div><label style={lbl}>联系人</label><input value={form.contact_name} onChange={set("contact_name")} style={inp} /></div>
        <div><label style={lbl}>联系方式</label><input value={form.contact_info} onChange={set("contact_info")} style={inp} /></div>
      </div>
      <button onClick={handle} disabled={saving} style={{...primaryBtn,width:"100%",opacity:saving?0.4:1,marginTop:8}}>
        {saving?"保存中...":"保存"}
      </button>
    </Modal>
  );
}

// ─── Memory List Page ─────────────────────────────────────────────────────────
function MemoryPage({ authVendor, onShowAuth, onPublish }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [showPublish, setShowPublish] = useState(false);
  const [showQrId, setShowQrId] = useState(null);
  const thS = {padding:"9px 12px",fontSize:11,fontWeight:700,color:"#64748b",textAlign:"left",letterSpacing:0.5,background:"#f8fafc",borderBottom:"2px solid #e2e8f0",whiteSpace:"nowrap"};

  useEffect(()=>{
    fetch(`${API}/api/memory-listings`).then(r=>r.json()).then(setListings).catch(()=>{}).finally(()=>setLoading(false));
  },[]);

  const handlePublish = (item) => {
    setListings(ls=>[item,...ls]);
    setShowPublish(false);
    if (onPublish) onPublish(item);
  };

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div>
          <div style={{fontFamily:"'Noto Serif SC',serif",fontSize:22,fontWeight:700,color:"#0f172a"}}>内存条</div>
          <div style={{fontSize:12,color:"#94a3b8",marginTop:4}}>硬件 · 内存条买卖出租</div>
        </div>
        <button onClick={()=>{ if(authVendor) setShowPublish(true); else onShowAuth("login"); }}
          style={{...primaryBtn,padding:"10px 24px"}}>
          + 发布
        </button>
      </div>

      {loading ? (
        <div style={{textAlign:"center",padding:"60px 0",color:"#94a3b8"}}>加载中...</div>
      ) : listings.length===0 ? (
        <div style={{textAlign:"center",padding:"60px 0",color:"#94a3b8",fontSize:14}}>暂无记录，成为第一个发布者吧</div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="desk-only" style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:12,overflow:"hidden",boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead>
                <tr>
                  {["品牌","代数","容量","数量","频率","成色","单价","类型",""].map((h,i)=>(
                    <th key={i} style={thS}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {listings.flatMap(item=>{
                  const expanded = expandedId===item.id;
                  const tdS = {padding:"11px 12px",fontSize:13,color:"#374151",borderBottom:expanded?"none":"1px solid #f1f5f9"};
                  const mainRow = (
                    <tr key={item.id} onClick={()=>setExpandedId(expanded?null:item.id)}
                      style={{cursor:"pointer",background:expanded?"rgba(37,99,235,0.04)":"transparent"}}
                      onMouseEnter={e=>{if(!expanded)e.currentTarget.style.background="#f8fafc";}}
                      onMouseLeave={e=>{e.currentTarget.style.background=expanded?"rgba(37,99,235,0.04)":"transparent";}}>
                      <td style={{...tdS,fontWeight:600}}>{item.brand}</td>
                      <td style={tdS}>{item.generation}</td>
                      <td style={tdS}>{item.capacity_per_stick}</td>
                      <td style={tdS}>{item.quantity}条</td>
                      <td style={tdS}>{item.frequency}</td>
                      <td style={tdS}>{item.condition}</td>
                      <td style={{...tdS,color:"#2563eb",fontWeight:600}}>{item.price_per_stick?`¥${item.price_per_stick}/条`:"面议"}</td>
                      <td style={tdS}><span style={{padding:"2px 10px",borderRadius:20,fontSize:11,fontWeight:600,background:item.listing_type==="出售"?"#dbeafe":item.listing_type==="求购"?"#dcfce7":"#fef9c3",color:item.listing_type==="出售"?"#1d4ed8":item.listing_type==="求购"?"#15803d":"#854d0e"}}>{item.listing_type}</span></td>
                      <td style={{padding:"8px 6px",textAlign:"center",borderBottom:expanded?"none":"1px solid #f1f5f9",width:44}}>
                        <span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:28,height:28,borderRadius:8,background:expanded?"rgba(37,99,235,0.12)":"#f1f5f9",border:`1px solid ${expanded?"rgba(37,99,235,0.25)":"#e2e8f0"}`,fontSize:13,color:expanded?"#2563eb":"#64748b",cursor:"pointer",userSelect:"none"}}>
                          {expanded?"▲":"▼"}
                        </span>
                      </td>
                    </tr>
                  );
                  if (!expanded) return [mainRow];
                  const qrUrl = `${window.location.origin}/hardware/memory/${item.id}`;
                  const qrLabel = `${item.quantity}条 ${item.brand} ${item.generation} ${item.capacity_per_stick} ${item.listing_type}`;
                  return [mainRow,(
                    <tr key={`${item.id}-detail`}>
                      <td colSpan={9} style={{padding:"20px 24px",background:"rgba(37,99,235,0.02)",borderBottom:"1px solid #e2e8f0"}}>
                        <MemoryDetailInner item={item} authVendor={authVendor} onShowAuth={onShowAuth} qrUrl={qrUrl} qrLabel={qrLabel} />
                      </td>
                    </tr>
                  )];
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="mob-show" style={{display:"none",flexDirection:"column",gap:12}}>
            {listings.map(item=>(
              <div key={item.id} style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:12,padding:16,boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                  <div style={{fontWeight:700,fontSize:15,color:"#0f172a"}}>{item.brand} {item.generation} {item.capacity_per_stick}</div>
                  <span style={{padding:"2px 10px",borderRadius:20,fontSize:11,fontWeight:600,background:item.listing_type==="出售"?"#dbeafe":item.listing_type==="求购"?"#dcfce7":"#fef9c3",color:item.listing_type==="出售"?"#1d4ed8":item.listing_type==="求购"?"#15803d":"#854d0e",flexShrink:0}}>{item.listing_type}</span>
                </div>
                <div style={{fontSize:13,color:"#64748b",marginBottom:8}}>{item.frequency} · {item.condition} · {item.quantity}条 · {item.location}</div>
                <div style={{fontSize:15,fontWeight:700,color:"#2563eb",marginBottom:12}}>{item.price_per_stick?`¥${item.price_per_stick}/条`:"面议"}</div>
                <button onClick={()=>setExpandedId(expandedId===item.id?null:item.id)}
                  style={{width:"100%",padding:"8px",border:"1px solid #e2e8f0",borderRadius:8,background:"transparent",color:"#64748b",fontSize:13,cursor:"pointer"}}>
                  {expandedId===item.id?"收起详情 ▲":"查看详情 ▼"}
                </button>
                {expandedId===item.id && (
                  <div style={{marginTop:16,paddingTop:16,borderTop:"1px solid #f1f5f9"}}>
                    <MemoryDetailInner item={item} authVendor={authVendor} onShowAuth={onShowAuth}
                      qrUrl={`${window.location.origin}?memory=${item.id}`}
                      qrLabel={`${item.quantity}条 ${item.brand} ${item.generation} ${item.capacity_per_stick} ${item.listing_type}`} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {showPublish && <MemoryPublishModal onClose={()=>setShowPublish(false)} onSuccess={handlePublish} />}
      {showQrId && <QRCodeModal url={showQrId.url} label={showQrId.label} onClose={()=>setShowQrId(null)} />}
    </div>
  );
}

function MemoryDetailInner({ item, authVendor, onShowAuth, qrUrl, qrLabel }) {
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState(false);
  const fields = [
    ["标题", item.title],
    ["类型", item.listing_type],
    ["品牌", item.brand],
    ["代数", item.generation],
    ["单条容量", item.capacity_per_stick],
    ["数量", `${item.quantity}条`],
    ["频率", item.frequency],
    ["成色", item.condition],
    ["质保", item.warranty||"—"],
    ["单价", item.price_per_stick?`¥${item.price_per_stick}/条`:"面议"],
    ["含税", item.tax_included||"—"],
    ["发票一对一", item.invoice_one_to_one?"是":"否"],
    ["交易方式", item.payment_method||"—"],
    ["发货方式", item.shipping_method||"—"],
    ["所在地", item.location],
  ];
  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:8,marginBottom:16}}>
        {fields.map(([k,v])=>(
          <div key={k} style={{display:"flex",gap:8}}>
            <span style={{fontSize:12,color:"#94a3b8",flexShrink:0}}>{k}</span>
            <span style={{fontSize:12,color:"#374151",fontWeight:500}}>{v}</span>
          </div>
        ))}
      </div>
      {item.description && (
        <div style={{fontSize:13,color:"#374151",background:"#f8fafc",borderRadius:8,padding:"10px 14px",marginBottom:16,lineHeight:1.6}}>{item.description}</div>
      )}
      <div style={{background:"#f8fafc",borderRadius:10,padding:"14px 16px",marginBottom:14,border:"1px solid #e2e8f0"}}>
        <div style={{fontSize:12,fontWeight:700,color:"#0f172a",marginBottom:8}}>联系方式</div>
        <div style={{display:"flex",gap:24,flexWrap:"wrap"}}>
          <div style={{fontSize:13,color:"#374151"}}><span style={{color:"#94a3b8",marginRight:6}}>联系人</span>{item.contact_name}</div>
          <div style={{fontSize:13,color:"#374151"}}><span style={{color:"#94a3b8",marginRight:6}}>联系方式</span>{item.contact_info}</div>
        </div>
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <button onClick={()=>{
          navigator.clipboard.writeText(qrUrl).then(()=>{
            setCopied(true);
            setTimeout(()=>setCopied(false),2000);
          });
        }} style={{...ghostBtn,padding:"7px 20px",fontSize:12}}>
          {copied?"✓ 已复制":"复制链接"}
        </button>
        <button onClick={()=>setShowQr(true)} style={{...ghostBtn,padding:"7px 20px",fontSize:12}}>生成二维码</button>
      </div>
      {showQr && <QRCodeModal url={qrUrl} label={qrLabel} onClose={()=>setShowQr(false)} />}
    </div>
  );
}

// ─── Memory Detail Page ───────────────────────────────────────────────────────
function MemoryDetailPage({ listingId }) {
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(()=>{
    fetch(`${API}/api/memory-listings/${listingId}`)
      .then(r=>r.ok?r.json():null)
      .then(d=>{ if(d) setListing(d); else setNotFound(true); setLoading(false); })
      .catch(()=>{ setNotFound(true); setLoading(false); });
  },[listingId]);

  const base = {fontFamily:"'Noto Sans SC',system-ui,sans-serif",minHeight:"100vh",background:"#f1f5f9",color:"#0f172a"};
  if (loading) return <div style={{...base,display:"flex",alignItems:"center",justifyContent:"center",gap:12}}>
    <div style={{width:32,height:32,border:"3px solid #e2e8f0",borderTop:"3px solid #2563eb",borderRadius:"50%",animation:"spin 0.8s linear infinite"}} />
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    <span style={{fontSize:14,color:"#64748b"}}>加载中...</span>
  </div>;
  if (notFound) return <div style={{...base,display:"flex",alignItems:"center",justifyContent:"center"}}>
    <div style={{textAlign:"center"}}>
      <div style={{fontSize:48,marginBottom:16}}>💾</div>
      <div style={{fontSize:18,fontWeight:700,color:"#0f172a",marginBottom:8}}>内存条不存在或已下线</div>
      <div style={{fontSize:13,color:"#64748b",marginBottom:24}}>该内存条已被删除或暂时下线</div>
      <a href="/" style={{color:"#2563eb",fontSize:13}}>← 返回首页</a>
    </div>
  </div>;

  const qrUrl = `${window.location.origin}/hardware/memory/${listing.id}`;
  const qrLabel = `${listing.quantity}条 ${listing.brand} ${listing.generation} ${listing.capacity_per_stick} ${listing.listing_type}`;

  return (
    <div style={base}>
      <div style={{maxWidth:900,margin:"0 auto",padding:"40px 20px"}}>
        <div style={{marginBottom:24}}>
          <a href="/" style={{color:"#2563eb",fontSize:13,textDecoration:"none"}}>← 返回首页</a>
        </div>
        <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:16,padding:"32px",boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
          <div style={{marginBottom:24}}>
            <div style={{fontSize:24,fontWeight:700,color:"#0f172a",marginBottom:8}}>{listing.title}</div>
            <div style={{display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
              <span style={{padding:"4px 12px",borderRadius:20,fontSize:12,fontWeight:600,background:listing.listing_type==="出售"?"#dbeafe":listing.listing_type==="求购"?"#dcfce7":"#fef9c3",color:listing.listing_type==="出售"?"#1d4ed8":listing.listing_type==="求购"?"#15803d":"#854d0e"}}>{listing.listing_type}</span>
              {listing.price_per_stick && <span style={{fontSize:20,fontWeight:700,color:"#2563eb"}}>¥{listing.price_per_stick}/条</span>}
            </div>
          </div>
          <MemoryDetailInner item={listing} authVendor={null} onShowAuth={()=>{}} qrUrl={qrUrl} qrLabel={qrLabel} />
        </div>
      </div>
    </div>
  );
}

// ─── Home Page ────────────────────────────────────────────────────────────────
const stripGpuName = gpu => (gpu||"").replace(/^(NVIDIA|AMD|华为|Huawei|Intel)\s*/i,"").replace(/\s*\d+GB/gi,"").trim();

function HomePage({ vendors, resources, demands, memoryListings, subscribers, onGoResources, onGoDemands, onGoMemory, onResourceClick, onSubscribe }) {
  const recentResources = [...resources]
    .sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0)||b.id-a.id)
    .slice(0,3);
  const recentDemands = [...demands]
    .filter(d=>d.isVisible!==false && (d.status||"online")==="online")
    .sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0)||b.id-a.id)
    .slice(0,3);
  const [expandedDemandId, setExpandedDemandId] = useState(null);
  const [expandedMemoryId, setExpandedMemoryId] = useState(null);
  const [shareDemandHome, setShareDemandHome] = useState(null);
  const thS = { padding:"9px 12px", fontSize:11, fontWeight:700, color:"#64748b", textAlign:"left", letterSpacing:0.5, background:"#f8fafc", borderBottom:"2px solid #e2e8f0", whiteSpace:"nowrap" };
  const thMob = { ...thS, padding:"7px 8px", fontSize:11 };
  const viewAllBtn = (onClick) => (
    <button onClick={onClick} style={{padding:"4px 12px",border:"1px solid rgba(37,99,235,0.3)",borderRadius:7,background:"transparent",color:"#2563eb",fontSize:12,cursor:"pointer",fontWeight:600,whiteSpace:"nowrap"}}>查看所有 →</button>
  );

  return (
    <div style={{paddingTop:12}}>
      {/* Compact header */}
      <div style={{textAlign:"center",paddingBottom:28,borderBottom:"1px solid #e2e8f0",marginBottom:24}}>
        <h1 style={{
          fontFamily:"'Noto Serif SC',serif",
          fontSize:"clamp(44px,9vw,72px)",
          fontWeight:800,
          lineHeight:1.15,
          marginBottom:16,
          letterSpacing:"-1px",
        }}>
          <span style={{color:"#4A5568"}}>来</span>
          <span style={{color:"#C0392B"}}>新云集市</span>
        </h1>
        <p style={{fontSize:"clamp(18px,3vw,24px)",letterSpacing:"4px",color:"#4A5568",marginBottom:10,fontWeight:400}}>闲逛 摆摊 买东西</p>
        <p style={{fontSize:14,color:"#94a3b8",fontWeight:300,letterSpacing:"0.5px"}}>The next-generation AI marketplace</p>
      </div>

      {/* 算力资源 */}
      <div style={{marginBottom:24}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div style={{display:"flex",alignItems:"baseline",gap:8}}>
            <h2 style={{fontFamily:"'Noto Serif SC',serif",fontSize:17,fontWeight:700,color:"#0f172a"}}>算力资源</h2>
            <span style={{fontSize:12,color:"#94a3b8"}}>共 {resources.length} 条</span>
          </div>
          {viewAllBtn(onGoResources)}
        </div>
        <div style={{background:"#ffffff",border:"1px solid #e2e8f0",borderRadius:12,overflowX:"auto",boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:320}}>
            <thead>
              <tr>
                <th style={thS} className="desk-only">品牌</th>
                <th style={thS}>GPU 型号</th>
                <th style={thS}>数量</th>
                <th style={thS}>单位</th>
                <th style={thS}>区域</th>
                <th style={thS}>状态</th>
              </tr>
            </thead>
            <tbody>
              {recentResources.map((r,i)=>{
                const brand = getGpuBrand(r.gpu);
                const statusLabel = r.status||(r.available?"在线":"下架");
                const isOnline = statusLabel==="在线"||statusLabel==="预售"||r.available;
                const last = i===recentResources.length-1;
                const tdS = {padding:"9px 12px",fontSize:13,color:"#374151",borderBottom:last?"none":"1px solid #f1f5f9",whiteSpace:"nowrap"};
                const tdMob = {...tdS,padding:"8px 8px",fontSize:12};
                return (
                  <tr key={r.id} onClick={()=>onResourceClick(r)} style={{cursor:"pointer"}}
                    onMouseEnter={e=>e.currentTarget.style.background="#f8fafc"}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <td style={{...tdS,fontSize:12,color:"#94a3b8"}} className="desk-only">{brand}</td>
                    <td style={{...tdS,fontWeight:700,fontFamily:"'Bebas Neue',cursive",fontSize:14,letterSpacing:0.8,color:"#0f172a"}}>{stripGpuName(r.gpu)}</td>
                    <td style={tdS}>{r.count}</td>
                    <td style={{...tdS,color:"#64748b"}}>{r.countUnit||"卡"}</td>
                    <td style={tdS}>{r.region||"—"}</td>
                    <td style={tdS}>
                      <span style={{display:"inline-block",padding:"2px 8px",borderRadius:20,fontSize:11,fontWeight:600,background:isOnline?"#dcfce7":"#f1f5f9",color:isOnline?"#16a34a":"#94a3b8"}}>
                        {statusLabel}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{borderTop:"1px solid #e2e8f0",marginBottom:20,marginTop:4}} />

      {/* 算力需求 */}
      <div style={{marginBottom:20}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div style={{display:"flex",alignItems:"baseline",gap:8}}>
            <h2 style={{fontFamily:"'Noto Serif SC',serif",fontSize:17,fontWeight:700,color:"#0f172a"}}>算力需求</h2>
            <span style={{fontSize:12,color:"#94a3b8"}}>共 {demands.filter(d=>d.isVisible!==false&&(d.status||"online")==="online").length} 条</span>
          </div>
          {viewAllBtn(onGoDemands)}
        </div>
        <div style={{background:"#ffffff",border:"1px solid #e2e8f0",borderRadius:12,overflowX:"auto",boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:280}}>
            <thead>
              <tr>
                <th style={thS}>GPU 型号</th>
                <th style={thS}>数量</th>
                <th style={thS}>租期</th>
                <th style={thS}>位置</th>
                <th style={{...thS,width:36}}></th>
              </tr>
            </thead>
            <tbody>
              {recentDemands.flatMap(d=>{
                const expanded = expandedDemandId===d.id;
                const brand = d.gpu_brand||"—";
                const bdBot = expanded?"none":"1px solid #f1f5f9";
                const bg = expanded?"rgba(37,99,235,0.04)":"transparent";
                const tdS = {padding:"9px 12px",fontSize:12,color:"#374151",borderBottom:bdBot,whiteSpace:"nowrap"};
                const colSpan = 5;
                const mainRow = (
                  <tr key={d.id} onClick={()=>setExpandedDemandId(expanded?null:d.id)}
                    style={{cursor:"pointer",background:bg}}
                    onMouseEnter={e=>{if(!expanded)e.currentTarget.style.background="#f8fafc";}}
                    onMouseLeave={e=>{e.currentTarget.style.background=bg;}}>
                    <td style={{...tdS,fontWeight:700,fontFamily:"'Bebas Neue',cursive",fontSize:13,letterSpacing:0.5,color:"#0f172a"}}>{stripGpuName(d.gpu)}</td>
                    <td style={tdS}>{d.count} {d.count_unit||"卡"}</td>
                    <td style={tdS}>{d.rental_months>0?`${d.rental_months}个月`:"—"}</td>
                    <td style={tdS}>{d.region||d.dc_location||"—"}</td>
                    <td style={{padding:"6px 6px",textAlign:"center",borderBottom:bdBot,width:36}}>
                      <span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:24,height:24,borderRadius:6,background:expanded?"rgba(37,99,235,0.12)":"#f1f5f9",border:`1px solid ${expanded?"rgba(37,99,235,0.25)":"#e2e8f0"}`,fontSize:11,color:expanded?"#2563eb":"#64748b"}}>
                        {expanded?"▲":"▼"}
                      </span>
                    </td>
                  </tr>
                );
                if (!expanded) return [mainRow];
                const detailFields = [
                  ["GPU 品牌", brand],["GPU 型号", d.gpu],["数量", `${d.count} ${d.count_unit||"卡"}`],
                  ["区域", d.region||null],["机房位置", d.dc_location||null],
                  ["租赁周期", d.rental_months>0?`${d.rental_months} 个月`:null],
                  ["交付形式", d.delivery_type||d.delivery||null],["合同形式", d.contract_type||null],
                  ["付款方式", (d.payment_type&&d.payment_type!=="其他")?d.payment_type:(d.payment_other||null)],
                  ["预算", d.budget_text||(d.budget>0?`≤¥${d.budget}/卡/时`:null)],
                  ["配置要求", d.config_req||null, true],["存储要求", d.storage_req||null],
                  ["带宽要求", d.bandwidth_req||null],["联系人", d.contact_name||d.contact||null],
                  ["联系电话", d.contact_phone||null],["公司", d.company||null],
                  ["邮箱", d.contact_email||null],["备注", d.notes||null, true],
                  ["发布时间", d.createdAt],
                ].filter(([,v])=>v);
                const detailRow = (
                  <tr key={`${d.id}-exp`}>
                    <td colSpan={colSpan} style={{padding:0,borderBottom:"1px solid #e2e8f0"}}>
                      <div style={{padding:"14px 16px 12px",background:"rgba(37,99,235,0.03)",borderTop:"2px solid #2563eb"}}>
                        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:"10px 16px"}}>
                          {detailFields.map(([label,value,wide])=>(
                            <div key={label} style={{gridColumn:wide?"1/-1":"auto",minWidth:0}}>
                              <div style={{fontSize:11,color:"#94a3b8",fontWeight:600,marginBottom:2}}>{label}</div>
                              <div style={{fontSize:12,color:"#374151",lineHeight:1.5,wordBreak:"break-word"}}>{value}</div>
                            </div>
                          ))}
                        </div>
                        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:10,paddingTop:8,borderTop:"1px solid #e2e8f0"}}>
                          <button onClick={e=>{e.stopPropagation();setShareDemandHome(d);}} style={{padding:"5px 14px",background:"transparent",border:"1px solid #e2e8f0",borderRadius:6,color:"#64748b",fontSize:12,cursor:"pointer"}}>分享</button>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
                return [mainRow, detailRow];
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{borderTop:"1px solid #e2e8f0",marginBottom:20,marginTop:4}} />

      {/* 内存条 */}
      {memoryListings && memoryListings.length>0 && (
        <div style={{marginBottom:24}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{display:"flex",alignItems:"baseline",gap:8}}>
              <h2 style={{fontFamily:"'Noto Serif SC',serif",fontSize:17,fontWeight:700,color:"#0f172a"}}>最新内存条</h2>
              <span style={{fontSize:12,color:"#94a3b8"}}>共 {memoryListings.length} 条</span>
            </div>
            {viewAllBtn(onGoMemory)}
          </div>
          <div style={{background:"#ffffff",border:"1px solid #e2e8f0",borderRadius:12,overflowX:"auto",boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
            <table style={{width:"100%",borderCollapse:"collapse",minWidth:280}}>
              <thead>
                <tr>
                  {["品牌","代数","容量","数量","类型"].map((h,i)=>(
                    <th key={i} style={thS}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {memoryListings.slice(0,3).map((item,i)=>{
                  const expanded = expandedMemoryId===item.id;
                  const last = i===Math.min(memoryListings.length,3)-1;
                  const tdS = {padding:"9px 12px",fontSize:12,color:"#374151",borderBottom:expanded?"none":last?"none":"1px solid #f1f5f9",whiteSpace:"nowrap"};
                  return [
                    <tr key={item.id} onClick={()=>setExpandedMemoryId(expanded?null:item.id)}
                      style={{cursor:"pointer",background:expanded?"rgba(37,99,235,0.04)":"transparent"}}
                      onMouseEnter={e=>{if(!expanded)e.currentTarget.style.background="#f8fafc";}}
                      onMouseLeave={e=>{e.currentTarget.style.background=expanded?"rgba(37,99,235,0.04)":"transparent";}}>
                      <td style={{...tdS,fontWeight:600}}>{item.brand}</td>
                      <td style={tdS}>{item.generation}</td>
                      <td style={tdS}>{item.capacity_per_stick}</td>
                      <td style={tdS}>{item.quantity}条</td>
                      <td style={tdS}><span style={{padding:"2px 8px",borderRadius:20,fontSize:11,fontWeight:600,background:item.listing_type==="出售"?"#dbeafe":item.listing_type==="求购"?"#dcfce7":"#fef9c3",color:item.listing_type==="出售"?"#1d4ed8":item.listing_type==="求购"?"#15803d":"#854d0e"}}>{item.listing_type}</span></td>
                    </tr>,
                    expanded && (
                      <tr key={`${item.id}-exp`}>
                        <td colSpan={5} style={{padding:"16px 20px",background:"rgba(37,99,235,0.02)",borderBottom:last?"none":"1px solid #e2e8f0",borderTop:"2px solid #2563eb"}}>
                          <MemoryDetailInner item={item} authVendor={null} onShowAuth={()=>{}}
                            qrUrl={`${window.location.origin}/hardware/memory/${item.id}`}
                            qrLabel={`${item.quantity}条 ${item.brand} ${item.generation} ${item.capacity_per_stick} ${item.listing_type}`} />
                        </td>
                      </tr>
                    )
                  ];
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {shareDemandHome&&(()=>{
        const d = shareDemandHome;
        const url = `${window.location.origin}/demands/${d.id}`;
        const qrLabel = `${d.count}${d.count_unit||"卡"} ${d.gpu} 租赁需求`;
        const parts = [
          `【GPU需求】${d.gpu} × ${d.count}${d.count_unit||"卡"}`,
          (d.region||d.dc_location)?`区域：${[d.region,d.dc_location].filter(Boolean).join(" · ")}`:null,
          d.rental_months>0?`租期：${d.rental_months}个月`:null,
          d.budget_text?`预算：${d.budget_text}`:null,
          `来源：${url}`,
        ].filter(Boolean);
        return <Modal onClose={()=>setShareDemandHome(null)} width={420}><ShareSheet title={`需求·${d.gpu}`} shareText={parts.join("\n")} shareUrl={url} qrLabel={qrLabel} onClose={()=>setShareDemandHome(null)} /></Modal>;
      })()}
    </div>
  );
}

// ─── Contact Page ─────────────────────────────────────────────────────────────
function ContactPage() {
  return (
    <div style={{maxWidth:640,margin:"0 auto",padding:"48px 24px"}}>
      <h2 style={{fontFamily:"'Noto Serif SC',serif",fontSize:28,fontWeight:700,color:"#0f172a",marginBottom:8}}>联系我们</h2>
      <p style={{fontSize:14,color:"#64748b",marginBottom:40}}>欢迎与我们取得联系，我们将尽快回复您。</p>

      {/* 微信二维码 */}
      <div style={{background:"#ffffff",border:"1px solid #e2e8f0",borderRadius:16,padding:"32px 24px",marginBottom:24,boxShadow:"0 1px 4px rgba(0,0,0,0.05)",textAlign:"center"}}>
        <div style={{fontSize:14,fontWeight:600,color:"#0f172a",marginBottom:4}}>微信扫码联系</div>
        <div style={{fontSize:12,color:"#94a3b8",marginBottom:20}}>扫描下方二维码添加微信</div>
        <div style={{display:"inline-block",background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:12,padding:16}}>
          <img
            src="/images/finder-wechat-qr.jpg"
            alt="微信二维码"
            width={200}
            height={200}
            style={{display:"block",borderRadius:8}}
          />
        </div>
      </div>

      {/* 其他联系方式 */}
      <div style={{background:"#ffffff",border:"1px solid #e2e8f0",borderRadius:16,padding:"24px 28px",boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
        <div style={{fontSize:14,fontWeight:600,color:"#0f172a",marginBottom:16}}>其他方式</div>
        {[["📧 邮箱","sales@wuyun.ai"],["🌐 官网","www.neocloud.market"]].map(([label,val])=>(
          <div key={label} style={{display:"flex",gap:12,alignItems:"center",padding:"10px 0",borderBottom:"1px solid #f1f5f9"}}>
            <span style={{fontSize:13,color:"#64748b",minWidth:80}}>{label}</span>
            <span style={{fontSize:13,color:"#0f172a"}}>{val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Links Page ───────────────────────────────────────────────────────────────
function LinksPage({ links }) {
  return (
    <div style={{maxWidth:640,margin:"0 auto",padding:"48px 24px"}}>
      <h2 style={{fontFamily:"'Noto Serif SC',serif",fontSize:28,fontWeight:700,color:"#0f172a",marginBottom:8}}>相关链接</h2>
      <p style={{fontSize:14,color:"#64748b",marginBottom:32}}>以下为平台精选的相关资源与合作伙伴链接。</p>
      {links.length === 0 ? (
        <div style={{textAlign:"center",padding:"60px 0",color:"#94a3b8",border:"1px dashed #d1d5db",borderRadius:16}}>
          <div style={{fontSize:36,marginBottom:12}}>🔗</div>
          <div style={{fontSize:14,color:"#374151"}}>暂无相关链接</div>
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {links.map(l=>(
            <a key={l.id} href={l.url} target="_blank" rel="noopener noreferrer"
              style={{background:"#ffffff",border:"1px solid #e2e8f0",borderRadius:12,padding:"16px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",textDecoration:"none",color:"#0f172a",boxShadow:"0 1px 3px rgba(0,0,0,0.04)",transition:"border-color 0.15s"}}
              onMouseEnter={e=>e.currentTarget.style.borderColor="#93c5fd"}
              onMouseLeave={e=>e.currentTarget.style.borderColor="#e2e8f0"}
            >
              <div>
                <div style={{fontSize:14,fontWeight:600,marginBottom:3}}>{l.title}</div>
                <div style={{fontSize:12,color:"#64748b",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:400}}>{l.url}</div>
              </div>
              <span style={{fontSize:16,color:"#94a3b8",flexShrink:0}}>→</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Vendor Share Page ────────────────────────────────────────────────────────
function VendorSharePage({ shareToken }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(()=>{
    fetch(`${API}/api/share/${shareToken}`)
      .then(r=>r.ok?r.json():null)
      .then(d=>{ if(d) setData(d); else setNotFound(true); setLoading(false); })
      .catch(()=>{ setNotFound(true); setLoading(false); });
  },[shareToken]);

  const base = {fontFamily:"'Noto Sans SC',system-ui,sans-serif",minHeight:"100vh",background:"#f1f5f9",color:"#0f172a"};
  if (loading) return <div style={{...base,display:"flex",alignItems:"center",justifyContent:"center",gap:12}}>
    <div style={{width:32,height:32,border:"3px solid #e2e8f0",borderTop:"3px solid #2563eb",borderRadius:"50%",animation:"spin 0.8s linear infinite"}} />
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    <span style={{fontSize:14,color:"#64748b"}}>加载中...</span>
  </div>;
  if (notFound) return <div style={{...base,display:"flex",alignItems:"center",justifyContent:"center"}}>
    <div style={{textAlign:"center"}}>
      <div style={{fontSize:48,marginBottom:16}}>🔗</div>
      <div style={{fontSize:18,fontWeight:700,color:"#0f172a",marginBottom:8}}>分享链接无效</div>
      <div style={{fontSize:13,color:"#64748b"}}>该链接不存在或已失效</div>
    </div>
  </div>;

  const { vendor, resources } = data;
  return (
    <div style={base}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Noto+Serif+SC:wght@600;700&family=Noto+Sans+SC:wght@400;600;700&display=swap'); *{margin:0;padding:0;box-sizing:border-box}`}</style>
      <div style={{background:"rgba(255,255,255,0.97)",borderBottom:"1px solid #e2e8f0",padding:"0 24px",height:60,display:"flex",alignItems:"center",gap:16}}>
        <img src="/logo.svg" height="32" onClick={()=>window.location.href="/"} style={{cursor:"pointer",display:"block"}} alt="新云集市" />
        <span style={{fontSize:12,color:"#94a3b8",borderLeft:"1px solid #e2e8f0",paddingLeft:16}}>供应商资源</span>
      </div>
      <div className="share-main" style={{maxWidth:900,margin:"0 auto",padding:"32px 24px"}}>
        <div style={{background:"#ffffff",border:"1px solid #e2e8f0",borderRadius:16,padding:"24px 28px",marginBottom:28,display:"flex",alignItems:"center",gap:20,flexWrap:"wrap",boxShadow:"0 1px 4px rgba(0,0,0,0.06)"}}>
          <div style={{width:52,height:52,borderRadius:14,background:"linear-gradient(135deg,#2563eb,#1d4ed8)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:700,color:"#fff",fontFamily:"'Noto Serif SC',serif",flexShrink:0}}>{vendor.avatar}</div>
          <div style={{flex:1,minWidth:120}}>
            <div style={{fontSize:20,fontWeight:700,fontFamily:"'Noto Serif SC',serif",marginBottom:4}}>{vendor.name}</div>
            <div style={{fontSize:13,color:"#64748b"}}>{vendor.location} · 入驻于 {vendor.joined}</div>
          </div>
          <div style={{display:"flex",gap:16,alignItems:"center"}}>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:22,fontWeight:700,color:"#2563eb",fontFamily:"'Bebas Neue',cursive"}}>{resources.length}</div>
              <div style={{fontSize:11,color:"#94a3b8"}}>在售资源</div>
            </div>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:22,fontWeight:700,color:"#f59e0b",fontFamily:"'Bebas Neue',cursive"}}>{vendor.rating?.toFixed(1)}</div>
              <div style={{fontSize:11,color:"#94a3b8"}}>评分</div>
            </div>
          </div>
        </div>
        {(vendor.contactName||vendor.contactPhone||vendor.email) && (
          <div style={{background:"#ffffff",border:"1px solid #e2e8f0",borderRadius:14,padding:"18px 24px",marginBottom:20,boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
            <div style={{fontSize:11,fontWeight:700,color:"#2563eb",letterSpacing:1,marginBottom:12,textTransform:"uppercase"}}>联系方式</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:"10px 32px"}}>
              {vendor.name && <div style={{fontSize:13,color:"#374151"}}><span style={{color:"#94a3b8",marginRight:6}}>公司</span>{vendor.name}</div>}
              {vendor.contactName && <div style={{fontSize:13,color:"#374151"}}><span style={{color:"#94a3b8",marginRight:6}}>联系人</span>{vendor.contactName}</div>}
              {vendor.contactPhone && <div style={{fontSize:13,color:"#374151"}}><span style={{color:"#94a3b8",marginRight:6}}>电话</span><a href={`tel:${vendor.contactPhone}`} style={{color:"#2563eb",textDecoration:"none"}}>{vendor.contactPhone}</a></div>}
              {vendor.email && <div style={{fontSize:13,color:"#374151"}}><span style={{color:"#94a3b8",marginRight:6}}>邮箱</span><a href={`mailto:${vendor.email}`} style={{color:"#2563eb",textDecoration:"none"}}>{vendor.email}</a></div>}
            </div>
          </div>
        )}
        {resources.length===0 ? (
          <div style={{textAlign:"center",padding:"60px 0",color:"#94a3b8",border:"1px dashed #d1d5db",borderRadius:16}}>
            <div style={{fontSize:36,marginBottom:12}}>🖥️</div>
            <div style={{fontSize:15,color:"#374151"}}>暂无可用资源</div>
          </div>
        ) : (
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {resources.map(r=>{
              const qrUrl = `${window.location.origin}/resources/${r.id}`;
              const qrLabel = `${r.availableQuantity??r.count}${r.countUnit||"卡"} ${r.gpu} 租赁资源`;
              return (
              <div key={r.id} style={{background:"#ffffff",border:"1px solid #e2e8f0",borderRadius:14,padding:20,display:"flex",alignItems:"center",gap:16,flexWrap:"wrap",boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
                <div style={{flex:1,minWidth:200}}>
                  <div style={{fontWeight:700,fontSize:14,fontFamily:"'Bebas Neue',cursive",letterSpacing:1,color:"#0f172a",marginBottom:4}}>{r.gpu}</div>
                  <div style={{fontSize:12,color:"#64748b",marginBottom:8}}>{r.mem}{r.bandwidth?` · ${r.bandwidth}`:""} · {r.region} · {r.delivery}</div>
                  {r.availableQuantity!=null && <div style={{fontSize:12,color:"#059669",marginBottom:6}}>可租：{r.availableQuantity} {r.countUnit||"卡"}</div>}
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{(r.tags||[]).map(t=><Tag key={t} t={t} />)}</div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontSize:26,fontWeight:700,color:"#2563eb",fontFamily:"'Bebas Neue',cursive"}}>¥{r.price}</div>
                  <div style={{fontSize:11,color:"#94a3b8"}}>元/卡/时</div>
                  <div style={{marginTop:6,fontSize:11,padding:"3px 10px",borderRadius:10,background:"#f0fdf4",color:"#16a34a",display:"inline-block"}}>{r.status}</div>
                  <div style={{marginTop:8}}>
                    <ShareQrButton url={qrUrl} label={qrLabel} />
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Docs Page ────────────────────────────────────────────────────────────────
function DocsPage({ authVendor, authAdmin, onShowAuth }) {
  const [docs, setDocs] = useState([]);
  const [tab, setTab] = useState("roadmap");
  const [comments, setComments] = useState({});
  const [commentInput, setCommentInput] = useState({});
  const [commentNick, setCommentNick] = useState("");
  const [commentSaving, setCommentSaving] = useState(null);

  useEffect(()=>{
    fetch(`${API}/api/docs`).then(r=>r.json()).then(setDocs).catch(()=>{});
  },[]);

  const tabDocs = docs.filter(d=>d.category===tab);

  const loadComments = (docId) => {
    if (comments[docId]) return;
    fetch(`${API}/api/docs/${docId}/comments`)
      .then(r=>r.json()).then(cs=>setComments(prev=>({...prev,[docId]:cs}))).catch(()=>{});
  };

  const submitComment = async (docId) => {
    const text = (commentInput[docId]||"").trim();
    if (!text) return;
    setCommentSaving(docId);
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`${API}/api/docs/${docId}/comments`, {
        method:"POST",
        headers:{"Content-Type":"application/json", Authorization:`Bearer ${token}`},
        body: JSON.stringify({ doc_id:docId, nickname:commentNick.trim()||"匿名", content:text }),
      });
      if (res.ok) {
        const c = await res.json();
        setComments(prev=>({...prev,[docId]:[...(prev[docId]||[]),c]}));
        setCommentInput(prev=>({...prev,[docId]:""}));
      }
    } finally { setCommentSaving(null); }
  };

  const deleteComment = async (docId, commentId) => {
    const token = localStorage.getItem("auth_token");
    const res = await fetch(`${API}/api/docs/comments/${commentId}`, {
      method:"DELETE", headers:{ Authorization:`Bearer ${token}` },
    });
    if (res.ok) setComments(prev=>({...prev,[docId]:(prev[docId]||[]).filter(c=>c.id!==commentId)}));
  };

  const mdStyle = {
    "h1,h2,h3": { fontFamily:"'Noto Serif SC',serif", fontWeight:700, marginBottom:8, marginTop:20 },
  };

  return (
    <div>
      <h2 style={{fontFamily:"'Noto Serif SC',serif",fontSize:26,fontWeight:700,marginBottom:6,color:"#0f172a"}}>文档中心</h2>
      <p style={{color:"#64748b",fontSize:13,marginBottom:20}}>网站说明与开发动态</p>

      {/* Tabs */}
      <div style={{display:"flex",gap:4,marginBottom:24,borderBottom:"2px solid #e2e8f0",overflowX:"auto"}}>
        {[["roadmap","开发计划"],["guide","网站使用说明"]].map(([v,l])=>(
          <button key={v} onClick={()=>setTab(v)} style={{
            padding:"10px 22px",border:"none",background:"transparent",cursor:"pointer",
            fontSize:14,fontWeight:600,color:tab===v?"#2563eb":"#64748b",
            borderBottom:`2px solid ${tab===v?"#2563eb":"transparent"}`,
            marginBottom:-2,whiteSpace:"nowrap",
          }}>{l}</button>
        ))}
      </div>

      {/* Docs */}
      {tabDocs.length===0 ? (
        <div style={{textAlign:"center",padding:"60px 0",color:"#94a3b8"}}>
          <div style={{fontSize:36,marginBottom:10}}>📄</div>
          暂无文档
        </div>
      ) : tabDocs.map(doc=>{
        const docComments = comments[doc.id];
        if (!docComments) loadComments(doc.id);
        const userSub = authVendor?.id ? null : null; // user_id from token is opaque; deletion uses authAdmin flag
        return (
          <div key={doc.id} style={{background:"#ffffff",border:"1px solid #e2e8f0",borderRadius:14,padding:"28px 32px",marginBottom:24,boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
            <h3 style={{fontFamily:"'Noto Serif SC',serif",fontSize:20,fontWeight:700,color:"#0f172a",marginBottom:16}}>{doc.title}</h3>
            <div style={{color:"#374151",lineHeight:1.9,fontSize:14}} className="md-body">
              <ReactMarkdown>{doc.content||""}</ReactMarkdown>
            </div>

            {/* Comments */}
            <div style={{marginTop:32,borderTop:"1px solid #f1f5f9",paddingTop:24}}>
              <div style={{fontSize:13,fontWeight:700,color:"#64748b",marginBottom:16}}>评论 {docComments?`(${docComments.length})`:"..."}</div>
              {(docComments||[]).map(c=>(
                <div key={c.id} style={{display:"flex",gap:10,marginBottom:14,alignItems:"flex-start"}}>
                  <div style={{width:30,height:30,borderRadius:8,background:"linear-gradient(135deg,#1d4ed8,#2563eb)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#fff",flexShrink:0}}>
                    {(c.nickname||"匿名").slice(0,2)}
                  </div>
                  <div style={{flex:1,background:"#f8fafc",borderRadius:8,padding:"10px 12px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                      <span style={{fontSize:12,fontWeight:600,color:"#374151"}}>{c.nickname||"匿名"}</span>
                      <span style={{fontSize:11,color:"#94a3b8"}}>{c.created_at?.slice(0,10)}</span>
                      {(authAdmin || (authVendor && c.user_id)) && (
                        <button onClick={()=>deleteComment(doc.id,c.id)} style={{marginLeft:"auto",fontSize:11,color:"#dc2626",background:"none",border:"none",cursor:"pointer",padding:0}}>删除</button>
                      )}
                    </div>
                    <div style={{fontSize:13,color:"#374151",lineHeight:1.6}}>{c.content}</div>
                  </div>
                </div>
              ))}
              {(authVendor || authAdmin) ? (
                <div style={{marginTop:12}}>
                  <input value={commentNick} onChange={e=>setCommentNick(e.target.value)}
                    placeholder="昵称（选填）" style={{...inp,marginBottom:8,maxWidth:200}} />
                  <div style={{display:"flex",gap:8}}>
                    <textarea value={commentInput[doc.id]||""} onChange={e=>setCommentInput(prev=>({...prev,[doc.id]:e.target.value}))}
                      placeholder="写下你的评论..." rows={2}
                      style={{...inp,flex:1,resize:"vertical",marginBottom:0}} />
                    <button onClick={()=>submitComment(doc.id)} disabled={commentSaving===doc.id||!(commentInput[doc.id]||"").trim()}
                      style={{...primaryBtn,padding:"0 20px",flexShrink:0,opacity:(commentSaving===doc.id||!(commentInput[doc.id]||"").trim())?0.6:1}}>
                      {commentSaving===doc.id?"发送...":"发送"}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{textAlign:"center",padding:"12px 0",fontSize:13,color:"#94a3b8"}}>
                  <button onClick={()=>onShowAuth("login")} style={{color:"#2563eb",background:"none",border:"none",cursor:"pointer",fontWeight:600,fontSize:13}}>登录</button>
                  &nbsp;后可评论
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Admin Panel ──────────────────────────────────────────────────────────────
function AdminMemoryPanel({ token }) {
  const [memList, setMemList] = useState([]);
  const [memLoading, setMemLoading] = useState(true);
  useEffect(()=>{
    fetch(`${API}/api/admin/memory-listings`,{headers:{Authorization:`Bearer ${token}`}})
      .then(r=>r.json()).then(d=>{setMemList(d);setMemLoading(false);}).catch(()=>setMemLoading(false));
  },[]);
  if(memLoading) return <div style={{padding:40,textAlign:"center",color:"#94a3b8",fontSize:13}}>加载中…</div>;
  return (
    <div>
      <div style={{fontSize:14,fontWeight:700,color:"#0f172a",marginBottom:16}}>内存条列表（共 {memList.length} 条）</div>
      {memList.length===0 ? <div style={{color:"#94a3b8",fontSize:13}}>暂无数据</div> : (
        <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:12,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead>
              <tr style={{background:"#f8fafc",borderBottom:"2px solid #e2e8f0"}}>
                {["标题","品牌","代数","容量","数量","价格","所在地","类型","状态","操作"].map(h=>(
                  <th key={h} style={{padding:"8px 10px",textAlign:"left",fontWeight:700,color:"#64748b",whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {memList.map(m=>(
                <tr key={m.id} style={{borderBottom:"1px solid #f1f5f9"}}>
                  <td style={{padding:"8px 10px",color:"#0f172a",maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.title}</td>
                  <td style={{padding:"8px 10px",color:"#374151"}}>{m.brand}</td>
                  <td style={{padding:"8px 10px",color:"#374151"}}>{m.generation}</td>
                  <td style={{padding:"8px 10px",color:"#374151"}}>{m.capacity_per_stick}</td>
                  <td style={{padding:"8px 10px",color:"#374151"}}>{m.quantity}</td>
                  <td style={{padding:"8px 10px",color:"#374151"}}>{m.price_per_stick!=null?`¥${m.price_per_stick}`:"面议"}</td>
                  <td style={{padding:"8px 10px",color:"#374151"}}>{m.location}</td>
                  <td style={{padding:"8px 10px",color:"#374151"}}>{m.listing_type}</td>
                  <td style={{padding:"8px 10px"}}>
                    <span style={{padding:"2px 8px",borderRadius:20,fontSize:11,fontWeight:600,background:m.is_visible?"#dcfce7":"#f1f5f9",color:m.is_visible?"#16a34a":"#94a3b8"}}>
                      {m.is_visible?"显示":"隐藏"}
                    </span>
                  </td>
                  <td style={{padding:"8px 10px",whiteSpace:"nowrap"}}>
                    <button onClick={async()=>{
                      const res=await fetch(`${API}/api/admin/memory-listings/${m.id}/visibility`,{method:"PATCH",headers:{Authorization:`Bearer ${token}`}});
                      if(res.ok){const d=await res.json();setMemList(ls=>ls.map(x=>x.id===m.id?{...x,is_visible:d.is_visible}:x));}
                    }} style={{padding:"4px 10px",borderRadius:6,border:"none",background:"#f1f5f9",color:"#374151",fontSize:12,cursor:"pointer",marginRight:6}}>
                      {m.is_visible?"隐藏":"显示"}
                    </button>
                    <button onClick={async()=>{
                      if(!confirm("确认删除？")) return;
                      const res=await fetch(`${API}/api/admin/memory-listings/${m.id}`,{method:"DELETE",headers:{Authorization:`Bearer ${token}`}});
                      if(res.ok) setMemList(ls=>ls.filter(x=>x.id!==m.id));
                    }} style={{padding:"4px 10px",borderRadius:6,border:"none",background:"none",color:"#dc2626",fontSize:12,cursor:"pointer"}}>删除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AdminPanel({ onExit, token }) {
  const [links, setLinks] = useState([]);
  const [form, setForm] = useState({ title:"", url:"", sort_order:"0" });
  const [saving, setSaving] = useState(false);
  const [adminTab, setAdminTab] = useState("links");
  const [allVendors, setAllVendors] = useState([]);
  const [vendorLoading, setVendorLoading] = useState(false);
  const [vendorUpdating, setVendorUpdating] = useState(null);
  const [expandedVendor, setExpandedVendor] = useState(null);
  const [vendorSubTab, setVendorSubTab] = useState("info");
  const [vendorRes, setVendorRes] = useState([]);
  const [vendorDem, setVendorDem] = useState([]);
  const [vendorSaving, setVendorSaving] = useState(false);
  const [editInfo, setEditInfo] = useState({});
  const [mergeMode, setMergeMode] = useState(false);
  const [mergeSelected, setMergeSelected] = useState([]); // selected vendor ids
  const [mergeTargetId, setMergeTargetId] = useState(null);
  const [mergeSaving, setMergeSaving] = useState(false);
  const [gpuBrands, setGpuBrands] = useState([]);
  const [gpuSeriesList, setGpuSeriesList] = useState([]);
  const [gpuModelsList, setGpuModelsList] = useState([]);
  const [selBrandId, setSelBrandId] = useState(null);
  const [selSeriesId, setSelSeriesId] = useState(null);
  const [brandForm, setBrandForm] = useState({name:"",sort_order:"0"});
  const [seriesForm, setSeriesForm] = useState({name:"",sort_order:"0"});
  const [modelForm, setModelForm] = useState({name:"",vram_gb:"",architecture:"",sort_order:"0"});
  const [gpuSaving, setGpuSaving] = useState("");
  const [allDemands, setAllDemands] = useState([]);
  const [demandLoading, setDemandLoading] = useState(false);
  const [editDemand, setEditDemand] = useState(null);   // demand object being edited
  const [editDemandForm, setEditDemandForm] = useState({});
  const [editDemandSaving, setEditDemandSaving] = useState(false);
  // docs admin state
  const [adminDocs, setAdminDocs] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docForm, setDocForm] = useState({ category:"roadmap", title:"", content:"", sort_order:"0", is_published:true });
  const [editingDoc, setEditingDoc] = useState(null); // doc being edited
  const [docSaving, setDocSaving] = useState(false);
  const [docPreview, setDocPreview] = useState(false);

  useEffect(()=>{
    fetch(`${API}/api/related-links`).then(r=>r.json()).then(setLinks).catch(()=>{});
  },[]);

  useEffect(()=>{
    if (adminTab === "vendors") {
      setVendorLoading(true);
      fetch(`${API}/api/admin/vendors`, { headers:{ Authorization:`Bearer ${token}` } })
        .then(r=>r.json()).then(setAllVendors).catch(()=>{}).finally(()=>setVendorLoading(false));
    }
    if (adminTab === "gpu") {
      fetch(`${API}/api/gpu-brands`).then(r=>r.json()).then(setGpuBrands).catch(()=>{});
    }
    if (adminTab === "demands") {
      setDemandLoading(true);
      fetch(`${API}/api/admin/demands`, { headers:{ Authorization:`Bearer ${token}` } })
        .then(r=>r.json()).then(setAllDemands).catch(()=>{}).finally(()=>setDemandLoading(false));
    }
    if (adminTab === "docs") {
      setDocsLoading(true);
      fetch(`${API}/api/admin/docs`, { headers:{ Authorization:`Bearer ${token}` } })
        .then(r=>r.json()).then(setAdminDocs).catch(()=>{}).finally(()=>setDocsLoading(false));
    }
  },[adminTab]);

  const addLink = async () => {
    if (!form.title.trim() || !form.url.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/related-links`, {
        method:"POST", headers:{"Content-Type":"application/json", Authorization:`Bearer ${token}`},
        body: JSON.stringify({title:form.title.trim(), url:form.url.trim(), sort_order:Number(form.sort_order)||0}),
      });
      if (res.ok) { const d = await res.json(); setLinks(l=>[...l,d]); setForm({title:"",url:"",sort_order:"0"}); }
    } finally { setSaving(false); }
  };

  const delLink = async (id) => {
    await fetch(`${API}/api/related-links/${id}`, { method:"DELETE", headers:{Authorization:`Bearer ${token}`} });
    setLinks(l=>l.filter(x=>x.id!==id));
  };

  const toggleVendor = async (v) => {
    const newStatus = v.status === "active" ? "suspended" : "active";
    setVendorUpdating(v.id);
    try {
      const res = await fetch(`${API}/api/admin/vendors/${v.id}`, {
        method:"PATCH",
        headers:{"Content-Type":"application/json", Authorization:`Bearer ${token}`},
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) setAllVendors(vs=>vs.map(x=>x.id===v.id?{...x,status:newStatus}:x));
    } finally { setVendorUpdating(null); }
  };

  const expandVendor = (v) => {
    if (expandedVendor === v.id) { setExpandedVendor(null); return; }
    setExpandedVendor(v.id);
    setVendorSubTab("info");
    setEditInfo({ company_name: v.name, contact_name: v.contact_name||"", contact_phone: v.contact_phone||"", email: v.email||"", location: v.location||"" });
    fetch(`${API}/api/admin/vendors/${v.id}/resources`, {headers:{Authorization:`Bearer ${token}`}})
      .then(r=>r.json()).then(setVendorRes).catch(()=>{});
    fetch(`${API}/api/admin/vendors/${v.id}/demands`, {headers:{Authorization:`Bearer ${token}`}})
      .then(r=>r.json()).then(setVendorDem).catch(()=>{});
  };

  const saveVendorInfo = async (vendorId) => {
    setVendorSaving(true);
    try {
      const res = await fetch(`${API}/api/admin/vendors/${vendorId}/info`, {
        method:"PATCH", headers:{"Content-Type":"application/json", Authorization:`Bearer ${token}`},
        body: JSON.stringify(editInfo),
      });
      if (res.ok) setAllVendors(vs=>vs.map(v=>v.id===vendorId?{...v,name:editInfo.company_name,contact_name:editInfo.contact_name,contact_phone:editInfo.contact_phone,email:editInfo.email,location:editInfo.location}:v));
    } finally { setVendorSaving(false); }
  };

  const doMerge = async () => {
    if (!mergeTargetId || mergeSelected.length < 2) return;
    const sourceIds = mergeSelected.filter(id => id !== mergeTargetId);
    if (sourceIds.length === 0) return;
    setMergeSaving(true);
    try {
      const res = await fetch(`${API}/api/admin/vendors/merge`, {
        method:"POST", headers:{"Content-Type":"application/json", Authorization:`Bearer ${token}`},
        body: JSON.stringify({ target_id: mergeTargetId, source_ids: sourceIds }),
      });
      if (res.ok) {
        setAllVendors(vs => vs.filter(v => !sourceIds.includes(v.id)));
        setMergeMode(false);
        setMergeSelected([]);
        setMergeTargetId(null);
      } else {
        const d = await res.json().catch(()=>({}));
        alert(d.detail || "合并失败");
      }
    } finally { setMergeSaving(false); }
  };

  const toggleResVisibility = async (r) => {
    const res = await fetch(`${API}/api/admin/resources/${r.id}/visibility`, {
      method:"PATCH", headers:{"Content-Type":"application/json", Authorization:`Bearer ${token}`},
      body: JSON.stringify({is_visible: !r.is_visible}),
    });
    if (res.ok) setVendorRes(rs=>rs.map(x=>x.id===r.id?{...x,is_visible:!r.is_visible}:x));
  };

  const deleteVendorRes = async (id) => {
    if (!window.confirm("确认删除该资源？")) return;
    await fetch(`${API}/api/admin/resources/${id}`, {method:"DELETE", headers:{Authorization:`Bearer ${token}`}});
    setVendorRes(rs=>rs.filter(x=>x.id!==id));
  };

  const toggleDemVisibility = async (d) => {
    const res = await fetch(`${API}/api/admin/demands/${d.id}/visibility`, {
      method:"PATCH", headers:{"Content-Type":"application/json", Authorization:`Bearer ${token}`},
      body: JSON.stringify({is_visible: !d.is_visible}),
    });
    if (res.ok) setVendorDem(ds=>ds.map(x=>x.id===d.id?{...x,is_visible:!d.is_visible}:x));
  };

  const deleteVendorDem = async (id) => {
    if (!window.confirm("确认删除该需求？")) return;
    await fetch(`${API}/api/admin/demands/${id}`, {method:"DELETE", headers:{Authorization:`Bearer ${token}`}});
    setVendorDem(ds=>ds.filter(x=>x.id!==id));
  };

  const selectBrand = (brandId) => {
    setSelBrandId(brandId); setSelSeriesId(null); setGpuSeriesList([]); setGpuModelsList([]);
    fetch(`${API}/api/gpu-series?brand_id=${brandId}`).then(r=>r.json()).then(setGpuSeriesList).catch(()=>{});
  };
  const selectSeries = (seriesId) => {
    setSelSeriesId(seriesId); setGpuModelsList([]);
    fetch(`${API}/api/gpu-models?series_id=${seriesId}&include_inactive=true`).then(r=>r.json()).then(setGpuModelsList).catch(()=>{});
  };
  const addBrand = async () => {
    if (!brandForm.name.trim()) return;
    setGpuSaving("brand");
    try {
      const res = await fetch(`${API}/api/admin/gpu-brands`, { method:"POST", headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`}, body:JSON.stringify({name:brandForm.name.trim(),sort_order:Number(brandForm.sort_order)||0}) });
      if (res.ok) { const d=await res.json(); setGpuBrands(b=>[...b,d]); setBrandForm({name:"",sort_order:"0"}); }
    } finally { setGpuSaving(""); }
  };
  const delBrand = async (id) => {
    if (!window.confirm("删除品牌将同时删除所有系列和型号，确认？")) return;
    await fetch(`${API}/api/admin/gpu-brands/${id}`, {method:"DELETE",headers:{Authorization:`Bearer ${token}`}});
    setGpuBrands(b=>b.filter(x=>x.id!==id));
    if (selBrandId===id) { setSelBrandId(null); setGpuSeriesList([]); setGpuModelsList([]); setSelSeriesId(null); }
  };
  const addSeries = async () => {
    if (!seriesForm.name.trim() || !selBrandId) return;
    setGpuSaving("series");
    try {
      const res = await fetch(`${API}/api/admin/gpu-series`, { method:"POST", headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`}, body:JSON.stringify({brand_id:selBrandId,name:seriesForm.name.trim(),sort_order:Number(seriesForm.sort_order)||0}) });
      if (res.ok) { const d=await res.json(); setGpuSeriesList(s=>[...s,d]); setSeriesForm({name:"",sort_order:"0"}); }
    } finally { setGpuSaving(""); }
  };
  const delSeries = async (id) => {
    if (!window.confirm("删除系列将同时删除所有型号，确认？")) return;
    await fetch(`${API}/api/admin/gpu-series/${id}`, {method:"DELETE",headers:{Authorization:`Bearer ${token}`}});
    setGpuSeriesList(s=>s.filter(x=>x.id!==id));
    if (selSeriesId===id) { setSelSeriesId(null); setGpuModelsList([]); }
  };
  const addModel = async () => {
    if (!modelForm.name.trim() || !selSeriesId || !selBrandId) return;
    setGpuSaving("model");
    try {
      const res = await fetch(`${API}/api/admin/gpu-models`, { method:"POST", headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`}, body:JSON.stringify({series_id:selSeriesId,brand_id:selBrandId,name:modelForm.name.trim(),vram_gb:modelForm.vram_gb?Number(modelForm.vram_gb):null,architecture:modelForm.architecture||null,sort_order:Number(modelForm.sort_order)||0}) });
      if (res.ok) { const d=await res.json(); setGpuModelsList(m=>[...m,d]); setModelForm({name:"",vram_gb:"",architecture:"",sort_order:"0"}); }
    } finally { setGpuSaving(""); }
  };
  const toggleModel = async (m) => {
    const res = await fetch(`${API}/api/admin/gpu-models/${m.id}`, { method:"PATCH", headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`}, body:JSON.stringify({is_active:!m.is_active}) });
    if (res.ok) setGpuModelsList(ms=>ms.map(x=>x.id===m.id?{...x,is_active:!m.is_active}:x));
  };
  const delModel = async (id) => {
    await fetch(`${API}/api/admin/gpu-models/${id}`, {method:"DELETE",headers:{Authorization:`Bearer ${token}`}});
    setGpuModelsList(m=>m.filter(x=>x.id!==id));
  };

  const adminTabs = [["links","相关链接"],["vendors","用户管理"],["demands","需求管理"],["gpu","GPU型号库"],["docs","文档管理"],["memory","内存条管理"]];

  const openEditDemand = (d) => {
    setEditDemand(d);
    setEditDemandForm({
      gpu: d.gpu||"", gpu_brand: d.gpu_brand||"",
      gpu_count: d.count||"", count_unit: d.count_unit||"卡",
      rental_months: d.rental_months||"", region: d.region||"",
      dc_location: d.dc_location||"", delivery_time: d.delivery_time||"",
      contract_type: d.contract_type||"", payment_type: d.payment_type||"",
      budget_text: d.budget_text||"", notes: d.notes||"",
      is_visible: d.is_visible!==false,
      vendor_id: d.vendor_id||"",
    });
  };

  const saveEditDemand = async () => {
    if (!editDemand) return;
    setEditDemandSaving(true);
    const body = {
      gpu: editDemandForm.gpu||null,
      gpu_brand: editDemandForm.gpu_brand||null,
      gpu_count: editDemandForm.gpu_count?Number(editDemandForm.gpu_count):null,
      count_unit: editDemandForm.count_unit||null,
      rental_months: editDemandForm.rental_months!==''?Number(editDemandForm.rental_months):null,
      region: editDemandForm.region||null,
      dc_location: editDemandForm.dc_location||null,
      delivery_time: editDemandForm.delivery_time||null,
      contract_type: editDemandForm.contract_type||null,
      payment_type: editDemandForm.payment_type||null,
      budget_text: editDemandForm.budget_text||null,
      notes: editDemandForm.notes||null,
      is_visible: editDemandForm.is_visible,
      vendor_id: editDemandForm.vendor_id?Number(editDemandForm.vendor_id):null,
    };
    try {
      const res = await fetch(`${API}/api/admin/demands/${editDemand.id}`, {
        method:"PATCH", headers:{"Content-Type":"application/json", Authorization:`Bearer ${token}`},
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const vendor = allVendors.find(v=>v.id===body.vendor_id);
        setAllDemands(ds=>ds.map(d=>d.id===editDemand.id?{
          ...d, ...body, count:body.gpu_count||d.count,
          vendor_name: vendor?.name||"",
        }:d));
        setEditDemand(null);
      }
    } finally { setEditDemandSaving(false); }
  };

  const deleteAdminDemand = async (id) => {
    if (!window.confirm("确认删除该需求？")) return;
    await fetch(`${API}/api/admin/demands/${id}`, {method:"DELETE", headers:{Authorization:`Bearer ${token}`}});
    setAllDemands(ds=>ds.filter(d=>d.id!==id));
  };

  return (
    <div style={{minHeight:"100vh",background:"#f1f5f9",color:"#0f172a",fontFamily:"'Noto Sans SC',system-ui,sans-serif"}}>
      <div style={{borderBottom:"1px solid #e2e8f0",padding:"0 24px",display:"flex",alignItems:"center",gap:16,height:60,background:"rgba(255,255,255,0.97)",backdropFilter:"blur(12px)"}}>
        <img src="/logo.svg" height="32" onClick={onExit} style={{cursor:"pointer",display:"block"}} alt="新云集市" />
        <span style={{fontSize:12,color:"#94a3b8",borderLeft:"1px solid #e2e8f0",paddingLeft:16}}>管理员后台</span>
        {adminTabs.map(([k,l])=>(
          <button key={k} onClick={()=>setAdminTab(k)} style={{fontSize:13,fontWeight:adminTab===k?700:400,color:adminTab===k?"#2563eb":"#64748b",background:"none",border:"none",cursor:"pointer",padding:"4px 2px",borderBottom:adminTab===k?"2px solid #2563eb":"2px solid transparent"}}>
            {l}
          </button>
        ))}
        <div style={{marginLeft:"auto"}}>
          <button onClick={onExit} style={{fontSize:12,color:"#64748b",background:"none",border:"1px solid #e2e8f0",borderRadius:6,padding:"4px 10px",cursor:"pointer"}}>退出</button>
        </div>
      </div>
      <div style={{maxWidth:860,margin:"0 auto",padding:"40px 24px"}}>
        {adminTab === "links" && (
          <>
            <div style={{fontSize:22,fontWeight:700,color:"#0f172a",marginBottom:4}}>相关链接管理</div>
            <div style={{fontSize:13,color:"#64748b",marginBottom:28}}>管理展示在「相关链接」页面的链接</div>
            <div style={{background:"#ffffff",border:"1px solid #e2e8f0",borderRadius:14,padding:"20px 24px",marginBottom:20,boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
              <div style={{fontSize:14,fontWeight:600,color:"#0f172a",marginBottom:14}}>添加新链接</div>
              <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"flex-end"}}>
                <div style={{flex:"2 1 160px"}}>
                  <div style={{fontSize:12,color:"#64748b",marginBottom:4}}>链接名称</div>
                  <input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="如：算力云官网" style={{...inp,marginBottom:0}} />
                </div>
                <div style={{flex:"3 1 200px"}}>
                  <div style={{fontSize:12,color:"#64748b",marginBottom:4}}>URL</div>
                  <input value={form.url} onChange={e=>setForm(f=>({...f,url:e.target.value}))} placeholder="https://..." style={{...inp,marginBottom:0}} />
                </div>
                <div style={{flex:"0 0 80px"}}>
                  <div style={{fontSize:12,color:"#64748b",marginBottom:4}}>排序</div>
                  <input type="number" value={form.sort_order} onChange={e=>setForm(f=>({...f,sort_order:e.target.value}))} style={{...inp,marginBottom:0}} />
                </div>
                <button onClick={addLink} disabled={saving||!form.title.trim()||!form.url.trim()} style={{...primaryBtn,padding:"11px 22px",flexShrink:0,opacity:saving?0.6:1}}>
                  {saving?"添加中...":"＋ 添加"}
                </button>
              </div>
            </div>
            {links.length === 0 ? (
              <div style={{textAlign:"center",padding:"48px 0",color:"#94a3b8",border:"1px dashed #d1d5db",borderRadius:12,fontSize:13}}>暂无链接，请添加</div>
            ) : (
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {links.map(l=>(
                  <div key={l.id} style={{background:"#ffffff",border:"1px solid #e2e8f0",borderRadius:10,padding:"14px 18px",display:"flex",alignItems:"center",gap:12,boxShadow:"0 1px 2px rgba(0,0,0,0.03)"}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:14,fontWeight:600,color:"#0f172a",marginBottom:3}}>{l.title}</div>
                      <a href={l.url} target="_blank" rel="noopener noreferrer" style={{fontSize:12,color:"#2563eb",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",display:"block",textDecoration:"none"}}>{l.url}</a>
                    </div>
                    <span style={{fontSize:11,color:"#94a3b8",flexShrink:0}}>排序 {l.sort_order}</span>
                    <button onClick={()=>delLink(l.id)} style={{fontSize:12,color:"#dc2626",background:"none",border:"1px solid #fecaca",borderRadius:6,padding:"5px 12px",cursor:"pointer",flexShrink:0}}>删除</button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        {adminTab === "vendors" && (
          <>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
              <div style={{fontSize:22,fontWeight:700,color:"#0f172a"}}>用户管理</div>
              {!mergeMode ? (
                <button onClick={()=>{setMergeMode(true);setMergeSelected([]);setMergeTargetId(null);}}
                  style={{...ghostBtn,fontSize:12,padding:"6px 14px"}}>合并供应商</button>
              ) : (
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <span style={{fontSize:12,color:"#64748b"}}>已选 {mergeSelected.length} 个</span>
                  <button onClick={doMerge} disabled={mergeSaving||mergeSelected.length<2||!mergeTargetId}
                    style={{...primaryBtn,fontSize:12,padding:"6px 14px",opacity:(mergeSelected.length<2||!mergeTargetId)?0.4:1}}>
                    {mergeSaving?"合并中...":"确认合并"}
                  </button>
                  <button onClick={()=>{setMergeMode(false);setMergeSelected([]);setMergeTargetId(null);}}
                    style={{...ghostBtn,fontSize:12,padding:"6px 14px"}}>取消</button>
                </div>
              )}
            </div>
            <div style={{fontSize:13,color:"#64748b",marginBottom:mergeMode?8:28}}>
              {mergeMode
                ? "勾选要合并的供应商，然后点击其中一个「设为保留」确定目标"
                : "查看所有已入驻用户，点击展开可管理其资源和需求"}
            </div>
            {mergeMode && mergeTargetId && (
              <div style={{fontSize:12,color:"#2563eb",background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:8,padding:"6px 14px",marginBottom:12}}>
                保留目标：<strong>{allVendors.find(v=>v.id===mergeTargetId)?.name}</strong>，其余选中供应商的资源和需求将迁移至此，原记录删除
              </div>
            )}
            {vendorLoading ? (
              <div style={{textAlign:"center",padding:"60px 0",color:"#94a3b8",fontSize:14}}>加载中…</div>
            ) : allVendors.length === 0 ? (
              <div style={{textAlign:"center",padding:"48px 0",color:"#94a3b8",border:"1px dashed #d1d5db",borderRadius:12,fontSize:13}}>暂无用户</div>
            ) : (
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {allVendors.map(v=>{
                  const isActive = v.status === "active";
                  const isSuspended = v.status === "suspended";
                  const statusColor = isActive?"#16a34a":isSuspended?"#dc2626":"#d97706";
                  const statusLabel = isActive?"上线中":isSuspended?"已下架":"待审核";
                  const isExpanded = !mergeMode && expandedVendor === v.id;
                  const isChecked = mergeSelected.includes(v.id);
                  const isTarget = mergeTargetId === v.id;
                  return (
                    <div key={v.id} style={{background:"#ffffff",border:`1px solid ${isTarget?"#2563eb":isChecked?"#93c5fd":isExpanded?"#93c5fd":"#e2e8f0"}`,borderRadius:10,boxShadow:"0 1px 2px rgba(0,0,0,0.03)",overflow:"hidden"}}>
                      <div
                        onClick={()=>{
                          if (mergeMode) {
                            setMergeSelected(sel => sel.includes(v.id) ? sel.filter(x=>x!==v.id) : [...sel, v.id]);
                            if (mergeTargetId === v.id) setMergeTargetId(null);
                          } else {
                            expandVendor(v);
                          }
                        }}
                        style={{padding:"14px 18px",display:"flex",alignItems:"center",gap:12,cursor:"pointer"}}>
                        {mergeMode && (
                          <input type="checkbox" checked={isChecked} readOnly
                            style={{width:16,height:16,accentColor:"#2563eb",flexShrink:0,cursor:"pointer"}} />
                        )}
                        <div style={{width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#2563eb,#7c3aed)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:14,fontWeight:700,flexShrink:0}}>
                          {v.name.slice(0,2)}
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:14,fontWeight:600,color:"#0f172a"}}>{v.name}</div>
                          <div style={{fontSize:12,color:"#94a3b8",marginTop:2}}>
                            {v.contact_name&&<span style={{marginRight:8}}>{v.contact_name}</span>}
                            {v.email&&<span style={{marginRight:8}}>{v.email}</span>}
                            入驻 {v.joined} · {v.resource_count} 条资源
                          </div>
                        </div>
                        <span style={{fontSize:11,fontWeight:600,color:statusColor,background:statusColor+"15",border:`1px solid ${statusColor}40`,borderRadius:20,padding:"3px 10px",flexShrink:0}}>{statusLabel}</span>
                        {mergeMode && isChecked && (
                          <button onClick={e=>{e.stopPropagation();setMergeTargetId(isTarget?null:v.id);}}
                            style={{fontSize:11,padding:"4px 12px",borderRadius:6,border:`1px solid ${isTarget?"#2563eb":"#cbd5e1"}`,color:isTarget?"#2563eb":"#64748b",background:isTarget?"#eff6ff":"none",cursor:"pointer",flexShrink:0,fontWeight:isTarget?700:400}}>
                            {isTarget?"✓ 保留目标":"设为保留"}
                          </button>
                        )}
                        {!mergeMode && v.status !== "pending" && (
                          <button onClick={e=>{e.stopPropagation();toggleVendor(v);}} disabled={vendorUpdating===v.id}
                            style={{fontSize:12,color:isActive?"#dc2626":"#16a34a",background:"none",border:`1px solid ${isActive?"#fecaca":"#bbf7d0"}`,borderRadius:6,padding:"5px 14px",cursor:"pointer",flexShrink:0,opacity:vendorUpdating===v.id?0.5:1}}>
                            {vendorUpdating===v.id?"处理中...":isActive?"下架":"恢复上线"}
                          </button>
                        )}
                        {!mergeMode && <span style={{fontSize:12,color:"#94a3b8",flexShrink:0}}>{isExpanded?"▲":"▼"}</span>}
                      </div>
                      {isExpanded && (
                        <div style={{borderTop:"1px solid #e2e8f0",padding:"16px 18px"}}>
                          <div style={{display:"flex",gap:0,background:"#f1f5f9",borderRadius:8,padding:3,marginBottom:16,width:"fit-content"}}>
                            {[["info","公司信息"],["resources","资源管理"],["demands","需求管理"]].map(([k,l])=>(
                              <button key={k} onClick={()=>setVendorSubTab(k)} style={{padding:"5px 14px",borderRadius:6,border:"none",fontSize:12,fontWeight:600,cursor:"pointer",background:vendorSubTab===k?"#ffffff":"transparent",color:vendorSubTab===k?"#0f172a":"#64748b",boxShadow:vendorSubTab===k?"0 1px 3px rgba(0,0,0,0.08)":"none"}}>{l}</button>
                            ))}
                          </div>
                          {vendorSubTab==="info" && (
                            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px 14px"}}>
                              {[["公司名称","company_name"],["联系人","contact_name"],["手机号","contact_phone"],["邮箱","email"],["城市","location"]].map(([label,key])=>(
                                <div key={key} style={{gridColumn:key==="company_name"?"span 2":"auto"}}>
                                  <div style={{fontSize:11,color:"#64748b",marginBottom:3}}>{label}</div>
                                  <input value={editInfo[key]||""} onChange={e=>setEditInfo(x=>({...x,[key]:e.target.value}))} style={{...inp,marginBottom:0,fontSize:13}} />
                                </div>
                              ))}
                              <div style={{gridColumn:"span 2",display:"flex",justifyContent:"flex-end",marginTop:4}}>
                                <button onClick={()=>saveVendorInfo(v.id)} disabled={vendorSaving} style={{...primaryBtn,padding:"8px 22px",fontSize:13,opacity:vendorSaving?0.6:1}}>
                                  {vendorSaving?"保存中...":"保存"}
                                </button>
                              </div>
                            </div>
                          )}
                          {vendorSubTab==="resources" && (
                            vendorRes.length===0 ? (
                              <div style={{textAlign:"center",padding:"24px 0",color:"#94a3b8",fontSize:13}}>暂无资源</div>
                            ) : (
                              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                                {vendorRes.map(r=>(
                                  <div key={r.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:"#f8fafc",borderRadius:8,border:"1px solid #f1f5f9"}}>
                                    <div style={{flex:1,minWidth:0}}>
                                      <span style={{fontSize:13,fontWeight:600,color:"#0f172a",marginRight:8}}>{r.gpu}</span>
                                      <span style={{fontSize:12,color:"#64748b"}}>{r.count}卡 · ¥{r.price}/时</span>
                                    </div>
                                    <span style={{fontSize:11,color:"#64748b",flexShrink:0}}>{r.status||"在线"}</span>
                                    <button onClick={()=>toggleResVisibility(r)} style={{fontSize:11,padding:"3px 10px",borderRadius:5,border:`1px solid ${r.is_visible!==false?"#93c5fd":"#e2e8f0"}`,color:r.is_visible!==false?"#2563eb":"#94a3b8",background:"none",cursor:"pointer",flexShrink:0}}>
                                      {r.is_visible!==false?"可见":"隐藏"}
                                    </button>
                                    <button onClick={()=>deleteVendorRes(r.id)} style={{fontSize:11,padding:"3px 10px",borderRadius:5,border:"1px solid #fecaca",color:"#dc2626",background:"none",cursor:"pointer",flexShrink:0}}>删除</button>
                                  </div>
                                ))}
                              </div>
                            )
                          )}
                          {vendorSubTab==="demands" && (
                            vendorDem.length===0 ? (
                              <div style={{textAlign:"center",padding:"24px 0",color:"#94a3b8",fontSize:13}}>暂无需求</div>
                            ) : (
                              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                                {vendorDem.map(d=>(
                                  <div key={d.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:"#f8fafc",borderRadius:8,border:"1px solid #f1f5f9"}}>
                                    <div style={{flex:1,minWidth:0}}>
                                      <span style={{fontSize:13,fontWeight:600,color:"#0f172a",marginRight:8}}>{d.gpu}</span>
                                      <span style={{fontSize:12,color:"#64748b"}}>{d.count}{d.count_unit||"卡"} · {d.contact_name}</span>
                                    </div>
                                    <span style={{fontSize:11,color:"#94a3b8",flexShrink:0}}>{d.createdAt}</span>
                                    <button onClick={()=>toggleDemVisibility(d)} style={{fontSize:11,padding:"3px 10px",borderRadius:5,border:`1px solid ${d.is_visible!==false?"#93c5fd":"#e2e8f0"}`,color:d.is_visible!==false?"#2563eb":"#94a3b8",background:"none",cursor:"pointer",flexShrink:0}}>
                                      {d.is_visible!==false?"可见":"隐藏"}
                                    </button>
                                    <button onClick={()=>deleteVendorDem(d.id)} style={{fontSize:11,padding:"3px 10px",borderRadius:5,border:"1px solid #fecaca",color:"#dc2626",background:"none",cursor:"pointer",flexShrink:0}}>删除</button>
                                  </div>
                                ))}
                              </div>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
        {adminTab === "demands" && (
          <>
            <div style={{fontSize:22,fontWeight:700,color:"#0f172a",marginBottom:4}}>需求管理</div>
            <div style={{fontSize:13,color:"#64748b",marginBottom:20}}>全部需求（含未关联用户），可编辑或删除</div>
            {demandLoading ? (
              <div style={{textAlign:"center",padding:"40px 0",color:"#94a3b8"}}>加载中…</div>
            ) : allDemands.length === 0 ? (
              <div style={{textAlign:"center",padding:"60px 0",color:"#94a3b8"}}>暂无需求</div>
            ) : (
              <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:14,overflow:"hidden",boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead>
                    <tr>
                      {["#","GPU型号","数量","租期","区域","联系人","公司","关联用户","可见","操作"].map((h,i)=>(
                        <th key={i} style={{padding:"9px 12px",fontSize:11,fontWeight:700,color:"#64748b",textAlign:"left",background:"#f8fafc",borderBottom:"2px solid #e2e8f0",whiteSpace:"nowrap"}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {allDemands.map(d=>(
                      <tr key={d.id} style={{background:"transparent"}}
                        onMouseEnter={e=>e.currentTarget.style.background="#f8fafc"}
                        onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                      >
                        <td style={{padding:"10px 12px",fontSize:12,color:"#94a3b8",borderBottom:"1px solid #f1f5f9"}}>{d.id}</td>
                        <td style={{padding:"10px 12px",fontSize:13,fontWeight:600,color:"#0f172a",borderBottom:"1px solid #f1f5f9",fontFamily:"'Bebas Neue',cursive",letterSpacing:0.5}}>{d.gpu_brand?`${d.gpu_brand} `:""}{d.gpu}</td>
                        <td style={{padding:"10px 12px",fontSize:13,color:"#374151",borderBottom:"1px solid #f1f5f9"}}>{d.count} {d.count_unit}</td>
                        <td style={{padding:"10px 12px",fontSize:13,color:"#374151",borderBottom:"1px solid #f1f5f9"}}>{d.rental_months>0?`${d.rental_months}个月`:"—"}</td>
                        <td style={{padding:"10px 12px",fontSize:13,color:"#374151",borderBottom:"1px solid #f1f5f9"}}>{d.region||"—"}</td>
                        <td style={{padding:"10px 12px",fontSize:13,color:"#374151",borderBottom:"1px solid #f1f5f9"}}>{d.contact_name||"—"}</td>
                        <td style={{padding:"10px 12px",fontSize:12,color:"#64748b",borderBottom:"1px solid #f1f5f9"}}>{d.company||"—"}</td>
                        <td style={{padding:"10px 12px",fontSize:12,borderBottom:"1px solid #f1f5f9"}}>
                          {d.vendor_id
                            ? <span style={{color:"#2563eb",fontWeight:600}}>{d.vendor_name||`#${d.vendor_id}`}</span>
                            : <span style={{color:"#f59e0b",fontWeight:600}}>未关联</span>
                          }
                        </td>
                        <td style={{padding:"10px 12px",borderBottom:"1px solid #f1f5f9"}}>
                          <span style={{fontSize:11,padding:"2px 7px",borderRadius:10,background:d.is_visible!==false?"#dcfce7":"#f1f5f9",color:d.is_visible!==false?"#16a34a":"#94a3b8",fontWeight:600}}>
                            {d.is_visible!==false?"显示":"隐藏"}
                          </span>
                        </td>
                        <td style={{padding:"10px 12px",borderBottom:"1px solid #f1f5f9",whiteSpace:"nowrap"}}>
                          <button onClick={()=>openEditDemand(d)} style={{fontSize:11,padding:"3px 10px",borderRadius:5,border:"1px solid #93c5fd",color:"#2563eb",background:"none",cursor:"pointer",marginRight:6}}>编辑</button>
                          <button onClick={()=>deleteAdminDemand(d.id)} style={{fontSize:11,padding:"3px 10px",borderRadius:5,border:"1px solid #fecaca",color:"#dc2626",background:"none",cursor:"pointer"}}>删除</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 编辑弹窗 */}
            {editDemand && (
              <Modal onClose={()=>setEditDemand(null)} width={560}>
                <div style={{fontFamily:"'Noto Serif SC',serif",fontSize:18,fontWeight:700,color:"#0f172a",marginBottom:4}}>编辑需求 #{editDemand.id}</div>
                <div style={{fontSize:12,color:"#94a3b8",marginBottom:20}}>修改后点击保存，空值保持原内容不变</div>
                {(()=>{
                  const s = k => e => setEditDemandForm(f=>({...f,[k]:e.target.value}));
                  const row2 = {display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 14px"};
                  const lbl = {display:"block",fontSize:12,color:"#64748b",marginBottom:4};
                  return <>
                    <div style={row2}>
                      <div><label style={lbl}>GPU 品牌</label><input value={editDemandForm.gpu_brand} onChange={s("gpu_brand")} style={inp} /></div>
                      <div><label style={lbl}>GPU 型号</label><input value={editDemandForm.gpu} onChange={s("gpu")} style={inp} /></div>
                    </div>
                    <div style={row2}>
                      <div><label style={lbl}>数量</label><input value={editDemandForm.gpu_count} onChange={s("gpu_count")} type="number" min="1" style={inp} /></div>
                      <div><label style={lbl}>单位</label>
                        <select value={editDemandForm.count_unit} onChange={s("count_unit")} style={inp}>
                          <option>台</option><option>卡</option><option>张</option>
                        </select>
                      </div>
                    </div>
                    <div style={row2}>
                      <div><label style={lbl}>租期（月）</label><input value={editDemandForm.rental_months} onChange={s("rental_months")} type="number" min="0" style={inp} /></div>
                      <div><label style={lbl}>区域</label>
                        <select value={editDemandForm.region} onChange={s("region")} style={inp}>
                          <option value="">—</option><option>国内</option><option>海外</option>
                        </select>
                      </div>
                    </div>
                    <div style={row2}>
                      <div><label style={lbl}>机房位置</label><input value={editDemandForm.dc_location} onChange={s("dc_location")} style={inp} /></div>
                      <div><label style={lbl}>交付时间</label><input value={editDemandForm.delivery_time} onChange={s("delivery_time")} style={inp} /></div>
                    </div>
                    <div style={row2}>
                      <div><label style={lbl}>合同形式</label><input value={editDemandForm.contract_type} onChange={s("contract_type")} style={inp} /></div>
                      <div><label style={lbl}>付款方式</label><input value={editDemandForm.payment_type} onChange={s("payment_type")} style={inp} /></div>
                    </div>
                    <div><label style={lbl}>预算描述</label><input value={editDemandForm.budget_text} onChange={s("budget_text")} placeholder="如：160000.00/台/月" style={inp} /></div>
                    <div><label style={lbl}>备注</label><textarea value={editDemandForm.notes} onChange={s("notes")} rows={2} style={{...inp,resize:"vertical"}} /></div>
                    <div style={row2}>
                      <div><label style={lbl}>关联用户</label>
                        <select value={editDemandForm.vendor_id} onChange={s("vendor_id")} style={inp}>
                          <option value="">未关联</option>
                          {allVendors.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}
                        </select>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:8,paddingTop:20}}>
                        <input type="checkbox" id="dem-vis" checked={editDemandForm.is_visible} onChange={e=>setEditDemandForm(f=>({...f,is_visible:e.target.checked}))} style={{width:16,height:16,cursor:"pointer"}} />
                        <label htmlFor="dem-vis" style={{fontSize:13,color:"#374151",cursor:"pointer"}}>前台显示</label>
                      </div>
                    </div>
                    <div style={{display:"flex",gap:10,marginTop:8}}>
                      <button onClick={()=>setEditDemand(null)} style={{...ghostBtn,flex:1}}>取消</button>
                      <button onClick={saveEditDemand} disabled={editDemandSaving} style={{...primaryBtn,flex:2,opacity:editDemandSaving?0.6:1}}>{editDemandSaving?"保存中…":"保存"}</button>
                    </div>
                  </>;
                })()}
              </Modal>
            )}
          </>
        )}
        {adminTab === "gpu" && (
          <>
            <div style={{fontSize:22,fontWeight:700,color:"#0f172a",marginBottom:4}}>GPU 型号库</div>
            <div style={{fontSize:13,color:"#64748b",marginBottom:20}}>管理品牌 → 系列 → 型号三级数据，点击品牌/系列展开下级</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16,alignItems:"start"}}>
              <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:12,padding:16}}>
                <div style={{fontSize:12,fontWeight:700,color:"#2563eb",letterSpacing:1,marginBottom:12}}>品牌</div>
                <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:12}}>
                  {gpuBrands.map(b=>(
                    <div key={b.id} onClick={()=>selectBrand(b.id)} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:8,cursor:"pointer",background:selBrandId===b.id?"#eff6ff":"transparent",border:`1px solid ${selBrandId===b.id?"#93c5fd":"#f1f5f9"}`}}>
                      <span style={{flex:1,fontSize:13,fontWeight:selBrandId===b.id?700:400,color:"#0f172a"}}>{b.name}</span>
                      <button onClick={e=>{e.stopPropagation();delBrand(b.id);}} style={{fontSize:11,color:"#dc2626",background:"none",border:"none",cursor:"pointer",padding:0,lineHeight:1}}>✕</button>
                    </div>
                  ))}
                  {gpuBrands.length===0 && <div style={{fontSize:12,color:"#94a3b8",textAlign:"center",padding:"12px 0"}}>暂无品牌</div>}
                </div>
                <div style={{borderTop:"1px solid #f1f5f9",paddingTop:10}}>
                  <input value={brandForm.name} onChange={e=>setBrandForm(f=>({...f,name:e.target.value}))} placeholder="品牌名称" style={{...inp,marginBottom:6,fontSize:12}} />
                  <button onClick={addBrand} disabled={gpuSaving==="brand"||!brandForm.name.trim()} style={{...primaryBtn,width:"100%",padding:"7px",fontSize:12,opacity:gpuSaving==="brand"||!brandForm.name.trim()?0.5:1}}>
                    {gpuSaving==="brand"?"添加中...":"＋ 添加品牌"}
                  </button>
                </div>
              </div>
              <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:12,padding:16}}>
                <div style={{fontSize:12,fontWeight:700,color:"#2563eb",letterSpacing:1,marginBottom:12}}>系列{selBrandId?` · ${gpuBrands.find(b=>b.id===selBrandId)?.name}`:""}</div>
                {!selBrandId ? (
                  <div style={{fontSize:12,color:"#94a3b8",textAlign:"center",padding:"24px 0"}}>← 先选择品牌</div>
                ) : (<>
                  <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:12}}>
                    {gpuSeriesList.map(s=>(
                      <div key={s.id} onClick={()=>selectSeries(s.id)} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:8,cursor:"pointer",background:selSeriesId===s.id?"#eff6ff":"transparent",border:`1px solid ${selSeriesId===s.id?"#93c5fd":"#f1f5f9"}`}}>
                        <span style={{flex:1,fontSize:13,fontWeight:selSeriesId===s.id?700:400,color:"#0f172a"}}>{s.name}</span>
                        <button onClick={e=>{e.stopPropagation();delSeries(s.id);}} style={{fontSize:11,color:"#dc2626",background:"none",border:"none",cursor:"pointer",padding:0,lineHeight:1}}>✕</button>
                      </div>
                    ))}
                    {gpuSeriesList.length===0 && <div style={{fontSize:12,color:"#94a3b8",textAlign:"center",padding:"12px 0"}}>暂无系列</div>}
                  </div>
                  <div style={{borderTop:"1px solid #f1f5f9",paddingTop:10}}>
                    <input value={seriesForm.name} onChange={e=>setSeriesForm(f=>({...f,name:e.target.value}))} placeholder="系列名称" style={{...inp,marginBottom:6,fontSize:12}} />
                    <button onClick={addSeries} disabled={gpuSaving==="series"||!seriesForm.name.trim()} style={{...primaryBtn,width:"100%",padding:"7px",fontSize:12,opacity:gpuSaving==="series"||!seriesForm.name.trim()?0.5:1}}>
                      {gpuSaving==="series"?"添加中...":"＋ 添加系列"}
                    </button>
                  </div>
                </>)}
              </div>
              <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:12,padding:16}}>
                <div style={{fontSize:12,fontWeight:700,color:"#2563eb",letterSpacing:1,marginBottom:12}}>型号{selSeriesId?` · ${gpuSeriesList.find(s=>s.id===selSeriesId)?.name}`:""}</div>
                {!selSeriesId ? (
                  <div style={{fontSize:12,color:"#94a3b8",textAlign:"center",padding:"24px 0"}}>← 先选择系列</div>
                ) : (<>
                  <div style={{display:"flex",flexDirection:"column",gap:5,marginBottom:12,maxHeight:320,overflowY:"auto"}}>
                    {gpuModelsList.map(m=>(
                      <div key={m.id} style={{display:"flex",alignItems:"center",gap:6,padding:"7px 10px",borderRadius:8,border:"1px solid #f1f5f9",background:m.is_active?"#fff":"#f8fafc"}}>
                        <span style={{flex:1,fontSize:12,color:m.is_active?"#0f172a":"#94a3b8",fontWeight:500}}>
                          {m.name}{m.vram_gb?` (${m.vram_gb}GB)`:""}
                        </span>
                        <button onClick={()=>toggleModel(m)} style={{fontSize:10,padding:"2px 7px",borderRadius:5,border:`1px solid ${m.is_active?"#bbf7d0":"#e2e8f0"}`,color:m.is_active?"#16a34a":"#94a3b8",background:"none",cursor:"pointer",flexShrink:0}}>
                          {m.is_active?"启用":"禁用"}
                        </button>
                        <button onClick={()=>delModel(m.id)} style={{fontSize:11,color:"#dc2626",background:"none",border:"none",cursor:"pointer",padding:0,lineHeight:1,flexShrink:0}}>✕</button>
                      </div>
                    ))}
                    {gpuModelsList.length===0 && <div style={{fontSize:12,color:"#94a3b8",textAlign:"center",padding:"12px 0"}}>暂无型号</div>}
                  </div>
                  <div style={{borderTop:"1px solid #f1f5f9",paddingTop:10}}>
                    <input value={modelForm.name} onChange={e=>setModelForm(f=>({...f,name:e.target.value}))} placeholder="型号名称，如 A100 80GB" style={{...inp,marginBottom:6,fontSize:12}} />
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:6}}>
                      <input value={modelForm.vram_gb} onChange={e=>setModelForm(f=>({...f,vram_gb:e.target.value}))} placeholder="显存 GB" type="number" style={{...inp,marginBottom:0,fontSize:12}} />
                      <input value={modelForm.architecture} onChange={e=>setModelForm(f=>({...f,architecture:e.target.value}))} placeholder="架构，如 Hopper" style={{...inp,marginBottom:0,fontSize:12}} />
                    </div>
                    <button onClick={addModel} disabled={gpuSaving==="model"||!modelForm.name.trim()} style={{...primaryBtn,width:"100%",padding:"7px",fontSize:12,opacity:gpuSaving==="model"||!modelForm.name.trim()?0.5:1}}>
                      {gpuSaving==="model"?"添加中...":"＋ 添加型号"}
                    </button>
                  </div>
                </>)}
              </div>
            </div>
          </>
        )}

        {/* Docs Admin */}
        {adminTab === "docs" && (
          <>
            {/* New/Edit Doc Form */}
            <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:12,padding:20,marginBottom:20}}>
              <div style={{fontSize:13,fontWeight:700,color:"#0f172a",marginBottom:14}}>
                {editingDoc ? "编辑文档" : "新增文档"}
              </div>
              <div style={{display:"flex",gap:10,marginBottom:10,flexWrap:"wrap"}}>
                <select value={editingDoc?editingDoc.category:docForm.category}
                  onChange={e=>editingDoc?setEditingDoc(d=>({...d,category:e.target.value})):setDocForm(f=>({...f,category:e.target.value}))}
                  style={{...inp,marginBottom:0,flex:"0 0 160px"}}>
                  <option value="roadmap">开发计划</option>
                  <option value="guide">网站使用说明</option>
                </select>
                <input value={editingDoc?editingDoc.title:docForm.title}
                  onChange={e=>editingDoc?setEditingDoc(d=>({...d,title:e.target.value})):setDocForm(f=>({...f,title:e.target.value}))}
                  placeholder="文档标题" style={{...inp,marginBottom:0,flex:1}} />
                <input value={editingDoc?String(editingDoc.sort_order):docForm.sort_order}
                  onChange={e=>editingDoc?setEditingDoc(d=>({...d,sort_order:e.target.value})):setDocForm(f=>({...f,sort_order:e.target.value}))}
                  placeholder="排序" type="number" style={{...inp,marginBottom:0,flex:"0 0 80px"}} />
              </div>
              <div style={{display:"flex",gap:10,marginBottom:10,alignItems:"center"}}>
                <button onClick={()=>setDocPreview(false)} style={{padding:"4px 14px",borderRadius:6,border:"none",background:!docPreview?"#2563eb":"#f1f5f9",color:!docPreview?"#fff":"#64748b",fontSize:12,cursor:"pointer",fontWeight:600}}>编辑</button>
                <button onClick={()=>setDocPreview(true)} style={{padding:"4px 14px",borderRadius:6,border:"none",background:docPreview?"#2563eb":"#f1f5f9",color:docPreview?"#fff":"#64748b",fontSize:12,cursor:"pointer",fontWeight:600}}>预览</button>
                <label style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:"#374151",marginLeft:"auto",cursor:"pointer"}}>
                  <input type="checkbox"
                    checked={editingDoc?editingDoc.is_published:docForm.is_published}
                    onChange={e=>editingDoc?setEditingDoc(d=>({...d,is_published:e.target.checked})):setDocForm(f=>({...f,is_published:e.target.checked}))} />
                  已发布
                </label>
              </div>
              {!docPreview ? (
                <textarea
                  value={editingDoc?editingDoc.content:docForm.content}
                  onChange={e=>editingDoc?setEditingDoc(d=>({...d,content:e.target.value})):setDocForm(f=>({...f,content:e.target.value}))}
                  placeholder="Markdown 内容..." rows={14}
                  style={{...inp,resize:"vertical",fontFamily:"monospace",fontSize:13,marginBottom:10}} />
              ) : (
                <div style={{border:"1px solid #e2e8f0",borderRadius:8,padding:"14px 18px",minHeight:200,background:"#fafafa",marginBottom:10,fontSize:14,lineHeight:1.8,color:"#0f172a"}}>
                  <ReactMarkdown>{editingDoc?editingDoc.content:docForm.content}</ReactMarkdown>
                </div>
              )}
              <div style={{display:"flex",gap:10}}>
                {editingDoc ? (<>
                  <button onClick={async()=>{
                    setDocSaving(true);
                    try{
                      const res = await fetch(`${API}/api/admin/docs/${editingDoc.id}`,{
                        method:"PATCH",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},
                        body:JSON.stringify({category:editingDoc.category,title:editingDoc.title,content:editingDoc.content,sort_order:Number(editingDoc.sort_order)||0,is_published:editingDoc.is_published}),
                      });
                      if(res.ok){ setAdminDocs(ds=>ds.map(d=>d.id===editingDoc.id?{...d,...editingDoc,sort_order:Number(editingDoc.sort_order)||0}:d)); setEditingDoc(null); }
                    }finally{setDocSaving(false);}
                  }} disabled={docSaving} style={{...primaryBtn,padding:"9px 24px",opacity:docSaving?0.6:1}}>{docSaving?"保存中...":"保存修改"}</button>
                  <button onClick={()=>setEditingDoc(null)} style={{...ghostBtn,padding:"9px 24px"}}>取消</button>
                </>) : (
                  <button onClick={async()=>{
                    if(!docForm.title.trim()) return;
                    setDocSaving(true);
                    try{
                      const res = await fetch(`${API}/api/admin/docs`,{
                        method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},
                        body:JSON.stringify({category:docForm.category,title:docForm.title,content:docForm.content,sort_order:Number(docForm.sort_order)||0,is_published:docForm.is_published}),
                      });
                      if(res.ok){ const d=await res.json(); setAdminDocs(ds=>[...ds,d]); setDocForm({category:"roadmap",title:"",content:"",sort_order:"0",is_published:true}); }
                    }finally{setDocSaving(false);}
                  }} disabled={docSaving||!docForm.title.trim()} style={{...primaryBtn,padding:"9px 24px",opacity:(docSaving||!docForm.title.trim())?0.6:1}}>
                    {docSaving?"创建中...":"＋ 创建文档"}
                  </button>
                )}
              </div>
            </div>

            {/* Docs List */}
            {docsLoading ? <div style={{textAlign:"center",padding:"40px 0",color:"#94a3b8"}}>加载中...</div> : (
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {["roadmap","guide"].map(cat=>{
                  const catDocs = adminDocs.filter(d=>d.category===cat);
                  return (
                    <div key={cat}>
                      <div style={{fontSize:11,fontWeight:700,color:"#64748b",letterSpacing:1,marginBottom:8,textTransform:"uppercase"}}>
                        {cat==="roadmap"?"开发计划":"网站使用说明"} ({catDocs.length})
                      </div>
                      {catDocs.map(d=>(
                        <div key={d.id} style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:10,padding:"12px 16px",marginBottom:8,display:"flex",alignItems:"center",gap:12}}>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:14,fontWeight:600,color:"#0f172a",marginBottom:2}}>{d.title}</div>
                            <div style={{fontSize:11,color:"#94a3b8"}}>排序:{d.sort_order} · {d.is_published?"已发布":"草稿"} · {d.updated_at?.slice(0,10)}</div>
                          </div>
                          <button onClick={()=>{setEditingDoc({...d});setDocPreview(false);}} style={{padding:"5px 14px",borderRadius:6,border:"1px solid #e2e8f0",background:"#fff",color:"#374151",fontSize:12,cursor:"pointer"}}>编辑</button>
                          <button onClick={async()=>{
                            const res = await fetch(`${API}/api/admin/docs/${d.id}`,{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({is_published:!d.is_published})});
                            if(res.ok) setAdminDocs(ds=>ds.map(x=>x.id===d.id?{...x,is_published:!d.is_published}:x));
                          }} style={{padding:"5px 14px",borderRadius:6,border:`1px solid ${d.is_published?"#bbf7d0":"#e2e8f0"}`,background:"none",color:d.is_published?"#16a34a":"#94a3b8",fontSize:12,cursor:"pointer"}}>
                            {d.is_published?"已发布":"草稿"}
                          </button>
                          <button onClick={async()=>{
                            if(!confirm("确认删除？")) return;
                            const res = await fetch(`${API}/api/admin/docs/${d.id}`,{method:"DELETE",headers:{Authorization:`Bearer ${token}`}});
                            if(res.ok) setAdminDocs(ds=>ds.filter(x=>x.id!==d.id));
                          }} style={{padding:"5px 10px",borderRadius:6,border:"none",background:"none",color:"#dc2626",fontSize:13,cursor:"pointer"}}>✕</button>
                        </div>
                      ))}
                      {catDocs.length===0 && <div style={{fontSize:12,color:"#94a3b8",padding:"8px 0"}}>暂无文档</div>}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── 内存条管理 ── */}
        {adminTab==="memory" && <AdminMemoryPanel token={token} />}
      </div>
    </div>
  );
}

// ─── Demand Detail Page ───────────────────────────────────────────────────────
function DemandDetailPage({ demandId }) {
  const [demand, setDemand] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(()=>{
    fetch(`${API}/api/demands/${demandId}`)
      .then(r=>r.ok?r.json():null)
      .then(d=>{ if(d) setDemand(d); else setNotFound(true); setLoading(false); })
      .catch(()=>{ setNotFound(true); setLoading(false); });
  },[demandId]);

  const base = {fontFamily:"'Noto Sans SC',system-ui,sans-serif",minHeight:"100vh",background:"#f1f5f9",color:"#0f172a"};
  if (loading) return <div style={{...base,display:"flex",alignItems:"center",justifyContent:"center",gap:12}}>
    <div style={{width:32,height:32,border:"3px solid #e2e8f0",borderTop:"3px solid #2563eb",borderRadius:"50%",animation:"spin 0.8s linear infinite"}} />
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    <span style={{fontSize:14,color:"#64748b"}}>加载中...</span>
  </div>;
  if (notFound) return <div style={{...base,display:"flex",alignItems:"center",justifyContent:"center"}}>
    <div style={{textAlign:"center"}}>
      <div style={{fontSize:48,marginBottom:16}}>📋</div>
      <div style={{fontSize:18,fontWeight:700,color:"#0f172a",marginBottom:8}}>需求不存在或已下线</div>
      <div style={{fontSize:13,color:"#64748b",marginBottom:24}}>该需求已被删除或暂时下线</div>
      <a href="/" style={{color:"#2563eb",fontSize:13}}>← 返回首页</a>
    </div>
  </div>;

  const d = demand;
  const brand = d.gpu_brand||"";
  const qrUrl = `${window.location.origin}/demands/${d.id}`;
  const qrLabel = `${d.count}${d.count_unit||"卡"} ${d.gpu} 租赁需求`;
  const fields = [
    ["GPU 品牌", brand||null],["GPU 型号", d.gpu],["数量", `${d.count} ${d.count_unit||"卡"}`],
    ["区域", d.region||null],["机房位置", d.dc_location||null],
    ["租赁周期", d.rental_months>0?`${d.rental_months} 个月`:null],
    ["交付时间", d.delivery_time||null],["交付形式", d.delivery||d.delivery_type||null],
    ["合同形式", d.contract_type||null],
    ["付款方式", (d.payment_type&&d.payment_type!=="其他")?d.payment_type:(d.payment_other||null)],
    ["预算", d.budget_text||(d.budget>0?`≤¥${d.budget}/卡/时`:null)],
    ["配置要求", d.config_req||null],["存储要求", d.storage_req||null],
    ["带宽要求", d.bandwidth_req||null],["公网 IP", d.public_ip_req||null],
    ["额外 CPU", d.need_extra_cpu?(d.extra_cpu_config||"是"):null],
    ["备注", d.notes||null],["发布时间", d.createdAt],
  ].filter(([,v])=>v);
  const contactFields = [
    ["联系人", d.contact_name||d.contact||null],["联系电话", d.contact_phone||null],
    ["公司", d.company||null],["邮箱", d.contact_email||null],
  ].filter(([,v])=>v);

  return (
    <div style={base}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Noto+Serif+SC:wght@600;700&family=Noto+Sans+SC:wght@400;600;700&display=swap'); *{margin:0;padding:0;box-sizing:border-box}`}</style>
      <div style={{background:"rgba(255,255,255,0.97)",borderBottom:"1px solid #e2e8f0",padding:"0 24px",height:56,display:"flex",alignItems:"center",gap:16}}>
        <img src="/logo.svg" height="30" onClick={()=>window.location.href="/"} style={{cursor:"pointer",display:"block"}} alt="新云集市" />
        <span style={{fontSize:12,color:"#94a3b8",borderLeft:"1px solid #e2e8f0",paddingLeft:16}}>需求详情</span>
        <a href="/" style={{marginLeft:"auto",fontSize:12,color:"#64748b",textDecoration:"none"}}>← 返回列表</a>
      </div>
      <div style={{maxWidth:720,margin:"0 auto",padding:"28px 20px"}}>
        <div style={{background:"#ffffff",border:"1px solid #e2e8f0",borderRadius:16,padding:"24px 24px 20px",marginBottom:16,boxShadow:"0 1px 4px rgba(0,0,0,0.06)"}}>
          <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:24,letterSpacing:1.5,color:"#0f172a",marginBottom:4}}>{d.gpu}</div>
          {brand && <div style={{fontSize:12,color:"#94a3b8",marginBottom:16}}>{brand}</div>}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:"10px 16px",marginBottom:8}}>
            {fields.map(([label,value])=>(
              <div key={label} style={{background:"#f8fafc",borderRadius:8,padding:"9px 12px",border:"1px solid #e2e8f0",minWidth:0}}>
                <div style={{fontSize:10,color:"#94a3b8",fontWeight:700,letterSpacing:0.5,marginBottom:2,textTransform:"uppercase"}}>{label}</div>
                <div style={{fontSize:13,fontWeight:600,color:"#374151",wordBreak:"break-word"}}>{value}</div>
              </div>
            ))}
          </div>
        </div>
        {contactFields.length>0 && (
          <div style={{background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:14,padding:"18px 20px",marginBottom:16,boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
            <div style={{fontSize:11,fontWeight:700,color:"#2563eb",letterSpacing:1,marginBottom:12,textTransform:"uppercase"}}>联系方式</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:"10px 32px"}}>
              {contactFields.map(([k,v])=>(
                <div key={k} style={{fontSize:13,color:"#1e3a5f"}}>
                  <span style={{color:"#60a5fa",fontWeight:600,marginRight:6}}>{k}</span>{v}
                </div>
              ))}
            </div>
          </div>
        )}
        <div style={{display:"flex",gap:10}}>
          <ShareQrButton url={qrUrl} label={qrLabel} />
        </div>
      </div>
    </div>
  );
}

// ─── Resource Detail Page ─────────────────────────────────────────────────────
function ResourceDetailPage({ resourceId }) {
  const [resource, setResource] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(()=>{
    fetch(`${API}/api/resources/${resourceId}`)
      .then(r=>r.ok?r.json():null)
      .then(d=>{ if(d) setResource(d); else setNotFound(true); setLoading(false); })
      .catch(()=>{ setNotFound(true); setLoading(false); });
  },[resourceId]);

  const base = {fontFamily:"'Noto Sans SC',system-ui,sans-serif",minHeight:"100vh",background:"#f1f5f9",color:"#0f172a"};
  if (loading) return <div style={{...base,display:"flex",alignItems:"center",justifyContent:"center",gap:12}}>
    <div style={{width:32,height:32,border:"3px solid #e2e8f0",borderTop:"3px solid #2563eb",borderRadius:"50%",animation:"spin 0.8s linear infinite"}} />
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    <span style={{fontSize:14,color:"#64748b"}}>加载中...</span>
  </div>;
  if (notFound) return <div style={{...base,display:"flex",alignItems:"center",justifyContent:"center"}}>
    <div style={{textAlign:"center"}}>
      <div style={{fontSize:48,marginBottom:16}}>🖥️</div>
      <div style={{fontSize:18,fontWeight:700,color:"#0f172a",marginBottom:8}}>资源不存在或已下线</div>
      <div style={{fontSize:13,color:"#64748b",marginBottom:24}}>该资源已被删除或暂时下线</div>
      <a href="/" style={{color:"#2563eb",fontSize:13}}>← 返回首页</a>
    </div>
  </div>;

  const r = resource;
  const brand = getGpuBrand(r.gpu);
  const qrUrl = `${window.location.origin}/resources/${r.id}`;
  const countUnit = r.countUnit||"卡";
  const qrLabel = `${r.availableQuantity??r.count}${countUnit} ${r.gpu} 租赁资源`;
  const fields = [
    ["GPU 品牌", brand],["GPU 型号", r.gpu],["数量", `${r.availableQuantity??r.count} ${countUnit}`],
    ["单价", r.price!=null?`¥${r.price}/卡/时`:null],
    ["货币", r.currency||null],
    ["区域", r.region||null],["机房位置", r.dcLocation||r.vendorLocation||null],
    ["状态", r.status||(r.available?"在线":null)],
    ["显存", r.mem||null],["内存带宽", r.bandwidth||null],
    ["交付形式", r.delivery||null],
    ["可用数量", r.availableQuantity!=null?String(r.availableQuantity):null],
    ["发布时间", r.createdAt||null],
  ].filter(([,v])=>v);
  const contactFields = [
    ["公司", r.vendorName||null],["联系人", r.contactName||null],
    ["联系电话", r.contactPhone||null],["邮箱", r.contactEmail||null],
  ].filter(([,v])=>v);

  return (
    <div style={base}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Noto+Serif+SC:wght@600;700&family=Noto+Sans+SC:wght@400;600;700&display=swap'); *{margin:0;padding:0;box-sizing:border-box}`}</style>
      <div style={{background:"rgba(255,255,255,0.97)",borderBottom:"1px solid #e2e8f0",padding:"0 24px",height:56,display:"flex",alignItems:"center",gap:16}}>
        <img src="/logo.svg" height="30" onClick={()=>window.location.href="/"} style={{cursor:"pointer",display:"block"}} alt="新云集市" />
        <span style={{fontSize:12,color:"#94a3b8",borderLeft:"1px solid #e2e8f0",paddingLeft:16}}>资源详情</span>
        <a href="/" style={{marginLeft:"auto",fontSize:12,color:"#64748b",textDecoration:"none"}}>← 返回列表</a>
      </div>
      <div style={{maxWidth:720,margin:"0 auto",padding:"28px 20px"}}>
        <div style={{background:"#ffffff",border:"1px solid #e2e8f0",borderRadius:16,padding:"24px 24px 20px",marginBottom:16,boxShadow:"0 1px 4px rgba(0,0,0,0.06)"}}>
          <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:24,letterSpacing:1.5,color:"#0f172a",marginBottom:4}}>{r.gpu}</div>
          <span style={{display:"inline-block",marginBottom:16,padding:"2px 10px",borderRadius:20,fontSize:11,fontWeight:600,background:"rgba(37,99,235,0.08)",color:"#2563eb"}}>{brand}</span>
          {r.desc && <div style={{fontSize:13,color:"#475569",lineHeight:1.7,borderLeft:"2px solid #bfdbfe",paddingLeft:12,marginBottom:16}}>{r.desc}</div>}
          {r.tags?.length>0 && <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>{r.tags.map(t=><Tag key={t} t={t} />)}</div>}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:"10px 16px"}}>
            {fields.map(([label,value])=>(
              <div key={label} style={{background:"#f8fafc",borderRadius:8,padding:"9px 12px",border:"1px solid #e2e8f0",minWidth:0}}>
                <div style={{fontSize:10,color:"#94a3b8",fontWeight:700,letterSpacing:0.5,marginBottom:2,textTransform:"uppercase"}}>{label}</div>
                <div style={{fontSize:13,fontWeight:600,color:"#374151",wordBreak:"break-word"}}>{value}</div>
              </div>
            ))}
          </div>
        </div>
        {contactFields.length>0 && (
          <div style={{background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:14,padding:"18px 20px",marginBottom:16,boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
            <div style={{fontSize:11,fontWeight:700,color:"#2563eb",letterSpacing:1,marginBottom:12,textTransform:"uppercase"}}>联系方式</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:"10px 32px"}}>
              {contactFields.map(([k,v])=>(
                <div key={k} style={{fontSize:13,color:"#1e3a5f"}}>
                  <span style={{color:"#60a5fa",fontWeight:600,marginRight:6}}>{k}</span>{v}
                </div>
              ))}
            </div>
          </div>
        )}
        <div style={{display:"flex",gap:10}}>
          <ShareQrButton url={qrUrl} label={qrLabel} />
        </div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const shareMatch = window.location.pathname.match(/^\/vendor\/(.+)$/);
  if (shareMatch) return <VendorSharePage shareToken={shareMatch[1]} />;
  const demandMatch = window.location.pathname.match(/^\/demands\/(\d+)$/);
  if (demandMatch) return <DemandDetailPage demandId={demandMatch[1]} />;
  const resourceMatch = window.location.pathname.match(/^\/resources\/(\d+)$/);
  if (resourceMatch) return <ResourceDetailPage resourceId={resourceMatch[1]} />;
  const memoryMatch = window.location.pathname.match(/^\/hardware\/memory\/([a-f0-9-]+)$/);
  if (memoryMatch) return <MemoryDetailPage listingId={memoryMatch[1]} />;
  const [vendors, setVendors] = useState([]);
  const [resources, setResources] = useState([]);
  const [demands, setDemands] = useState([]);
  const [links, setLinks] = useState([]);
  const [resSubCount, setResSubCount] = useState(0);
  const [demSubCount, setDemSubCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [authVendor, setAuthVendor] = useState(null); // 当前登录的供应商
  const [authAdmin, setAuthAdmin] = useState(false);  // 当前登录的管理员
  const [showAuth, setShowAuth] = useState(null);     // "login" | "register" | null
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ model:"", region:"" });
  const hasFilter = !!(filters.model || filters.region);
  const [expandedGpuGroup, setExpandedGpuGroup] = useState(null);
  const [tabView, setTabView] = useState("home");
  const [menuOpen, setMenuOpen] = useState(false);
  const [vendorModal, setVendorModal] = useState(null);
  const [contactModal, setContactModal] = useState(null);
  const [showRegister, setShowRegister] = useState(false);
  const [currentVendor, setCurrentVendor] = useState(null);
  const [detailModal, setDetailModal] = useState(null);
  const [showPostReq, setShowPostReq] = useState(false);
  const [showPostRes, setShowPostRes] = useState(false);
  const [pendingPost, setPendingPost] = useState(null); // "resource" | "demand" | null
  const [showSubscribe, setShowSubscribe] = useState(false);
  const [shareDemand, setShareDemand] = useState(null);
  const [expandedDemandId, setExpandedDemandId] = useState(null);
  const [expandVendorId, setExpandVendorId] = useState(null);
  const [memoryListings, setMemoryListings] = useState([]);

  // 会话恢复
  useEffect(()=>{
    const token = localStorage.getItem("auth_token");
    if (token) {
      fetch(`${API}/auth/me`, { headers:{ Authorization:`Bearer ${token}` } })
        .then(r=>r.ok?r.json():null).then(d=>{
          if (!d) return;
          if (d.role === "admin") { setAuthAdmin(true); }
          else if (d.vendor) { setAuthVendor(d.vendor); }
        }).catch(()=>{});
    }
  },[]);

  // 初始加载：拉取全部数据
  useEffect(()=>{
    const safe = p => p.catch(()=>null);
    Promise.all([
      safe(fetch(`${API}/api/vendors`).then(r=>r.json())),
      safe(fetch(`${API}/api/resources`).then(r=>r.json())),
      safe(fetch(`${API}/api/demands`).then(r=>r.json())),
      safe(fetch(`${API}/api/subscribers/count`).then(r=>r.json())),
      safe(fetch(`${API}/api/related-links`).then(r=>r.json())),
      safe(fetch(`${API}/api/memory-listings`).then(r=>r.json())),
    ]).then(([v,r,d,s,l,m])=>{
      if(v) setVendors(v);
      if(r) setResources(r);
      if(d) setDemands(d);
      if(s) { setResSubCount(s.resources); setDemSubCount(s.demands); }
      if(l) setLinks(l);
      if(m) setMemoryListings(m);
      setLoading(false);
      // URL 深链（数据加载后处理）
      const p = new URLSearchParams(window.location.search);
      const rid = p.get("resource"), vid = p.get("vendor");
      if (rid&&r) { const res=r.find(x=>String(x.id)===rid); if(res){setTabView("resources");setDetailModal(res);} }
      else if (vid) { setTabView("resources"); setExpandVendorId(Number(vid)); }
    });
  },[]);

  const filtered = useMemo(()=>resources.filter(r=>{
    if (r.isVisible === false) return false;
    if (filters.model && r.gpu !== filters.model) return false;
    if (filters.region === "国内" && !r.region.includes("国内")) return false;
    if (filters.region === "海外" && r.region.includes("国内")) return false;
    return true;
  }),[resources, filters]);

  const gpuGroups = useMemo(()=>{
    const map={};
    filtered.forEach(r=>{ if(!map[r.gpu]) map[r.gpu]=[]; map[r.gpu].push(r); });
    return Object.entries(map).map(([gpu,items])=>({gpu,items}));
  },[filtered]);

  const handleRegister = (vendor) => { setVendors(vs=>[...vs,vendor]); setShowRegister(false); setCurrentVendor(vendor); };
  const handlePublish = (resource) => { setResources(rs=>[...rs,resource]); };
  const handleUpdateResource = (id, patch) => { setResources(rs=>rs.map(r=>r.id===id?{...r,...patch}:r)); };
  const handleDeleteResource = (id) => { setResources(rs=>rs.filter(r=>r.id!==id)); };
  const handlePublishFromDemand = (vendor,resource) => { setVendors(vs=>[...vs,vendor]); setResources(rs=>[resource,...rs]); };
  const handleSubscribe = (sub) => {
    if (sub.type === "wechat") {
      fetch(`${API}/api/subscriptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ send_key: sub.sendKey, filters: sub.filters }),
      }).catch(() => {});
    } else {
      // 乐观更新计数
      if (sub.topics && sub.topics.includes("resources")) setResSubCount(n=>n+1);
      if (sub.topics && sub.topics.includes("demands"))   setDemSubCount(n=>n+1);
      fetch(`${API}/api/subscribers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: sub.email, topics: sub.topics }),
      }).catch(() => {});
    }
  };

  const resSubscriberCount = resSubCount;
  const demSubscriberCount = demSubCount;

  if (loading) return (
    <div style={{minHeight:"100vh",background:"#f1f5f9",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16}}>
      <div style={{width:40,height:40,border:"3px solid #e2e8f0",borderTop:"3px solid #2563eb",borderRadius:"50%",animation:"spin 0.8s linear infinite"}} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{color:"#64748b",fontSize:14}}>加载中...</div>
    </div>
  );

  if (authAdmin) return <AdminPanel token={localStorage.getItem("auth_token")} onExit={()=>{ localStorage.removeItem("auth_token"); setAuthAdmin(false); }} />;
  if (currentVendor) return <Dashboard vendor={{...currentVendor,_token:localStorage.getItem("auth_token")}} resources={resources} onPublish={handlePublish} onExit={()=>setCurrentVendor(null)} onUpdateResource={handleUpdateResource} onDeleteResource={handleDeleteResource} />;

  const uniq = arr => ["",...new Set(arr.filter(Boolean))];
  const gpuModelOpts = uniq(resources.filter(r=>r.isVisible!==false).map(r=>r.gpu));

  return (
    <div style={{minHeight:"100vh",background:"#f1f5f9",color:"#0f172a",fontFamily:"'Noto Sans SC',system-ui,sans-serif"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Noto+Serif+SC:wght@600;700&family=Noto+Sans+SC:wght@400;600;700&display=swap'); *{margin:0;padding:0;box-sizing:border-box} ::-webkit-scrollbar{width:6px} ::-webkit-scrollbar-thumb{background:#d1d5db;border-radius:3px} input::placeholder,textarea::placeholder{color:#94a3b8} select{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%2394a3b8' fill='none' stroke-width='1.5'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;} @media(max-width:768px){.desk-only{display:none!important} .mob-menu{display:none;flex-direction:column;position:fixed;top:60px;left:0;right:0;background:rgba(255,255,255,0.97);border-bottom:1px solid #e2e8f0;padding:8px 16px;z-index:48;gap:4px;backdrop-filter:blur(12px)} .mob-menu.open{display:flex!important} .mob-show{display:flex!important} .main-wrap{padding:20px 16px!important} .gpu-row{flex-wrap:wrap!important;padding:10px 14px 10px 30px!important;gap:8px!important} .filter-bar{gap:6px!important;padding:10px 12px!important} .share-main{padding:16px 12px!important}} @media(min-width:769px){.mob-show{display:none!important} .mob-menu{display:none!important}} .md-body h1,.md-body h2,.md-body h3{font-family:'Noto Serif SC',serif;font-weight:700;color:#0f172a;margin-top:20px;margin-bottom:8px} .md-body h1{font-size:22px} .md-body h2{font-size:18px} .md-body h3{font-size:16px} .md-body ul,.md-body ol{padding-left:20px;margin-bottom:12px} .md-body li{margin-bottom:4px;color:#374151} .md-body p{margin-bottom:10px;color:#374151} .md-body code{background:#f1f5f9;padding:2px 6px;border-radius:4px;font-size:12px;font-family:monospace} .md-body pre{background:#f1f5f9;padding:12px;border-radius:8px;overflow-x:auto;margin-bottom:12px} input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0} input[type=number]{-moz-appearance:textfield}`}</style>

      {/* Nav */}
      <nav style={{borderBottom:"1px solid #e2e8f0",padding:"0 24px",display:"flex",alignItems:"center",gap:16,height:60,background:"rgba(255,255,255,0.97)",backdropFilter:"blur(12px)",position:"sticky",top:0,zIndex:50,boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
        <img src="/logo.svg" height="36" onClick={()=>setTabView("home")} style={{cursor:"pointer",flexShrink:0,display:"block"}} alt="新云集市" />
        <div className="desk-only" style={{display:"flex",gap:2}}>
          <button onClick={()=>setTabView("home")} style={{padding:"6px 14px",borderRadius:8,border:"none",background:tabView==="home"?"rgba(37,99,235,0.08)":"transparent",color:tabView==="home"?"#2563eb":"#64748b",cursor:"pointer",fontSize:13,fontWeight:600}}>
            首页
          </button>
          {/* 算力租赁下拉 */}
          <div style={{position:"relative"}} onMouseEnter={e=>e.currentTarget.querySelector(".nav-dropdown").style.display="block"} onMouseLeave={e=>e.currentTarget.querySelector(".nav-dropdown").style.display="none"}>
            <button style={{padding:"6px 14px",borderRadius:8,border:"none",background:(tabView==="resources"||tabView==="demands")?"rgba(37,99,235,0.08)":"transparent",color:(tabView==="resources"||tabView==="demands")?"#2563eb":"#64748b",cursor:"pointer",fontSize:13,fontWeight:600}}>
              算力租赁 ▾
            </button>
            <div className="nav-dropdown" style={{display:"none",position:"absolute",top:"100%",left:0,background:"#fff",border:"1px solid #e2e8f0",borderRadius:10,boxShadow:"0 8px 24px rgba(0,0,0,0.08)",padding:"6px",minWidth:120,zIndex:100}}>
              {[["resources","资源列表"],["demands","需求列表"]].map(([v,l])=>(
                <button key={v} onClick={()=>setTabView(v)} style={{display:"block",width:"100%",padding:"8px 14px",borderRadius:7,border:"none",background:tabView===v?"rgba(37,99,235,0.08)":"transparent",color:tabView===v?"#2563eb":"#374151",cursor:"pointer",fontSize:13,fontWeight:600,textAlign:"left",whiteSpace:"nowrap"}}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          {[["hardware","硬件"],["docs","文档"]].map(([v,l])=>(
            <button key={v} onClick={()=>setTabView(v)} style={{padding:"6px 14px",borderRadius:8,border:"none",background:tabView===v?"rgba(37,99,235,0.08)":"transparent",color:tabView===v?"#2563eb":"#64748b",cursor:"pointer",fontSize:13,fontWeight:600}}>
              {l}
            </button>
          ))}
        </div>
        <button className="mob-show" onClick={()=>setMenuOpen(o=>!o)}
          style={{display:"none",alignItems:"center",justifyContent:"center",width:40,height:44,border:"none",background:"transparent",cursor:"pointer"}}>
          <span style={{fontSize:22,color:"#374151",lineHeight:1}}>{menuOpen?"✕":"☰"}</span>
        </button>
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:8}}>
          {authVendor ? <>
            <span className="desk-only" style={{fontSize:13,color:"#374151",fontWeight:600}}>{authVendor.name}</span>
            <button onClick={()=>setCurrentVendor(authVendor)} style={{padding:"7px 16px",border:"1px solid #e2e8f0",borderRadius:8,background:"#ffffff",color:"#374151",fontSize:13,cursor:"pointer",fontWeight:600}}>个人中心</button>
            <button onClick={()=>{ localStorage.removeItem("auth_token"); setAuthVendor(null); setAuthAdmin(false); }} style={{padding:"7px 14px",border:"none",borderRadius:8,background:"transparent",color:"#94a3b8",fontSize:13,cursor:"pointer"}}>退出</button>
          </> : <>
            <button onClick={()=>setShowAuth("login")} style={{padding:"10px 20px",border:"none",borderRadius:8,background:"#2563eb",color:"#fff",fontSize:13,cursor:"pointer",fontWeight:600}}
              onMouseEnter={e=>e.currentTarget.style.background="#1d4ed8"}
              onMouseLeave={e=>e.currentTarget.style.background="#2563eb"}
            >登录</button>
          </>}
        </div>
      </nav>
      <div className={`mob-menu${menuOpen?" open":""}`}>
        <button onClick={()=>{setTabView("home");setMenuOpen(false);}}
          style={{padding:"12px 16px",borderRadius:8,border:"none",background:tabView==="home"?"rgba(37,99,235,0.08)":"transparent",color:tabView==="home"?"#2563eb":"#64748b",cursor:"pointer",fontSize:14,fontWeight:600,textAlign:"left",minHeight:44}}>
          首页
        </button>
        <div style={{padding:"4px 0"}}>
          <div style={{padding:"10px 16px",fontSize:14,fontWeight:600,color:"#64748b"}}>算力租赁</div>
          {[["resources","资源列表"],["demands","需求列表"]].map(([v,l])=>(
            <button key={v} onClick={()=>{setTabView(v);setMenuOpen(false);}}
              style={{display:"block",width:"100%",padding:"10px 16px 10px 28px",borderRadius:8,border:"none",background:tabView===v?"rgba(37,99,235,0.08)":"transparent",color:tabView===v?"#2563eb":"#64748b",cursor:"pointer",fontSize:14,fontWeight:600,textAlign:"left",minHeight:44}}>
              {l}
            </button>
          ))}
        </div>
        {[["hardware","硬件"],["docs","文档"]].map(([v,l])=>(
          <button key={v} onClick={()=>{setTabView(v);setMenuOpen(false);}}
            style={{padding:"12px 16px",borderRadius:8,border:"none",background:tabView===v?"rgba(37,99,235,0.08)":"transparent",color:tabView===v?"#2563eb":"#64748b",cursor:"pointer",fontSize:14,fontWeight:600,textAlign:"left",minHeight:44}}>
            {l}
          </button>
        ))}
      </div>

      <main className="main-wrap" style={{maxWidth:1200,margin:"0 auto",padding:"40px 24px"}}>

        {/* Home */}
        {tabView==="home" && (
          <HomePage vendors={vendors} resources={resources} demands={demands} memoryListings={memoryListings} subscribers={[]} resSubCount={resSubCount} demSubCount={demSubCount}
            onGoResources={()=>setTabView("resources")} onGoDemands={()=>setTabView("demands")} onGoMemory={()=>setTabView("hardware")}
            onResourceClick={r=>{setTabView("resources");setDetailModal(r);}} onSubscribe={()=>setShowSubscribe(true)} />
        )}

        {/* Hardware */}
        {tabView==="hardware" && (
          <MemoryPage authVendor={authVendor} onShowAuth={setShowAuth} onPublish={m=>setMemoryListings(ls=>[m,...ls])} />
        )}

        {/* Resources */}
        {tabView==="resources" && <>
          {/* 发布需求 banner */}
          <div style={{background:"rgba(37,99,235,0.05)",border:"1px solid rgba(37,99,235,0.15)",borderRadius:12,padding:"13px 18px",marginBottom:16,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
            <div style={{fontSize:13,color:"#374151",lineHeight:1.5}}>
              <span style={{marginRight:6}}>📋</span>
              找不到合适的资源？发布需求，供应商主动来找您
              <span style={{fontSize:11,color:"#94a3b8",marginLeft:8}}>· 将同步至【需求列表】并推送至 {demSubscriberCount} 位订阅用户</span>
            </div>
            <button onClick={()=>{ if(!authVendor){ setPendingPost("demand"); setShowAuth("login"); } else setShowPostReq(true); }} style={{...primaryBtn,padding:"8px 20px",fontSize:13,whiteSpace:"nowrap",flexShrink:0}}>发布需求</button>
          </div>

          {/* Filters */}
          <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"center",marginBottom:16,padding:"12px 16px",background:"#ffffff",borderRadius:12,border:"1px solid #e2e8f0",boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:12,color:"#64748b",whiteSpace:"nowrap"}}>GPU 型号</span>
              <select value={filters.model} onChange={e=>setFilters(f=>({...f,model:e.target.value}))} style={{background:"#fff",border:`1px solid ${filters.model?"rgba(37,99,235,0.4)":"#e2e8f0"}`,borderRadius:7,padding:"5px 10px",color:filters.model?"#2563eb":"#64748b",fontSize:13,cursor:"pointer",outline:"none",maxWidth:180}}>
                {gpuModelOpts.map(o=><option key={o} value={o}>{o||"全部"}</option>)}
              </select>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:12,color:"#64748b",whiteSpace:"nowrap"}}>区域</span>
              {["","国内","海外"].map(r=>(
                <button key={r} onClick={()=>setFilters(f=>({...f,region:r}))} style={{padding:"4px 12px",borderRadius:20,border:`1px solid ${filters.region===r?"rgba(37,99,235,0.4)":"#e2e8f0"}`,background:filters.region===r?"rgba(37,99,235,0.08)":"transparent",color:filters.region===r?"#2563eb":"#64748b",fontSize:12,cursor:"pointer",fontWeight:filters.region===r?600:400}}>
                  {r||"全部"}
                </button>
              ))}
            </div>
            {hasFilter&&<button onClick={()=>setFilters({model:"",region:""})} style={{padding:"4px 12px",background:"transparent",border:"1px solid #d1d5db",borderRadius:20,color:"#64748b",fontSize:12,cursor:"pointer"}}>重置</button>}
            <span style={{marginLeft:"auto",fontSize:12,color:"#94a3b8"}}>{filtered.length} 条记录</span>
          </div>

          {/* Resource table */}
          {filtered.length===0 ? (
            <div style={{textAlign:"center",padding:"80px 0",color:"#94a3b8"}}><div style={{fontSize:36,marginBottom:10}}>🔎</div>没有找到匹配的资源</div>
          ) : (
            <div style={{background:"#ffffff",border:"1px solid #e2e8f0",borderRadius:14,overflow:"hidden",boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead>
                  <tr style={{background:"#f8fafc",borderBottom:"2px solid #e2e8f0"}}>
                    <th className="desk-only" style={{padding:"10px 14px",fontSize:11,fontWeight:700,color:"#64748b",textAlign:"left",letterSpacing:0.5,whiteSpace:"nowrap"}}>品牌</th>
                    <th style={{padding:"10px 14px",fontSize:11,fontWeight:700,color:"#64748b",textAlign:"left",letterSpacing:0.5,whiteSpace:"nowrap"}}>GPU 型号</th>
                    <th style={{padding:"10px 14px",fontSize:11,fontWeight:700,color:"#64748b",textAlign:"left",letterSpacing:0.5,whiteSpace:"nowrap"}}>数量</th>
                    <th style={{padding:"10px 14px",fontSize:11,fontWeight:700,color:"#64748b",textAlign:"left",letterSpacing:0.5,whiteSpace:"nowrap"}}>单位</th>
                    <th className="desk-only" style={{padding:"10px 14px",fontSize:11,fontWeight:700,color:"#64748b",textAlign:"left",letterSpacing:0.5,whiteSpace:"nowrap"}}>区域</th>
                    <th style={{padding:"10px 14px",fontSize:11,fontWeight:700,color:"#64748b",textAlign:"left",letterSpacing:0.5,whiteSpace:"nowrap"}}>状态</th>
                    <th style={{width:36}}></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r=>{
                    const brand = getGpuBrand(r.gpu);
                    const statusLabel = r.status||(r.available?"在线":"下架");
                    const isOnline = statusLabel==="在线"||r.available;
                    return (
                      <tr key={r.id}
                        onClick={()=>setDetailModal(r)}
                        style={{cursor:"pointer",borderBottom:"1px solid #f1f5f9"}}
                        onMouseEnter={e=>e.currentTarget.style.background="#f8fafc"}
                        onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                      >
                        <td className="desk-only" style={{padding:"12px 14px",fontSize:12,color:"#94a3b8"}}>{brand}</td>
                        <td style={{padding:"12px 14px",fontWeight:700,fontFamily:"'Bebas Neue',cursive",fontSize:14,letterSpacing:0.8,color:"#0f172a"}}>{r.gpu}</td>
                        <td style={{padding:"12px 14px",fontSize:13,color:"#374151"}}>{r.availableQuantity??r.count}</td>
                        <td style={{padding:"12px 14px",fontSize:13,color:"#64748b"}}>{r.countUnit||"卡"}</td>
                        <td className="desk-only" style={{padding:"12px 14px",fontSize:12,color:"#64748b"}}>{r.region||"—"}</td>
                        <td style={{padding:"12px 14px"}}>
                          <span style={{display:"inline-block",padding:"2px 8px",borderRadius:20,fontSize:11,fontWeight:600,background:isOnline?"#dcfce7":"#f1f5f9",color:isOnline?"#16a34a":"#94a3b8"}}>
                            {statusLabel}
                          </span>
                        </td>
                        <td style={{padding:"12px 6px",textAlign:"center",color:"#94a3b8",fontSize:14}}>›</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Subscribe strip */}
          <div style={{marginTop:32,display:"flex",alignItems:"center",justifyContent:"space-between",gap:16,padding:"18px 24px",background:"#ffffff",border:"1px solid #e2e8f0",borderRadius:14,boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
            <div>
              <div style={{fontSize:14,fontWeight:600,color:"#0f172a",marginBottom:3}}>订阅资源更新</div>
              <div style={{fontSize:12,color:"#64748b"}}>第一时间收到新资源上线通知 · 已有 <span style={{color:"#2563eb",fontWeight:600}}>{resSubscriberCount}</span> 位用户关注</div>
            </div>
            <button onClick={()=>setShowSubscribe(true)} style={{padding:"9px 24px",border:"1px solid rgba(37,99,235,0.3)",borderRadius:9,background:"transparent",color:"#2563eb",fontSize:13,cursor:"pointer",fontWeight:600,flexShrink:0}}>订阅更新</button>
          </div>
        </>}

        {/* Demands */}
        {tabView==="demands" && <>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
            <div>
              <h2 style={{fontFamily:"'Noto Serif SC',serif",fontSize:26,fontWeight:700,marginBottom:6,color:"#0f172a"}}>需求列表</h2>
              <p style={{color:"#64748b",fontSize:13}}>{demands.length} 条需求 · 供应商可直接联系报价</p>
            </div>
            <button onClick={()=>{ if(!authVendor){ setPendingPost("resource"); setShowAuth("login"); } else setShowPostRes(true); }} style={{...primaryBtn,padding:"10px 22px",fontSize:13}}>发布资源</button>
          </div>

          {/* 发布资源 banner */}
          <div style={{background:"rgba(37,99,235,0.05)",border:"1px solid rgba(37,99,235,0.15)",borderRadius:12,padding:"13px 18px",marginBottom:16,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
            <div style={{fontSize:13,color:"#374151",lineHeight:1.5}}>
              <span style={{marginRight:6}}>🖥️</span>
              有算力资源可供出租？发布资源，买家主动联系您
              <span style={{fontSize:11,color:"#94a3b8",marginLeft:8}}>· 将同步至【资源列表】并推送至 {resSubscriberCount} 位订阅用户</span>
            </div>
            <button onClick={()=>{ if(!authVendor){ setPendingPost("resource"); setShowAuth("login"); } else setShowPostRes(true); }} style={{padding:"8px 18px",background:"transparent",border:"1px solid rgba(37,99,235,0.3)",borderRadius:8,color:"#2563eb",fontSize:13,cursor:"pointer",fontWeight:600,whiteSpace:"nowrap",flexShrink:0}}>发布资源</button>
          </div>

          {/* Demand Table */}
          <div style={{background:"#ffffff",border:"1px solid #e2e8f0",borderRadius:14,boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
            {demands.length===0 ? (
              <div style={{textAlign:"center",padding:"80px 0",color:"#94a3b8"}}><div style={{fontSize:36,marginBottom:10}}>📋</div>暂无需求</div>
            ) : (<>
              {/* Desktop table */}
              <table className="demand-desktop-table" style={{width:"100%",borderCollapse:"collapse"}}>
                <thead>
                  <tr>
                    {["GPU 品牌","GPU 型号","数量","租期","区域","发布时间",""].map((h,i)=>(
                      <th key={i} style={{padding:"10px 14px",fontSize:11,fontWeight:700,color:"#64748b",textAlign:"left",letterSpacing:0.5,background:"#f8fafc",borderBottom:"2px solid #e2e8f0",whiteSpace:"nowrap",width:h===""?44:"auto"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {demands.flatMap(d=>{
                    const expanded = expandedDemandId===d.id;
                    const colSpan = 7;
                    const brand = d.gpu_brand||"—";
                    const bdBot = expanded ? "none" : "1px solid #f1f5f9";
                    const bg = expanded ? "rgba(37,99,235,0.04)" : "transparent";
                    const tdS = {padding:"11px 14px",fontSize:13,color:"#374151",borderBottom:bdBot};

                    const mainRow = (
                      <tr key={d.id}
                        onClick={()=>setExpandedDemandId(expanded?null:d.id)}
                        style={{cursor:"pointer",background:bg}}
                        onMouseEnter={e=>{if(!expanded)e.currentTarget.style.background="#f8fafc";}}
                        onMouseLeave={e=>{e.currentTarget.style.background=bg;}}
                      >
                        <td style={tdS}>{brand}</td>
                        <td style={{...tdS,fontWeight:600,fontFamily:"'Bebas Neue',cursive",letterSpacing:0.5,color:"#0f172a"}}>{d.gpu}</td>
                        <td style={tdS}>{d.count} {d.count_unit||"卡"}</td>
                        <td style={tdS}>{d.rental_months>0?`${d.rental_months}个月`:"—"}</td>
                        <td style={tdS}>{d.region||"—"}</td>
                        <td style={{...tdS,fontSize:12,color:"#94a3b8"}}>{d.createdAt}</td>
                        <td style={{padding:"8px 6px",textAlign:"center",borderBottom:bdBot,width:44}}>
                          <span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:28,height:28,borderRadius:8,background:expanded?"rgba(37,99,235,0.12)":"#f1f5f9",border:`1px solid ${expanded?"rgba(37,99,235,0.25)":"#e2e8f0"}`,fontSize:13,color:expanded?"#2563eb":"#64748b",transition:"all 0.18s",cursor:"pointer",userSelect:"none",flexShrink:0}}>
                            {expanded?"▲":"▼"}
                          </span>
                        </td>
                      </tr>
                    );

                    if (!expanded) return [mainRow];

                    const detailFields = [
                      ["GPU 品牌", brand],["GPU 型号", d.gpu],["数量", `${d.count} ${d.count_unit||"卡"}`],
                      ["区域", d.region||null],["机房位置", d.dc_location||null],
                      ["租赁周期", d.rental_months>0?`${d.rental_months} 个月`:null],
                      ["交付时间", d.delivery_time||null],["交付形式", d.delivery_type||d.delivery||null],
                      ["合同形式", d.contract_type||null],
                      ["付款方式", (d.payment_type&&d.payment_type!=="其他")?d.payment_type:(d.payment_other||null)],
                      ["预算", d.budget_text||(d.budget>0?`≤¥${d.budget}/卡/时`:null)],
                      ["配置要求", d.config_req||null, true],["存储要求", d.storage_req||null],
                      ["带宽要求", d.bandwidth_req||null],["公网 IP", d.public_ip_req||null],
                      ["额外 CPU", d.need_extra_cpu?(d.extra_cpu_config||"是"):null],
                      ["联系人", d.contact_name||d.contact||null],["联系电话", d.contact_phone||null],
                      ["公司", d.company||null],["邮箱", d.contact_email||null],
                      ["备注", d.notes||null, true],["发布时间", d.createdAt],
                    ].filter(([,v])=>v);

                    const detailRow = (
                      <tr key={`${d.id}-exp`}>
                        <td colSpan={colSpan} style={{padding:0,borderBottom:"1px solid #e2e8f0"}}>
                          <div style={{padding:"16px 20px 14px",background:"rgba(37,99,235,0.03)",borderTop:"2px solid #2563eb"}}>
                            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"12px 20px"}}>
                              {detailFields.map(([label,value,wide])=>(
                                <div key={label} style={{gridColumn:wide?"span 3":"auto",minWidth:0}}>
                                  <div style={{fontSize:11,color:"#94a3b8",fontWeight:600,letterSpacing:0.3,marginBottom:2,textTransform:"uppercase"}}>{label}</div>
                                  <div style={{fontSize:13,color:"#374151",lineHeight:1.5,wordBreak:"break-word"}}>{value}</div>
                                </div>
                              ))}
                            </div>
                            <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:12,paddingTop:10,borderTop:"1px solid #e2e8f0"}}>
                              <button onClick={e=>{e.stopPropagation();setShareDemand(d);}} style={{padding:"5px 14px",background:"transparent",border:"1px solid #e2e8f0",borderRadius:6,color:"#64748b",fontSize:12,cursor:"pointer"}}>分享</button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );

                    return [mainRow, detailRow];
                  })}
                </tbody>
              </table>
              {/* Mobile cards */}
              <div className="demand-mobile-cards">
                {demands.map(d=>{
                  const brand = d.gpu_brand||"";
                  const expanded = expandedDemandId===d.id;
                  const detailFields = [
                    ["GPU 品牌", brand||null],["数量", `${d.count} ${d.count_unit||"卡"}`],
                    ["区域", d.region||null],["机房位置", d.dc_location||null],
                    ["租赁周期", d.rental_months>0?`${d.rental_months} 个月`:null],
                    ["交付时间", d.delivery_time||null],["交付形式", d.delivery_type||d.delivery||null],
                    ["合同形式", d.contract_type||null],
                    ["付款方式", (d.payment_type&&d.payment_type!=="其他")?d.payment_type:(d.payment_other||null)],
                    ["预算", d.budget_text||(d.budget>0?`≤¥${d.budget}/卡/时`:null)],
                    ["配置要求", d.config_req||null],["存储要求", d.storage_req||null],
                    ["带宽要求", d.bandwidth_req||null],
                    ["联系人", d.contact_name||d.contact||null],["联系电话", d.contact_phone||null],
                    ["公司", d.company||null],["邮箱", d.contact_email||null],
                    ["备注", d.notes||null],["发布时间", d.createdAt],
                  ].filter(([,v])=>v);
                  return (
                    <div key={d.id} style={{borderBottom:"1px solid #f1f5f9"}}>
                      <div onClick={()=>setExpandedDemandId(expanded?null:d.id)} style={{padding:"14px 16px",cursor:"pointer",background:expanded?"rgba(37,99,235,0.04)":"transparent"}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontWeight:700,fontFamily:"'Bebas Neue',cursive",fontSize:15,letterSpacing:0.5,color:"#0f172a",marginBottom:4}}>{d.gpu}</div>
                            {brand && <div style={{fontSize:11,color:"#94a3b8",marginBottom:6}}>{brand}</div>}
                            <div style={{display:"flex",flexWrap:"wrap",gap:"4px 12px",fontSize:12,color:"#64748b"}}>
                              <span>{d.count} {d.count_unit||"卡"}</span>
                              {d.rental_months>0 && <span>{d.rental_months}个月</span>}
                              {d.region && <span>{d.region}</span>}
                              {d.createdAt && <span style={{color:"#94a3b8"}}>{d.createdAt}</span>}
                            </div>
                          </div>
                          <div style={{display:"flex",gap:6,flexShrink:0,alignItems:"center"}}>
                            <button onClick={e=>{e.stopPropagation();setShareDemand(d);}} style={{padding:"5px 10px",background:"transparent",border:"1px solid #e2e8f0",borderRadius:6,color:"#64748b",fontSize:12,cursor:"pointer"}}>分享</button>
                            <span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:28,height:28,borderRadius:8,background:expanded?"rgba(37,99,235,0.12)":"#f1f5f9",border:`1px solid ${expanded?"rgba(37,99,235,0.25)":"#e2e8f0"}`,fontSize:13,color:expanded?"#2563eb":"#64748b"}}>
                              {expanded?"▲":"▼"}
                            </span>
                          </div>
                        </div>
                      </div>
                      {expanded && (
                        <div style={{padding:"12px 16px 16px",background:"rgba(37,99,235,0.03)",borderTop:"2px solid #2563eb"}}>
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px 16px"}}>
                            {detailFields.map(([label,value])=>(
                              <div key={label} style={{minWidth:0}}>
                                <div style={{fontSize:10,color:"#94a3b8",fontWeight:600,letterSpacing:0.3,marginBottom:2,textTransform:"uppercase"}}>{label}</div>
                                <div style={{fontSize:12,color:"#374151",lineHeight:1.5,wordBreak:"break-word"}}>{value}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>)}
          </div>

          {/* Subscribe strip */}
          <div style={{marginTop:32,display:"flex",alignItems:"center",justifyContent:"space-between",gap:16,padding:"18px 24px",background:"#ffffff",border:"1px solid #e2e8f0",borderRadius:14,boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
            <div>
              <div style={{fontSize:14,fontWeight:600,color:"#0f172a",marginBottom:3}}>订阅需求更新</div>
              <div style={{fontSize:12,color:"#64748b"}}>第一时间收到新需求发布通知 · 已有 <span style={{color:"#2563eb",fontWeight:600}}>{demSubscriberCount}</span> 位用户关注</div>
            </div>
            <button onClick={()=>setShowSubscribe(true)} style={{padding:"9px 24px",border:"1px solid rgba(37,99,235,0.3)",borderRadius:9,background:"transparent",color:"#2563eb",fontSize:13,cursor:"pointer",fontWeight:600,flexShrink:0}}>订阅更新</button>
          </div>
        </>}

        {/* Links */}
        {tabView==="links" && <LinksPage links={links} />}

        {/* Contact */}
        {tabView==="contact" && <ContactPage />}

        {/* Docs */}
        {tabView==="docs" && <DocsPage authVendor={authVendor} authAdmin={authAdmin} onShowAuth={setShowAuth} />}

      </main>

      {detailModal&&<ResourceDetailModal resource={detailModal} vendor={vendors.find(v=>v.id===detailModal.vendorId)} onClose={()=>setDetailModal(null)} />}
      {vendorModal&&<VendorModal vendor={vendorModal} resources={resources.filter(r=>r.vendorId===vendorModal.id)} onClose={()=>setVendorModal(null)} onContact={v=>{setVendorModal(null);setContactModal(v);}} />}
      {contactModal&&<ContactModal vendor={contactModal} onClose={()=>setContactModal(null)} />}
      {showRegister&&<RegisterModal onClose={()=>setShowRegister(false)} onSuccess={handleRegister} />}
      {showAuth&&<AuthModal defaultTab={showAuth} onClose={()=>setShowAuth(null)} onSuccess={(vendor,token,role)=>{ localStorage.setItem("auth_token",token); if(role==="admin"){ setAuthAdmin(true); } else { setAuthVendor(vendor); if(pendingPost==="resource"){ setPendingPost(null); setShowPostRes(true); } else if(pendingPost==="demand"){ setPendingPost(null); setShowPostReq(true); } } setShowAuth(null); }} />}
      {showPostReq&&<PostRequirementModal vendor={authVendor} onClose={()=>setShowPostReq(false)} onSuccess={d=>{
        setDemands(ds=>[d,...ds]);
        setTabView("demands");
        fetch(`${API}/api/demands`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...d,vendor_id:authVendor?.id??null})}).catch(()=>{});
      }} subscriberCount={demSubscriberCount} />}
      {showPostRes&&<PostResourceFromDemandModal onClose={()=>setShowPostRes(false)} onSuccess={(v,r)=>{
        handlePublishFromDemand(v,r);
      }} subscriberCount={resSubscriberCount} />}
      {showSubscribe&&<SubscribeModal onClose={()=>setShowSubscribe(false)} onSuccess={handleSubscribe} />}
      {shareDemand&&(()=>{
        const d = shareDemand;
        const url = `${window.location.origin}/demands/${d.id}`;
        const qrLabel = `${d.count}${d.count_unit||"卡"} ${d.gpu} 租赁需求`;
        const parts = [
          `【GPU需求】${d.gpu} × ${d.count}${d.count_unit||"卡"}`,
          (d.region||d.dc_location) ? `区域：${[d.region,d.dc_location].filter(Boolean).join(" · ")}` : null,
          d.rental_months>0 ? `租期：${d.rental_months}个月` : null,
          d.delivery_time ? `交付时间：${d.delivery_time}` : null,
          d.budget_text ? `预算：${d.budget_text}` : null,
          (d.contact_name||d.contact) ? `联系人：${d.contact_name||d.contact}` : null,
          d.contact_phone ? `电话：${d.contact_phone}` : null,
          `来源：${url}`,
        ].filter(Boolean);
        return <Modal onClose={()=>setShareDemand(null)} width={420}><ShareSheet title={`需求·${d.gpu}`} shareText={parts.join("\n")} shareUrl={url} qrLabel={qrLabel} onClose={()=>setShareDemand(null)} /></Modal>;
      })()}

      {/* Footer */}
      <footer style={{borderTop:"1px solid #e2e8f0",padding:"24px",background:"#ffffff",marginTop:0}}>
        <div style={{maxWidth:1200,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
          <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:18,letterSpacing:2,color:"#1d4ed8"}}>新云集市</div>
          <div style={{display:"flex",gap:24,alignItems:"center"}}>
            {[["内存条","hardware"],["文档","docs"],["相关链接","links"],["联系我们","contact"]].map(([label,view])=>(
              <span key={label} onClick={()=>setTabView(view)} style={{fontSize:13,color:"#64748b",cursor:"pointer"}}
                onMouseEnter={e=>e.currentTarget.style.color="#2563eb"}
                onMouseLeave={e=>e.currentTarget.style.color="#64748b"}
              >{label}</span>
            ))}
          </div>
          <div style={{fontSize:12,color:"#94a3b8"}}>© 2026 新云集市 · neocloud.market</div>
        </div>
      </footer>
    </div>
  );
}
