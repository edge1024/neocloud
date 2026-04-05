import { useState, useMemo } from "react";

// ─── Initial Data ───────────────────────────────────────────────────────────
const INIT_VENDORS = [
  { id: 1, name: "算力云 CloudPower", avatar: "CP", rating: 4.9, reviews: 312, location: "北京", joined: "2022-03" },
  { id: 2, name: "极速算力 TurboGPU", avatar: "TG", rating: 4.7, reviews: 189, location: "上海", joined: "2021-11" },
  { id: 3, name: "深算科技 DeepCompute", avatar: "DC", rating: 4.5, reviews: 76, location: "深圳", joined: "2023-06" },
  { id: 4, name: "星辰算力 StarAI", avatar: "SA", rating: 4.8, reviews: 254, location: "杭州", joined: "2022-08" },
];

const INIT_RESOURCES = [
  { id: 1, vendorId: 1, gpu: "NVIDIA H100 80G SXM5", count: 8, price: 28, tags: ["训练", "推理", "NVLink"], mem: "80GB HBM3", bandwidth: "900GB/s", available: true, region: "华北", desc: "8卡互联，NVSwitch全互联，适合大模型训练" },
  { id: 2, vendorId: 1, gpu: "NVIDIA A100 40G PCIe", count: 4, price: 12, tags: ["训练", "推理"], mem: "40GB HBM2e", bandwidth: "400GB/s", available: true, region: "华北", desc: "高性价比A100，适合中等规模训练任务" },
  { id: 3, vendorId: 2, gpu: "NVIDIA H800 80G SXM", count: 8, price: 22, tags: ["训练", "大模型"], mem: "80GB HBM3", bandwidth: "800GB/s", available: true, region: "华东", desc: "国内合规H800，8卡集群，稳定高效" },
  { id: 4, vendorId: 2, gpu: "NVIDIA RTX 4090 24G", count: 16, price: 4.5, tags: ["推理", "微调", "渲染"], mem: "24GB GDDR6X", bandwidth: "192GB/s", available: true, region: "华东", desc: "消费级旗舰，适合推理部署和模型微调" },
  { id: 5, vendorId: 3, gpu: "NVIDIA A800 80G SXM", count: 4, price: 18, tags: ["训练", "大模型"], mem: "80GB HBM2e", bandwidth: "800GB/s", available: false, region: "华南", desc: "国内定制A800，目前暂时售罄，可预约" },
  { id: 6, vendorId: 4, gpu: "NVIDIA L40S 48G", count: 8, price: 9, tags: ["推理", "多模态", "渲染"], mem: "48GB GDDR6", bandwidth: "864GB/s", available: true, region: "华东", desc: "Ada Lovelace架构，适合视频、多模态推理" },
];

const TAG_COLORS = {
  "训练": "#3b82f6", "推理": "#10b981", "大模型": "#8b5cf6",
  "NVLink": "#f59e0b", "渲染": "#ec4899", "微调": "#06b6d4",
  "入门": "#64748b", "多模态": "#f97316", "大内存": "#a855f7",
};
const ALL_TAGS = ["训练", "推理", "大模型", "NVLink", "渲染", "微调", "入门", "多模态", "大内存"];
const REGIONS = ["华北", "华东", "华南", "华西", "华中"];

// ─── Shared Styles ───────────────────────────────────────────────────────────
const inp = { width:"100%", boxSizing:"border-box", background:"rgba(30,41,59,0.8)", border:"1px solid rgba(99,102,241,0.3)", borderRadius:10, padding:"11px 14px", color:"#e2e8f0", fontSize:14, outline:"none", marginBottom:12 };
const primaryBtn = { padding:"11px 0", border:"none", borderRadius:10, fontWeight:600, fontSize:14, cursor:"pointer", background:"linear-gradient(135deg,#6366f1,#8b5cf6)", color:"#fff" };
const ghostBtn = { padding:"11px 0", border:"1px solid rgba(99,102,241,0.3)", borderRadius:10, fontWeight:600, fontSize:14, cursor:"pointer", background:"rgba(30,41,59,0.8)", color:"#94a3b8" };

// ─── Sub-components ──────────────────────────────────────────────────────────
function Tag({ t }) {
  return <span style={{ fontSize:11, padding:"3px 9px", borderRadius:20, background:`${TAG_COLORS[t]||"#64748b"}20`, color:TAG_COLORS[t]||"#94a3b8", border:`1px solid ${TAG_COLORS[t]||"#64748b"}40` }}>{t}</span>;
}

function Avatar({ text, size=40 }) {
  return <div style={{ width:size, height:size, borderRadius:Math.round(size*0.3), background:"linear-gradient(135deg,#6366f1,#8b5cf6)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*0.36, fontWeight:700, color:"#fff", fontFamily:"'Bebas Neue',cursive", letterSpacing:1, flexShrink:0 }}>{text}</div>;
}

function Modal({ onClose, children, width=480 }) {
  return (
    <div style={{position:"fixed",inset:0,zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(2,6,23,0.85)",backdropFilter:"blur(8px)"}} onMouseDown={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={{background:"#0f172a",border:"1px solid rgba(99,102,241,0.3)",borderRadius:20,padding:36,width:`min(${width}px,94vw)`,maxHeight:"90vh",overflowY:"auto",color:"#e2e8f0"}}>
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
        <div style={{fontSize:20,fontWeight:700,marginBottom:4,fontFamily:"'Noto Serif SC',serif"}}>联系商家</div>
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
        <div style={{fontSize:18,fontWeight:700,marginBottom:6}}>已发送！</div>
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
          <div style={{fontSize:18,fontWeight:700,fontFamily:"'Noto Serif SC',serif"}}>{vendor.name}</div>
          <div style={{fontSize:12,color:"#64748b",marginTop:3}}>{vendor.location} · 入驻 {vendor.joined} · ⭐ {vendor.rating}（{vendor.reviews} 评价）</div>
        </div>
        <button onClick={onClose} style={{background:"none",border:"none",color:"#64748b",fontSize:20,cursor:"pointer"}}>✕</button>
      </div>
      <div style={{fontSize:12,color:"#64748b",marginBottom:14}}>共 {resources.length} 个资源</div>
      {resources.length === 0 && <div style={{textAlign:"center",padding:"32px 0",color:"#475569",fontSize:13}}>该供应商暂未发布资源</div>}
      {resources.map(r => (
        <div key={r.id} style={{background:"rgba(30,41,59,0.5)",borderRadius:12,padding:14,marginBottom:10,border:"1px solid rgba(99,102,241,0.15)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
            <span style={{fontWeight:600,fontSize:14,color:r.available?"#e2e8f0":"#64748b"}}>{r.gpu}</span>
            <span style={{color:"#6366f1",fontWeight:700}}>¥{r.price}<span style={{fontSize:11,fontWeight:400,color:"#64748b"}}>/卡/时</span></span>
          </div>
          <div style={{fontSize:12,color:"#64748b",marginBottom:8}}>{r.mem} · {r.bandwidth||"—"} · {r.count}卡 · {r.region}</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
            {r.tags.map(t=><Tag key={t} t={t} />)}
            <span style={{marginLeft:"auto",fontSize:11,color:r.available?"#10b981":"#ef4444"}}>{r.available?"● 可用":"● 售罄"}</span>
          </div>
        </div>
      ))}
      <button onClick={()=>{onClose();onContact(vendor);}} style={{...primaryBtn,width:"100%",marginTop:8}}>📩 联系商家</button>
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
      id: Date.now(),
      name: form.name,
      avatar: form.name.slice(0,2),
      rating: 5.0, reviews: 0,
      location: form.location,
      joined: `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`,
    });
  };

  return (
    <Modal onClose={onClose}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24}}>
        <div>
          <div style={{fontFamily:"'Noto Serif SC',serif",fontSize:22,fontWeight:700}}>供应商入驻</div>
          <div style={{fontSize:13,color:"#64748b",marginTop:6}}>填写信息后立即进入后台，开始发布资源</div>
        </div>
        <button onClick={onClose} style={{background:"none",border:"none",color:"#64748b",fontSize:20,cursor:"pointer",flexShrink:0}}>✕</button>
      </div>

      <label style={{display:"block",fontSize:12,color:"#64748b",marginBottom:6}}>商家名称 *</label>
      <input value={form.name} onChange={set("name")} placeholder="例：极光算力 AuroraAI" style={inp} />

      <label style={{display:"block",fontSize:12,color:"#64748b",marginBottom:6}}>联系人姓名 *</label>
      <input value={form.contact} onChange={set("contact")} placeholder="您的姓名" style={inp} />

      <label style={{display:"block",fontSize:12,color:"#64748b",marginBottom:6}}>手机号码 *</label>
      <input value={form.phone} onChange={set("phone")} placeholder="用于接收用户询价消息" style={inp} />

      <label style={{display:"block",fontSize:12,color:"#64748b",marginBottom:6}}>所在城市</label>
      <select value={form.location} onChange={set("location")} style={{...inp, marginBottom:28}}>
        {["北京","上海","深圳","杭州","广州","成都","武汉"].map(c=><option key={c}>{c}</option>)}
      </select>

      <button onClick={handle} disabled={!valid} style={{...primaryBtn, width:"100%", opacity:valid?1:0.45, cursor:valid?"pointer":"default"}}>
        立即入驻，进入后台 →
      </button>
    </Modal>
  );
}

// ─── Publish Resource Modal ───────────────────────────────────────────────────
function PublishModal({ vendor, onClose, onPublish }) {
  const empty = { gpu:"", mem:"", bandwidth:"", count:"", price:"", region:"华东", desc:"", tags:[], available:true };
  const [form, setForm] = useState(empty);
  const set = k => e => setForm(f=>({...f,[k]:e.target.value}));
  const toggleTag = t => setForm(f=>({...f, tags: f.tags.includes(t) ? f.tags.filter(x=>x!==t) : [...f.tags, t]}));
  const valid = !!(form.gpu.trim().length > 0 && form.mem.trim().length > 0 && Number(form.count) > 0 && Number(form.price) > 0);

  const handle = () => {
    if (!valid) return;
    onPublish({ id:Date.now(), vendorId:vendor.id, gpu:form.gpu, mem:form.mem, bandwidth:form.bandwidth, count:Number(form.count), price:Number(form.price), tags:form.tags, region:form.region, desc:form.desc, available:form.available });
    onClose();
  };

  return (
    <Modal onClose={onClose} width={560}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24}}>
        <div>
          <div style={{fontFamily:"'Noto Serif SC',serif",fontSize:20,fontWeight:700}}>发布新资源</div>
          <div style={{fontSize:12,color:"#64748b",marginTop:4}}>发布后即在平台对用户展示</div>
        </div>
        <button onClick={onClose} style={{background:"none",border:"none",color:"#64748b",fontSize:20,cursor:"pointer"}}>✕</button>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 14px"}}>
        {[["GPU 型号 *","gpu","NVIDIA H100 80G SXM5","text"],["显存 *","mem","80GB HBM3","text"],["显存带宽","bandwidth","900GB/s","text"],["可租卡数 *","count","8","number"],["单价（元/卡/时） *","price","28","number"]].map(([label,key,ph,type])=>(
          <div key={key} style={key==="gpu"||key==="mem"?{gridColumn:"span 2"}:{}}>
            <label style={{display:"block",fontSize:12,color:"#64748b",marginBottom:5}}>{label}</label>
            <input value={form[key]} onChange={set(key)} placeholder={ph} type={type} min="0" step={key==="price"?"0.1":"1"} style={{...inp}} />
          </div>
        ))}
        <div>
          <label style={{display:"block",fontSize:12,color:"#64748b",marginBottom:5}}>所在地区</label>
          <select value={form.region} onChange={set("region")} style={inp}>
            {REGIONS.map(r=><option key={r}>{r}</option>)}
          </select>
        </div>
      </div>

      <label style={{display:"block",fontSize:12,color:"#64748b",marginBottom:8,marginTop:4}}>适用场景标签</label>
      <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:16}}>
        {ALL_TAGS.map(t=>(
          <button type="button" key={t} onClick={()=>toggleTag(t)} style={{padding:"5px 12px",borderRadius:20,border:`1px solid ${form.tags.includes(t)?(TAG_COLORS[t]||"#6366f1")+"99":"rgba(99,102,241,0.2)"}`,background:form.tags.includes(t)?`${TAG_COLORS[t]||"#6366f1"}20`:"transparent",color:form.tags.includes(t)?(TAG_COLORS[t]||"#818cf8"):"#64748b",cursor:"pointer",fontSize:12,transition:"all 0.15s"}}>
            {t}
          </button>
        ))}
      </div>

      <label style={{display:"block",fontSize:12,color:"#64748b",marginBottom:6}}>资源描述</label>
      <textarea value={form.desc} onChange={set("desc")} placeholder="介绍资源特点、网络配置、适合场景..." rows={3} style={{...inp,resize:"vertical",marginBottom:16}} />

      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:24,padding:"12px 14px",background:"rgba(30,41,59,0.5)",borderRadius:10,cursor:"pointer"}} onClick={()=>setForm(f=>({...f,available:!f.available}))}>
        <div style={{width:36,height:20,borderRadius:10,background:form.available?"#6366f1":"#334155",position:"relative",transition:"background 0.2s",flexShrink:0}}>
          <div style={{position:"absolute",top:2,left:form.available?18:2,width:16,height:16,borderRadius:"50%",background:"#fff",transition:"left 0.2s"}} />
        </div>
        <span style={{fontSize:13,color:form.available?"#e2e8f0":"#64748b",userSelect:"none"}}>
          {form.available ? "立即上架（用户可见）" : "暂不上架（保存草稿）"}
        </span>
      </div>

      <div style={{display:"flex",gap:10}}>
        <button type="button" onClick={onClose} style={{...ghostBtn,flex:1}}>取消</button>
        <button type="button" onClick={handle} style={{...primaryBtn,flex:2,opacity:valid?1:0.45,cursor:valid?"pointer":"default"}}>发布资源</button>
      </div>
    </Modal>
  );
}

// ─── Vendor Dashboard ─────────────────────────────────────────────────────────
function Dashboard({ vendor, resources, onPublish, onExit }) {
  const [showPublish, setShowPublish] = useState(false);
  const myRes = resources.filter(r => r.vendorId === vendor.id);
  const availCount = myRes.filter(r=>r.available).length;

  return (
    <div style={{minHeight:"100vh",background:"#020617",color:"#e2e8f0",fontFamily:"'Noto Sans SC',system-ui,sans-serif"}}>
      {/* Top bar */}
      <div style={{borderBottom:"1px solid rgba(99,102,241,0.2)",padding:"0 24px",display:"flex",alignItems:"center",gap:16,height:60,background:"rgba(2,6,23,0.95)",backdropFilter:"blur(12px)"}}>
        <span style={{fontFamily:"'Bebas Neue',cursive",fontSize:22,letterSpacing:3,background:"linear-gradient(135deg,#6366f1,#a78bfa)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>GPU·MARKET</span>
        <span style={{fontSize:12,color:"#475569",borderLeft:"1px solid rgba(99,102,241,0.2)",paddingLeft:16}}>供应商后台</span>
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:12}}>
          <Avatar text={vendor.name.slice(0,2)} size={30} />
          <span style={{fontSize:13,color:"#94a3b8"}}>{vendor.name}</span>
          <button onClick={onExit} style={{fontSize:12,color:"#475569",background:"none",border:"1px solid rgba(99,102,241,0.2)",borderRadius:6,padding:"4px 10px",cursor:"pointer"}}>退出后台</button>
        </div>
      </div>

      <div style={{maxWidth:900,margin:"0 auto",padding:"40px 24px"}}>
        {/* Welcome banner */}
        <div style={{background:"linear-gradient(135deg,rgba(99,102,241,0.12),rgba(139,92,246,0.08))",border:"1px solid rgba(99,102,241,0.2)",borderRadius:16,padding:"24px 28px",marginBottom:32,display:"flex",alignItems:"center",gap:20,flexWrap:"wrap"}}>
          <Avatar text={vendor.name.slice(0,2)} size={52} />
          <div style={{flex:1,minWidth:120}}>
            <div style={{fontSize:20,fontWeight:700,fontFamily:"'Noto Serif SC',serif",marginBottom:4}}>欢迎，{vendor.name} 👋</div>
            <div style={{fontSize:13,color:"#64748b"}}>{vendor.location} · 入驻于 {vendor.joined}</div>
          </div>
          <div style={{display:"flex",gap:12}}>
            {[["资源总数",myRes.length,"#6366f1"],["上架中",availCount,"#10b981"],["草稿",myRes.length-availCount,"#f59e0b"]].map(([l,v,c])=>(
              <div key={l} style={{background:"rgba(2,6,23,0.4)",borderRadius:10,padding:"12px 20px",textAlign:"center"}}>
                <div style={{fontSize:24,fontWeight:700,color:c,fontFamily:"'Bebas Neue',cursive"}}>{v}</div>
                <div style={{fontSize:11,color:"#475569",marginTop:2}}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Header row */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div>
            <div style={{fontSize:18,fontWeight:700}}>我的资源</div>
            <div style={{fontSize:12,color:"#475569",marginTop:2}}>管理已发布的 GPU 资源</div>
          </div>
          <button onClick={()=>setShowPublish(true)} style={{...primaryBtn,padding:"10px 22px",display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:18,lineHeight:1}}>＋</span>发布新资源
          </button>
        </div>

        {/* Resource list */}
        {myRes.length === 0 ? (
          <div style={{textAlign:"center",padding:"80px 0",border:"1px dashed rgba(99,102,241,0.2)",borderRadius:16,color:"#475569"}}>
            <div style={{fontSize:40,marginBottom:12}}>🖥️</div>
            <div style={{fontSize:16,marginBottom:6}}>还没有发布任何资源</div>
            <div style={{fontSize:13,marginBottom:24,color:"#334155"}}>点击「发布新资源」开始</div>
            <button onClick={()=>setShowPublish(true)} style={{...primaryBtn,padding:"10px 28px",display:"inline-block"}}>立即发布</button>
          </div>
        ) : (
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {myRes.map(r => (
              <div key={r.id} style={{background:"rgba(15,23,42,0.8)",border:"1px solid rgba(99,102,241,0.15)",borderRadius:14,padding:20,display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
                <div style={{flex:1,minWidth:200}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,flexWrap:"wrap"}}>
                    <span style={{fontWeight:700,fontSize:14,fontFamily:"'Bebas Neue',cursive",letterSpacing:1}}>{r.gpu}</span>
                    <span style={{fontSize:11,padding:"2px 8px",borderRadius:20,background:r.available?"rgba(16,185,129,0.12)":"rgba(100,116,139,0.15)",color:r.available?"#10b981":"#64748b",border:`1px solid ${r.available?"rgba(16,185,129,0.3)":"rgba(100,116,139,0.3)"}`}}>
                      {r.available ? "上架中" : "草稿"}
                    </span>
                  </div>
                  <div style={{fontSize:12,color:"#64748b",marginBottom:8}}>{r.mem}{r.bandwidth?` · ${r.bandwidth}`:""} · {r.count}卡 · {r.region}</div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    {r.tags.map(t=><Tag key={t} t={t} />)}
                  </div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontSize:26,fontWeight:700,color:"#6366f1",fontFamily:"'Bebas Neue',cursive"}}>¥{r.price}</div>
                  <div style={{fontSize:11,color:"#475569"}}>元/卡/时</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showPublish && <PublishModal vendor={vendor} onClose={()=>setShowPublish(false)} onPublish={onPublish} />}
    </div>
  );
}

// ─── Resource Detail Modal ────────────────────────────────────────────────────
function ResourceDetailModal({ resource, vendor, onClose, onContact }) {
  return (
    <Modal onClose={onClose} width={560}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24}}>
        <div>
          <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:20,letterSpacing:1.5,color:"#e2e8f0"}}>{resource.gpu}</div>
          <div style={{fontSize:12,color:"#475569",marginTop:4}}>{resource.mem} · {resource.bandwidth||"—"} · {resource.region}</div>
        </div>
        <button onClick={onClose} style={{background:"none",border:"none",color:"#64748b",fontSize:20,cursor:"pointer"}}>✕</button>
      </div>
      <div style={{background:"rgba(99,102,241,0.1)",border:"1px solid rgba(99,102,241,0.2)",borderRadius:12,padding:"14px 20px",marginBottom:18,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <span style={{fontSize:13,color:"#94a3b8"}}>单价</span>
        <div><span style={{fontSize:26,fontWeight:700,color:"#6366f1",fontFamily:"'Bebas Neue',cursive"}}>¥{resource.price}</span><span style={{fontSize:12,color:"#475569"}}>/卡/时</span></div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
        {[["可租卡数",`${resource.count} 卡`],["显存",resource.mem],["显存带宽",resource.bandwidth||"—"],["地区",resource.region]].map(([k,v])=>(
          <div key={k} style={{background:"rgba(30,41,59,0.6)",borderRadius:8,padding:"10px 14px"}}>
            <div style={{fontSize:10,color:"#475569",marginBottom:3}}>{k}</div>
            <div style={{fontSize:13,fontWeight:600,color:"#94a3b8"}}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center",marginBottom:14}}>
        {resource.tags.map(t=><Tag key={t} t={t} />)}
        <span style={{marginLeft:"auto",fontSize:11,color:resource.available?"#10b981":"#ef4444",fontWeight:600}}>{resource.available?"● 可用":"● 售罄"}</span>
      </div>
      {resource.desc && <div style={{fontSize:13,color:"#475569",lineHeight:1.7,borderLeft:"2px solid rgba(99,102,241,0.3)",paddingLeft:12,marginBottom:18}}>{resource.desc}</div>}
      <div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",background:"rgba(30,41,59,0.5)",borderRadius:10,marginBottom:20}}>
        <Avatar text={vendor.name.slice(0,2)} size={34} />
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:600,color:"#e2e8f0"}}>{vendor.name}</div>
          <div style={{fontSize:11,color:"#64748b"}}>{vendor.location} · ⭐ {vendor.rating}（{vendor.reviews} 评价）</div>
        </div>
      </div>
      <div style={{display:"flex",gap:10}}>
        <button onClick={onClose} style={{...ghostBtn,flex:1}}>关闭</button>
        <button onClick={()=>{onClose();onContact(vendor);}} style={{...primaryBtn,flex:2}}>{resource.available?"询价":"预约"}</button>
      </div>
    </Modal>
  );
}

// ─── GPU Model Group ──────────────────────────────────────────────────────────
function GpuModelGroup({ gpu, items, vendors, onDetailClick }) {
  const [expanded, setExpanded] = useState(false);
  const prices = items.map(r=>r.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const allTags = [...new Set(items.flatMap(r=>r.tags))].slice(0, 3);
  const availableCount = items.filter(r=>r.available).length;

  return (
    <div style={{border:"1px solid rgba(99,102,241,0.15)",borderRadius:12,overflow:"hidden",marginBottom:8}}>
      <div
        onClick={()=>setExpanded(e=>!e)}
        style={{display:"flex",alignItems:"center",gap:14,padding:"14px 18px",background:expanded?"rgba(30,41,59,0.9)":"rgba(15,23,42,0.8)",cursor:"pointer",userSelect:"none"}}
        onMouseEnter={e=>e.currentTarget.style.background="rgba(30,41,59,0.9)"}
        onMouseLeave={e=>e.currentTarget.style.background=expanded?"rgba(30,41,59,0.9)":"rgba(15,23,42,0.8)"}
      >
        <span style={{fontSize:11,color:"#6366f1",display:"inline-block",transition:"transform 0.2s",transform:expanded?"rotate(90deg)":"rotate(0deg)",flexShrink:0}}>▶</span>
        <span style={{fontFamily:"'Bebas Neue',cursive",fontSize:17,letterSpacing:1.2,color:"#e2e8f0",flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{gpu}</span>
        <div style={{display:"flex",alignItems:"center",gap:16,flexShrink:0}}>
          <span style={{fontSize:12,color:"#475569"}}>{items.length}个供应商</span>
          <span style={{fontSize:14,fontWeight:700,color:"#6366f1",fontFamily:"'Bebas Neue',cursive"}}>
            ¥{minPrice===maxPrice?minPrice:`${minPrice}~${maxPrice}`}<span style={{fontSize:10,fontWeight:400,color:"#475569",fontFamily:"'Noto Sans SC',sans-serif"}}>/卡/时</span>
          </span>
          <div style={{display:"flex",gap:4}}>{allTags.map(t=><Tag key={t} t={t} />)}</div>
          <span style={{fontSize:11,color:availableCount>0?"#10b981":"#ef4444",fontWeight:600,minWidth:46}}>{availableCount>0?`● ${availableCount}可用`:"● 售罄"}</span>
        </div>
      </div>
      {expanded && (
        <div style={{borderTop:"1px solid rgba(99,102,241,0.1)"}}>
          {items.map(r=>{
            const vendor = vendors.find(v=>v.id===r.vendorId);
            return (
              <div
                key={r.id}
                onClick={()=>onDetailClick(r)}
                style={{display:"flex",alignItems:"center",gap:12,padding:"11px 18px 11px 44px",borderBottom:"1px solid rgba(99,102,241,0.07)",cursor:"pointer"}}
                onMouseEnter={e=>e.currentTarget.style.background="rgba(99,102,241,0.07)"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}
              >
                <Avatar text={vendor.name.slice(0,2)} size={26} />
                <span style={{flex:1,fontSize:13,fontWeight:600,color:"#94a3b8"}}>{vendor.name}</span>
                <span style={{fontSize:11,color:"#475569"}}>⭐ {vendor.rating}</span>
                <span style={{fontSize:12,color:"#64748b",minWidth:36}}>{r.count}卡</span>
                <span style={{fontSize:12,color:"#64748b",minWidth:28}}>{r.region}</span>
                <span style={{fontSize:14,fontWeight:700,color:"#6366f1",fontFamily:"'Bebas Neue',cursive",minWidth:80,textAlign:"right"}}>¥{r.price}<span style={{fontSize:10,fontWeight:400,color:"#475569",fontFamily:"'Noto Sans SC',sans-serif"}}>/卡/时</span></span>
                <span style={{fontSize:11,color:r.available?"#10b981":"#ef4444",minWidth:40}}>{r.available?"● 可用":"● 售罄"}</span>
                <span style={{fontSize:13,color:"#475569"}}>›</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [vendors, setVendors] = useState(INIT_VENDORS);
  const [resources, setResources] = useState(INIT_RESOURCES);
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState("全部");
  const [tabView, setTabView] = useState("resources");
  const [vendorModal, setVendorModal] = useState(null);
  const [contactModal, setContactModal] = useState(null);
  const [showRegister, setShowRegister] = useState(false);
  const [currentVendor, setCurrentVendor] = useState(null);
  const [detailModal, setDetailModal] = useState(null);

  const filtered = useMemo(()=>resources.filter(r=>{
    const v = vendors.find(x=>x.id===r.vendorId);
    const q = search.toLowerCase();
    return (!q || r.gpu.toLowerCase().includes(q) || r.tags.some(t=>t.includes(q)) || v?.name.toLowerCase().includes(q) || r.region.includes(q))
      && (activeTag==="全部" || r.tags.includes(activeTag));
  }),[resources,vendors,search,activeTag]);

  const gpuGroups = useMemo(()=>{
    const map = {};
    filtered.forEach(r=>{ if(!map[r.gpu]) map[r.gpu]=[]; map[r.gpu].push(r); });
    return Object.entries(map).map(([gpu,items])=>({gpu,items}));
  },[filtered]);

  const handleRegister = (vendor) => {
    setVendors(vs=>[...vs, vendor]);
    setShowRegister(false);
    setCurrentVendor(vendor);
  };

  const handlePublish = (resource) => {
    setResources(rs=>[...rs, resource]);
  };

  if (currentVendor) {
    return <Dashboard vendor={currentVendor} resources={resources} onPublish={handlePublish} onExit={()=>setCurrentVendor(null)} />;
  }

  const filterTags = ["全部","训练","推理","大模型","微调","渲染","多模态","大内存"];

  return (
    <div style={{minHeight:"100vh",background:"#020617",color:"#e2e8f0",fontFamily:"'Noto Sans SC',system-ui,sans-serif"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Noto+Serif+SC:wght@600;700&family=Noto+Sans+SC:wght@400;600;700&display=swap'); *{margin:0;padding:0;box-sizing:border-box} ::-webkit-scrollbar{width:6px} ::-webkit-scrollbar-thumb{background:rgba(99,102,241,0.4);border-radius:3px} input::placeholder,textarea::placeholder{color:#334155} select{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%2364748b' fill='none' stroke-width='1.5'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;}`}</style>

      {/* Nav */}
      <nav style={{borderBottom:"1px solid rgba(99,102,241,0.2)",padding:"0 24px",display:"flex",alignItems:"center",gap:20,height:60,background:"rgba(2,6,23,0.95)",backdropFilter:"blur(12px)",position:"sticky",top:0,zIndex:50}}>
        <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:26,letterSpacing:3,background:"linear-gradient(135deg,#6366f1,#a78bfa)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>GPU·MARKET</div>
        <div style={{display:"flex",gap:4}}>
          {[["resources","资源列表"],["vendors","供应商"]].map(([v,l])=>(
            <button key={v} onClick={()=>setTabView(v)} style={{padding:"6px 14px",borderRadius:8,border:"none",background:tabView===v?"rgba(99,102,241,0.2)":"transparent",color:tabView===v?"#818cf8":"#64748b",cursor:"pointer",fontSize:13,fontWeight:600}}>
              {l}
            </button>
          ))}
        </div>
        <div style={{marginLeft:"auto"}}>
          <button onClick={()=>setShowRegister(true)} style={{...primaryBtn,padding:"8px 20px",fontSize:13}}>供应商入驻</button>
        </div>
      </nav>

      <main style={{maxWidth:1200,margin:"0 auto",padding:"40px 24px"}}>
        {tabView === "resources" && <>
          <div style={{textAlign:"center",padding:"36px 0 20px",marginBottom:36}}>
            <div style={{fontSize:11,letterSpacing:4,color:"#6366f1",marginBottom:10,fontWeight:600}}>GPU RENTAL MARKETPLACE</div>
            <h1 style={{fontFamily:"'Noto Serif SC',serif",fontSize:"clamp(26px,4.5vw,48px)",fontWeight:700,lineHeight:1.25,marginBottom:14}}>
              一站式 <span style={{background:"linear-gradient(135deg,#6366f1,#a78bfa)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>GPU 算力</span> 租赁平台
            </h1>
            <p style={{color:"#64748b",fontSize:14,maxWidth:440,margin:"0 auto 28px"}}>聚合优质供应商，透明比价，快速部署你的 AI 工作负载</p>
            <div style={{maxWidth:540,margin:"0 auto",position:"relative"}}>
              <span style={{position:"absolute",left:16,top:"50%",transform:"translateY(-50%)",color:"#475569"}}>🔍</span>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="搜索 GPU 型号、用途、供应商、地区..." style={{...inp,paddingLeft:46,marginBottom:0}} onFocus={e=>e.target.style.borderColor="rgba(99,102,241,0.7)"} onBlur={e=>e.target.style.borderColor="rgba(99,102,241,0.3)"} />
            </div>
          </div>

          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:24}}>
            {filterTags.map(t=>(
              <button key={t} onClick={()=>setActiveTag(t)} style={{padding:"6px 16px",borderRadius:20,border:`1px solid ${activeTag===t?"rgba(99,102,241,0.6)":"rgba(99,102,241,0.2)"}`,background:activeTag===t?"rgba(99,102,241,0.2)":"transparent",color:activeTag===t?"#818cf8":"#64748b",cursor:"pointer",fontSize:13,fontWeight:activeTag===t?600:400}}>
                {t}
              </button>
            ))}
            <span style={{marginLeft:"auto",fontSize:12,color:"#475569",alignSelf:"center"}}>{gpuGroups.length} 个型号 · {filtered.length} 条记录</span>
          </div>

          <div style={{display:"flex",flexDirection:"column"}}>
            {gpuGroups.map(({gpu,items})=>(
              <GpuModelGroup key={gpu} gpu={gpu} items={items} vendors={vendors} onDetailClick={setDetailModal} />
            ))}
          </div>
          {gpuGroups.length===0 && <div style={{textAlign:"center",padding:"80px 0",color:"#475569"}}><div style={{fontSize:36,marginBottom:10}}>🔎</div>没有找到匹配的资源</div>}
        </>}

        {tabView === "vendors" && <>
          <div style={{marginBottom:28}}>
            <h2 style={{fontFamily:"'Noto Serif SC',serif",fontSize:26,fontWeight:700,marginBottom:6}}>全部供应商</h2>
            <p style={{color:"#64748b",fontSize:13}}>点击供应商查看所有资源</p>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:18}}>
            {vendors.map(v=>{
              const vRes = resources.filter(r=>r.vendorId===v.id);
              return (
                <div key={v.id} onClick={()=>setVendorModal(v)} style={{background:"rgba(15,23,42,0.8)",border:"1px solid rgba(99,102,241,0.15)",borderRadius:14,padding:22,cursor:"pointer",transition:"all 0.2s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(99,102,241,0.5)";e.currentTarget.style.transform="translateY(-2px)";}} onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(99,102,241,0.15)";e.currentTarget.style.transform="none";}}>
                  <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
                    <Avatar text={v.name.slice(0,2)} size={46} />
                    <div>
                      <div style={{fontWeight:700,fontSize:14}}>{v.name}</div>
                      <div style={{fontSize:12,color:"#64748b"}}>{v.location} · ⭐ {v.rating}（{v.reviews}评价）</div>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:10}}>
                    {[["资源数",vRes.length,"#6366f1"],["可用",vRes.filter(r=>r.available).length,"#10b981"],["最低价",vRes.length?`¥${Math.min(...vRes.map(r=>r.price))}`:"—","#f59e0b"]].map(([l,val,c])=>(
                      <div key={l} style={{background:"rgba(30,41,59,0.6)",borderRadius:8,padding:"10px 0",flex:1,textAlign:"center"}}>
                        <div style={{fontSize:17,fontWeight:700,color:c,fontFamily:"'Bebas Neue',cursive"}}>{val}</div>
                        <div style={{fontSize:11,color:"#475569"}}>{l}</div>
                      </div>
                    ))}
                  </div>
                  <button onClick={e=>{e.stopPropagation();setContactModal(v);}} style={{width:"100%",marginTop:12,padding:"8px 0",background:"transparent",border:"1px solid rgba(99,102,241,0.3)",borderRadius:8,color:"#818cf8",fontSize:12,fontWeight:600,cursor:"pointer"}}>联系商家</button>
                </div>
              );
            })}
          </div>
        </>}
      </main>

      {detailModal && <ResourceDetailModal resource={detailModal} vendor={vendors.find(v=>v.id===detailModal.vendorId)} onClose={()=>setDetailModal(null)} onContact={v=>{setDetailModal(null);setContactModal(v);}} />}
      {vendorModal && <VendorModal vendor={vendorModal} resources={resources.filter(r=>r.vendorId===vendorModal.id)} onClose={()=>setVendorModal(null)} onContact={v=>{setVendorModal(null);setContactModal(v);}} />}
      {contactModal && <ContactModal vendor={contactModal} onClose={()=>setContactModal(null)} />}
      {showRegister && <RegisterModal onClose={()=>setShowRegister(false)} onSuccess={handleRegister} />}
    </div>
  );
}
