import { useState, useEffect, useRef, useCallback } from "react";

// ── SERVICE WORKER REGISTRATION (Fix #2 - Offline) ────────────────
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

const MODEL = "claude-sonnet-4-20250514";
const STORAGE_KEY = "akili_v5";

const getKey = () => { try { return localStorage.getItem("akili_api_key")||""; } catch { return ""; } };
const saveKey = (k) => { try { localStorage.setItem("akili_api_key", k); } catch {} };
const callClaude = async (body) => {
  const key = getKey();
  if (!key) throw new Error("NO_KEY");
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method:"POST",
      headers:{"Content-Type":"application/json","x-api-key":key,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.error) throw new Error("API_ERR: " + data.error.message);
    return data;
  } catch(err) {
    if (err.message.startsWith("NO_KEY")||err.message.startsWith("API_")) throw err;
    throw new Error("NETWORK");
  }
};

// ── FIX #6: Currency formatter with commas ─────────────────────────
const fmtInputUGX = (raw) => {
  const digits = String(raw).replace(/\D/g,"");
  return digits ? Number(digits).toLocaleString("en-UG") : "";
};
const parseUGX = (formatted) => parseInt(String(formatted).replace(/,/g,""))||0;

// ── KEYWORD-BASED CATEGORY SUGGESTION ──────────────────────────────
const CAT_KEYWORDS = {
  Food:["food","eat","restaurant","lunch","dinner","breakfast","groceries","nakumatt","game","supermarket","kfc","pizza","rolex","posho","beans","market","maama","chef"],
  Transport:["boda","taxi","uber","bus","fuel","petrol","matatu","stage","ride","transport","car","vehicle","total","oilcom"],
  Rent:["rent","landlord","house","apartment","room","hostel"],
  Health:["hospital","clinic","pharmacy","doctor","medicine","drugs","lab","dental","health","treatment"],
  Education:["school","fees","tuition","university","makerere","kyambogo","stationery","books","course","training"],
  Savings:["sacco","savings","deposit","save","investment","nssf"],
  Business:["client","payment","invoice","project","salary","wage","business","work","freelance","logo","design","contract"],
  Entertainment:["movie","cinema","bar","club","concert","game","netflix","spotify","fun","leisure","airtime","data","bundles"],
  Utilities:["umeme","yaka","water","nwsc","internet","wifi","electricity","bill","airtel","mtn","telecom"],
};
const suggestCategory = (desc) => {
  const lower = desc.toLowerCase();
  for (const [cat, words] of Object.entries(CAT_KEYWORDS)) {
    if (words.some(w => lower.includes(w))) return cat;
  }
  return null;
};

const CAT_META = {
  Food:{icon:"🍽️",color:"#FF6B6B"}, Transport:{icon:"🚌",color:"#4ECDC4"}, Rent:{icon:"🏠",color:"#45B7D1"},
  Health:{icon:"💊",color:"#96CEB4"}, Education:{icon:"📚",color:"#FFD166"}, Savings:{icon:"🏦",color:"#06D6A0"},
  Business:{icon:"💼",color:"#118AB2"}, Entertainment:{icon:"🎵",color:"#EF476F"}, Utilities:{icon:"💡",color:"#FFB347"}, Other:{icon:"📦",color:"#B2BEC3"},
};
const CATS = Object.keys(CAT_META);
const GOAL_ICONS = ["🎯","🏠","🚗","💻","✈️","🏦","💊","📚","👶","💍","🛡️","🌍","🎓","🎸"];
const GOAL_COLORS = ["#06D6A0","#118AB2","#EF476F","#FFD166","#7B8CDE","#FF6B6B","#4ECDC4","#96CEB4","#FFB347","#45B7D1"];

const fmtUGX = (n) => new Intl.NumberFormat("en-UG",{style:"currency",currency:"UGX",maximumFractionDigits:0}).format(n||0);
const fmtC = (n) => (n||0)>=1e6?`${((n||0)/1e6).toFixed(1)}M`:(n||0)>=1000?`${((n||0)/1000).toFixed(0)}K`:String(n||0);
const uid = () => Math.random().toString(36).slice(2,10);
const toDay = () => new Date().toISOString().slice(0,10);
const monthOf = (d) => (d||"").slice(0,7);
const nowMonth = () => { const n=new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}`; };
const monthLbl = (ym) => { if(!ym) return ""; const [y,m]=ym.split("-"); return new Date(+y,+m-1,1).toLocaleString("en",{month:"short",year:"numeric"}); };
const haptic = (ms=10) => { try { navigator.vibrate?.(ms); } catch {} };

// ── THEMES ────────────────────────────────────────────────────────
const THEMES = {
  dark: {
    bg:"#080C16", bg2:"#0F1626", bg3:"rgba(255,255,255,0.04)", bg4:"rgba(255,255,255,0.025)",
    border:"rgba(255,255,255,0.06)", border2:"rgba(255,255,255,0.09)", border3:"rgba(255,255,255,0.12)",
    text:"#E8EAF0", textSub:"rgba(232,234,240,0.4)", textMid:"rgba(232,234,240,0.7)",
    hdrBg:"rgba(8,12,22,0.92)", navBg:"rgba(8,12,22,0.97)", sheetBg:"#0F1626",
    inputBg:"rgba(255,255,255,0.06)", iconColor:"rgba(255,255,255,0.6)",
    powerBarBg:"rgba(255,255,255,0.02)", powerBtnColor:"rgba(255,255,255,0.55)",
    navInactive:"rgba(255,255,255,0.3)", overlayBg:"rgba(0,0,0,0.75)",
    heroBg:"linear-gradient(135deg,#0d1e3a,#132640)",
    meshBg:"radial-gradient(ellipse at 10% 10%,#0d2040,transparent 55%),radial-gradient(ellipse at 90% 90%,#0a1a30,transparent 55%)",
    cancelColor:"rgba(255,255,255,0.45)", cancelBorder:"rgba(255,255,255,0.1)",
    filterInactive:"rgba(255,255,255,0.04)", progressTrack:"rgba(255,255,255,0.07)",
    txIcoBg:"rgba(255,255,255,0.06)", budgetTrack:"rgba(255,255,255,0.07)",
    settingsBg:"#0F1626", sectionTabInactive:"rgba(255,255,255,0.04)",
  },
  light: {
    bg:"#F2F5FF", bg2:"#FFFFFF", bg3:"rgba(255,255,255,0.9)", bg4:"rgba(255,255,255,0.7)",
    border:"rgba(15,22,38,0.08)", border2:"rgba(15,22,38,0.1)", border3:"rgba(15,22,38,0.12)",
    text:"#0D1117", textSub:"rgba(13,17,23,0.45)", textMid:"rgba(13,17,23,0.65)",
    hdrBg:"rgba(242,245,255,0.95)", navBg:"rgba(255,255,255,0.97)", sheetBg:"#FFFFFF",
    inputBg:"rgba(0,0,0,0.04)", iconColor:"rgba(13,17,23,0.5)",
    powerBarBg:"rgba(0,0,0,0.02)", powerBtnColor:"rgba(13,17,23,0.5)",
    navInactive:"rgba(13,17,23,0.3)", overlayBg:"rgba(0,0,0,0.45)",
    heroBg:"linear-gradient(135deg,#e4f0ff,#d8f5ee)",
    meshBg:"radial-gradient(ellipse at 10% 10%,rgba(6,214,160,0.07),transparent 55%),radial-gradient(ellipse at 90% 90%,rgba(12,184,212,0.05),transparent 55%)",
    cancelColor:"rgba(13,17,23,0.45)", cancelBorder:"rgba(0,0,0,0.1)",
    filterInactive:"rgba(0,0,0,0.03)", progressTrack:"rgba(0,0,0,0.06)",
    txIcoBg:"rgba(0,0,0,0.04)", budgetTrack:"rgba(0,0,0,0.06)",
    settingsBg:"#FFFFFF", sectionTabInactive:"rgba(0,0,0,0.03)",
  }
};

// ── FIX #5: No sample data on first launch ─────────────────────────
const DEFAULT_STATE = {
  onboarded: false,
  profile: { name:"", income:0 },
  transactions: [],
  goals: [],
  budgets: { Food:0,Transport:0,Rent:0,Health:0,Education:0,Savings:0,Business:0,Entertainment:0,Utilities:0,Other:0 },
  messages: [],
  alerts: [],
  partner: null,
  theme: "dark",
};

// ── PARTNER SYNC via shared localStorage key (same device) + share code ──
// For cross-device: partner shares a 6-char code; both use same code as a
// shared localStorage namespace. On deployment with a backend, replace with Firebase.
const PARTNER_KEY = (code) => `akili_partner_${code}`;
const genCode = () => Math.random().toString(36).slice(2,8).toUpperCase();

function useStore() {
  const [s, setRaw] = useState(() => {
    try { const r=localStorage.getItem(STORAGE_KEY); if(r) return {...DEFAULT_STATE,...JSON.parse(r)}; } catch {}
    return DEFAULT_STATE;
  });
  const set = useCallback((upd) => {
    setRaw(prev => {
      const next = typeof upd==="function" ? upd(prev) : {...prev,...upd};
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      // If in a partner session, also write shared partner data
      if (next.partnerCode) {
        try {
          const shared = { name: next.profile.name, transactions: next.transactions, goals: next.goals, lastSeen: Date.now() };
          localStorage.setItem(PARTNER_KEY(next.partnerCode), JSON.stringify(shared));
        } catch {}
      }
      return next;
    });
  }, []);
  return [s, set];
}

// ── SMALL COMPONENTS ──────────────────────────────────────────────
function SparkBars({ data, color="#06D6A0" }) {
  const max = Math.max(...data, 1);
  return (
    <div style={{display:"flex",alignItems:"flex-end",gap:3,height:44}}>
      {data.map((v,i) => (
        <div key={i} style={{flex:1,borderRadius:"3px 3px 0 0",background:i===data.length-1?color:color+"55",height:`${Math.max(5,(v/max)*100)}%`,transition:"height 0.6s"}}/>
      ))}
    </div>
  );
}

function DonutChart({ slices, size=110, th }) {
  const r=44,cx=55,cy=55,circ=2*Math.PI*r;
  let cum=0;
  const total=slices.reduce((a,x)=>a+x.value,0)||1;
  const tk = th || THEMES.dark;
  return (
    <svg width={size} height={size} viewBox="0 0 110 110">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={tk.progressTrack} strokeWidth={16}/>
      {slices.map((sl,i) => {
        const pct=sl.value/total,dash=pct*circ,gap=circ-dash,offset=circ*0.25-cum*circ;
        cum+=pct;
        return <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={sl.color} strokeWidth={16} strokeDasharray={`${dash} ${gap}`} strokeDashoffset={offset} style={{transition:"all 0.8s"}}/>;
      })}
    </svg>
  );
}

function Chip({ label, color="#06D6A0" }) {
  return <span style={{fontSize:10,fontWeight:900,padding:"2px 8px",borderRadius:20,background:color+"22",color,border:`1px solid ${color}44`}}>{label}</span>;
}

// ── FIX #6: UGX Amount Input with comma formatting ─────────────────
function UGXInput({ value, onChange, placeholder="0", style={}, autoFocus=false }) {
  const [display, setDisplay] = useState(value ? fmtInputUGX(value) : "");
  useEffect(() => { setDisplay(value ? fmtInputUGX(value) : ""); }, [value]);
  return (
    <input
      style={style}
      inputMode="numeric"
      placeholder={placeholder}
      value={display}
      autoFocus={autoFocus}
      onChange={e => {
        const raw = e.target.value.replace(/,/g,"");
        if (raw === "" || /^\d+$/.test(raw)) {
          setDisplay(raw ? Number(raw).toLocaleString("en-UG") : "");
          onChange(raw ? parseInt(raw) : "");
        }
      }}
    />
  );
}

// ── ONBOARDING (Fix #8 - budget setup in step 4) ──────────────────
function Onboarding({ onDone }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [income, setIncome] = useState("");
  const [budgets, setBudgets] = useState({ Food:300000, Transport:150000, Rent:500000, Entertainment:100000, Utilities:130000 });

  const OB = {
    root:{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#080C16",padding:20,fontFamily:"'Sora',sans-serif",overflowY:"auto"},
    glow:{position:"fixed",inset:0,background:"radial-gradient(ellipse at 50% 30%,#0d2040,transparent 70%)",pointerEvents:"none"},
    card:{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:28,padding:"36px 28px",width:"100%",maxWidth:380,position:"relative",zIndex:1},
    title:{fontSize:24,fontWeight:900,letterSpacing:"-0.5px",margin:"0 0 8px",textAlign:"center",color:"#E8EAF0"},
    body:{fontSize:13,opacity:0.55,margin:"0 0 22px",textAlign:"center",lineHeight:1.6,color:"#E8EAF0"},
    inp:{width:"100%",background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:14,padding:"14px 16px",color:"#E8EAF0",fontSize:15,marginBottom:14,boxSizing:"border-box",outline:"none",fontFamily:"inherit"},
    btn:{width:"100%",padding:"15px",background:"linear-gradient(135deg,#06D6A0,#0CB8D4)",color:"#080C16",border:"none",borderRadius:14,fontWeight:900,fontSize:15,cursor:"pointer",marginBottom:10,fontFamily:"inherit"},
    skip:{width:"100%",padding:"10px",background:"none",border:"none",color:"rgba(255,255,255,0.35)",fontSize:13,cursor:"pointer",fontFamily:"inherit"},
    label:{fontSize:11,fontWeight:800,color:"rgba(232,234,240,0.45)",letterSpacing:"0.8px",marginBottom:6,display:"block"},
  };
  const TOTAL_STEPS = 5;
  const Dots = ({cur}) => <div style={{display:"flex",gap:6,justifyContent:"center",marginBottom:28}}>{Array.from({length:TOTAL_STEPS},(_,i)=><div key={i} style={{height:8,borderRadius:4,background:i===cur?"#06D6A0":"rgba(255,255,255,0.15)",width:i===cur?24:8,transition:"all 0.3s"}}/>)}</div>;

  const QUICK_BUDGETS = [
    { label:"Student", budgets:{Food:150000,Transport:80000,Entertainment:50000,Utilities:50000,Rent:200000} },
    { label:"Professional", budgets:{Food:300000,Transport:150000,Entertainment:100000,Utilities:130000,Rent:500000} },
    { label:"Family", budgets:{Food:500000,Transport:200000,Entertainment:150000,Utilities:200000,Rent:800000} },
  ];

  if (step===0) return (
    <div style={OB.root}><div style={OB.glow}/><div style={OB.card}>
      <Dots cur={0}/>
      <div style={{fontSize:52,textAlign:"center",margin:"0 0 14px"}}>💰</div>
      <h2 style={OB.title}>Welcome to Akili</h2>
      <p style={OB.body}>Your smart money manager built for East Africa. Track UGX, scan receipts, parse MoMo SMS and get insights.</p>
      <button style={OB.btn} onClick={()=>{haptic();setStep(1);}}>Get Started →</button>
    </div></div>
  );

  if (step===1) return (
    <div style={OB.root}><div style={OB.glow}/><div style={OB.card}>
      <Dots cur={1}/>
      <div style={{fontSize:40,textAlign:"center",margin:"0 0 12px"}}>👤</div>
      <h2 style={OB.title}>What's your name?</h2>
      <p style={OB.body}>We'll personalise everything for you.</p>
      <input style={OB.inp} placeholder="e.g. James Kamau" value={name} onChange={e=>setName(e.target.value)} autoFocus/>
      <button style={{...OB.btn,opacity:name.trim()?1:0.4}} disabled={!name.trim()} onClick={()=>{haptic();setStep(2);}}>Continue →</button>
    </div></div>
  );

  if (step===2) return (
    <div style={OB.root}><div style={OB.glow}/><div style={OB.card}>
      <Dots cur={2}/>
      <div style={{fontSize:40,textAlign:"center",margin:"0 0 12px"}}>💵</div>
      <h2 style={OB.title}>Monthly income?</h2>
      <p style={OB.body}>Your average monthly earnings in UGX. This helps calculate your savings rate.</p>
      <div style={{position:"relative",marginBottom:14}}>
        <span style={{position:"absolute",left:16,top:"50%",transform:"translateY(-50%)",fontSize:11,fontWeight:800,color:"#06D6A0",zIndex:1}}>UGX</span>
        <UGXInput
          value={income}
          onChange={setIncome}
          placeholder="e.g. 1,500,000"
          autoFocus={true}
          style={{...OB.inp,paddingLeft:58,marginBottom:0}}
        />
      </div>
      <button style={{...OB.btn,opacity:income?1:0.4}} disabled={!income} onClick={()=>{haptic();setStep(3);}}>Continue →</button>
      <button style={OB.skip} onClick={()=>{setStep(3);}}>Skip for now</button>
    </div></div>
  );

  if (step===3) return (
    <div style={OB.root}><div style={OB.glow}/><div style={{...OB.card,maxHeight:"85vh",overflowY:"auto"}}>
      <Dots cur={3}/>
      <div style={{fontSize:40,textAlign:"center",margin:"0 0 12px"}}>📊</div>
      <h2 style={OB.title}>Set your budgets</h2>
      <p style={OB.body}>Pick a starting point — you can always change these later.</p>

      <div style={{display:"flex",gap:8,marginBottom:20}}>
        {QUICK_BUDGETS.map(q=>(
          <button key={q.label} style={{flex:1,padding:"8px 4px",borderRadius:10,border:"1px solid rgba(6,214,160,0.25)",background:"rgba(6,214,160,0.07)",color:"#06D6A0",fontWeight:800,fontSize:11,cursor:"pointer",fontFamily:"inherit"}} onClick={()=>{haptic();setBudgets(q.budgets);}}>
            {q.label}
          </button>
        ))}
      </div>

      {["Food","Transport","Rent","Entertainment","Utilities","Health","Education","Savings"].map(cat=>(
        <div key={cat} style={{marginBottom:12}}>
          <label style={OB.label}>{CAT_META[cat].icon} {cat.toUpperCase()}</label>
          <div style={{position:"relative"}}>
            <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",fontSize:10,fontWeight:800,color:"#06D6A0"}}>UGX</span>
            <UGXInput
              value={budgets[cat]||""}
              onChange={v=>setBudgets(b=>({...b,[cat]:v||0}))}
              placeholder="0 = no limit"
              style={{...OB.inp,paddingLeft:52,marginBottom:0,fontSize:13,padding:"11px 14px 11px 52px"}}
            />
          </div>
        </div>
      ))}
      <button style={{...OB.btn,marginTop:8}} onClick={()=>{haptic();setStep(4);}}>Save Budgets →</button>
      <button style={OB.skip} onClick={()=>setStep(4)}>Skip budgets</button>
    </div></div>
  );

  // Step 4: Done
  return (
    <div style={OB.root}><div style={OB.glow}/><div style={OB.card}>
      <Dots cur={4}/>
      <div style={{fontSize:52,textAlign:"center",margin:"0 0 14px"}}>🎉</div>
      <h2 style={OB.title}>You're all set, {name||"there"}!</h2>
      <p style={OB.body}>Dashboard, AI coach, receipt scanner, MoMo parser and monthly reports — all ready.</p>
      <button style={OB.btn} onClick={()=>{haptic();onDone({name:name||"User",income:parseUGX(income)||0,budgets});}}>Open My Dashboard →</button>
    </div></div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────
export default function AkiliElite() {
  const [store, set] = useStore();
  const [tab, setTab] = useState("home");
  const [modal, setModal] = useState(null);
  const [editTxData, setEditTxData] = useState(null);
  const [depositGoalData, setDepositGoalData] = useState(null);
  const [toast, setToast] = useState(null);

  const themeName = store.theme || "dark";
  const th = THEMES[themeName];

  useEffect(() => {
    // PWA meta
    let meta = document.querySelector("meta[name=viewport]");
    if (!meta) { meta=document.createElement("meta"); meta.name="viewport"; document.head.appendChild(meta); }
    meta.content = "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover";

    // Theme colour meta for browser chrome
    let tc = document.querySelector("meta[name='theme-color']");
    if (!tc) { tc=document.createElement("meta"); tc.name="theme-color"; document.head.appendChild(tc); }
    tc.content = themeName==="dark" ? "#080C16" : "#F2F5FF";

    // PWA manifest link
    if (!document.querySelector("link[rel=manifest]")) {
      const ml=document.createElement("link"); ml.rel="manifest"; ml.href="/manifest.json"; document.head.appendChild(ml);
    }

    if (!document.getElementById("akili-lock")) {
      const s=document.createElement("style"); s.id="akili-lock";
      s.textContent="@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800;900&display=swap');*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}html,body,#root{width:100%;height:100%;overflow:hidden;overscroll-behavior:none;}input,select,textarea{font-family:inherit;}::-webkit-scrollbar{width:0;}@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.35}}@keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(16px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}";
      document.head.appendChild(s);
    }
    document.body.style.background = th.bg;
  }, [themeName]);

  const showToast = useCallback((msg, type="ok") => {
    setToast({msg,type}); setTimeout(()=>setToast(null), 2600);
  }, []);
  const closeModal = useCallback(() => { setModal(null); setEditTxData(null); }, []);

  const cm = nowMonth();
  const cmTxs = store.transactions.filter(tx=>monthOf(tx.date)===cm);
  const income  = cmTxs.filter(tx=>tx.type==="income").reduce((a,tx)=>a+tx.amount,0);
  const expense = cmTxs.filter(tx=>tx.type==="expense").reduce((a,tx)=>a+tx.amount,0);
  const balance = income-expense;
  const savRate = income>0 ? Math.round((Math.max(0,balance)/income)*100) : 0;
  const last6 = Array.from({length:6},(_,i)=>{ const d=new Date(); d.setMonth(d.getMonth()-5+i); const k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; return store.transactions.filter(tx=>tx.type==="expense"&&monthOf(tx.date)===k).reduce((a,tx)=>a+tx.amount,0); });
  const catSpend={};
  CATS.forEach(c=>{catSpend[c]=cmTxs.filter(tx=>tx.type==="expense"&&tx.category===c).reduce((a,tx)=>a+tx.amount,0);});
  const topCats=Object.entries(catSpend).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]);
  const unread=store.alerts.filter(a=>!a.read).length;

  const ops = {
    addTx:(tx) => { haptic(); set(s=>({...s,transactions:[...s.transactions,{...tx,id:uid()}]})); showToast("Transaction saved ✓"); closeModal(); },
    updTx:(tx) => { haptic(); set(s=>({...s,transactions:s.transactions.map(x=>x.id===tx.id?tx:x)})); showToast("Updated ✓"); closeModal(); },
    delTx:(id) => { haptic(20); set(s=>({...s,transactions:s.transactions.filter(tx=>tx.id!==id)})); showToast("Deleted","warn"); },
    addGoal:(g) => { haptic(); set(s=>({...s,goals:[...s.goals,{...g,id:uid()}]})); showToast("Goal created ✓"); closeModal(); },
    deposit:(id,amt,source,goalName) => {
      set(s=>{
        const updated = {...s, goals:s.goals.map(g=>g.id===id?{...g,saved:Math.min(g.target,g.saved+amt)}:g)};
        if(source==="balance") updated.transactions=[...s.transactions,{id:uid(),type:"expense",amount:amt,category:"Savings",desc:`Goal: ${goalName}`,date:toDay()}];
        return updated;
      });
      showToast(source==="balance"?"Deducted from balance ✓":"Progress updated ✓");
      setDepositGoalData(null);
    },
    delGoal:(id) => { set(s=>({...s,goals:s.goals.filter(g=>g.id!==id)})); showToast("Goal removed","warn"); },
    setBudgets:(b) => { set(s=>({...s,budgets:b})); showToast("Budgets saved ✓"); closeModal(); },
    setPartner:(p) => { set(s=>({...s,partner:p})); showToast(p?"Partner linked ✓":"Partner removed"); closeModal(); },
    markRead:() => { set(s=>({...s,alerts:s.alerts.map(a=>({...a,read:true}))})); },
    toggleTheme:() => { set(s=>({...s,theme:s.theme==="dark"?"light":"dark"})); },
    reset:() => { if(confirm("Reset all data?")){ set({...DEFAULT_STATE,onboarded:true,profile:store.profile,theme:store.theme}); showToast("Data reset","warn"); closeModal(); } },
    exportCSV:() => {
      const headers="Date,Type,Category,Description,Amount,AddedBy\n";
      const rows=store.transactions.map(tx=>`${tx.date},${tx.type},${tx.category},"${tx.desc}",${tx.amount},${tx.addedBy||"me"}`).join("\n");
      const blob=new Blob([headers+rows],{type:"text/csv"});
      const url=URL.createObjectURL(blob);
      const a=document.createElement("a"); a.href=url; a.download="akili-transactions.csv"; a.click();
      URL.revokeObjectURL(url); showToast("CSV exported ✓");
    },
  };

  // Fix #5: on first onboarding complete, start with empty data
  if (!store.onboarded) return (
    <Onboarding onDone={p=>set(s=>({
      ...s,
      onboarded:true,
      profile:{...s.profile,name:p.name,income:p.income},
      budgets:{...s.budgets,...p.budgets},
      transactions:[],
      goals:[],
    }))}/>
  );

  const shared = { store, set, ops, income, expense, balance, savRate, last6, topCats, catSpend, showToast, th, themeName };
  const S = makeStyles(th);

  return (
    <div style={S.root}>
      <div style={S.mesh}/>
      {toast && <div style={{...S.toast,background:toast.type==="warn"?"#EF476F":toast.type==="info"?"#118AB2":"#06D6A0",color:toast.type==="ok"?"#080C16":"#fff"}}>{toast.msg}</div>}

      {modal==="add-tx"   && <TxModal th={th} onSave={ops.addTx} onClose={closeModal}/>}
      {modal==="edit-tx"  && editTxData && <TxModal th={th} initial={editTxData} onSave={ops.updTx} onClose={closeModal} isEdit/>}
      {modal==="add-goal" && <GoalModal th={th} onSave={ops.addGoal} onClose={closeModal}/>}
      {modal==="budgets"  && <BudgetModal th={th} budgets={store.budgets} catSpend={catSpend} onSave={ops.setBudgets} onClose={closeModal}/>}
      {modal==="scanner"  && <ReceiptScanner th={th} onAdd={ops.addTx} onClose={closeModal} showToast={showToast}/>}
      {modal==="momo"     && <MomoParser th={th} onAdd={ops.addTx} onClose={closeModal} showToast={showToast}/>}
      {modal==="report"   && <ReportModal th={th} {...shared} onClose={closeModal}/>}
      {modal==="alerts"   && <AlertsModal th={th} alerts={store.alerts} onRead={ops.markRead} onClose={closeModal}/>}
      {modal==="partner"  && <PartnerModal th={th} store={store} set={set} partner={store.partner} onSave={ops.setPartner} onClose={closeModal} showToast={showToast}/>}
      {modal==="settings" && <SettingsModal th={th} store={store} set={set} ops={ops} onClose={closeModal} showToast={showToast} themeName={themeName}/>}
      {depositGoalData    && <DepositModal th={th} goal={depositGoalData} onSave={ops.deposit} onClose={()=>setDepositGoalData(null)}/>}

      <header style={S.hdr}>
        <div style={{display:"flex",alignItems:"center",gap:11}}>
          <div style={S.logo}>₳</div>
          <div>
            <div style={S.appName}>Akili Finance</div>
            <div style={S.appSub}>Karibu, {store.profile.name||"friend"} 👋</div>
          </div>
        </div>
        <div style={{display:"flex",gap:4,alignItems:"center"}}>
          <button style={S.iconBtn} onClick={()=>{haptic();setModal("alerts");}}>🔔{unread>0&&<span style={S.notifDot}>{unread}</span>}</button>
          <button style={{...S.iconBtn,fontSize:18}} onClick={()=>{haptic();ops.toggleTheme();}}>{themeName==="dark"?"☀️":"🌙"}</button>
          <button style={{...S.iconBtn,fontSize:16}} onClick={()=>{haptic();setModal("settings");}}>⚙️</button>
        </div>
      </header>

      <div style={S.powerBar}>
        {[{icon:"📸",label:"Scan Receipt",key:"scanner"},{icon:"📩",label:"Parse MoMo",key:"momo"},{icon:"📊",label:"Get Report",key:"report"},{icon:"👥",label:"Partner",key:"partner"}].map(b=>(
          <button key={b.key} style={S.powerBtn} onClick={()=>{haptic();setModal(b.key);}}>
            <span style={{fontSize:18}}>{b.icon}</span>
            <span style={{fontSize:9,fontWeight:800,opacity:0.7}}>{b.label}</span>
          </button>
        ))}
      </div>

      <main style={S.main}>
        {tab==="home"         && <HomeTab {...shared} S={S} onAddTx={()=>setModal("add-tx")} onBudgets={()=>setModal("budgets")}/>}
        {tab==="transactions" && <TxTab  {...shared} S={S} onAdd={()=>setModal("add-tx")} onEdit={tx=>{setEditTxData(tx);setModal("edit-tx");}}/>}
        {tab==="goals"        && <GoalsTab {...shared} S={S} onAdd={()=>setModal("add-goal")} onDeposit={g=>setDepositGoalData(g)}/>}
        {tab==="coach"        && <CoachTab {...shared} S={S}/>}
      </main>

      <nav style={S.nav}>
        {[{id:"home",icon:"⬡",label:"Home"},{id:"transactions",icon:"↕",label:"Ledger"},{id:"goals",icon:"◎",label:"Goals"},{id:"coach",icon:"✦",label:"AI Coach"}].map(navItem=>(
          <button key={navItem.id} style={{...S.navBtn,...(tab===navItem.id?{color:"#06D6A0"}:{})}} onClick={()=>{haptic();setTab(navItem.id);}}>
            <span style={{fontSize:20}}>{navItem.icon}</span>
            <span style={{fontSize:10,fontWeight:700}}>{navItem.label}</span>
            {tab===navItem.id&&<div style={S.navPip}/>}
          </button>
        ))}
      </nav>
    </div>
  );
}

// ── HOME TAB ──────────────────────────────────────────────────────
function HomeTab({ store, income, expense, balance, savRate, last6, topCats, catSpend, onAddTx, onBudgets, th, S }) {
  const donut = topCats.slice(0,5).map(([c,v])=>({value:v,color:CAT_META[c].color}));
  return (
    <div style={S.wrap}>
      <div style={S.hero}>
        <div style={{position:"absolute",top:-50,right:-50,width:180,height:180,borderRadius:"50%",background:"radial-gradient(circle,rgba(6,214,160,0.1),transparent 70%)",pointerEvents:"none"}}/>
        <div style={{fontSize:10,fontWeight:800,letterSpacing:"1.2px",color:th.textSub,marginBottom:7}}>NET BALANCE · {monthLbl(nowMonth()).toUpperCase()}</div>
        <div style={{fontFamily:"monospace",fontSize:28,fontWeight:700,letterSpacing:"-1px",marginBottom:14,color:th.text}}>{fmtUGX(balance)}</div>
        <div style={{display:"flex",gap:20,marginBottom:18}}>
          {[["↑",income,"#06D6A0","Income"],["↓",expense,"#EF476F","Spent"],["★",savRate+"%","#FFD166","Saved"]].map(([ic,v,cl,lb])=>(
            <div key={lb} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
              <span style={{color:cl,fontWeight:800}}>{ic} <span style={{fontSize:13}}>{typeof v==="number"?fmtUGX(v):v}</span></span>
              <span style={{fontSize:9,color:th.textSub,fontWeight:800,letterSpacing:"0.6px",textTransform:"uppercase"}}>{lb}</span>
            </div>
          ))}
        </div>
        <div style={{fontSize:10,color:th.textSub,fontWeight:800,letterSpacing:"1px",textTransform:"uppercase",marginBottom:8}}>6-Month Spending Trend</div>
        <SparkBars data={last6} color="#06D6A0"/>
      </div>

      {store.partner && (
        <div style={{background:"rgba(123,140,222,0.08)",border:"1px solid rgba(123,140,222,0.2)",borderRadius:16,padding:"12px 14px",display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
          <span style={{fontSize:20}}>👥</span>
          <div style={{flex:1}}>
            <div style={{fontSize:12,fontWeight:800,color:th.text}}>{store.partner.name} · Shared Finances</div>
            <div style={{fontSize:11,color:th.textSub}}>Partner view active</div>
          </div>
          <Chip label="Linked" color={store.partner.color||"#7B8CDE"}/>
        </div>
      )}

      <button style={S.quickAdd} onClick={()=>{haptic();onAddTx();}}>＋ Add Transaction</button>

      {topCats.length>0 ? (
        <>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <span style={S.secTitle}>This Month's Spending</span>
            <button style={S.secBtn} onClick={onBudgets}>Set Budgets</button>
          </div>
          <div style={S.card}>
            <div style={{display:"flex",gap:14,alignItems:"center",marginBottom:16}}>
              <DonutChart slices={donut} size={100} th={th}/>
              <div style={{flex:1}}>
                {topCats.slice(0,4).map(([c,v])=>(
                  <div key={c} style={{display:"flex",alignItems:"center",gap:7,marginBottom:7}}>
                    <div style={{width:7,height:7,borderRadius:"50%",background:CAT_META[c].color,flexShrink:0}}/>
                    <span style={{flex:1,fontSize:11,fontWeight:600,color:th.text}}>{c}</span>
                    <span style={{fontSize:11,fontWeight:800,fontFamily:"monospace",color:th.textMid}}>{fmtC(v)}</span>
                  </div>
                ))}
              </div>
            </div>
            {topCats.map(([cat,val])=>{
              const b=store.budgets[cat]||0, over=b>0&&val>b, pct=b>0?Math.min(100,Math.round(val/b*100)):0;
              return (
                <div key={cat} style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                  <span style={{fontSize:17}}>{CAT_META[cat].icon}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,fontWeight:700,color:th.text}}>{cat}{b>0&&<span style={{fontSize:10,color:th.textSub,marginLeft:6}}>{fmtC(val)}/{fmtC(b)}</span>}</div>
                    {b>0&&<div style={{height:4,background:th.budgetTrack,borderRadius:3,marginTop:4,overflow:"hidden"}}><div style={{height:"100%",width:`${pct}%`,background:over?"#EF476F":CAT_META[cat].color,borderRadius:3,transition:"width 0.7s"}}/></div>}
                  </div>
                  <div style={{display:"flex",gap:6,alignItems:"center"}}>
                    {over&&<span style={{fontSize:9,fontWeight:900,color:"#EF476F",background:"rgba(239,71,111,0.15)",padding:"2px 6px",borderRadius:6}}>OVER</span>}
                    <span style={{fontSize:12,fontWeight:900,fontFamily:"monospace",color:over?"#EF476F":th.textMid}}>{fmtC(val)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div style={{background:th.bg3,border:`1px dashed ${th.border2}`,borderRadius:20,padding:"28px 20px",textAlign:"center",marginBottom:18}}>
          <div style={{fontSize:36,marginBottom:10}}>📊</div>
          <div style={{fontSize:13,fontWeight:700,color:th.text,marginBottom:6}}>No spending recorded yet</div>
          <div style={{fontSize:11,color:th.textSub}}>Add your first transaction to see insights here</div>
        </div>
      )}

      {store.goals.length>0 && (
        <>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><span style={S.secTitle}>Savings Goals</span></div>
          <div style={{display:"flex",gap:12,overflowX:"auto",paddingBottom:6,marginBottom:18}}>
            {store.goals.map(g=>{
              const p=Math.round(Math.min(100,g.saved/g.target*100));
              return (
                <div key={g.id} style={{minWidth:118,background:th.bg3,border:`1px solid ${th.border}`,borderRadius:16,padding:"13px 12px",flexShrink:0}}>
                  <div style={{fontSize:22,marginBottom:5}}>{g.icon}</div>
                  <div style={{fontSize:11,fontWeight:800,marginBottom:7,color:th.text}}>{g.name}</div>
                  <div style={{height:4,background:th.progressTrack,borderRadius:3,overflow:"hidden",marginBottom:4}}><div style={{height:"100%",width:`${p}%`,background:g.color,transition:"width 0.7s"}}/></div>
                  <div style={{fontSize:11,fontWeight:900,color:g.color}}>{p}%</div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><span style={S.secTitle}>Recent Activity</span></div>
      {store.transactions.length===0
        ? <div style={{fontSize:13,color:th.textSub,textAlign:"center",padding:"20px 0"}}>No transactions yet — tap <strong style={{color:"#06D6A0"}}>+ Add Transaction</strong> above</div>
        : store.transactions.slice(-5).reverse().map(tx=>(
          <div key={tx.id} style={S.txRow}>
            <div style={S.txIco}>{CAT_META[tx.category]?.icon||"📦"}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={S.txDesc}>{tx.desc}</div>
              <div style={{fontSize:11,color:th.textSub,display:"flex",alignItems:"center",gap:5}}>
                {tx.category} · {tx.date}
                {tx.addedBy==="partner"&&store.partner&&<span style={{fontSize:9,fontWeight:900,padding:"1px 6px",borderRadius:10,background:(store.partner.color||"#7B8CDE")+"22",color:store.partner.color||"#7B8CDE"}}>{store.partner.name}</span>}
              </div>
            </div>
            <div style={{fontSize:13,fontWeight:900,fontFamily:"monospace",color:tx.type==="income"?"#06D6A0":"#EF476F"}}>
              {tx.type==="income"?"+":"-"}{fmtC(tx.amount)}
            </div>
          </div>
        ))
      }
    </div>
  );
}

// ── TX TAB ────────────────────────────────────────────────────────
function TxTab({ store, ops, onAdd, onEdit, th, S }) {
  const [filter,setFilter]=useState("all");
  const [q,setQ]=useState("");
  const [delId,setDelId]=useState(null);
  const ML = makeML(th);
  const list=store.transactions.filter(tx=>(filter==="all"||tx.type===filter)&&(!q||tx.desc.toLowerCase().includes(q.toLowerCase())||tx.category.toLowerCase().includes(q.toLowerCase()))).slice().reverse();
  const grouped=list.reduce((acc,tx)=>{const l=monthLbl(monthOf(tx.date));(acc[l]=acc[l]||[]).push(tx);return acc;},{});
  return (
    <div style={S.wrap}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div style={S.pageTitle}>Transactions</div>
        <button style={S.addBtn} onClick={()=>{haptic();onAdd();}}>+ Add</button>
      </div>
      <input style={S.search} placeholder="🔍  Search..." value={q} onChange={e=>setQ(e.target.value)}/>
      <div style={{display:"flex",gap:8,marginBottom:14}}>
        {["all","income","expense"].map(x=>(
          <button key={x} style={{padding:"7px 14px",borderRadius:20,border:`1px solid ${th.border}`,background:filter===x?"rgba(6,214,160,0.12)":th.filterInactive,color:filter===x?"#06D6A0":th.textSub,fontSize:12,fontWeight:700,cursor:"pointer"}} onClick={()=>{haptic();setFilter(x);}}>
            {x==="all"?"All":x==="income"?"↑ Income":"↓ Expense"}
          </button>
        ))}
      </div>
      {list.length===0
        ? <div style={{textAlign:"center",padding:"50px 0",color:th.textSub}}>
            <div style={{fontSize:40,marginBottom:12}}>📋</div>
            <div>No transactions found</div>
          </div>
        : Object.entries(grouped).map(([lbl,txs])=>(
          <div key={lbl}>
            <div style={{fontSize:11,fontWeight:800,color:th.textSub,letterSpacing:"0.8px",textTransform:"uppercase",margin:"16px 0 8px"}}>{lbl}</div>
            {txs.map(tx=>(
              <div key={tx.id} style={S.txRow}>
                <div style={S.txIco}>{CAT_META[tx.category]?.icon||"📦"}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={S.txDesc}>{tx.desc}</div>
                  <div style={{fontSize:11,color:th.textSub,display:"flex",alignItems:"center",gap:5}}>
                    {tx.category} · {tx.date}
                    {tx.addedBy==="partner"&&store.partner&&<span style={{fontSize:9,fontWeight:900,padding:"1px 6px",borderRadius:10,background:(store.partner.color||"#7B8CDE")+"22",color:store.partner.color||"#7B8CDE"}}>{store.partner.name}</span>}
                  </div>
                </div>
                <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:5}}>
                  <div style={{fontSize:13,fontWeight:900,fontFamily:"monospace",color:tx.type==="income"?"#06D6A0":"#EF476F"}}>{tx.type==="income"?"+":"-"}{fmtC(tx.amount)}</div>
                  <div style={{display:"flex",gap:5}}>
                    <button style={{background:"none",border:"none",cursor:"pointer",fontSize:14}} onClick={()=>{haptic();onEdit(tx);}}>✏️</button>
                    <button style={{background:"none",border:"none",cursor:"pointer",fontSize:14}} onClick={()=>{haptic(20);setDelId(tx.id);}}>🗑</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))
      }
      {delId && (
        <div style={ML.ov} onClick={()=>setDelId(null)}>
          <div style={ML.sh} onClick={e=>e.stopPropagation()}>
            <div style={ML.title}>Delete transaction?</div>
            <p style={{color:th.textSub,fontSize:13,margin:"8px 0 22px"}}>This cannot be undone.</p>
            <div style={{display:"flex",gap:10}}>
              <button style={ML.cancelBtn} onClick={()=>setDelId(null)}>Cancel</button>
              <button style={{...ML.saveBtn,background:"#EF476F"}} onClick={()=>{ops.delTx(delId);setDelId(null);}}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── GOALS TAB ─────────────────────────────────────────────────────
function GoalsTab({ store, ops, onAdd, onDeposit, th, S }) {
  return (
    <div style={S.wrap}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div style={S.pageTitle}>Savings Goals</div>
        <button style={S.addBtn} onClick={()=>{haptic();onAdd();}}>+ New Goal</button>
      </div>
      {store.goals.length===0
        ? <div style={{textAlign:"center",padding:"50px 20px"}}>
            <div style={{fontSize:48,marginBottom:14}}>🎯</div>
            <div style={{fontSize:15,fontWeight:800,color:th.text,marginBottom:8}}>Your first goal is waiting!</div>
            <div style={{color:th.textSub,marginBottom:20,fontSize:13}}>Emergency fund? New laptop? Holiday? Set a goal and track your progress.</div>
            <button style={{background:"linear-gradient(135deg,#06D6A0,#0CB8D4)",color:"#080C16",border:"none",borderRadius:14,padding:"12px 28px",fontWeight:900,fontSize:14,cursor:"pointer"}} onClick={()=>{haptic();onAdd();}}>Create My First Goal 🎯</button>
          </div>
        : store.goals.map(g=>{
          const p=Math.min(100,Math.round(g.saved/g.target*100)), done=p>=100;
          return (
            <div key={g.id} style={{...S.card,marginBottom:14,borderColor:done?g.color+"44":th.border}}>
              <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:14}}>
                <div style={{width:52,height:52,borderRadius:16,background:g.color+"18",border:`2px solid ${g.color}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0}}>{g.icon}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:16,fontWeight:800,marginBottom:3,color:th.text}}>{g.name}</div>
                  <div style={{fontSize:12,color:th.textSub}}><span style={{color:g.color,fontWeight:800}}>{fmtUGX(g.saved)}</span> / {fmtUGX(g.target)}</div>
                </div>
                {done&&<Chip label="Done! 🎉" color={g.color}/>}
              </div>
              <div style={{height:8,background:th.progressTrack,borderRadius:4,overflow:"hidden",marginBottom:12}}>
                <div style={{height:"100%",width:`${p}%`,background:done?`linear-gradient(90deg,${g.color},#06D6A0)`:g.color,borderRadius:4,transition:"width 0.7s"}}/>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:13,fontWeight:900,color:g.color}}>{p}% complete</span>
                <div style={{display:"flex",gap:8}}>
                  <button style={{padding:"7px 14px",borderRadius:10,background:g.color+"18",border:`1px solid ${g.color}44`,color:g.color,fontWeight:800,fontSize:12,cursor:"pointer"}} onClick={()=>{haptic();onDeposit(g);}}>+ Add Funds</button>
                  <button style={{padding:"7px 10px",borderRadius:10,background:"rgba(239,71,111,0.1)",border:"1px solid rgba(239,71,111,0.2)",color:"#EF476F",fontWeight:800,fontSize:12,cursor:"pointer"}} onClick={()=>{haptic(20);ops.delGoal(g.id);}}>🗑</button>
                </div>
              </div>
            </div>
          );
        })
      }
    </div>
  );
}

// ── COACH TAB ─────────────────────────────────────────────────────
function CoachTab({ store, set, income, expense, balance, savRate, topCats, th, S }) {
  const [inp,setInp]=useState("");
  const [loading,setLoading]=useState(false);
  const endRef=useRef(null);
  const hasKey = !!getKey();
  const msgs=store.messages.length>0?store.messages:[{role:"assistant",content:"Habari! 👋 I'm **Akili**, your AI finance coach.\n\nI have full context on your finances and can give you sharp, personalised advice for Kampala.\n\n" + (hasKey ? "Ask me anything! 👇" : "🔑 Add your free API key in ⚙️ Settings → AI Key to activate me.")}];
  useEffect(()=>{endRef.current?.scrollIntoView({behavior:"smooth"});},[msgs,loading]);
  const ctx=`You are Akili, elite finance coach for ${store.profile.name||"User"} in Kampala, Uganda.\nIncome=${fmtUGX(income)}, Expenses=${fmtUGX(expense)}, Balance=${fmtUGX(balance)}, Savings=${savRate}%\nTop spending: ${topCats.slice(0,5).map(([c,v])=>`${c}=${fmtUGX(v)}`).join(", ")}\nGoals: ${store.goals.map(g=>`${g.name} ${Math.round(g.saved/g.target*100)}%`).join("; ")}\nBe sharp, warm, specific. Bold key figures. Under 200 words unless asked more.`;
  const send=async(text)=>{
    const m=text||inp.trim(); if(!m||loading) return;
    if(!hasKey) return;
    haptic();
    setInp("");
    const updated=[...msgs,{role:"user",content:m}];
    set(s=>({...s,messages:updated}));
    setLoading(true);
    try {
      const d=await callClaude({model:MODEL,max_tokens:1000,system:ctx,messages:updated.map(x=>({role:x.role,content:x.content}))});
      set(s=>({...s,messages:[...updated,{role:"assistant",content:d.content?.[0]?.text||"Sorry, try again."}]}));
    } catch(e) {
      const msg=e.message==="NO_KEY"?"⚠️ No API key — go to ⚙️ Settings → AI Key.":e.message==="NETWORK"?"⚠️ Network error. Check your internet.":"⚠️ "+e.message;
      set(s=>({...s,messages:[...updated,{role:"assistant",content:msg}]}));
    }
    setLoading(false);
  };
  const md=txt=>txt.replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>").replace(/\*(.*?)\*/g,"<em>$1</em>").replace(/\n/g,"<br/>");
  return (
    <div style={{display:"flex",flexDirection:"column",flex:1,minHeight:0}}>
      <div style={{display:"flex",alignItems:"center",gap:12,padding:"14px 18px",borderBottom:`1px solid ${th.border}`}}>
        <div style={{width:44,height:44,borderRadius:14,background:"linear-gradient(135deg,#0d1e3a,#1a2f5e)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,border:"1px solid rgba(6,214,160,0.2)"}}>🧠</div>
        <div style={{flex:1}}>
          <div style={{fontSize:15,fontWeight:800,color:th.text}}>Akili AI Coach</div>
          <div style={{fontSize:11,color:th.textSub,display:"flex",alignItems:"center",gap:5}}>
            <span style={{display:"inline-block",width:6,height:6,borderRadius:"50%",background:hasKey?"#06D6A0":"#EF476F"}}/>
            {hasKey?"Live · Full financial context":"API key needed — see ⚙️ Settings"}
          </div>
        </div>
        <button style={{background:"none",border:`1px solid ${th.border}`,borderRadius:20,color:th.textSub,fontSize:11,fontWeight:700,padding:"5px 12px",cursor:"pointer"}} onClick={()=>set(s=>({...s,messages:[]}))}>Clear</button>
      </div>

      {/* Fix #4: Visual step-by-step API key guide */}
      {!hasKey && (
        <div style={{margin:"12px 14px 0",background:"rgba(6,214,160,0.06)",border:"1px solid rgba(6,214,160,0.15)",borderRadius:14,padding:"14px"}}>
          <div style={{fontSize:12,fontWeight:800,color:"#06D6A0",marginBottom:10}}>🔑 Get your free AI key in 3 steps:</div>
          {[
            {n:"1",text:"Go to","link":"console.anthropic.com","after":"on your phone browser"},
            {n:"2",text:"Sign up free → click","bold":"API Keys","after":"→ Create Key"},
            {n:"3",text:"Come back here → ⚙️ Settings → AI Key → paste it"},
          ].map((s,i)=>(
            <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:8}}>
              <div style={{width:22,height:22,borderRadius:"50%",background:"rgba(6,214,160,0.15)",border:"1px solid rgba(6,214,160,0.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:900,color:"#06D6A0",flexShrink:0}}>{s.n}</div>
              <div style={{fontSize:12,color:th.textMid,lineHeight:1.5}}>
                {s.text} {s.link&&<span style={{color:"#06D6A0",fontWeight:700}}>{s.link}</span>} {s.after||""}{s.bold&&<strong style={{color:th.text}}> {s.bold}</strong>}
              </div>
            </div>
          ))}
          <div style={{fontSize:11,color:th.textSub,marginTop:4}}>💡 New accounts get free credits — enough to get started!</div>
        </div>
      )}

      <div style={{flex:1,overflowY:"auto",padding:"16px",display:"flex",flexDirection:"column",gap:12}}>
        {msgs.map((m,i)=>(
          <div key={i} style={{display:"flex",alignItems:"flex-end",gap:8,justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
            {m.role==="assistant"&&<div style={{width:30,height:30,borderRadius:10,background:th.bg3,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>🧠</div>}
            <div style={{maxWidth:"82%",padding:"11px 15px",borderRadius:18,fontSize:13,lineHeight:1.65,...(m.role==="user"?{background:"linear-gradient(135deg,#06D6A0,#0CB8D4)",color:"#080C16",fontWeight:700,borderBottomRightRadius:4}:{background:th.bg3,border:`1px solid ${th.border}`,color:th.text,borderBottomLeftRadius:4})}} dangerouslySetInnerHTML={{__html:md(m.content)}}/>
          </div>
        ))}
        {loading&&<div style={{display:"flex",alignItems:"flex-end",gap:8}}><div style={{width:30,height:30,borderRadius:10,background:th.bg3,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>🧠</div><div style={{padding:"11px 18px",borderRadius:18,background:th.bg3,border:`1px solid ${th.border}`,color:th.textSub,fontSize:13,animation:"pulse 1.2s infinite"}}>Thinking...</div></div>}
        <div ref={endRef}/>
      </div>
      <div style={{display:"flex",gap:6,padding:"8px 14px",overflowX:"auto",borderTop:`1px solid ${th.border}`}}>
        {["How am I doing?","Cut my spending?","On track for goals?","Save 30% this month?"].map(s=><button key={s} style={{flexShrink:0,padding:"6px 14px",borderRadius:20,background:th.bg3,border:`1px solid ${th.border}`,color:hasKey?th.textSub:th.textSub+"55",fontSize:11,fontWeight:700,cursor:hasKey?"pointer":"not-allowed",whiteSpace:"nowrap",opacity:hasKey?1:0.45}} onClick={()=>hasKey&&send(s)}>{s}</button>)}
      </div>
      <div style={{display:"flex",gap:10,padding:"10px 14px 14px",borderTop:`1px solid ${th.border}`}}>
        <input style={{flex:1,background:th.inputBg,border:`1px solid ${th.border3}`,borderRadius:24,padding:"12px 18px",color:th.text,fontSize:13,outline:"none",opacity:hasKey?1:0.5}} value={inp} onChange={e=>setInp(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder={hasKey?"Ask Akili anything...":"Add API key to activate →"} disabled={!hasKey}/>
        <button style={{width:46,height:46,borderRadius:"50%",border:"none",background:"linear-gradient(135deg,#06D6A0,#0CB8D4)",color:"#080C16",fontWeight:900,fontSize:20,cursor:"pointer",opacity:loading||!inp.trim()||!hasKey?0.35:1,transition:"opacity 0.2s"}} disabled={loading||!inp.trim()||!hasKey} onClick={()=>send()}>→</button>
      </div>
    </div>
  );
}

// ── RECEIPT SCANNER ───────────────────────────────────────────────
function ReceiptScanner({ onAdd, onClose, showToast, th }) {
  const [stage,setStage]=useState("idle");
  const [result,setResult]=useState(null);
  const [imgSrc,setImgSrc]=useState(null);
  const fileRef=useRef(null);
  const ML=makeML(th);
  const hasKey=!!getKey();
  const handleFile=async(file)=>{
    if(!file) return;
    if(!hasKey){showToast("Add API key in ⚙️ Settings → AI Key","warn");return;}
    setStage("scanning");
    const reader=new FileReader();
    reader.onload=async(e)=>{
      const b64=e.target.result.split(",")[1], mime=file.type||"image/jpeg";
      setImgSrc(e.target.result);
      try {
        const d=await callClaude({model:MODEL,max_tokens:400,messages:[{role:"user",content:[{type:"image",source:{type:"base64",media_type:mime,data:b64}},{type:"text",text:`Analyze this receipt. Return ONLY valid JSON: {"amount":number,"desc":"merchant max 5 words","category":"one of ${CATS.join(",")}","confidence":"high|medium|low"}`}]}]});
        const parsed=JSON.parse((d.content?.[0]?.text||"{}").replace(/```json|```/g,"").trim());
        setResult({...parsed,date:toDay(),type:"expense"});
        setStage("result");
      } catch(e) { showToast(e.message==="NETWORK"?"Network error":"Couldn't read receipt. Try a clearer photo.","warn"); setStage("idle"); }
    };
    reader.readAsDataURL(file);
  };
  return (
    <div style={ML.ov} onClick={onClose}>
      <div style={{...ML.sh,maxHeight:"90vh"}} onClick={e=>e.stopPropagation()}>
        <ModalHdr th={th} title="📸 Receipt Scanner" onClose={onClose}/>
        {stage==="idle"&&<>
          {!hasKey&&(
            <div style={{background:"rgba(255,209,102,0.08)",border:"1px solid rgba(255,209,102,0.2)",borderRadius:12,padding:"10px 14px",fontSize:12,color:"#FFD166",marginBottom:12}}>
              🔑 Needs API key — add it in ⚙️ Settings → AI Key
            </div>
          )}
          <div style={{background:th.bg3,border:`2px dashed ${th.border}`,borderRadius:20,padding:"36px 20px",textAlign:"center",marginBottom:14,cursor:hasKey?"pointer":"default",opacity:hasKey?1:0.5}} onClick={()=>hasKey&&fileRef.current.click()}>
            <div style={{fontSize:48,marginBottom:12}}>📸</div>
            <div style={{fontWeight:800,fontSize:15,marginBottom:6,color:th.text}}>Tap to scan a receipt</div>
            <div style={{fontSize:12,color:th.textSub}}>AI reads amount, store & category instantly</div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={e=>handleFile(e.target.files[0])}/>
          <div style={{background:"rgba(6,214,160,0.07)",border:"1px solid rgba(6,214,160,0.15)",borderRadius:12,padding:"10px 14px",fontSize:12,color:th.textMid,lineHeight:1.5}}>💡 Works with Nakumatt, Total, Game receipts, MoMo slips & more</div>
        </>}
        {stage==="scanning"&&<div style={{textAlign:"center",padding:"40px 20px"}}><div style={{fontSize:48,marginBottom:16,display:"inline-block",animation:"spin 1s linear infinite"}}>🔍</div><div style={{fontWeight:800,fontSize:15,color:th.text}}>Akili is reading your receipt...</div></div>}
        {stage==="result"&&result&&<>
          {imgSrc&&<img src={imgSrc} alt="receipt" style={{width:"100%",borderRadius:12,marginBottom:16,maxHeight:160,objectFit:"cover"}}/>}
          <ResultCard th={th} result={result} setResult={setResult}/>
          <div style={{display:"flex",gap:10,marginTop:16}}>
            <button style={ML.cancelBtn} onClick={()=>setStage("idle")}>Re-scan</button>
            <button style={ML.saveBtn} onClick={()=>{haptic();onAdd({...result,amount:parseInt(result.amount)||0});onClose();}}>Save Transaction</button>
          </div>
        </>}
      </div>
    </div>
  );
}

// ── MOMO PARSER ───────────────────────────────────────────────────
function MomoParser({ onAdd, onClose, showToast, th }) {
  const [sms,setSms]=useState("");
  const [loading,setLoading]=useState(false);
  const [result,setResult]=useState(null);
  const ML=makeML(th);
  const hasKey=!!getKey();
  const SAMPLES=["You have received 150,000 UGX from JOHN MUKASA 0772123456. Your new balance is 890,000 UGX. Fee: 0 UGX.","Your MTN Mobile Money payment of 45,000 UGX to TOTAL PETROL STATION was successful. Balance: 655,000 UGX.","You have sent 200,000 UGX to SARAH NALWOGA 0701987654. Balance: 455,000 UGX. Transaction fee: 800 UGX."];
  const parse=async()=>{
    if(!sms.trim()) return;
    if(!hasKey){showToast("Add API key in ⚙️ Settings → AI Key","warn");return;}
    setLoading(true);
    try {
      const d=await callClaude({model:MODEL,max_tokens:300,messages:[{role:"user",content:`Parse this MoMo SMS. Received=income, Sent/paid=expense. SMS: "${sms}"\nReturn ONLY valid JSON: {"type":"income|expense","amount":number,"desc":"max 6 words","category":"one of ${CATS.join(",")}","date":"${toDay()}","confidence":"high|medium|low"}`}]});
      setResult(JSON.parse((d.content?.[0]?.text||"{}").replace(/```json|```/g,"").trim()));
    } catch(e) { showToast(e.message==="NETWORK"?"Network error":"Couldn't parse SMS","warn"); }
    setLoading(false);
  };
  return (
    <div style={ML.ov} onClick={onClose}>
      <div style={{...ML.sh,maxHeight:"90vh"}} onClick={e=>e.stopPropagation()}>
        <ModalHdr th={th} title="📩 MoMo SMS Parser" onClose={onClose}/>
        {!result&&<>
          {!hasKey&&(
            <div style={{background:"rgba(255,209,102,0.08)",border:"1px solid rgba(255,209,102,0.2)",borderRadius:12,padding:"10px 14px",fontSize:12,color:"#FFD166",marginBottom:12}}>
              🔑 Needs API key — add it in ⚙️ Settings → AI Key
            </div>
          )}
          <div style={{background:"rgba(6,214,160,0.07)",border:"1px solid rgba(6,214,160,0.15)",borderRadius:12,padding:"10px 14px",fontSize:12,color:th.textMid,lineHeight:1.5,marginBottom:14}}>Paste any MTN MoMo, Airtel Money, or M-Pesa SMS — Akili logs it automatically.</div>
          <textarea style={{...ML.input,height:90,resize:"none",lineHeight:1.5,marginBottom:12}} placeholder="Paste your MoMo SMS here..." value={sms} onChange={e=>setSms(e.target.value)}/>
          <div style={{fontSize:11,color:th.textSub,fontWeight:700,marginBottom:8}}>OR TRY A SAMPLE:</div>
          {SAMPLES.map((s,i)=><button key={i} style={{display:"block",width:"100%",textAlign:"left",background:th.bg3,border:`1px solid ${th.border}`,borderRadius:10,padding:"8px 12px",color:th.textMid,fontSize:11,cursor:"pointer",marginBottom:6,lineHeight:1.4,fontFamily:"inherit"}} onClick={()=>setSms(s)}>{s.slice(0,65)}...</button>)}
          <div style={{display:"flex",gap:10,marginTop:8}}>
            <button style={ML.cancelBtn} onClick={onClose}>Cancel</button>
            <button style={{...ML.saveBtn,opacity:sms.trim()&&!loading?1:0.4}} disabled={!sms.trim()||loading} onClick={parse}>{loading?"Parsing...":"Parse SMS →"}</button>
          </div>
        </>}
        {result&&<>
          <ResultCard th={th} result={result} setResult={setResult}/>
          <div style={{display:"flex",gap:10,marginTop:16}}>
            <button style={ML.cancelBtn} onClick={()=>setResult(null)}>Re-parse</button>
            <button style={ML.saveBtn} onClick={()=>{haptic();onAdd({...result,amount:parseInt(result.amount)||0});onClose();}}>Save Transaction</button>
          </div>
        </>}
      </div>
    </div>
  );
}

// ── REPORT MODAL ──────────────────────────────────────────────────
function ReportModal({ store, income, expense, balance, savRate, topCats, catSpend, onClose, showToast, th }) {
  const [loading,setLoading]=useState(false);
  const [report,setReport]=useState(null);
  const ML=makeML(th);
  const hasKey=!!getKey();
  const generate=async()=>{
    if(!hasKey){showToast("Add API key in ⚙️ Settings → AI Key","warn");return;}
    setLoading(true);
    try {
      const d=await callClaude({model:MODEL,max_tokens:1000,messages:[{role:"user",content:`Write a monthly financial report for ${store.profile.name||"User"} in Uganda.\nIncome=${fmtUGX(income)}, Expenses=${fmtUGX(expense)}, Balance=${fmtUGX(balance)}, Savings=${savRate}%\nSpending: ${topCats.map(([c,v])=>`${c}=${fmtUGX(v)}`).join(", ")}\nGoals: ${store.goals.map(g=>`${g.name} ${Math.round(g.saved/g.target*100)}%`).join(", ")}\nBudget overages: ${topCats.filter(([c,v])=>store.budgets[c]>0&&v>store.budgets[c]).map(([c])=>c).join(", ")||"none"}\nInclude: 1) Executive Summary 2) Income & Expense Analysis 3) Top 3 Wins 4) Top 3 Concerns 5) 3 Action Items. Use UGX numbers.`}]});
      setReport(d.content?.[0]?.text||"Failed.");
    } catch(e) { showToast(e.message==="NETWORK"?"Network error":"Report failed: "+e.message,"warn"); }
    setLoading(false);
  };
  const md=txt=>txt.replace(/^#{1,3}\s(.+)$/gm,`<div style='font-size:14px;font-weight:900;margin:14px 0 6px;color:#06D6A0'>$1</div>`).replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>").replace(/\n/g,"<br/>");
  const shareReport = () => {
    if (navigator.share) { navigator.share({title:"Akili Monthly Report",text:report}).catch(()=>{}); }
    else { navigator.clipboard?.writeText(report); showToast("Copied ✓"); }
  };
  return (
    <div style={ML.ov} onClick={onClose}>
      <div style={{...ML.sh,maxHeight:"90vh"}} onClick={e=>e.stopPropagation()}>
        <ModalHdr th={th} title="📊 Monthly Report" onClose={onClose}/>
        {!report&&!loading&&<>
          {!hasKey&&(
            <div style={{background:"rgba(255,209,102,0.08)",border:"1px solid rgba(255,209,102,0.2)",borderRadius:12,padding:"10px 14px",fontSize:12,color:"#FFD166",marginBottom:12}}>
              🔑 Needs API key — add it in ⚙️ Settings → AI Key
            </div>
          )}
          <div style={{background:th.bg3,border:`2px dashed ${th.border}`,borderRadius:20,padding:"36px 20px",textAlign:"center",marginBottom:14,cursor:hasKey?"pointer":"default",opacity:hasKey?1:0.6}} onClick={()=>hasKey&&generate()}>
            <div style={{fontSize:48,marginBottom:12}}>📊</div>
            <div style={{fontWeight:800,fontSize:15,marginBottom:6,color:th.text}}>{monthLbl(nowMonth())} Financial Report</div>
            <div style={{fontSize:12,color:th.textSub}}>AI generates a full analysis of your month</div>
          </div>
          <div style={{display:"flex",justifyContent:"space-around",background:th.bg3,borderRadius:14,padding:"14px",marginBottom:16}}>
            {[[fmtUGX(income),"Income","#06D6A0"],[fmtUGX(expense),"Expenses","#EF476F"],[savRate+"%","Saved","#FFD166"]].map(([v,l,c])=>(
              <div key={l} style={{textAlign:"center"}}><div style={{fontSize:15,fontWeight:900,color:c}}>{v}</div><div style={{fontSize:10,color:th.textSub,fontWeight:700}}>{l}</div></div>
            ))}
          </div>
          <button style={{...ML.saveBtn,opacity:hasKey?1:0.45}} onClick={generate}>Generate Report</button>
        </>}
        {loading&&<div style={{textAlign:"center",padding:"40px 20px"}}><div style={{fontSize:48,marginBottom:16,display:"inline-block",animation:"spin 1s linear infinite"}}>📊</div><div style={{fontWeight:800,fontSize:15,color:th.text}}>Writing your report...</div></div>}
        {report&&<>
          <div style={{background:th.bg3,border:`1px solid ${th.border}`,borderRadius:16,padding:"16px",overflowY:"auto",maxHeight:"52vh",fontSize:13,lineHeight:1.7,color:th.text}} dangerouslySetInnerHTML={{__html:md(report)}}/>
          <div style={{display:"flex",gap:10,marginTop:14}}>
            <button style={ML.cancelBtn} onClick={()=>setReport(null)}>Regenerate</button>
            <button style={ML.saveBtn} onClick={shareReport}>
              {navigator.share ? "Share Report 📤" : "Copy Report 📋"}
            </button>
          </div>
        </>}
      </div>
    </div>
  );
}

// ── ALERTS ────────────────────────────────────────────────────────
function AlertsModal({ alerts, onRead, onClose, th }) {
  const ML=makeML(th);
  const colors={warning:"#FFD166",success:"#06D6A0",momo:"#4ECDC4"};
  return (
    <div style={ML.ov} onClick={onClose}>
      <div style={ML.sh} onClick={e=>e.stopPropagation()}>
        <ModalHdr th={th} title="🔔 Alerts" onClose={()=>{onRead();onClose();}}/>
        {alerts.length===0
          ? <div style={{textAlign:"center",padding:"30px 0",color:th.textSub}}>
              <div style={{fontSize:36,marginBottom:8}}>🔔</div>
              <div>No alerts yet</div>
            </div>
          : alerts.map(a=>{
            const c=colors[a.type]||"#FFD166";
            return <div key={a.id} style={{display:"flex",gap:12,padding:"12px",borderRadius:14,background:c+"11",border:`1px solid ${c}22`,marginBottom:10,opacity:a.read?0.55:1}}>
              <div style={{flex:1}}><div style={{fontSize:13,fontWeight:a.read?600:800,lineHeight:1.5,color:th.text}}>{a.text}</div><div style={{fontSize:10,color:th.textSub,marginTop:3}}>{a.time}</div></div>
              {!a.read&&<div style={{width:8,height:8,borderRadius:"50%",background:c,marginTop:4,flexShrink:0}}/>}
            </div>;
          })}
        {alerts.length>0&&<button style={{...ML.saveBtn,marginTop:10}} onClick={()=>{onRead();onClose();}}>Mark All Read</button>}
      </div>
    </div>
  );
}

// ── PARTNER (Fix #3 + #7) ─────────────────────────────────────────
function PartnerModal({ store, set, partner, onSave, onClose, th, showToast }) {
  const [view, setView] = useState(partner ? "dashboard" : "setup");
  const [name, setName] = useState(partner?.name||"");
  const [color, setColor] = useState(partner?.color||"#7B8CDE");
  const [showAddTx, setShowAddTx] = useState(false);
  const [ptxForm, setPtxForm] = useState({type:"expense",amount:"",category:"Food",desc:"",date:toDay()});
  const ML = makeML(th);
  const COLORS = ["#7B8CDE","#06D6A0","#EF476F","#FFD166","#4ECDC4","#FFB347","#96CEB4","#118AB2"];

  const myName = store.profile.name||"You";
  const partnerName = partner?.name||"Partner";
  const myTx = store.transactions.filter(tx=>!tx.addedBy||tx.addedBy==="me");
  const partnerTx = store.transactions.filter(tx=>tx.addedBy==="partner");
  const mySpend = myTx.filter(t=>t.type==="expense").reduce((a,t)=>a+t.amount,0);
  const partnerSpend = partnerTx.filter(t=>t.type==="expense").reduce((a,t)=>a+t.amount,0);
  const myIncome = myTx.filter(t=>t.type==="income").reduce((a,t)=>a+t.amount,0);
  const partnerIncome = partnerTx.filter(t=>t.type==="income").reduce((a,t)=>a+t.amount,0);

  const addPartnerTx = () => {
    if (!ptxForm.amount || !ptxForm.desc.trim()) return;
    haptic();
    set(s=>({...s,transactions:[...s.transactions,{...ptxForm,id:uid(),amount:parseUGX(ptxForm.amount),addedBy:"partner"}]}));
    showToast(`Added for ${partnerName} ✓`);
    setShowAddTx(false);
    setPtxForm({type:"expense",amount:"",category:"Food",desc:"",date:toDay()});
  };

  if (view==="setup") return (
    <div style={ML.ov} onClick={onClose}>
      <div style={ML.sh} onClick={e=>e.stopPropagation()}>
        <ModalHdr th={th} title="👥 Link a Partner" onClose={onClose}/>
        <div style={{background:"rgba(6,214,160,0.07)",border:"1px solid rgba(6,214,160,0.15)",borderRadius:12,padding:"10px 14px",fontSize:12,color:th.textMid,lineHeight:1.6,marginBottom:14}}>
          👫 Link your partner to track income, expenses and goals side by side. Both can add transactions and see who added what.
        </div>
        <div style={{fontSize:11,color:th.textSub,fontWeight:800,letterSpacing:"0.8px",marginBottom:6}}>PARTNER'S NAME</div>
        <input style={ML.input} placeholder="e.g. Sarah, James, Partner..." value={name} onChange={e=>setName(e.target.value)} autoFocus/>
        <div style={{fontSize:11,color:th.textSub,fontWeight:700,marginBottom:10}}>PARTNER COLOUR</div>
        <div style={{display:"flex",gap:10,marginBottom:20,flexWrap:"wrap"}}>
          {COLORS.map(c=><button key={c} style={{width:34,height:34,borderRadius:"50%",background:c,border:color===c?"3px solid white":"3px solid transparent",cursor:"pointer"}} onClick={()=>setColor(c)}/>)}
        </div>
        <div style={{display:"flex",gap:10}}>
          <button style={ML.cancelBtn} onClick={onClose}>Cancel</button>
          <button style={{...ML.saveBtn,opacity:name.trim()?1:0.4}} disabled={!name.trim()} onClick={()=>{haptic();onSave({name,color});setView("dashboard");}}>Link Partner ✓</button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={ML.ov} onClick={onClose}>
      <div style={{...ML.sh,maxHeight:"92vh"}} onClick={e=>e.stopPropagation()}>
        <ModalHdr th={th} title="👥 Shared Finances" onClose={onClose}/>

        {/* Side-by-side scorecards */}
        <div style={{display:"flex",gap:10,marginBottom:16}}>
          {[
            {label:myName,color:"#06D6A0",income:myIncome,spend:mySpend,count:myTx.length},
            {label:partnerName,color:partner?.color||"#7B8CDE",income:partnerIncome,spend:partnerSpend,count:partnerTx.length},
          ].map(p=>(
            <div key={p.label} style={{flex:1,background:p.color+"0D",border:`1px solid ${p.color}33`,borderRadius:16,padding:"12px 10px",textAlign:"center"}}>
              <div style={{width:36,height:36,borderRadius:11,background:p.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:900,color:"#080C16",margin:"0 auto 8px"}}>{p.label[0]?.toUpperCase()}</div>
              <div style={{fontSize:12,fontWeight:800,color:th.text,marginBottom:6}}>{p.label}</div>
              <div style={{fontSize:11,color:"#06D6A0",fontWeight:700}}>+{fmtC(p.income)}</div>
              <div style={{fontSize:11,color:"#EF476F",fontWeight:700}}>-{fmtC(p.spend)}</div>
              <div style={{fontSize:10,color:th.textSub,marginTop:3}}>{p.count} txns</div>
            </div>
          ))}
        </div>

        {/* Recent partner transactions */}
        <div style={{fontSize:11,fontWeight:800,color:th.textSub,letterSpacing:"0.8px",textTransform:"uppercase",marginBottom:8}}>
          {partnerName}'s Recent Transactions
        </div>
        {partnerTx.length===0
          ? <div style={{fontSize:12,color:th.textSub,textAlign:"center",padding:"12px 0 16px",background:th.bg3,borderRadius:12,marginBottom:12}}>No transactions from {partnerName} yet</div>
          : partnerTx.slice(-4).reverse().map(tx=>(
            <div key={tx.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",background:th.bg3,borderRadius:12,marginBottom:7,border:`1px solid ${th.border}`}}>
              <span style={{fontSize:16}}>{CAT_META[tx.category]?.icon||"📦"}</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:th.text}}>{tx.desc}</div>
                <div style={{fontSize:10,color:th.textSub}}>{tx.category} · {tx.date}</div>
              </div>
              <div style={{fontSize:12,fontWeight:900,color:tx.type==="income"?"#06D6A0":"#EF476F"}}>{tx.type==="income"?"+":"-"}{fmtC(tx.amount)}</div>
            </div>
          ))
        }

        {/* Fix #7: Proper modal form for adding partner transaction (no prompt()) */}
        {showAddTx ? (
          <div style={{background:th.bg3,border:`1px solid ${th.border2}`,borderRadius:16,padding:"14px",marginBottom:12}}>
            <div style={{fontSize:13,fontWeight:800,color:th.text,marginBottom:12}}>Add for {partnerName}</div>
            <div style={{display:"flex",gap:8,marginBottom:10}}>
              {["expense","income"].map(type=>(
                <button key={type} style={{flex:1,padding:"8px",borderRadius:10,border:`1px solid ${th.border}`,background:ptxForm.type===type?"rgba(6,214,160,0.12)":th.filterInactive,color:ptxForm.type===type?"#06D6A0":th.textSub,fontWeight:800,fontSize:12,cursor:"pointer",fontFamily:"inherit"}} onClick={()=>setPtxForm(f=>({...f,type}))}>
                  {type==="income"?"↑ Income":"↓ Expense"}
                </button>
              ))}
            </div>
            <div style={{position:"relative",marginBottom:10}}>
              <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",fontSize:10,fontWeight:800,color:"#06D6A0",zIndex:1}}>UGX</span>
              <UGXInput value={ptxForm.amount} onChange={v=>setPtxForm(f=>({...f,amount:v}))} placeholder="Amount" style={{...ML.input,paddingLeft:50,marginBottom:0,fontSize:13}} autoFocus={true}/>
            </div>
            <input style={{...ML.input,marginBottom:10}} placeholder="Description (e.g. Taxi fare)" value={ptxForm.desc} onChange={e=>{
              const desc=e.target.value;
              const suggested=suggestCategory(desc);
              setPtxForm(f=>({...f,desc,...(suggested?{category:suggested}:{})}));
            }}/>
            <select style={{...ML.input,marginBottom:10}} value={ptxForm.category} onChange={e=>setPtxForm(f=>({...f,category:e.target.value}))}>{CATS.map(c=><option key={c}>{c}</option>)}</select>
            <div style={{display:"flex",gap:8}}>
              <button style={ML.cancelBtn} onClick={()=>setShowAddTx(false)}>Cancel</button>
              <button style={{...ML.saveBtn,opacity:ptxForm.amount&&ptxForm.desc.trim()?1:0.4}} disabled={!ptxForm.amount||!ptxForm.desc.trim()} onClick={addPartnerTx}>Save ✓</button>
            </div>
          </div>
        ) : (
          <button style={{...ML.saveBtn,marginBottom:10}} onClick={()=>{haptic();setShowAddTx(true);}}>
            + Add Transaction for {partnerName}
          </button>
        )}

        <button style={{...ML.cancelBtn,color:"#EF476F",width:"100%"}} onClick={()=>{haptic(20);onSave(null);}}>Remove Partner</button>
      </div>
    </div>
  );
}

// ── SETTINGS MODAL ────────────────────────────────────────────────
function SettingsModal({ store, set, ops, onClose, showToast, th, themeName }) {
  const [section,setSection]=useState("profile");
  const [name,setName]=useState(store.profile.name||"");
  const [income,setIncome]=useState(store.profile.income||"");
  const [apiKey,setApiKey]=useState(()=>{ try{return localStorage.getItem("akili_api_key")||"";}catch{return "";} });
  const ML=makeML(th);
  const saveProfile=()=>{ set(s=>({...s,profile:{...s.profile,name,income:parseUGX(income)||0}})); showToast("Profile updated ✓"); };
  const saveApiKey=()=>{ saveKey(apiKey); showToast("API key saved ✓"); };
  const SECTIONS=[{id:"profile",icon:"👤",label:"Profile"},{id:"ai",icon:"🤖",label:"AI Key"},{id:"display",icon:"🎨",label:"Display"},{id:"data",icon:"💾",label:"Data"},{id:"about",icon:"ℹ️",label:"About"}];
  const Row=({icon,label,children,danger})=>(
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"13px 0",borderBottom:`1px solid ${th.border}`}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontSize:18}}>{icon}</span>
        <span style={{fontSize:13,fontWeight:700,color:danger?"#EF476F":th.text}}>{label}</span>
      </div>
      <div>{children}</div>
    </div>
  );
  const Toggle=({value,onChange})=>(
    <div onClick={()=>onChange(!value)} style={{width:44,height:24,borderRadius:12,background:value?"#06D6A0":th.border,cursor:"pointer",position:"relative",transition:"background 0.2s",flexShrink:0}}>
      <div style={{position:"absolute",top:3,left:value?23:3,width:18,height:18,borderRadius:"50%",background:"#fff",transition:"left 0.2s",boxShadow:"0 2px 6px rgba(0,0,0,0.3)"}}/>
    </div>
  );
  const [notifs,setNotifs]=useState(store.settings?.notifs!==false);
  const [budgetAlerts,setBudgetAlerts]=useState(store.settings?.budgetAlerts!==false);
  return (
    <div style={ML.ov} onClick={onClose}>
      <div style={{...ML.sh,maxHeight:"92vh",padding:"0 0 36px",background:th.settingsBg}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"20px 20px 0"}}>
          <div style={{fontSize:18,fontWeight:900,color:th.text}}>⚙️ Settings</div>
          <button style={ML.closeX} onClick={onClose}>✕</button>
        </div>
        <div style={{display:"flex",gap:6,padding:"14px 20px 0",overflowX:"auto"}}>
          {SECTIONS.map(s=>(
            <button key={s.id} onClick={()=>{haptic();setSection(s.id);}} style={{flexShrink:0,display:"flex",alignItems:"center",gap:6,padding:"8px 14px",borderRadius:20,border:`1px solid ${th.border}`,background:section===s.id?"rgba(6,214,160,0.15)":th.sectionTabInactive,color:section===s.id?"#06D6A0":th.textSub,fontWeight:800,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
              {s.icon} {s.label}
            </button>
          ))}
        </div>
        <div style={{padding:"0 20px",overflowY:"auto",maxHeight:"70vh"}}>
          {section==="profile"&&(
            <div style={{paddingTop:16}}>
              <div style={{display:"flex",justifyContent:"center",marginBottom:20}}>
                <div style={{width:72,height:72,borderRadius:22,background:"linear-gradient(135deg,#06D6A0,#0CB8D4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,fontWeight:900,color:"#080C16"}}>{(name||"?")[0]?.toUpperCase()}</div>
              </div>
              <div style={{fontSize:11,color:th.textSub,fontWeight:800,letterSpacing:"0.8px",marginBottom:6}}>YOUR NAME</div>
              <input style={ML.input} value={name} onChange={e=>setName(e.target.value)} placeholder="Your name"/>
              <div style={{fontSize:11,color:th.textSub,fontWeight:800,letterSpacing:"0.8px",marginBottom:6}}>MONTHLY INCOME (UGX)</div>
              <div style={{position:"relative",marginBottom:14}}>
                <span style={{position:"absolute",left:16,top:"50%",transform:"translateY(-50%)",fontSize:11,fontWeight:800,color:"#06D6A0",zIndex:1}}>UGX</span>
                <UGXInput value={income} onChange={setIncome} placeholder="e.g. 1,500,000" style={{...ML.input,paddingLeft:55,marginBottom:0}}/>
              </div>
              <button style={ML.saveBtn} onClick={saveProfile}>Save Profile ✓</button>
            </div>
          )}
          {section==="ai"&&(
            <div style={{paddingTop:16}}>
              {apiKey?(
                <div style={{background:"rgba(6,214,160,0.08)",border:"1px solid rgba(6,214,160,0.2)",borderRadius:14,padding:"14px",marginBottom:14,display:"flex",alignItems:"center",gap:12}}>
                  <span style={{fontSize:22}}>✅</span>
                  <div><div style={{fontSize:13,fontWeight:800,color:"#06D6A0"}}>API Key Active</div><div style={{fontSize:11,color:th.textSub}}>{"sk-ant-..."+apiKey.slice(-6)}</div></div>
                </div>
              ):(
                <div style={{background:"rgba(239,71,111,0.08)",border:"1px solid rgba(239,71,111,0.2)",borderRadius:14,padding:"14px",marginBottom:14}}>
                  <div style={{fontSize:13,fontWeight:800,color:"#EF476F",marginBottom:8}}>⚠️ No API key — AI features disabled</div>
                  <div style={{fontSize:11,color:th.textSub,lineHeight:1.7}}>
                    {["1. Visit console.anthropic.com","2. Sign up (it's free)","3. Click API Keys → Create Key","4. Copy and paste it below"].map((s,i)=>(
                      <div key={i} style={{display:"flex",gap:8,marginBottom:4}}>
                        <span style={{color:"#06D6A0",fontWeight:800,minWidth:14}}>{i+1}.</span>
                        <span>{s.slice(3)}</span>
                      </div>
                    ))}
                    <div style={{marginTop:6,padding:"6px 10px",background:"rgba(6,214,160,0.07)",borderRadius:8}}>💡 New accounts get free credits — enough to get started!</div>
                  </div>
                </div>
              )}
              <div style={{fontSize:11,color:th.textSub,fontWeight:800,letterSpacing:"0.8px",marginBottom:6}}>PASTE YOUR KEY BELOW</div>
              <input style={{...ML.input,fontFamily:"monospace",fontSize:12}} type="password" placeholder="sk-ant-api03-..." value={apiKey} onChange={e=>setApiKey(e.target.value)}/>
              <button style={{...ML.saveBtn,opacity:apiKey?1:0.4}} disabled={!apiKey} onClick={saveApiKey}>Save API Key ✓</button>
              {apiKey&&<button style={{...ML.cancelBtn,marginTop:10,width:"100%",color:"#EF476F"}} onClick={()=>{setApiKey("");saveKey("");showToast("Key removed","warn");}}>Remove Key</button>}
            </div>
          )}
          {section==="display"&&(
            <div style={{paddingTop:16}}>
              <Row icon={themeName==="dark"?"🌙":"☀️"} label="Theme">
                <button onClick={()=>{haptic();ops.toggleTheme();}} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 14px",borderRadius:20,border:`1px solid ${th.border}`,background:th.bg3,color:th.text,fontWeight:800,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
                  {themeName==="dark"?"☀️ Switch to Light":"🌙 Switch to Dark"}
                </button>
              </Row>
              <Row icon="🔔" label="Budget alerts"><Toggle value={budgetAlerts} onChange={setBudgetAlerts}/></Row>
              <Row icon="📣" label="Notifications"><Toggle value={notifs} onChange={setNotifs}/></Row>
            </div>
          )}
          {section==="data"&&(
            <div style={{paddingTop:16}}>
              <div style={{display:"flex",gap:10,marginBottom:20}}>
                {[[store.transactions.length,"Transactions"],[store.goals.length,"Goals"],[Object.values(store.budgets).filter(v=>v>0).length,"Budgets"]].map(([v,l])=>(
                  <div key={l} style={{flex:1,background:th.bg3,border:`1px solid ${th.border}`,borderRadius:14,padding:"12px 10px",textAlign:"center"}}>
                    <div style={{fontSize:22,fontWeight:900,color:"#06D6A0"}}>{v}</div>
                    <div style={{fontSize:10,color:th.textSub,fontWeight:700}}>{l}</div>
                  </div>
                ))}
              </div>
              <Row icon="📤" label="Export as CSV"><button onClick={()=>{haptic();ops.exportCSV();}} style={{background:"rgba(6,214,160,0.12)",border:"1px solid rgba(6,214,160,0.25)",borderRadius:10,padding:"7px 14px",color:"#06D6A0",fontWeight:800,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>Export</button></Row>
              <Row icon="🔄" label="Re-run onboarding"><button onClick={()=>{set(s=>({...s,onboarded:false}));onClose();}} style={{background:th.bg3,border:`1px solid ${th.border}`,borderRadius:10,padding:"7px 14px",color:th.textMid,fontWeight:800,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>Run</button></Row>
              <Row icon="🗑️" label="Clear AI chat"><button onClick={()=>{set(s=>({...s,messages:[]}));showToast("Chat cleared ✓");}} style={{background:"rgba(255,209,102,0.1)",border:"1px solid rgba(255,209,102,0.2)",borderRadius:10,padding:"7px 14px",color:"#FFD166",fontWeight:800,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>Clear</button></Row>
              <Row icon="⚠️" label="Reset all data" danger><button onClick={ops.reset} style={{background:"rgba(239,71,111,0.12)",border:"1px solid rgba(239,71,111,0.25)",borderRadius:10,padding:"7px 14px",color:"#EF476F",fontWeight:800,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>Reset</button></Row>
            </div>
          )}
          {section==="about"&&(
            <div style={{paddingTop:20}}>
              <div style={{textAlign:"center",marginBottom:24}}>
                <div style={{width:72,height:72,borderRadius:22,background:"linear-gradient(135deg,#06D6A0,#0CB8D4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:34,fontWeight:900,color:"#080C16",margin:"0 auto 12px"}}>₳</div>
                <div style={{fontSize:20,fontWeight:900,color:th.text}}>Akili Finance</div>
                <div style={{fontSize:12,color:th.textSub,marginTop:4}}>Version 5.0 · Built for East Africa</div>
              </div>
              {[
                {icon:"🤖",title:"AI-Powered",desc:"Claude AI reads receipts, parses MoMo SMS & coaches your finances."},
                {icon:"📴",title:"Works Offline",desc:"All core features work without internet. Data is cached on your device."},
                {icon:"🔒",title:"Your data stays local",desc:"All data stored on your device only. Nothing sent to any server except AI queries."},
                {icon:"💱",title:"Built for Uganda",desc:"UGX-first, MoMo-aware, understands Kampala pricing and local context."},
              ].map(f=>(
                <div key={f.title} style={{display:"flex",gap:12,padding:"12px 0",borderBottom:`1px solid ${th.border}`}}>
                  <span style={{fontSize:22}}>{f.icon}</span>
                  <div><div style={{fontSize:13,fontWeight:800,marginBottom:2,color:th.text}}>{f.title}</div><div style={{fontSize:11,color:th.textSub,lineHeight:1.5}}>{f.desc}</div></div>
                </div>
              ))}
              <div style={{textAlign:"center",marginTop:20,fontSize:11,color:th.textSub,fontWeight:700}}>Made with ❤️ for East Africa</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── SHARED MODALS ─────────────────────────────────────────────────
function TxModal({ initial, onSave, onClose, isEdit, th }) {
  const [f,setF]=useState(initial||{type:"expense",amount:"",category:"Food",desc:"",date:toDay()});
  const ML=makeML(th);
  const ok=f.amount&&parseUGX(f.amount)>0&&f.desc.trim();
  return (
    <div style={ML.ov} onClick={onClose}>
      <div style={ML.sh} onClick={e=>e.stopPropagation()}>
        <ModalHdr th={th} title={`${isEdit?"Edit":"New"} Transaction`} onClose={onClose}/>
        <div style={{display:"flex",gap:10,marginBottom:14}}>
          {["expense","income"].map(type=><button key={type} style={{flex:1,padding:"10px",borderRadius:12,border:`1px solid ${th.border}`,background:f.type===type?"rgba(6,214,160,0.12)":th.filterInactive,color:f.type===type?"#06D6A0":th.textSub,fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"inherit"}} onClick={()=>setF(x=>({...x,type}))}>{type==="income"?"↑ Income":"↓ Expense"}</button>)}
        </div>
        <div style={{position:"relative",marginBottom:12}}>
          <span style={{position:"absolute",left:16,top:"50%",transform:"translateY(-50%)",fontSize:11,fontWeight:800,color:"#06D6A0",zIndex:1}}>UGX</span>
          <UGXInput value={f.amount} onChange={v=>setF(x=>({...x,amount:v}))} placeholder="0" autoFocus={true} style={{...ML.input,paddingLeft:55,marginBottom:0}}/>
        </div>
        <input style={ML.input} placeholder="Description (e.g. Boda fare, UMEME bill)" value={f.desc} onChange={e=>{
          const desc=e.target.value;
          const suggested=suggestCategory(desc);
          setF(x=>({...x,desc,...(suggested&&!isEdit?{category:suggested}:{})}));
        }}/>
        <select style={ML.input} value={f.category} onChange={e=>setF(x=>({...x,category:e.target.value}))}>{CATS.map(c=><option key={c}>{c}</option>)}</select>
        <input style={ML.input} type="date" value={f.date} onChange={e=>setF(x=>({...x,date:e.target.value}))}/>
        <div style={{display:"flex",gap:10}}>
          <button style={ML.cancelBtn} onClick={onClose}>Cancel</button>
          <button style={{...ML.saveBtn,opacity:ok?1:0.4}} disabled={!ok} onClick={()=>{haptic();onSave({...f,amount:parseUGX(f.amount)});}}>{isEdit?"Update":"Save"}</button>
        </div>
      </div>
    </div>
  );
}

function GoalModal({ onSave, onClose, th }) {
  const [f,setF]=useState({name:"",target:"",saved:"",icon:"🎯",color:"#06D6A0"});
  const ML=makeML(th);
  const ok=f.name.trim()&&f.target&&parseUGX(f.target)>0;
  return (
    <div style={ML.ov} onClick={onClose}>
      <div style={ML.sh} onClick={e=>e.stopPropagation()}>
        <ModalHdr th={th} title="New Goal" onClose={onClose}/>
        <input style={ML.input} placeholder="Goal name (e.g. Emergency Fund)" value={f.name} onChange={e=>setF(x=>({...x,name:e.target.value}))} autoFocus/>
        <div style={{position:"relative",marginBottom:12}}>
          <span style={{position:"absolute",left:16,top:"50%",transform:"translateY(-50%)",fontSize:11,fontWeight:800,color:"#06D6A0",zIndex:1}}>UGX</span>
          <UGXInput value={f.target} onChange={v=>setF(x=>({...x,target:v}))} placeholder="Target amount" style={{...ML.input,paddingLeft:55,marginBottom:0}}/>
        </div>
        <div style={{position:"relative",marginBottom:14}}>
          <span style={{position:"absolute",left:16,top:"50%",transform:"translateY(-50%)",fontSize:11,fontWeight:800,color:"#06D6A0",zIndex:1}}>UGX</span>
          <UGXInput value={f.saved} onChange={v=>setF(x=>({...x,saved:v}))} placeholder="Already saved (optional)" style={{...ML.input,paddingLeft:55,marginBottom:0}}/>
        </div>
        <div style={{fontSize:11,color:th.textSub,fontWeight:700,marginBottom:8}}>ICON</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:16}}>{GOAL_ICONS.map(ic=><button key={ic} style={{width:40,height:40,borderRadius:11,border:f.icon===ic?`2px solid #06D6A0`:`1px solid ${th.border}`,background:f.icon===ic?"rgba(6,214,160,0.12)":th.bg3,fontSize:19,cursor:"pointer"}} onClick={()=>setF(x=>({...x,icon:ic}))}>{ic}</button>)}</div>
        <div style={{fontSize:11,color:th.textSub,fontWeight:700,marginBottom:8}}>COLOR</div>
        <div style={{display:"flex",gap:10,marginBottom:20,flexWrap:"wrap"}}>{GOAL_COLORS.map(c=><button key={c} style={{width:32,height:32,borderRadius:"50%",background:c,border:f.color===c?"3px solid white":"3px solid transparent",cursor:"pointer"}} onClick={()=>setF(x=>({...x,color:c}))}/>)}</div>
        <div style={{display:"flex",gap:10}}>
          <button style={ML.cancelBtn} onClick={onClose}>Cancel</button>
          <button style={{...ML.saveBtn,opacity:ok?1:0.4}} disabled={!ok} onClick={()=>{haptic();onSave({...f,target:parseUGX(f.target),saved:parseUGX(f.saved)||0});}}>Create Goal</button>
        </div>
      </div>
    </div>
  );
}

function BudgetModal({ budgets, catSpend, onSave, onClose, th }) {
  const [b,setB]=useState({...budgets});
  const ML=makeML(th);
  return (
    <div style={ML.ov} onClick={onClose}>
      <div style={{...ML.sh,maxHeight:"80vh"}} onClick={e=>e.stopPropagation()}>
        <ModalHdr th={th} title="Monthly Budgets" onClose={onClose}/>
        <div style={{overflowY:"auto",maxHeight:"55vh",marginBottom:14}}>
          {CATS.map(c=>(
            <div key={c} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,padding:"10px 0",borderBottom:`1px solid ${th.border}`}}>
              <div style={{display:"flex",alignItems:"center",gap:10,flex:1}}>
                <span style={{fontSize:18}}>{CAT_META[c].icon}</span>
                <div><div style={{fontSize:13,fontWeight:700,color:th.text}}>{c}</div><div style={{fontSize:10,color:th.textSub}}>Spent: {fmtC(catSpend[c]||0)}</div></div>
              </div>
              <div style={{position:"relative"}}>
                <span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",fontSize:9,fontWeight:800,color:"#06D6A0",zIndex:1}}>UGX</span>
                <UGXInput value={b[c]||""} onChange={v=>setB(x=>({...x,[c]:v||0}))} placeholder="0" style={{width:120,background:th.inputBg,border:`1px solid ${th.border3}`,borderRadius:10,padding:"8px 8px 8px 38px",color:th.text,fontSize:12,outline:"none",fontFamily:"inherit"}}/>
              </div>
            </div>
          ))}
        </div>
        <div style={{display:"flex",gap:10}}>
          <button style={ML.cancelBtn} onClick={onClose}>Cancel</button>
          <button style={ML.saveBtn} onClick={()=>{haptic();onSave(b);}}>Save Budgets</button>
        </div>
      </div>
    </div>
  );
}

function DepositModal({ goal, onSave, onClose, th }) {
  const [amt,setAmt]=useState("");
  const [source,setSource]=useState("balance");
  const ML=makeML(th);
  const ok = amt && parseUGX(amt) > 0;
  const SOURCES = [
    {id:"balance",icon:"💳",label:"Deduct from balance",sub:"Automatically logged as expense"},
    {id:"external",icon:"💵",label:"External / other source",sub:"Cash, gift, side income, etc."},
  ];
  return (
    <div style={ML.ov} onClick={onClose}>
      <div style={ML.sh} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
          <div style={{width:48,height:48,borderRadius:15,background:goal.color+"18",border:`2px solid ${goal.color}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>{goal.icon}</div>
          <div style={{flex:1}}><div style={{fontSize:16,fontWeight:800,color:th.text}}>{goal.name}</div><div style={{fontSize:12,color:th.textSub}}>{fmtUGX(goal.saved)} / {fmtUGX(goal.target)}</div></div>
        </div>
        <div style={{fontSize:11,color:th.textSub,fontWeight:800,letterSpacing:"0.8px",marginBottom:8}}>AMOUNT TO ADD (UGX)</div>
        <div style={{position:"relative",marginBottom:14}}>
          <span style={{position:"absolute",left:16,top:"50%",transform:"translateY(-50%)",fontSize:11,fontWeight:800,color:"#06D6A0",zIndex:1}}>UGX</span>
          <UGXInput value={amt} onChange={setAmt} placeholder="0" autoFocus={true} style={{...ML.input,paddingLeft:55,marginBottom:0}}/>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20}}>
          {SOURCES.map(s=>(
            <button key={s.id} onClick={()=>setSource(s.id)} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:14,border:source===s.id?`2px solid #06D6A0`:`1px solid ${th.border}`,background:source===s.id?"rgba(6,214,160,0.08)":th.bg3,cursor:"pointer",textAlign:"left",fontFamily:"inherit",transition:"all 0.15s"}}>
              <span style={{fontSize:22}}>{s.icon}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:800,color:source===s.id?"#06D6A0":th.text}}>{s.label}</div>
                <div style={{fontSize:11,color:th.textSub,marginTop:2}}>{s.sub}</div>
              </div>
              <div style={{width:20,height:20,borderRadius:"50%",border:source===s.id?"none":`2px solid ${th.border}`,background:source===s.id?"#06D6A0":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:11,color:"#080C16",fontWeight:900}}>{source===s.id?"✓":""}</div>
            </button>
          ))}
        </div>
        {source==="balance"&&ok&&(
          <div style={{background:"rgba(255,209,102,0.08)",border:"1px solid rgba(255,209,102,0.2)",borderRadius:12,padding:"10px 14px",fontSize:12,color:"#FFD166",marginBottom:16,lineHeight:1.5}}>
            ⚠️ <strong>{fmtUGX(parseUGX(amt))}</strong> will be deducted from your account balance.
          </div>
        )}
        <div style={{display:"flex",gap:10}}>
          <button style={ML.cancelBtn} onClick={onClose}>Cancel</button>
          <button style={{...ML.saveBtn,opacity:ok?1:0.4}} disabled={!ok} onClick={()=>{haptic();onSave(goal.id,parseUGX(amt),source,goal.name);}}>
            {source==="balance"?"Deduct & Save →":"Add Funds →"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ResultCard({ result, setResult, th }) {
  const ML=makeML(th);
  return (
    <div style={{background:th.bg3,border:`1px solid ${th.border}`,borderRadius:16,padding:"14px"}}>
      {[
        {label:"Type",content:<Chip label={result.type} color={result.type==="income"?"#06D6A0":"#EF476F"}/>},
        {label:"Amount",content:<span style={{fontWeight:900,fontSize:17,color:result.type==="income"?"#06D6A0":"#EF476F"}}>{fmtUGX(result.amount||0)}</span>},
        {label:"Description",content:<input style={{background:th.inputBg,border:`1px solid ${th.border}`,borderRadius:8,padding:"6px 10px",color:th.text,fontSize:12,outline:"none",fontFamily:"inherit",maxWidth:160,textAlign:"right"}} value={result.desc||""} onChange={e=>setResult(r=>({...r,desc:e.target.value}))}/>},
        {label:"Category",content:<select style={{background:th.inputBg,border:`1px solid ${th.border}`,borderRadius:8,padding:"6px 10px",color:th.text,fontSize:12,outline:"none",fontFamily:"inherit",maxWidth:160}} value={result.category} onChange={e=>setResult(r=>({...r,category:e.target.value}))}>{CATS.map(c=><option key={c}>{c}</option>)}</select>},
        {label:"Confidence",content:<Chip label={result.confidence||"medium"} color={result.confidence==="high"?"#06D6A0":result.confidence==="low"?"#EF476F":"#FFD166"}/>},
      ].map(({label,content},i,arr)=>(
        <div key={label} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 0",borderBottom:i<arr.length-1?`1px solid ${th.border}`:"none"}}>
          <span style={{fontSize:11,color:th.textSub,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.6px"}}>{label}</span>
          {content}
        </div>
      ))}
    </div>
  );
}

function ModalHdr({ title, onClose, th }) {
  const ML=makeML(th);
  return (
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
      <div style={{fontSize:18,fontWeight:900,color:th.text}}>{title}</div>
      <button style={ML.closeX} onClick={onClose}>✕</button>
    </div>
  );
}

// ── STYLE FACTORIES ───────────────────────────────────────────────
function makeStyles(th) {
  return {
    root:{fontFamily:"'Sora',sans-serif",background:th.bg,color:th.text,width:"100%",height:"100%",maxWidth:430,margin:"0 auto",display:"flex",flexDirection:"column",position:"fixed",top:0,left:"50%",transform:"translateX(-50%)",overflow:"hidden",transition:"background 0.3s,color 0.3s"},
    mesh:{position:"absolute",inset:0,background:th.meshBg,pointerEvents:"none",zIndex:0},
    toast:{position:"absolute",bottom:95,left:"50%",transform:"translateX(-50%)",padding:"10px 22px",borderRadius:24,fontSize:13,fontWeight:800,zIndex:9999,whiteSpace:"nowrap",animation:"toastIn 0.3s ease",boxShadow:"0 8px 24px rgba(0,0,0,0.2)"},
    hdr:{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"13px 18px 11px",borderBottom:`1px solid ${th.border}`,background:th.hdrBg,backdropFilter:"blur(16px)",zIndex:10,flexShrink:0},
    logo:{width:38,height:38,borderRadius:11,background:"linear-gradient(135deg,#06D6A0,#0CB8D4)",display:"flex",alignItems:"center",justifyContent:"center",color:"#080C16",fontWeight:900,fontSize:19},
    appName:{fontSize:16,fontWeight:900,letterSpacing:"-0.3px",display:"flex",alignItems:"center",gap:7,color:th.text},
    appSub:{fontSize:11,color:th.textSub,marginTop:1},
    iconBtn:{position:"relative",background:"none",border:"none",color:th.iconColor,fontSize:20,cursor:"pointer",padding:"6px"},
    notifDot:{position:"absolute",top:2,right:2,width:14,height:14,borderRadius:"50%",background:"#EF476F",fontSize:8,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff"},
    powerBar:{display:"flex",background:th.powerBarBg,borderBottom:`1px solid ${th.border}`,overflowX:"auto",flexShrink:0},
    powerBtn:{flex:"1 0 auto",display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"10px 14px",background:"none",border:"none",color:th.powerBtnColor,cursor:"pointer",borderRight:`1px solid ${th.border}`},
    main:{flex:1,overflowY:"auto",overflowX:"hidden",paddingBottom:80,position:"relative",zIndex:1,WebkitOverflowScrolling:"touch",display:"flex",flexDirection:"column"},
    nav:{position:"absolute",bottom:0,left:0,right:0,display:"flex",background:th.navBg,backdropFilter:"blur(16px)",borderTop:`1px solid ${th.border}`,zIndex:20,padding:"8px 0 12px"},
    navBtn:{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2,background:"none",border:"none",color:th.navInactive,cursor:"pointer",padding:"6px 0",position:"relative",transition:"color 0.2s"},
    navPip:{position:"absolute",bottom:0,left:"50%",transform:"translateX(-50%)",width:4,height:4,borderRadius:"50%",background:"#06D6A0"},
    wrap:{padding:"18px 16px",animation:"fadeUp 0.3s ease",flex:1},
    pageTitle:{fontSize:22,fontWeight:900,letterSpacing:"-0.5px",color:th.text},
    hero:{background:th.heroBg,borderRadius:24,padding:"24px 20px",marginBottom:14,border:`1px solid ${th.border}`,position:"relative",overflow:"hidden",boxShadow:"0 20px 60px rgba(0,0,0,0.08)"},
    quickAdd:{display:"flex",alignItems:"center",justifyContent:"center",gap:10,width:"100%",padding:"13px",background:"linear-gradient(135deg,#06D6A0,#0CB8D4)",color:"#080C16",border:"none",borderRadius:16,fontWeight:900,fontSize:14,cursor:"pointer",marginBottom:18},
    secTitle:{fontSize:12,fontWeight:800,color:th.textSub,letterSpacing:"1px",textTransform:"uppercase"},
    secBtn:{fontSize:11,fontWeight:800,color:"#06D6A0",background:"none",border:"1px solid rgba(6,214,160,0.25)",borderRadius:20,padding:"4px 12px",cursor:"pointer"},
    card:{background:th.bg3,border:`1px solid ${th.border}`,borderRadius:20,padding:"16px",marginBottom:18,boxShadow:"0 2px 12px rgba(0,0,0,0.04)"},
    txRow:{display:"flex",alignItems:"center",gap:11,padding:"11px 12px",background:th.bg4,borderRadius:13,marginBottom:7,border:`1px solid ${th.border}`},
    txIco:{width:38,height:38,borderRadius:11,background:th.txIcoBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,flexShrink:0},
    txDesc:{fontSize:13,fontWeight:700,marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:th.text},
    addBtn:{background:"linear-gradient(135deg,#06D6A0,#0CB8D4)",color:"#080C16",border:"none",borderRadius:20,padding:"8px 18px",fontWeight:900,fontSize:12,cursor:"pointer"},
    search:{width:"100%",background:th.inputBg,border:`1px solid ${th.border}`,borderRadius:14,padding:"11px 16px",color:th.text,fontSize:13,marginBottom:12,boxSizing:"border-box",outline:"none"},
  };
}

function makeML(th) {
  return {
    ov:{position:"absolute",inset:0,background:th.overlayBg,backdropFilter:"blur(8px)",zIndex:100,display:"flex",alignItems:"flex-end",justifyContent:"center"},
    sh:{background:th.sheetBg,border:`1px solid ${th.border2}`,borderRadius:"24px 24px 0 0",padding:"24px 20px 36px",width:"100%",maxWidth:430,maxHeight:"88vh",overflowY:"auto",animation:"fadeUp 0.25s ease",boxShadow:"0 -8px 40px rgba(0,0,0,0.12)"},
    title:{fontSize:18,fontWeight:900,letterSpacing:"-0.3px",color:th.text},
    closeX:{background:"none",border:"none",color:th.textSub,fontSize:20,cursor:"pointer",padding:4},
    input:{width:"100%",background:th.inputBg,border:`1px solid ${th.border3}`,borderRadius:14,padding:"13px 16px",color:th.text,fontSize:14,marginBottom:12,boxSizing:"border-box",outline:"none",fontFamily:"inherit"},
    cancelBtn:{flex:1,padding:"13px",borderRadius:14,border:`1px solid ${th.cancelBorder}`,background:"transparent",color:th.cancelColor,fontWeight:800,cursor:"pointer",fontFamily:"inherit"},
    saveBtn:{flex:1,padding:"13px",borderRadius:14,border:"none",background:"linear-gradient(135deg,#06D6A0,#0CB8D4)",color:"#080C16",fontWeight:900,cursor:"pointer",fontFamily:"inherit",transition:"opacity 0.2s"},
  };
}
