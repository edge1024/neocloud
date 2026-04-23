import { useState, useMemo, useEffect } from "react";

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
        <div style={{fontSize:13,color:"#64748b",marginBottom:24}}>商家会尽快联系您</div>
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
          {[["login","登录"],["register","供应商入驻"]].map(([k,l])=>(
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
          还没有账号？<span onClick={()=>{setTab("register");setErr("");}} style={{color:"#2563eb",cursor:"pointer",fontWeight:600}}>供应商入驻 →</span>
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
          <div style={{fontFamily:"'Noto Serif SC',serif",fontSize:22,fontWeight:700,color:"#0f172a"}}>供应商入驻</div>
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
    brand:"NVIDIA", gpuModel:"", vram:"",
    delivery:"裸金属", count:"", billingUnit:"台",
    price:"", currency:"人民币",
    region:"国内", dcLocation:"",
    contract:"", paymentTerms:"",
    status:"可售", onlineTime:"",
    config:"", company:"", contact:"",
  };
  const [form, setForm] = useState(empty);
  const set = k => e => setForm(f=>({...f,[k]:e.target.value}));

  const handleBrand = e => {
    const brand = e.target.value;
    setForm(f=>({...f, brand, gpuModel:"", vram:""}));
  };
  const handleModel = e => {
    const gpuModel = e.target.value;
    setForm(f=>({...f, gpuModel, vram: VRAM_MAP[gpuModel]||""}));
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
      contract_type: form.contract, payment_type: form.paymentTerms,
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
  const models = GPU_MODELS[form.brand] || [];

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
          <select value={form.brand} onChange={handleBrand} style={inp}>
            {Object.keys(GPU_MODELS).map(b=><option key={b}>{b}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>GPU 型号 *</label>
          <select value={form.gpuModel} onChange={handleModel} style={inp}>
            <option value="">请选择型号</option>
            {models.map(m=><option key={m}>{m}</option>)}
            {form.brand==="其他" && <option value="__custom__">手动输入</option>}
          </select>
        </div>
      </div>
      {form.brand==="其他" && (
        <div>
          <label style={lbl}>GPU 型号（手动输入） *</label>
          <input value={form.gpuModel==="__custom__"?"":form.gpuModel} onChange={e=>setForm(f=>({...f,gpuModel:e.target.value}))} placeholder="请输入 GPU 型号" style={inp} />
        </div>
      )}
      <div style={row2}>
        <div>
          <label style={lbl}>显存 *</label>
          <input value={form.vram} onChange={set("vram")} placeholder="自动填充或手动输入，如 80GB" style={inp} />
        </div>
        <div style={{gridColumn:"span 1"}} />
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
          <label style={lbl}>计费单位 *</label>
          <select value={form.billingUnit} onChange={set("billingUnit")} style={inp}>
            <option>台</option><option>卡</option>
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
          <label style={lbl}>数据中心位置 *</label>
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
          <label style={lbl}>联系方式 *</label>
          <input value={form.contact} onChange={set("contact")} placeholder="手机 / 微信 / 邮箱" style={inp} />
        </div>
      </div>

      {err && <div style={{color:"#ef4444",fontSize:13,marginBottom:8}}>{err}</div>}
      <div style={{display:"flex",gap:10,marginTop:8}}>
        <button type="button" onClick={onClose} style={{...ghostBtn,flex:1}}>取消</button>
        <button type="button" onClick={handle} disabled={saving} style={{...primaryBtn,flex:2,opacity:(valid&&!saving)?1:0.4,cursor:(valid&&!saving)?"pointer":"default"}}>{saving?"发布中...":"发布资源"}</button>
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

  return (
    <div style={{background:"#ffffff",border:"1px solid #e2e8f0",borderRadius:14,padding:20,display:"flex",alignItems:"center",gap:16,flexWrap:"wrap",boxShadow:"0 1px 3px rgba(0,0,0,0.04)",opacity:isVisible?1:0.6}}>
      <div style={{flex:1,minWidth:200}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,flexWrap:"wrap"}}>
          <span style={{fontWeight:700,fontSize:14,fontFamily:"'Bebas Neue',cursive",letterSpacing:1,color:"#0f172a"}}>{r.gpu}</span>
          {!isVisible && <span style={{fontSize:10,padding:"2px 7px",borderRadius:10,background:"#f1f5f9",color:"#94a3b8",fontWeight:600}}>不可见</span>}
        </div>
        <div style={{fontSize:12,color:"#64748b",marginBottom:8}}>{r.mem}{r.bandwidth?` · ${r.bandwidth}`:""} · {r.region}</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{(r.tags||[]).map(t=><Tag key={t} t={t} />)}</div>
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
          <div style={{fontSize:26,fontWeight:700,color:"#2563eb",fontFamily:"'Bebas Neue',cursive"}}>¥{r.price}</div>
          <div style={{fontSize:11,color:"#94a3b8"}}>元/卡/时</div>
        </div>
        <button onClick={handleDelete} disabled={deleting} style={{fontSize:11,padding:"4px 10px",borderRadius:6,border:`1px solid ${confirmDelete?"#ef4444":"#e2e8f0"}`,background:confirmDelete?"#fef2f2":"transparent",color:confirmDelete?"#ef4444":"#94a3b8",cursor:"pointer"}}>
          {deleting?"删除中...":confirmDelete?"确认删除":"删除"}
        </button>
        {confirmDelete && <button onClick={()=>setConfirmDelete(false)} style={{fontSize:11,color:"#94a3b8",background:"none",border:"none",cursor:"pointer"}}>取消</button>}
      </div>
    </div>
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
  const myRes = resources.filter(r=>r.vendorId===vendor.id);
  const availCount = myRes.filter(r=>r.status==="在线"||r.available).length;

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
        <span onClick={onExit} style={{fontFamily:"'Bebas Neue',cursive",fontSize:22,letterSpacing:3,color:"#1d4ed8",cursor:"pointer"}}>GPUMARKET</span>
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
            <div style={{fontSize:13,color:"#64748b"}}>{vendor.location} · 入驻于 {vendor.joined}</div>
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
      </div>
      {showPublish && <PublishModal vendor={vendor} onClose={()=>setShowPublish(false)} onPublish={onPublish} />}
    </div>
  );
}

// ─── Share Sheet ──────────────────────────────────────────────────────────────
function ShareSheet({ title, shareText, shareUrl, onClose }) {
  const [copied, setCopied] = useState("");
  const [showWechat, setShowWechat] = useState(false);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&color=0f172a&bgcolor=ffffff&data=${encodeURIComponent(shareUrl)}`;

  const copy = (text, label) => { navigator.clipboard?.writeText(text).catch(()=>{}); setCopied(label); setTimeout(()=>setCopied(""),2000); };
  const open = (url) => window.open(url,"_blank","noopener,noreferrer");
  const weiboUrl = `https://service.weibo.com/share/share.php?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareText)}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText+"\n"+shareUrl)}`;

  if (showWechat) return <>
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
      <button onClick={()=>setShowWechat(false)} style={{background:"none",border:"none",color:"#94a3b8",fontSize:18,cursor:"pointer",padding:0}}>‹</button>
      <div style={{fontSize:16,fontWeight:700,color:"#0f172a"}}>微信分享</div>
      <button onClick={onClose} style={{background:"none",border:"none",color:"#94a3b8",fontSize:20,cursor:"pointer",marginLeft:"auto"}}>✕</button>
    </div>
    <div style={{textAlign:"center",padding:"8px 0 24px"}}>
      <div style={{display:"inline-block",background:"#ffffff",border:"1px solid #e2e8f0",borderRadius:16,padding:20,marginBottom:18}}>
        <img src={qrUrl} alt="微信扫码分享" width={180} height={180} style={{display:"block",borderRadius:8}} />
      </div>
      <div style={{fontSize:14,fontWeight:600,color:"#0f172a",marginBottom:8}}>用微信扫一扫</div>
      <div style={{fontSize:12,color:"#64748b",marginBottom:24}}>扫描二维码后，点击右上角「…」即可转发分享</div>
      <button onClick={()=>copy(shareUrl,"wechat")} style={{...ghostBtn,padding:"9px 28px",fontSize:13,color:copied==="wechat"?"#2563eb":"#374151"}}>
        {copied==="wechat"?"✓ 已复制链接":"复制链接发给微信好友"}
      </button>
    </div>
  </>;

  return <>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
      <div style={{fontSize:16,fontWeight:700,color:"#0f172a"}}>分享</div>
      <button onClick={onClose} style={{background:"none",border:"none",color:"#94a3b8",fontSize:20,cursor:"pointer"}}>✕</button>
    </div>
    <div style={{background:"#f8fafc",borderRadius:10,padding:"14px 16px",marginBottom:20,fontSize:12,color:"#374151",lineHeight:1.8,whiteSpace:"pre-line",wordBreak:"break-word",border:"1px solid #e2e8f0"}}>
      {shareText}
    </div>
    <div style={{display:"flex",gap:10,marginBottom:12}}>
      <button onClick={()=>setShowWechat(true)} style={{...ghostBtn,flex:1,fontSize:13}}>微信</button>
      <button onClick={()=>open(weiboUrl)} style={{...ghostBtn,flex:1,fontSize:13}}>微博</button>
      <button onClick={()=>open(twitterUrl)} style={{...ghostBtn,flex:1,fontSize:13}}>X (Twitter)</button>
      {typeof navigator!=="undefined"&&navigator.share&&
        <button onClick={()=>navigator.share({title,text:shareText,url:shareUrl})} style={{...ghostBtn,flex:1,fontSize:13}}>系统分享</button>}
    </div>
    <div style={{display:"flex",gap:10}}>
      <button onClick={()=>copy(shareUrl,"link")} style={{...ghostBtn,flex:1,fontSize:12,color:copied==="link"?"#2563eb":"#374151"}}>{copied==="link"?"✓ 已复制":"复制链接"}</button>
      <button onClick={()=>copy(shareText,"text")} style={{...ghostBtn,flex:1,fontSize:12,color:copied==="text"?"#2563eb":"#374151"}}>{copied==="text"?"✓ 已复制":"复制信息卡"}</button>
    </div>
  </>;
}

// ─── Resource Detail Modal ────────────────────────────────────────────────────
function ResourceDetailModal({ resource, vendor, onClose, onContact }) {
  const [showShare, setShowShare] = useState(false);
  const shareUrl = `https://www.neocloud.market?resource=${resource.id}`;
  const shareText = `【GPU 资源】${resource.gpu}\n供应商：${vendor.name}  ⭐${vendor.rating}\n价格：¥${resource.price}/卡/时 · ${resource.count}卡 · ${resource.region}\n用途：${resource.tags.join(" · ")}${resource.desc?"\n"+resource.desc:""}\n来源：${shareUrl}`;

  return (
    <Modal onClose={onClose} width={560}>
      {showShare ? <ShareSheet title={resource.gpu} shareText={shareText} shareUrl={shareUrl} onClose={()=>setShowShare(false)} /> : <>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24}}>
          <div>
            <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:20,letterSpacing:1.5,color:"#0f172a"}}>{resource.gpu}</div>
            <div style={{fontSize:12,color:"#64748b",marginTop:4}}>{resource.mem} · {resource.bandwidth||"—"} · {resource.region}</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#94a3b8",fontSize:20,cursor:"pointer"}}>✕</button>
        </div>
        <div style={{background:"rgba(37,99,235,0.06)",border:"1px solid rgba(37,99,235,0.15)",borderRadius:12,padding:"14px 20px",marginBottom:18,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <span style={{fontSize:13,color:"#64748b"}}>单价</span>
          <div><span style={{fontSize:26,fontWeight:700,color:"#2563eb",fontFamily:"'Bebas Neue',cursive"}}>¥{resource.price}</span><span style={{fontSize:12,color:"#64748b"}}>/卡/时</span></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:16}}>
          {[["可租卡数",`${resource.count} 卡`],["显存",resource.mem],["显存带宽",resource.bandwidth||"—"],["地区",resource.region],["交付形式",resource.delivery||"—"]].map(([k,v])=>(
            <div key={k} style={{background:"#f8fafc",borderRadius:8,padding:"10px 14px",border:"1px solid #e2e8f0"}}>
              <div style={{fontSize:10,color:"#94a3b8",marginBottom:3}}>{k}</div>
              <div style={{fontSize:13,fontWeight:600,color:"#374151"}}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center",marginBottom:14}}>
          {resource.tags.map(t=><Tag key={t} t={t} />)}
          <span style={{marginLeft:"auto",fontSize:11,color:resource.available?"#2563eb":"#94a3b8",fontWeight:600}}>{resource.available?"● 可用":"● 售罄"}</span>
        </div>
        {resource.desc && <div style={{fontSize:13,color:"#475569",lineHeight:1.7,borderLeft:"2px solid #bfdbfe",paddingLeft:12,marginBottom:18}}>{resource.desc}</div>}
        {(resource.contractType || resource.paymentType) && (
          <div style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:10,padding:"12px 16px",marginBottom:18}}>
            <div style={{fontSize:11,fontWeight:700,color:"#2563eb",letterSpacing:1,marginBottom:10}}>商务条款</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {resource.contractType && (
                <div>
                  <div style={{fontSize:10,color:"#94a3b8",marginBottom:3}}>合同要求</div>
                  <div style={{fontSize:13,fontWeight:600,color:"#374151",whiteSpace:"pre-wrap"}}>{resource.contractType}</div>
                </div>
              )}
              {resource.paymentType && (
                <div>
                  <div style={{fontSize:10,color:"#94a3b8",marginBottom:3}}>付款要求</div>
                  <div style={{fontSize:13,fontWeight:600,color:"#374151",whiteSpace:"pre-wrap"}}>{resource.paymentType}</div>
                </div>
              )}
            </div>
          </div>
        )}
        <div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",background:"#f8fafc",borderRadius:10,marginBottom:20,border:"1px solid #e2e8f0"}}>
          <Avatar text={vendor.name.slice(0,2)} size={34} />
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:600,color:"#0f172a"}}>{vendor.name}</div>
            <div style={{fontSize:11,color:"#64748b"}}>{vendor.location} · ⭐ {vendor.rating}（{vendor.reviews} 评价）</div>
          </div>
        </div>
        <div style={{display:"flex",gap:10}}>
          <button onClick={()=>setShowShare(true)} style={{...ghostBtn,flex:1}}>分享</button>
          <button onClick={onClose} style={{...ghostBtn,flex:1}}>关闭</button>
          <button onClick={()=>{onClose();onContact(vendor);}} style={{...primaryBtn,flex:2}}>{resource.available?"询价":"预约"}</button>
        </div>
      </>}
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
        style={{display:"flex",alignItems:"center",gap:14,padding:"14px 18px",background:expanded?"#f8fafc":"#ffffff",cursor:"pointer",userSelect:"none"}}
        onMouseEnter={e=>e.currentTarget.style.background="#f8fafc"}
        onMouseLeave={e=>e.currentTarget.style.background=expanded?"#f8fafc":"#ffffff"}
      >
        <span style={{fontSize:11,color:"#2563eb",display:"inline-block",transition:"transform 0.2s",transform:expanded?"rotate(90deg)":"rotate(0deg)",flexShrink:0}}>▶</span>
        <span style={{fontFamily:"'Bebas Neue',cursive",fontSize:17,letterSpacing:1.2,color:"#0f172a",flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{gpu}</span>
        <div style={{display:"flex",alignItems:"center",gap:16,flexShrink:0}}>
          <span style={{fontSize:12,color:"#94a3b8"}}>{items.length}个供应商</span>
          <span style={{fontSize:14,fontWeight:700,color:"#2563eb",fontFamily:"'Bebas Neue',cursive"}}>
            ¥{minPrice===maxPrice?minPrice:`${minPrice}~${maxPrice}`}<span style={{fontSize:10,fontWeight:400,color:"#94a3b8",fontFamily:"'Noto Sans SC',sans-serif"}}>/卡/时</span>
          </span>
          <div style={{display:"flex",gap:4}}>{allTags.map(t=><Tag key={t} t={t} />)}</div>
          <span style={{fontSize:11,color:availableCount>0?"#2563eb":"#94a3b8",fontWeight:600,minWidth:46}}>{availableCount>0?`● ${availableCount}可用`:"● 售罄"}</span>
        </div>
      </div>
      {expanded && (
        <div style={{borderTop:"1px solid #f1f5f9"}}>
          {items.map(r=>{
            const vendor = vendors.find(v=>v.id===r.vendorId);
            return (
              <div key={r.id} onClick={()=>onDetailClick(r)}
                style={{display:"flex",alignItems:"center",gap:12,padding:"11px 18px 11px 44px",borderBottom:"1px solid #f1f5f9",cursor:"pointer"}}
                onMouseEnter={e=>e.currentTarget.style.background="#f8fafc"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}
              >
                <Avatar text={vendor?.name.slice(0,2)||"??"} size={26} />
                <span style={{flex:1,fontSize:13,fontWeight:600,color:"#374151"}}>{vendor?.name||"—"}</span>
                <span style={{fontSize:11,color:"#94a3b8"}}>⭐ {vendor?.rating||"—"}</span>
                <span style={{fontSize:12,color:"#64748b",minWidth:36}}>{r.count}卡</span>
                <span style={{fontSize:12,color:"#64748b",minWidth:28}}>{r.region}</span>
                <span style={{fontSize:14,fontWeight:700,color:"#2563eb",fontFamily:"'Bebas Neue',cursive",minWidth:80,textAlign:"right"}}>¥{r.price}<span style={{fontSize:10,fontWeight:400,color:"#94a3b8",fontFamily:"'Noto Sans SC',sans-serif"}}>/卡/时</span></span>
                <span style={{fontSize:11,color:r.available?"#2563eb":"#94a3b8",minWidth:40}}>{r.available?"● 可用":"● 售罄"}</span>
                <span style={{fontSize:13,color:"#94a3b8"}}>›</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Post Requirement Modal ───────────────────────────────────────────────────
function PostRequirementModal({ onClose, onSuccess, subscriberCount=0 }) {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ gpu:"", count:"", budget:"", contact:"", tags:[], desc:"", region:"国内", delivery:"裸金属" });
  const set = k => e => setForm(f=>({...f,[k]:e.target.value}));
  const toggleTag = t => setForm(f=>({...f, tags:f.tags.includes(t)?f.tags.filter(x=>x!==t):[...f.tags,t]}));
  const valid = form.gpu.trim() && form.contact.trim();

  const handleSubmit = () => {
    if (!valid) return;
    const today = new Date().toISOString().slice(0,10);
    onSuccess?.({ id:Date.now(), gpu:form.gpu, count:Number(form.count)||1, budget:Number(form.budget)||0, tags:form.tags, region:form.region, delivery:form.delivery, desc:form.desc, contact:form.contact, createdAt:today });
    setSent(true);
  };

  return (
    <Modal onClose={onClose} width={520}>
      {!sent ? <>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
          <div>
            <div style={{fontFamily:"'Noto Serif SC',serif",fontSize:20,fontWeight:700,color:"#0f172a"}}>发布需求</div>
            <div style={{fontSize:12,color:"#64748b",marginTop:4}}>供应商将主动与您联系报价</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#94a3b8",fontSize:20,cursor:"pointer"}}>✕</button>
        </div>
        <div style={{background:"rgba(37,99,235,0.05)",border:"1px solid rgba(37,99,235,0.15)",borderRadius:10,padding:"10px 14px",marginBottom:16,fontSize:12,color:"#2563eb",display:"flex",alignItems:"center",gap:8}}>
          <span>📢</span>
          <span>发布后将同步至【需求列表】，并推送至 <strong>{subscriberCount}</strong> 位订阅用户</span>
        </div>
        <label style={{display:"block",fontSize:12,color:"#64748b",marginBottom:6}}>所需 GPU 型号 *</label>
        <input value={form.gpu} onChange={set("gpu")} placeholder="例：NVIDIA H100 80G" style={inp} />
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 14px"}}>
          <div>
            <label style={{display:"block",fontSize:12,color:"#64748b",marginBottom:6}}>需求卡数</label>
            <input value={form.count} onChange={set("count")} placeholder="例：8" type="number" min="1" style={inp} />
          </div>
          <div>
            <label style={{display:"block",fontSize:12,color:"#64748b",marginBottom:6}}>预算（元/卡/时）</label>
            <input value={form.budget} onChange={set("budget")} placeholder="例：25" type="number" min="0" style={inp} />
          </div>
        </div>
        <label style={{display:"block",fontSize:12,color:"#64748b",marginBottom:8}}>用途标签</label>
        <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:16}}>
          {ALL_TAGS.map(t=>(
            <button type="button" key={t} onClick={()=>toggleTag(t)} style={{padding:"5px 12px",borderRadius:20,border:`1px solid ${form.tags.includes(t)?(TAG_COLORS[t]||"#2563eb")+"60":"#e2e8f0"}`,background:form.tags.includes(t)?`${TAG_COLORS[t]||"#2563eb"}12`:"transparent",color:form.tags.includes(t)?(TAG_COLORS[t]||"#2563eb"):"#64748b",cursor:"pointer",fontSize:12}}>
              {t}
            </button>
          ))}
        </div>
        <label style={{display:"block",fontSize:12,color:"#64748b",marginBottom:6}}>补充说明</label>
        <textarea value={form.desc} onChange={set("desc")} placeholder="租用时长、部署场景、其他要求..." rows={3} style={{...inp,resize:"vertical",marginBottom:16}} />
        <label style={{display:"block",fontSize:12,color:"#64748b",marginBottom:6}}>联系方式 *</label>
        <input value={form.contact} onChange={set("contact")} placeholder="手机 / 微信 / 邮箱" style={inp} />
        <div style={{display:"flex",gap:10,marginTop:4}}>
          <button onClick={onClose} style={{...ghostBtn,flex:1}}>取消</button>
          <button onClick={handleSubmit} style={{...primaryBtn,flex:2,opacity:valid?1:0.4,cursor:valid?"pointer":"default"}}>发布需求</button>
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
    brand:"NVIDIA", gpuModel:"", vram:"",
    delivery:"裸金属", count:"", billingUnit:"台",
    price:"", currency:"人民币",
    region:"国内", dcLocation:"",
    contract:"", paymentTerms:"",
    status:"可售", onlineTime:"",
    config:"", company:"", contact:"",
  };
  const [form, setForm] = useState(empty);
  const set = k => e => setForm(f=>({...f,[k]:e.target.value}));
  const handleBrand = e => { const brand=e.target.value; setForm(f=>({...f,brand,gpuModel:"",vram:""})); };
  const handleModel = e => { const gpuModel=e.target.value; setForm(f=>({...f,gpuModel,vram:VRAM_MAP[gpuModel]||""})); };

  const required = [form.brand,form.gpuModel,form.vram,form.delivery,form.count,
    form.billingUnit,form.price,form.currency,form.region,form.dcLocation,
    form.contract,form.paymentTerms,form.status,form.config,form.contact,form.company];
  const valid = required.every(v=>String(v).trim()!=="") && Number(form.count)>0 && Number(form.price)>0;

  const handle = () => {
    if (!valid) return;
    const now = new Date();
    const gpuLabel = `${form.brand} ${form.gpuModel}`;
    const newVendor = { id:Date.now(), name:form.company, avatar:form.company.slice(0,2), rating:5.0, reviews:0, location:"—", joined:`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}` };
    const newResource = {
      id:Date.now()+1, vendorId:newVendor.id,
      gpu:gpuLabel, mem:form.vram, bandwidth:"",
      count:Number(form.count), price:Number(form.price),
      delivery:form.delivery, region:form.region,
      available:form.status==="可售", tags:[], desc:form.config,
      brand:form.brand, gpuModel:form.gpuModel, vram:form.vram,
      billingUnit:form.billingUnit, currency:form.currency,
      dcLocation:form.dcLocation, contract:form.contract,
      paymentTerms:form.paymentTerms, status:form.status,
      onlineTime:form.onlineTime, config:form.config,
      company:form.company, contact:form.contact,
    };
    onSuccess(newVendor, newResource);
    setSent(true);
  };

  const sl = { fontSize:11, fontWeight:700, color:"#2563eb", letterSpacing:1, marginBottom:12, marginTop:20, paddingBottom:8, borderBottom:"1px solid #e2e8f0" };
  const lbl = { display:"block", fontSize:12, color:"#64748b", marginBottom:5 };
  const row2 = { display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 14px" };
  const models = GPU_MODELS[form.brand] || [];

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

        <div style={sl}>GPU 信息</div>
        <div style={row2}>
          <div><label style={lbl}>品牌 *</label><select value={form.brand} onChange={handleBrand} style={inp}>{Object.keys(GPU_MODELS).map(b=><option key={b}>{b}</option>)}</select></div>
          <div><label style={lbl}>GPU 型号 *</label><select value={form.gpuModel} onChange={handleModel} style={inp}><option value="">请选择型号</option>{models.map(m=><option key={m}>{m}</option>)}{form.brand==="其他"&&<option value="__custom__">手动输入</option>}</select></div>
        </div>
        {form.brand==="其他"&&<div><label style={lbl}>GPU 型号（手动输入） *</label><input value={form.gpuModel==="__custom__"?"":form.gpuModel} onChange={e=>setForm(f=>({...f,gpuModel:e.target.value}))} placeholder="请输入 GPU 型号" style={inp} /></div>}
        <div style={row2}>
          <div><label style={lbl}>显存 *</label><input value={form.vram} onChange={set("vram")} placeholder="自动填充或手动输入，如 80GB" style={inp} /></div>
          <div />
        </div>
        <div><label style={lbl}>配置说明 *</label><textarea value={form.config} onChange={set("config")} placeholder="描述互联方式、网络带宽、存储配置等硬件规格" rows={2} style={{...inp,resize:"vertical"}} /></div>

        <div style={sl}>租赁条件</div>
        <div style={row2}>
          <div><label style={lbl}>交付形式 *</label><select value={form.delivery} onChange={set("delivery")} style={inp}><option>裸金属</option><option>云平台</option></select></div>
          <div><label style={lbl}>资源状态 *</label><select value={form.status} onChange={set("status")} style={inp}><option>可售</option><option>预售</option></select></div>
        </div>
        <div style={row2}>
          <div><label style={lbl}>可租数量 *</label><input value={form.count} onChange={set("count")} type="number" min="1" placeholder="256" style={inp} /></div>
          <div><label style={lbl}>计费单位 *</label><select value={form.billingUnit} onChange={set("billingUnit")} style={inp}><option>台</option><option>卡</option></select></div>
        </div>
        <div style={row2}>
          <div><label style={lbl}>单价 *</label><input value={form.price} onChange={set("price")} type="number" min="0" step="0.01" placeholder="75000" style={inp} /></div>
          <div><label style={lbl}>货币 *</label><select value={form.currency} onChange={set("currency")} style={inp}><option>人民币</option><option>美金</option></select></div>
        </div>
        {form.status==="预售"&&<div><label style={lbl}>预计上线时间</label><input value={form.onlineTime} onChange={set("onlineTime")} placeholder="如：4月初、2026-Q2" style={inp} /></div>}

        <div style={sl}>位置信息</div>
        <div style={row2}>
          <div><label style={lbl}>区域 *</label><select value={form.region} onChange={set("region")} style={inp}><option>国内</option><option>海外</option></select></div>
          <div><label style={lbl}>数据中心位置 *</label><input value={form.dcLocation} onChange={set("dcLocation")} placeholder="如：内蒙古、北京、新加坡" style={inp} /></div>
        </div>

        <div style={sl}>商务条款</div>
        <div style={row2}>
          <div><label style={lbl}>合同要求 *</label><input value={form.contract} onChange={set("contract")} placeholder="如：3年闭口" style={inp} /></div>
          <div><label style={lbl}>付款要求 *</label><input value={form.paymentTerms} onChange={set("paymentTerms")} placeholder="如：押一付三" style={inp} /></div>
        </div>

        <div style={sl}>联系信息</div>
        <div style={row2}>
          <div><label style={lbl}>公司名称 *</label><input value={form.company} onChange={set("company")} placeholder="例：极光算力 AuroraAI" style={inp} /></div>
          <div><label style={lbl}>联系方式 *</label><input value={form.contact} onChange={set("contact")} placeholder="手机 / 微信 / 邮箱" style={inp} /></div>
        </div>

        <div style={{display:"flex",gap:10,marginTop:8}}>
          <button onClick={onClose} style={{...ghostBtn,flex:1}}>取消</button>
          <button onClick={handle} style={{...primaryBtn,flex:2,opacity:valid?1:0.4,cursor:valid?"pointer":"default"}}>发布资源</button>
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
  const [email, setEmail] = useState("");
  const [topics, setTopics] = useState(["resources","demands"]);
  const [done, setDone] = useState(false);
  const toggleTopic = t => setTopics(ts=>ts.includes(t)?ts.filter(x=>x!==t):[...ts,t]);
  const valid = email.trim().includes("@") && topics.length>0;

  const handle = () => {
    if (!valid) return;
    onSuccess({ id:Date.now(), email:email.trim(), topics });
    setDone(true);
  };

  return (
    <Modal onClose={onClose} width={420}>
      {!done ? <>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
          <div>
            <div style={{fontFamily:"'Noto Serif SC',serif",fontSize:20,fontWeight:700,color:"#0f172a"}}>订阅更新</div>
            <div style={{fontSize:12,color:"#64748b",marginTop:4}}>第一时间获取新资源上线和需求发布通知</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#94a3b8",fontSize:20,cursor:"pointer"}}>✕</button>
        </div>
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
        <button onClick={handle} disabled={!valid} style={{...primaryBtn,width:"100%",opacity:valid?1:0.4,cursor:valid?"pointer":"default"}}>立即订阅</button>
      </> : <div style={{textAlign:"center",padding:"28px 0"}}>
        <div style={{fontSize:44,marginBottom:12}}>🎉</div>
        <div style={{fontSize:18,fontWeight:700,marginBottom:6,color:"#0f172a"}}>订阅成功！</div>
        <div style={{fontSize:13,color:"#64748b",marginBottom:24}}>我们将通过邮件第一时间通知您</div>
        <button onClick={onClose} style={{...primaryBtn,padding:"10px 32px"}}>完成</button>
      </div>}
    </Modal>
  );
}

// ─── Home Page ────────────────────────────────────────────────────────────────
function HomePage({ vendors, resources, demands, subscribers, onGoResources, onGoDemands, onResourceClick, onSubscribe }) {
  const recentResources = [...resources].sort((a,b)=>b.id-a.id).slice(0,6);
  const recentDemands   = [...demands].sort((a,b)=>b.id-a.id).slice(0,5);
  const rowStyle = { display:"flex", alignItems:"center", gap:14, padding:"12px 16px", borderBottom:"1px solid #f1f5f9", cursor:"pointer" };

  return (
    <div style={{paddingTop:12}}>
      {/* Compact header */}
      <div style={{textAlign:"center",paddingBottom:36,borderBottom:"1px solid #e2e8f0",marginBottom:40}}>
        <div style={{fontSize:10,letterSpacing:4,color:"#2563eb",marginBottom:10,fontWeight:600}}>GPU RENTAL MARKETPLACE</div>
        <h1 style={{fontFamily:"'Noto Serif SC',serif",fontSize:"clamp(22px,3.5vw,38px)",fontWeight:700,lineHeight:1.3,marginBottom:10,color:"#0f172a"}}>
          全球&nbsp;<span style={{color:"#2563eb"}}>GPU 算力</span>&nbsp;资源与需求集市
        </h1>
        <p style={{color:"#64748b",fontSize:13}}>全球算力资源，全球算力需求，</p>
      </div>

      {/* 最新资源 */}
      <div style={{marginBottom:48}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div style={{display:"flex",alignItems:"baseline",gap:12}}>
            <h2 style={{fontFamily:"'Noto Serif SC',serif",fontSize:20,fontWeight:700,color:"#0f172a"}}>最新资源</h2>
            <span style={{fontSize:12,color:"#94a3b8"}}>共 {resources.length} 条</span>
          </div>
          <button onClick={onSubscribe} style={{padding:"6px 16px",border:"1px solid rgba(37,99,235,0.3)",borderRadius:8,background:"transparent",color:"#2563eb",fontSize:13,cursor:"pointer",fontWeight:600}}>订阅更新</button>
        </div>
        <div style={{background:"#ffffff",border:"1px solid #e2e8f0",borderRadius:12,overflow:"hidden",marginBottom:14,boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
          {recentResources.map((r,i)=>{
            const vendor = vendors.find(v=>v.id===r.vendorId);
            return (
              <div key={r.id} onClick={()=>onResourceClick(r)}
                style={{...rowStyle,borderBottom:i===recentResources.length-1?"none":rowStyle.borderBottom}}
                onMouseEnter={e=>e.currentTarget.style.background="#f8fafc"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}
              >
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:15,letterSpacing:1,color:"#0f172a",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{r.gpu}</div>
                  <div style={{fontSize:11,color:"#94a3b8",marginTop:2}}>{vendor?.name||"—"} · {r.count}卡 · {r.region} · {r.delivery}</div>
                </div>
                <div style={{display:"flex",gap:4,flexShrink:0}}>{r.tags.slice(0,2).map(t=><Tag key={t} t={t} />)}</div>
                <div style={{flexShrink:0,textAlign:"right",minWidth:88}}>
                  <span style={{fontSize:16,fontWeight:700,color:"#2563eb",fontFamily:"'Bebas Neue',cursive"}}>¥{r.price}</span>
                  <span style={{fontSize:10,color:"#94a3b8"}}>/卡/时</span>
                </div>
                <span style={{fontSize:11,color:r.available?"#2563eb":"#94a3b8",minWidth:42,textAlign:"right"}}>{r.available?"● 可租":"● 售罄"}</span>
              </div>
            );
          })}
        </div>
        <button onClick={onGoResources}
          style={{width:"100%",padding:"11px",border:"1px solid #e2e8f0",borderRadius:10,background:"transparent",color:"#64748b",fontSize:13,cursor:"pointer",fontWeight:500}}
          onMouseEnter={e=>{e.currentTarget.style.color="#2563eb";e.currentTarget.style.borderColor="rgba(37,99,235,0.3)";}}
          onMouseLeave={e=>{e.currentTarget.style.color="#64748b";e.currentTarget.style.borderColor="#e2e8f0";}}
        >查看所有资源 →</button>
      </div>

      <div style={{borderTop:"1px solid #e2e8f0",marginBottom:40}} />

      {/* 最新需求 */}
      <div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div style={{display:"flex",alignItems:"baseline",gap:12}}>
            <h2 style={{fontFamily:"'Noto Serif SC',serif",fontSize:20,fontWeight:700,color:"#0f172a"}}>最新需求</h2>
            <span style={{fontSize:12,color:"#94a3b8"}}>共 {demands.length} 条</span>
          </div>
          <button onClick={onSubscribe} style={{padding:"6px 16px",border:"1px solid rgba(37,99,235,0.3)",borderRadius:8,background:"transparent",color:"#2563eb",fontSize:13,cursor:"pointer",fontWeight:600}}>订阅更新</button>
        </div>
        <div style={{background:"#ffffff",border:"1px solid #e2e8f0",borderRadius:12,overflow:"hidden",marginBottom:14,boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
          {recentDemands.map((d,i)=>(
            <div key={d.id} onClick={onGoDemands}
              style={{...rowStyle,borderBottom:i===recentDemands.length-1?"none":rowStyle.borderBottom}}
              onMouseEnter={e=>e.currentTarget.style.background="#f8fafc"}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}
            >
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:15,letterSpacing:1,color:"#0f172a",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{d.gpu} × {d.count}卡</div>
                <div style={{display:"flex",gap:4,marginTop:4,flexWrap:"wrap"}}>{d.tags.slice(0,2).map(t=><Tag key={t} t={t} />)}</div>
              </div>
              <div style={{flexShrink:0,textAlign:"right"}}>
                {d.budget>0&&<div style={{fontSize:16,fontWeight:700,color:"#2563eb",fontFamily:"'Bebas Neue',cursive"}}>≤¥{d.budget}<span style={{fontSize:10,color:"#94a3b8",fontFamily:"'Noto Sans SC',sans-serif"}}>/卡/时</span></div>}
                <div style={{fontSize:11,color:"#94a3b8",marginTop:2}}>{d.region} · {d.delivery}</div>
              </div>
            </div>
          ))}
        </div>
        <button onClick={onGoDemands}
          style={{width:"100%",padding:"11px",border:"1px solid #e2e8f0",borderRadius:10,background:"transparent",color:"#64748b",fontSize:13,cursor:"pointer",fontWeight:500}}
          onMouseEnter={e=>{e.currentTarget.style.color="#2563eb";e.currentTarget.style.borderColor="rgba(37,99,235,0.3)";}}
          onMouseLeave={e=>{e.currentTarget.style.color="#64748b";e.currentTarget.style.borderColor="#e2e8f0";}}
        >查看所有需求 →</button>
      </div>
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
          {/* TODO: 将 src 替换为真实微信二维码图片路径，如 src="/images/wechat-qr.png" */}
          <img
            src="finder-wechat-qr.png"
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

// ─── Hardware Page ────────────────────────────────────────────────────────────
function HardwarePage({ onNavigate }) {
  return (
    <div style={{maxWidth:800,margin:"0 auto",padding:"48px 24px"}}>
      <h2 style={{fontFamily:"'Noto Serif SC',serif",fontSize:28,fontWeight:700,color:"#0f172a",marginBottom:8}}>硬件买卖</h2>
      <p style={{fontSize:14,color:"#64748b",marginBottom:40}}>选择您需要的硬件类型</p>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
        <div onClick={()=>onNavigate("hardware:servers")} style={{background:"#ffffff",border:"1px solid #e2e8f0",borderRadius:16,padding:"32px 24px",cursor:"pointer",boxShadow:"0 1px 4px rgba(0,0,0,0.05)",transition:"all 0.2s"}}
          onMouseEnter={e=>{e.currentTarget.style.borderColor="#2563eb";e.currentTarget.style.boxShadow="0 4px 12px rgba(37,99,235,0.15)";}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor="#e2e8f0";e.currentTarget.style.boxShadow="0 1px 4px rgba(0,0,0,0.05)";}}>
          <div style={{fontSize:40,marginBottom:16}}>🖥️</div>
          <div style={{fontSize:18,fontWeight:700,color:"#0f172a",marginBottom:8}}>服务器</div>
          <div style={{fontSize:13,color:"#64748b"}}>GPU 服务器买卖信息</div>
        </div>

        <div style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:16,padding:"32px 24px",opacity:0.6}}>
          <div style={{fontSize:40,marginBottom:16}}>💾</div>
          <div style={{fontSize:18,fontWeight:700,color:"#0f172a",marginBottom:8}}>内存条</div>
          <div style={{fontSize:13,color:"#64748b"}}>敬请期待</div>
        </div>
      </div>
    </div>
  );
}

// ─── Server Listings Page ─────────────────────────────────────────────────────
function ServerListingsPage({ listings, onPublish }) {
  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return `${d.getMonth()+1}/${d.getDate()}`;
  };

  return (
    <div style={{maxWidth:1000,margin:"0 auto",padding:"32px 24px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
        <div>
          <h2 style={{fontFamily:"'Noto Serif SC',serif",fontSize:26,fontWeight:700,color:"#0f172a",marginBottom:6}}>服务器买卖</h2>
          <p style={{fontSize:13,color:"#64748b"}}>{listings.length} 条信息</p>
        </div>
        <button onClick={onPublish} style={{...primaryBtn,padding:"10px 22px",fontSize:13}}>发布需求</button>
      </div>

      {listings.length === 0 ? (
        <div style={{textAlign:"center",padding:"80px 0",border:"1px dashed #d1d5db",borderRadius:16,color:"#94a3b8"}}>
          <div style={{fontSize:40,marginBottom:12}}>🖥️</div>
          <div style={{fontSize:16,marginBottom:6,color:"#374151"}}>暂无服务器买卖信息</div>
          <div style={{fontSize:13,marginBottom:24}}>点击「发布需求」开始</div>
        </div>
      ) : (
        <div style={{background:"#ffffff",border:"1px solid #e2e8f0",borderRadius:12,overflow:"hidden"}}>
          {listings.map((item,idx)=>(
            <div key={item.id} style={{display:"flex",alignItems:"center",gap:16,padding:"16px 20px",borderBottom:idx<listings.length-1?"1px solid #f1f5f9":"none"}}>
              <span style={{padding:"4px 10px",borderRadius:6,fontSize:11,fontWeight:600,background:item.listing_type==="buy"?"rgba(37,99,235,0.08)":"rgba(16,185,129,0.08)",color:item.listing_type==="buy"?"#2563eb":"#10b981"}}>
                {item.listing_type==="buy"?"购买":"销售"}
              </span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:14,fontWeight:600,color:"#0f172a",marginBottom:2}}>{item.gpu_model}</div>
                <div style={{fontSize:12,color:"#64748b"}}>{item.quantity} 台{item.brand&&item.brand!=="无要求"?` · ${item.brand}`:""}</div>
              </div>
              <span style={{padding:"3px 8px",borderRadius:6,fontSize:11,fontWeight:600,background:item.condition==="new"?"rgba(234,179,8,0.08)":"rgba(100,116,139,0.08)",color:item.condition==="new"?"#ca8a04":"#64748b"}}>
                {item.condition==="new"?"全新":item.condition==="used"?"二手":"均可"}
              </span>
              <div style={{fontSize:12,color:"#94a3b8",minWidth:60}}>{formatDate(item.created_at)}</div>
              <div style={{fontSize:12,color:"#374151",minWidth:100,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.contact_info}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Server Form Modal ────────────────────────────────────────────────────────
function ServerFormModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    listing_type:"buy",gpu_model:"H100",brand:"无要求",stock_type:"spot",
    quantity:"",min_batch_quantity:"",condition:"new",delivery_date:"",
    config_requirements:"",budget_per_unit:"",tax_included:true,
    payment_method:"意向金看货",other_requirements:"",
    contact_name:"",contact_info:""
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = k => e => setForm(f=>({...f,[k]:e.target.value}));
  const setCheck = k => e => setForm(f=>({...f,[k]:e.target.checked}));

  const valid = form.quantity && form.contact_name && form.contact_info;

  const handle = async () => {
    if (!valid || saving) return;
    setSaving(true); setErr("");
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) { setErr("请先登录"); setSaving(false); return; }
      const res = await fetch(`${API}/api/server-listings`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          ...form,
          quantity: Number(form.quantity),
          min_batch_quantity: form.min_batch_quantity ? Number(form.min_batch_quantity) : null
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const saved = await res.json();
      onSuccess(saved);
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
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
        <div>
          <div style={{fontFamily:"'Noto Serif SC',serif",fontSize:20,fontWeight:700,color:"#0f172a"}}>发布服务器需求</div>
          <div style={{fontSize:12,color:"#64748b",marginTop:4}}>* 为必填项</div>
        </div>
        <button onClick={onClose} style={{background:"none",border:"none",color:"#94a3b8",fontSize:20,cursor:"pointer"}}>✕</button>
      </div>

      {err && <div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8,padding:"10px 14px",marginBottom:16,fontSize:12,color:"#dc2626"}}>{err}</div>}

      <div style={sl}>基本信息</div>
      <div style={row2}>
        <div>
          <label style={lbl}>需求类型 *</label>
          <select value={form.listing_type} onChange={set("listing_type")} style={inp}>
            <option value="buy">购买</option>
            <option value="sell">销售</option>
          </select>
        </div>
        <div>
          <label style={lbl}>GPU 型号 *</label>
          <select value={form.gpu_model} onChange={set("gpu_model")} style={inp}>
            {["H200","H20","H100","B300","A800","A100","RTX 5090","RTX 4090","其他"].map(m=><option key={m}>{m}</option>)}
          </select>
        </div>
      </div>

      <div style={row2}>
        <div>
          <label style={lbl}>品牌要求</label>
          <select value={form.brand} onChange={set("brand")} style={inp}>
            {["无要求","Supermicro","Dell","HPE","浪潮","曙光","其他"].map(b=><option key={b}>{b}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>货物形态 *</label>
          <select value={form.stock_type} onChange={set("stock_type")} style={inp}>
            <option value="spot">现货</option>
            <option value="future">期货</option>
            <option value="both">均可</option>
          </select>
        </div>
      </div>

      <div style={row2}>
        <div>
          <label style={lbl}>数量（台）*</label>
          <input type="number" min="1" value={form.quantity} onChange={set("quantity")} placeholder="例：10" style={inp} />
        </div>
        <div>
          <label style={lbl}>最小分批交付数量（台）</label>
          <input type="number" min="1" value={form.min_batch_quantity} onChange={set("min_batch_quantity")} placeholder="选填" style={inp} />
        </div>
      </div>

      <div style={row2}>
        <div>
          <label style={lbl}>新旧 *</label>
          <select value={form.condition} onChange={set("condition")} style={inp}>
            <option value="new">全新</option>
            <option value="used">二手</option>
            <option value="both">均可</option>
          </select>
        </div>
        <div>
          <label style={lbl}>期望交付时间</label>
          <input type="date" value={form.delivery_date} onChange={set("delivery_date")} style={inp} />
        </div>
      </div>

      <div>
        <label style={lbl}>配置要求</label>
        <textarea value={form.config_requirements} onChange={set("config_requirements")} placeholder="描述 CPU、内存、存储等配置要求" rows={2} style={{...inp,resize:"vertical"}} />
      </div>

      <div style={sl}>商务信息</div>
      <div>
        <label style={lbl}>参考预算（元/台）</label>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          <input value={form.budget_per_unit} onChange={set("budget_per_unit")} placeholder="选填" style={{...inp,flex:1}} />
          <label style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:"#64748b",cursor:"pointer"}}>
            <input type="checkbox" checked={form.tax_included} onChange={setCheck("tax_included")} />
            含税13%
          </label>
        </div>
      </div>

      <div>
        <label style={lbl}>付款方式</label>
        <select value={form.payment_method} onChange={set("payment_method")} style={inp}>
          {["意向金看货","部分预付","验货后付款","可议"].map(p=><option key={p}>{p}</option>)}
        </select>
      </div>

      <div>
        <label style={lbl}>其他商务要求</label>
        <textarea value={form.other_requirements} onChange={set("other_requirements")} placeholder="其他补充说明" rows={2} style={{...inp,resize:"vertical"}} />
      </div>

      <div style={sl}>联系信息</div>
      <div style={row2}>
        <div>
          <label style={lbl}>姓名 *</label>
          <input value={form.contact_name} onChange={set("contact_name")} placeholder="您的姓名" style={inp} />
        </div>
        <div>
          <label style={lbl}>联系方式 *</label>
          <input value={form.contact_info} onChange={set("contact_info")} placeholder="手机 / 微信 / 邮箱" style={inp} />
        </div>
      </div>

      <div style={{display:"flex",gap:10,marginTop:20}}>
        <button onClick={onClose} style={{...ghostBtn,flex:1}}>取消</button>
        <button onClick={handle} disabled={!valid||saving} style={{...primaryBtn,flex:2,opacity:valid?1:0.4,cursor:valid?"pointer":"default"}}>
          {saving?"发布中...":"发布"}
        </button>
      </div>
    </Modal>
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
        <span onClick={()=>window.location.href="/"} style={{fontFamily:"'Bebas Neue',cursive",fontSize:22,letterSpacing:3,color:"#1d4ed8",cursor:"pointer"}}>GPUMARKET</span>
        <span style={{fontSize:12,color:"#94a3b8",borderLeft:"1px solid #e2e8f0",paddingLeft:16}}>供应商资源</span>
      </div>
      <div style={{maxWidth:900,margin:"0 auto",padding:"32px 24px"}}>
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
        {resources.length===0 ? (
          <div style={{textAlign:"center",padding:"60px 0",color:"#94a3b8",border:"1px dashed #d1d5db",borderRadius:16}}>
            <div style={{fontSize:36,marginBottom:12}}>🖥️</div>
            <div style={{fontSize:15,color:"#374151"}}>暂无可用资源</div>
          </div>
        ) : (
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {resources.map(r=>(
              <div key={r.id} style={{background:"#ffffff",border:"1px solid #e2e8f0",borderRadius:14,padding:20,display:"flex",alignItems:"center",gap:16,flexWrap:"wrap",boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
                <div style={{flex:1,minWidth:200}}>
                  <div style={{fontWeight:700,fontSize:14,fontFamily:"'Bebas Neue',cursive",letterSpacing:1,color:"#0f172a",marginBottom:4}}>{r.gpu}</div>
                  <div style={{fontSize:12,color:"#64748b",marginBottom:8}}>{r.mem}{r.bandwidth?` · ${r.bandwidth}`:""} · {r.region} · {r.delivery}</div>
                  {r.availableQuantity!=null && <div style={{fontSize:12,color:"#059669",marginBottom:6}}>可租：{r.availableQuantity} 卡</div>}
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{(r.tags||[]).map(t=><Tag key={t} t={t} />)}</div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontSize:26,fontWeight:700,color:"#2563eb",fontFamily:"'Bebas Neue',cursive"}}>¥{r.price}</div>
                  <div style={{fontSize:11,color:"#94a3b8"}}>元/卡/时</div>
                  <div style={{marginTop:6,fontSize:11,padding:"3px 10px",borderRadius:10,background:"#f0fdf4",color:"#16a34a",display:"inline-block"}}>{r.status}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Admin Panel ──────────────────────────────────────────────────────────────
function AdminPanel({ onExit, token }) {
  const [links, setLinks] = useState([]);
  const [form, setForm] = useState({ title:"", url:"", sort_order:"0" });
  const [saving, setSaving] = useState(false);

  useEffect(()=>{
    fetch(`${API}/api/related-links`).then(r=>r.json()).then(setLinks).catch(()=>{});
  },[]);

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

  return (
    <div style={{minHeight:"100vh",background:"#f1f5f9",color:"#0f172a",fontFamily:"'Noto Sans SC',system-ui,sans-serif"}}>
      <div style={{borderBottom:"1px solid #e2e8f0",padding:"0 24px",display:"flex",alignItems:"center",gap:16,height:60,background:"rgba(255,255,255,0.97)",backdropFilter:"blur(12px)"}}>
        <span onClick={onExit} style={{fontFamily:"'Bebas Neue',cursive",fontSize:22,letterSpacing:3,color:"#1d4ed8",cursor:"pointer"}}>GPUMARKET</span>
        <span style={{fontSize:12,color:"#94a3b8",borderLeft:"1px solid #e2e8f0",paddingLeft:16}}>管理员后台</span>
        <div style={{marginLeft:"auto"}}>
          <button onClick={onExit} style={{fontSize:12,color:"#64748b",background:"none",border:"1px solid #e2e8f0",borderRadius:6,padding:"4px 10px",cursor:"pointer"}}>退出</button>
        </div>
      </div>
      <div style={{maxWidth:860,margin:"0 auto",padding:"40px 24px"}}>
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
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const shareMatch = window.location.pathname.match(/^\/vendor\/(.+)$/);
  if (shareMatch) return <VendorSharePage shareToken={shareMatch[1]} />;
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
  const [filters, setFilters] = useState({ brand:"", model:"", mem:"", region:"", delivery:"" });
  const setFilter = k => e => setFilters(f=>({...f,[k]:e.target.value}));
  const hasFilter = Object.values(filters).some(v=>v!=="");
  const [tabView, setTabView] = useState("home");
  const [vendorModal, setVendorModal] = useState(null);
  const [contactModal, setContactModal] = useState(null);
  const [showRegister, setShowRegister] = useState(false);
  const [currentVendor, setCurrentVendor] = useState(null);
  const [detailModal, setDetailModal] = useState(null);
  const [showPostReq, setShowPostReq] = useState(false);
  const [showPostRes, setShowPostRes] = useState(false);
  const [showSubscribe, setShowSubscribe] = useState(false);
  const [expandVendorId, setExpandVendorId] = useState(null);
  const [serverListings, setServerListings] = useState([]);
  const [showServerForm, setShowServerForm] = useState(false);

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
      safe(fetch(`${API}/api/server-listings`).then(r=>r.json())),
    ]).then(([v,r,d,s,l,sl])=>{
      if(v) setVendors(v);
      if(r) setResources(r);
      if(d) setDemands(d);
      if(s) { setResSubCount(s.resources); setDemSubCount(s.demands); }
      if(l) setLinks(l);
      if(sl) setServerListings(sl);
      setLoading(false);
      // URL 深链（数据加载后处理）
      const p = new URLSearchParams(window.location.search);
      const rid = p.get("resource"), vid = p.get("vendor");
      if (rid&&r) { const res=r.find(x=>String(x.id)===rid); if(res){setTabView("resources");setDetailModal(res);} }
      else if (vid) { setTabView("resources"); setExpandVendorId(Number(vid)); }
    });
  },[]);

  const filtered = useMemo(()=>resources.filter(r=>{
    const v = vendors.find(x=>x.id===r.vendorId);
    const q = search.toLowerCase();
    const brand = r.gpu.split(" ")[0];
    const modelKey = (()=>{ const w=r.gpu.split(" "); return ["RTX","GTX","RX"].includes(w[1])?`${w[1]} ${w[2]}`:w[1]; })();
    const memKey = r.mem.split(" ")[0];
    return (!q||r.gpu.toLowerCase().includes(q)||r.tags.some(t=>t.includes(q))||v?.name.toLowerCase().includes(q)||r.region.includes(q))
      &&(!filters.brand||brand===filters.brand)&&(!filters.model||modelKey===filters.model)
      &&(!filters.mem||memKey===filters.mem)&&(!filters.region||r.region===filters.region)
      &&(!filters.delivery||r.delivery===filters.delivery)
      && r.isVisible !== false;
  }),[resources,vendors,search,filters]);

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
    // 乐观更新计数
    if (sub.topics.includes("resources")) setResSubCount(n=>n+1);
    if (sub.topics.includes("demands"))   setDemSubCount(n=>n+1);
    // 写入 API
    fetch(`${API}/api/subscribers`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(sub) }).catch(()=>{});
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

  const uniq = arr => ["",...new Set(arr)];
  const brands    = uniq(resources.map(r=>r.gpu.split(" ")[0]));
  const models    = uniq(resources.map(r=>{ const w=r.gpu.split(" "); return ["RTX","GTX","RX"].includes(w[1])?`${w[1]} ${w[2]}`:w[1]; }));
  const mems      = uniq(resources.map(r=>r.mem.split(" ")[0]));
  const regions   = uniq(resources.map(r=>r.region));
  const deliveries= uniq(resources.map(r=>r.delivery));

  return (
    <div style={{minHeight:"100vh",background:"#f1f5f9",color:"#0f172a",fontFamily:"'Noto Sans SC',system-ui,sans-serif"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Noto+Serif+SC:wght@600;700&family=Noto+Sans+SC:wght@400;600;700&display=swap'); *{margin:0;padding:0;box-sizing:border-box} ::-webkit-scrollbar{width:6px} ::-webkit-scrollbar-thumb{background:#d1d5db;border-radius:3px} input::placeholder,textarea::placeholder{color:#94a3b8} select{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%2394a3b8' fill='none' stroke-width='1.5'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;}`}</style>

      {/* Nav */}
      <nav style={{borderBottom:"1px solid #e2e8f0",padding:"0 24px",display:"flex",alignItems:"center",gap:16,height:60,background:"rgba(255,255,255,0.97)",backdropFilter:"blur(12px)",position:"sticky",top:0,zIndex:50,boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
        <div onClick={()=>setTabView("home")} style={{fontFamily:"'Bebas Neue',cursive",fontSize:26,letterSpacing:3,color:"#1d4ed8",cursor:"pointer",flexShrink:0}}>GPUMARKET</div>
        <div style={{display:"flex",gap:2}}>
          {[["home","首页"],["resources","资源列表"],["demands","需求列表"],["hardware","硬件买卖"],["links","相关链接"],["contact","联系我们"]].map(([v,l])=>(
            <button key={v} onClick={()=>setTabView(v)} style={{padding:"6px 14px",borderRadius:8,border:"none",background:tabView===v||tabView.startsWith(v+":")?"rgba(37,99,235,0.08)":"transparent",color:tabView===v||tabView.startsWith(v+":")?"#2563eb":"#64748b",cursor:"pointer",fontSize:13,fontWeight:600}}>
              {l}
            </button>
          ))}
        </div>
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:8}}>
          {authVendor ? <>
            <span style={{fontSize:13,color:"#374151",fontWeight:600}}>{authVendor.name}</span>
            <button onClick={()=>setCurrentVendor(authVendor)} style={{padding:"7px 16px",border:"1px solid #e2e8f0",borderRadius:8,background:"#ffffff",color:"#374151",fontSize:13,cursor:"pointer",fontWeight:600}}>个人中心</button>
            <button onClick={()=>{ localStorage.removeItem("auth_token"); setAuthVendor(null); setAuthAdmin(false); }} style={{padding:"7px 14px",border:"none",borderRadius:8,background:"transparent",color:"#94a3b8",fontSize:13,cursor:"pointer"}}>退出</button>
          </> : <>
            <button onClick={()=>setShowAuth("login")} style={{padding:"7px 20px",border:"1px solid #e2e8f0",borderRadius:8,background:"#ffffff",color:"#374151",fontSize:13,cursor:"pointer",fontWeight:600}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor="#2563eb";e.currentTarget.style.color="#2563eb";}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor="#e2e8f0";e.currentTarget.style.color="#374151";}}
            >登录</button>
            <button onClick={()=>setShowAuth("register")} style={{padding:"7px 20px",border:"none",borderRadius:8,background:"#2563eb",color:"#fff",fontSize:13,cursor:"pointer",fontWeight:600}}
              onMouseEnter={e=>e.currentTarget.style.background="#1d4ed8"}
              onMouseLeave={e=>e.currentTarget.style.background="#2563eb"}
            >供应商入驻</button>
          </>}
        </div>
      </nav>

      <main style={{maxWidth:1200,margin:"0 auto",padding:"40px 24px"}}>

        {/* Home */}
        {tabView==="home" && (
          <HomePage vendors={vendors} resources={resources} demands={demands} subscribers={[]} resSubCount={resSubCount} demSubCount={demSubCount}
            onGoResources={()=>setTabView("resources")} onGoDemands={()=>setTabView("demands")}
            onResourceClick={r=>{setTabView("resources");setDetailModal(r);}} onSubscribe={()=>setShowSubscribe(true)} />
        )}

        {/* Resources */}
        {tabView==="resources" && <>
          <div style={{maxWidth:540,margin:"32px auto 20px",position:"relative"}}>
            <span style={{position:"absolute",left:16,top:"50%",transform:"translateY(-50%)",color:"#94a3b8"}}>🔍</span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="搜索 GPU 型号、用途、供应商、地区..." style={{...inp,paddingLeft:46,marginBottom:0}} onFocus={e=>e.target.style.borderColor="rgba(37,99,235,0.4)"} onBlur={e=>e.target.style.borderColor="#e2e8f0"} />
          </div>

          {/* 发布需求 banner */}
          <div style={{background:"rgba(37,99,235,0.05)",border:"1px solid rgba(37,99,235,0.15)",borderRadius:12,padding:"13px 18px",marginBottom:16,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
            <div style={{fontSize:13,color:"#374151",lineHeight:1.5}}>
              <span style={{marginRight:6}}>📋</span>
              找不到合适的资源？发布需求，供应商主动来找您
              <span style={{fontSize:11,color:"#94a3b8",marginLeft:8}}>· 将同步至【需求列表】并推送至 {demSubscriberCount} 位订阅用户</span>
            </div>
            <button onClick={()=>setShowPostReq(true)} style={{...primaryBtn,padding:"8px 20px",fontSize:13,whiteSpace:"nowrap",flexShrink:0}}>发布需求</button>
          </div>

          {/* Filters */}
          <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center",marginBottom:24,padding:"14px 18px",background:"#ffffff",borderRadius:12,border:"1px solid #e2e8f0",boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
            {[["品牌","brand",brands],["型号","model",models],["显存","mem",mems],["区域","region",regions],["交付形式","delivery",deliveries]].map(([label,key,opts])=>(
              <div key={key} style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:12,color:"#64748b",whiteSpace:"nowrap"}}>{label}</span>
                <select value={filters[key]} onChange={setFilter(key)} style={{background:"#ffffff",border:`1px solid ${filters[key]?"rgba(37,99,235,0.4)":"#e2e8f0"}`,borderRadius:7,padding:"5px 28px 5px 10px",color:filters[key]?"#2563eb":"#64748b",fontSize:13,cursor:"pointer",outline:"none"}}>
                  {opts.map(o=><option key={o} value={o}>{o===""?"全部":o}</option>)}
                </select>
              </div>
            ))}
            {hasFilter&&<button onClick={()=>setFilters({brand:"",model:"",mem:"",region:"",delivery:""})} style={{padding:"5px 14px",background:"transparent",border:"1px solid #d1d5db",borderRadius:7,color:"#64748b",fontSize:12,cursor:"pointer",marginLeft:4}}>重置</button>}
            <span style={{marginLeft:"auto",fontSize:12,color:"#94a3b8"}}>{gpuGroups.length} 个型号 · {filtered.length} 条记录</span>
          </div>

          <div style={{display:"flex",flexDirection:"column"}}>
            {gpuGroups.map(({gpu,items})=>(
              <GpuModelGroup key={gpu} gpu={gpu} items={items} vendors={vendors} onDetailClick={setDetailModal} />
            ))}
          </div>
          {gpuGroups.length===0&&<div style={{textAlign:"center",padding:"80px 0",color:"#94a3b8"}}><div style={{fontSize:36,marginBottom:10}}>🔎</div>没有找到匹配的资源</div>}

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
            <button onClick={()=>setShowPostRes(true)} style={{...primaryBtn,padding:"10px 22px",fontSize:13}}>发布资源</button>
          </div>

          {/* 发布资源 banner */}
          <div style={{background:"rgba(37,99,235,0.05)",border:"1px solid rgba(37,99,235,0.15)",borderRadius:12,padding:"13px 18px",marginBottom:16,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
            <div style={{fontSize:13,color:"#374151",lineHeight:1.5}}>
              <span style={{marginRight:6}}>🖥️</span>
              有算力资源可供出租？发布资源，买家主动联系您
              <span style={{fontSize:11,color:"#94a3b8",marginLeft:8}}>· 将同步至【资源列表】并推送至 {resSubscriberCount} 位订阅用户</span>
            </div>
            <button onClick={()=>setShowPostRes(true)} style={{padding:"8px 18px",background:"transparent",border:"1px solid rgba(37,99,235,0.3)",borderRadius:8,color:"#2563eb",fontSize:13,cursor:"pointer",fontWeight:600,whiteSpace:"nowrap",flexShrink:0}}>发布资源</button>
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {demands.map(d=>(
              <div key={d.id} style={{background:"#ffffff",border:"1px solid #e2e8f0",borderRadius:12,padding:"16px 20px",display:"flex",alignItems:"center",gap:16,flexWrap:"wrap",boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
                <div style={{flex:1,minWidth:200}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6,flexWrap:"wrap"}}>
                    <span style={{fontFamily:"'Bebas Neue',cursive",fontSize:16,letterSpacing:1,color:"#0f172a"}}>{d.gpu}</span>
                    <span style={{fontSize:12,color:"#64748b"}}>{d.count}卡</span>
                    <span style={{fontSize:11,padding:"2px 8px",borderRadius:20,background:"rgba(37,99,235,0.07)",color:"#2563eb",border:"1px solid rgba(37,99,235,0.15)"}}>{d.region}</span>
                    <span style={{fontSize:11,padding:"2px 8px",borderRadius:20,background:"#f8fafc",color:"#64748b",border:"1px solid #e2e8f0"}}>{d.delivery}</span>
                  </div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:d.desc?8:0}}>{d.tags.map(t=><Tag key={t} t={t} />)}</div>
                  {d.desc&&<div style={{fontSize:12,color:"#64748b",lineHeight:1.6,borderLeft:"2px solid #bfdbfe",paddingLeft:10,marginTop:6}}>{d.desc}</div>}
                </div>
                <div style={{flexShrink:0,textAlign:"right"}}>
                  {d.budget>0&&<div style={{marginBottom:4}}>
                    <span style={{fontSize:18,fontWeight:700,color:"#2563eb",fontFamily:"'Bebas Neue',cursive"}}>≤¥{d.budget}</span>
                    <span style={{fontSize:11,color:"#94a3b8"}}>/卡/时</span>
                  </div>}
                  <div style={{fontSize:11,color:"#94a3b8",marginBottom:10}}>{d.createdAt}</div>
                  <button onClick={()=>setContactModal({name:d.contact,id:d.id})} style={{padding:"6px 18px",background:"#2563eb",border:"none",borderRadius:8,color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer"}}>联系买家</button>
                </div>
              </div>
            ))}
          </div>
          {demands.length===0&&<div style={{textAlign:"center",padding:"80px 0",color:"#94a3b8"}}><div style={{fontSize:36,marginBottom:10}}>📋</div>暂无需求</div>}

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

        {/* Hardware */}
        {tabView==="hardware" && <HardwarePage onNavigate={setTabView} />}

        {/* Server Listings */}
        {tabView==="hardware:servers" && <ServerListingsPage listings={serverListings} onPublish={()=>setShowServerForm(true)} />}

      </main>

      {detailModal&&<ResourceDetailModal resource={detailModal} vendor={vendors.find(v=>v.id===detailModal.vendorId)} onClose={()=>setDetailModal(null)} onContact={v=>{setDetailModal(null);setContactModal(v);}} />}
      {vendorModal&&<VendorModal vendor={vendorModal} resources={resources.filter(r=>r.vendorId===vendorModal.id)} onClose={()=>setVendorModal(null)} onContact={v=>{setVendorModal(null);setContactModal(v);}} />}
      {contactModal&&<ContactModal vendor={contactModal} onClose={()=>setContactModal(null)} />}
      {showRegister&&<RegisterModal onClose={()=>setShowRegister(false)} onSuccess={handleRegister} />}
      {showAuth&&<AuthModal defaultTab={showAuth} onClose={()=>setShowAuth(null)} onSuccess={(vendor,token,role)=>{ localStorage.setItem("auth_token",token); if(role==="admin"){ setAuthAdmin(true); } else { setAuthVendor(vendor); } setShowAuth(null); }} />}
      {showPostReq&&<PostRequirementModal onClose={()=>setShowPostReq(false)} onSuccess={d=>{
        setDemands(ds=>[d,...ds]);
        fetch(`${API}/api/demands`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(d)}).catch(()=>{});
      }} subscriberCount={demSubscriberCount} />}
      {showPostRes&&<PostResourceFromDemandModal onClose={()=>setShowPostRes(false)} onSuccess={(v,r)=>{
        handlePublishFromDemand(v,r);
        fetch(`${API}/api/vendors`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:v.name,location:v.location})}).catch(()=>{});
      }} subscriberCount={resSubscriberCount} />}
      {showSubscribe&&<SubscribeModal onClose={()=>setShowSubscribe(false)} onSuccess={handleSubscribe} />}
      {showServerForm&&<ServerFormModal onClose={()=>setShowServerForm(false)} onSuccess={s=>{
        setServerListings(sl=>[s,...sl]);
        setShowServerForm(false);
      }} />}

      {/* Footer */}
      <footer style={{borderTop:"1px solid #e2e8f0",padding:"24px",background:"#ffffff",marginTop:0}}>
        <div style={{maxWidth:1200,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
          <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:18,letterSpacing:2,color:"#1d4ed8"}}>GPUMARKET</div>
          <div style={{display:"flex",gap:24,alignItems:"center"}}>
            {[["相关链接","links"],["联系我们","contact"]].map(([label,view])=>(
              <span key={label} onClick={()=>setTabView(view)} style={{fontSize:13,color:"#64748b",cursor:"pointer"}}
                onMouseEnter={e=>e.currentTarget.style.color="#2563eb"}
                onMouseLeave={e=>e.currentTarget.style.color="#64748b"}
              >{label}</span>
            ))}
          </div>
          <div style={{fontSize:12,color:"#94a3b8"}}>© 2025 GPUMARKET · neocloud.market</div>
        </div>
      </footer>
    </div>
  );
}
