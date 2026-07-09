import React, { useState, useEffect, useRef } from "react";
import { Search, MessageCircle, Bell, User, Globe, CheckCircle2, Building2, ShieldCheck, Send, ChevronLeft, ChevronRight, Plus, Heart, Mail, Languages, Package, Users, Eye, BadgeCheck, X, Settings, LogOut, Camera, Lock, Sparkles, Wifi, Battery, ShieldAlert, FileCheck2, AlertCircle, Smartphone, RefreshCw, Edit3, Shield, MapPin } from "lucide-react";

/* ================================================================
   RAICO GLOBAL BUSINESS CONNECT
   Auth: 100% localStorage — no Firebase, no network, no "Load failed"
   Chat: Claude AI live translation (only network call in the app)
================================================================ */

// ── localStorage auth helpers ──────────────────────────────────
const USERS_KEY   = "raico_users_v1";
const SESSION_KEY = "raico_session_v1";

function getUsers()       { try { return JSON.parse(localStorage.getItem(USERS_KEY) || "{}"); } catch { return {}; } }
function saveUsers(u)     { try { localStorage.setItem(USERS_KEY, JSON.stringify(u)); } catch {} }
function getSession()     { try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch { return null; } }
function saveSession(s)   { try { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch {} }
function clearSession()   { try { localStorage.removeItem(SESSION_KEY); } catch {} }
function uid()            { return "u_" + Math.random().toString(36).slice(2) + Date.now().toString(36); }
function hashPw(pw)       { let h = 0; for (let i = 0; i < pw.length; i++) { h = (Math.imul(31, h) + pw.charCodeAt(i)) | 0; } return h.toString(16); }

function authSignUp(email, password, displayName) {
  const users = getUsers();
  const key = email.toLowerCase().trim();
  if (users[key]) throw new Error("This email is already registered. Please log in.");
  const id = uid();
  const now = new Date().toISOString();
  users[key] = { uid: id, email: key, displayName, passwordHash: hashPw(password), emailVerified: false, createdAt: now, business: "TFS Institute India", country: "India", flag: "🇮🇳", industry: "Education & Technology", initials: displayName.slice(0,2).toUpperCase(), color: "bg-blue-700", onboardingComplete: false, signInLog: [] };
  saveUsers(users);
  const session = { uid: id, email: key, displayName, emailVerified: false };
  saveSession(session);
  return session;
}

function authSignIn(email, password) {
  const users = getUsers();
  const key = email.toLowerCase().trim();
  const user = users[key];
  if (!user) throw new Error("No account found with this email. Please sign up first.");
  if (user.passwordHash !== hashPw(password)) throw new Error("Incorrect password. Please try again.");
  // Log sign-in
  user.signInLog = user.signInLog || [];
  user.signInLog.unshift({ time: new Date().toISOString(), device: navigator.userAgent.slice(0, 80) });
  if (user.signInLog.length > 20) user.signInLog = user.signInLog.slice(0, 20);
  saveUsers(users);
  const session = { uid: user.uid, email: key, displayName: user.displayName, emailVerified: user.emailVerified };
  saveSession(session);
  return session;
}

function authSignOut() { clearSession(); }

function authVerifyEmail() {
  const session = getSession();
  if (!session) return;
  const users = getUsers();
  const user = users[session.email];
  if (user) { user.emailVerified = true; saveUsers(users); }
  const updated = { ...session, emailVerified: true };
  saveSession(updated);
  return updated;
}

function authResetPassword(email, newPassword) {
  const users = getUsers();
  const key = email.toLowerCase().trim();
  if (!users[key]) throw new Error("No account found with this email.");
  users[key].passwordHash = hashPw(newPassword);
  saveUsers(users);
}

function authChangePassword(currentPw, newPw) {
  const session = getSession();
  if (!session) throw new Error("Not signed in.");
  const users = getUsers();
  const user = users[session.email];
  if (!user) throw new Error("Account not found.");
  if (user.passwordHash !== hashPw(currentPw)) throw new Error("Incorrect current password.");
  user.passwordHash = hashPw(newPw);
  saveUsers(users);
}

function authChangeEmail(currentPw, newEmail) {
  const session = getSession();
  if (!session) throw new Error("Not signed in.");
  const users = getUsers();
  const user = users[session.email];
  if (!user) throw new Error("Account not found.");
  if (user.passwordHash !== hashPw(currentPw)) throw new Error("Incorrect current password.");
  const newKey = newEmail.toLowerCase().trim();
  if (users[newKey]) throw new Error("This email is already in use.");
  users[newKey] = { ...user, email: newKey, emailVerified: false };
  delete users[session.email];
  saveUsers(users);
  const updated = { ...session, email: newKey, emailVerified: false };
  saveSession(updated);
  return updated;
}

function authUpdateProfile(data) {
  const session = getSession();
  if (!session) return;
  const users = getUsers();
  const user = users[session.email];
  if (!user) return;
  Object.assign(user, data);
  saveUsers(users);
}

function authGetProfile() {
  const session = getSession();
  if (!session) return null;
  const users = getUsers();
  return users[session.email] || null;
}

function authGetSignInLog() {
  const profile = authGetProfile();
  return profile?.signInLog || [];
}

// ── Claude AI (only real network call) ────────────────────────
async function claudeCall(messages, system, maxTokens = 400) {
  const body = { model: "claude-sonnet-4-6", max_tokens: maxTokens, messages };
  if (system) body.system = system;
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true", "Cache-Control": "no-cache" },
    body: JSON.stringify(body),
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error.message);
  return d.content?.[0]?.text?.trim() || "";
}

async function translate(text, from, to) {
  if (from === to) return text;
  try { return await claudeCall([{ role: "user", content: `Translate ONLY this from ${from} to ${to}. Output ONLY the translation, no quotes:\n\n${text}` }], null, 300); }
  catch { return text; }
}

// ── App data ───────────────────────────────────────────────────
const LANGS = [
  { code:"zh", name:"Chinese",    native:"中文"       },
  { code:"hi", name:"Hindi",      native:"हिन्दी"     },
  { code:"es", name:"Spanish",    native:"Español"   },
  { code:"ar", name:"Arabic",     native:"العربية"   },
  { code:"fr", name:"French",     native:"Français"  },
  { code:"de", name:"German",     native:"Deutsch"   },
  { code:"ru", name:"Russian",    native:"Русский"   },
  { code:"pt", name:"Portuguese", native:"Português" },
];

const BIZ = [
  { id:1, name:"Shenzhen Electronics Co.", owner:"Li Wei",            country:"China",    flag:"🇨🇳", industry:"Electronics",           type:"Manufacturer", verified:true,  lang:"zh", color:"bg-blue-700",   initials:"SE", tagline:"Consumer electronics & smart devices, OEM/ODM since 2011.",     products:[{name:"Wireless Earbuds X200",price:"$8.50/unit",moq:"MOQ 500",avail:"In stock"},{name:"Smart Home Hub",price:"$22/unit",moq:"MOQ 100",avail:"In stock"},{name:"Power Bank 20000mAh",price:"$6.20/unit",moq:"MOQ 1000",avail:"2wk lead"}] },
  { id:2, name:"Sharma Agro Exports",      owner:"Anjali Sharma",     country:"India",    flag:"🇮🇳", industry:"Agriculture & Food",     type:"Exporter",     verified:false, lang:"hi", color:"bg-amber-600",  initials:"SA", tagline:"Spices, rice and pulses sourced direct from partner farms.",     products:[{name:"Basmati Rice 25kg",price:"$28/bag",moq:"MOQ 200",avail:"In stock"},{name:"Turmeric Powder",price:"$3.40/kg",moq:"MOQ 500kg",avail:"In stock"}] },
  { id:3, name:"Andes Coffee Traders",     owner:"Camila Rojas",      country:"Colombia", flag:"🇨🇴", industry:"Food & Beverage",        type:"Supplier",     verified:true,  lang:"es", color:"bg-emerald-700",initials:"AC", tagline:"Single-origin green coffee beans, direct trade with growers.",   products:[{name:"Green Coffee Beans",price:"$4.90/kg",moq:"MOQ 300kg",avail:"In stock"}] },
  { id:4, name:"Dubai Gold Souk",          owner:"Khalid Al Maktoum", country:"UAE",      flag:"🇦🇪", industry:"Jewelry & Metals",       type:"Retailer",     verified:true,  lang:"ar", color:"bg-yellow-600", initials:"DG", tagline:"Wholesale gold, silver and custom jewelry design.",              products:[{name:"22K Gold Bangles",price:"Market+4%",moq:"MOQ 1kg",avail:"In stock"}] },
  { id:5, name:"Lyon Leather Goods",       owner:"Marie Dubois",      country:"France",   flag:"🇫🇷", industry:"Fashion & Leather",      type:"Manufacturer", verified:false, lang:"fr", color:"bg-rose-700",   initials:"LL", tagline:"Handcrafted leather bags, small-batch runs.",                    products:[{name:"Leather Tote Bag",price:"$34/pc",moq:"MOQ 100",avail:"In stock"}] },
  { id:6, name:"Hamburg Maritime Parts",   owner:"Stefan Bauer",      country:"Germany",  flag:"🇩🇪", industry:"Industrial & Marine",    type:"Supplier",     verified:true,  lang:"de", color:"bg-slate-700",  initials:"HM", tagline:"Marine engine parts and industrial fittings, EU certified.",     products:[{name:"Diesel Engine Filter",price:"$45/set",moq:"MOQ 50",avail:"In stock"}] },
  { id:7, name:"Ural Steel Exports",       owner:"Dmitri Volkov",     country:"Russia",   flag:"🇷🇺", industry:"Metals & Mining",        type:"Exporter",     verified:false, lang:"ru", color:"bg-zinc-700",   initials:"US", tagline:"Hot-rolled steel coils and billets for industrial buyers.",      products:[{name:"Steel Coil HRC",price:"$620/ton",moq:"MOQ 25t",avail:"4wk lead"}] },
  { id:8, name:"São Paulo Auto Parts",     owner:"Bruno Costa",       country:"Brazil",   flag:"🇧🇷", industry:"Automotive",             type:"Manufacturer", verified:true,  lang:"pt", color:"bg-green-700",  initials:"SP", tagline:"OEM-grade brake systems and suspension parts.",                  products:[{name:"Brake Pad Set",price:"$9.80/set",moq:"MOQ 300",avail:"In stock"}] },
];

const SEED = [
  { id:"s1", sender:"them", original:"你好！我们收到了你们的样品请求。",                   origLang:"中文",    translated:"Hello! We received your sample request.",                              translatedLang:"English", time:"9:02 AM" },
  { id:"s2", sender:"me",   original:"Great, pricing for 1,000 units please?",         origLang:"English", translated:"太好了，能分享1000个X200耳机的价格吗？",                               translatedLang:"中文",    time:"9:05 AM" },
  { id:"s3", sender:"them", original:"当然，1000个单位每个8.50美元，运费另计。",          origLang:"中文",    translated:"Of course, $8.50 each for 1,000 units, shipping extra.",              translatedLang:"English", time:"9:07 AM" },
];

function nowTime() { return new Date().toLocaleTimeString([], { hour:"numeric", minute:"2-digit" }); }
function langOf(code) { return LANGS.find(l => l.code === code) || { name:"Chinese", native:"中文" }; }

// ── Shared UI atoms ────────────────────────────────────────────
function Avatar({ initials, color="bg-blue-700", size="w-11 h-11", text="text-sm" }) {
  return <div className={`${size} ${color} rounded-full flex items-center justify-center text-white font-bold ${text} shrink-0 select-none`}>{initials}</div>;
}
function VBadge() {
  return <span className="inline-flex items-center bg-amber-100 text-amber-600 rounded-full p-0.5"><BadgeCheck size={12} strokeWidth={2.5}/></span>;
}
function TopBar({ title, onBack, right, dark=false }) {
  return (
    <div className={`flex items-center justify-between px-4 py-3.5 shrink-0 ${dark?"bg-blue-900 text-white":"bg-white text-slate-900 border-b border-slate-100"}`}>
      <div className="flex items-center gap-2 min-w-0">
        {onBack && <button onClick={onBack} className="p-1 -ml-1 rounded-full active:bg-black/10 shrink-0"><ChevronLeft size={20}/></button>}
        <span className="font-bold text-base truncate">{title}</span>
      </div>
      {right}
    </div>
  );
}
function StatusBar({ dark }) {
  return (
    <div className={`flex items-center justify-between px-5 pt-2 pb-1 text-xs font-semibold shrink-0 ${dark?"bg-blue-900 text-white":"bg-white text-slate-600"}`}>
      <span>9:41</span><div className="flex items-center gap-1.5"><Wifi size={12}/><Battery size={14}/></div>
    </div>
  );
}
function BottomNav({ screen, setScreen }) {
  const tabs = [{k:"home",I:Building2,l:"Home"},{k:"search",I:Search,l:"Search"},{k:"chatList",I:MessageCircle,l:"Chat"},{k:"notifications",I:Bell,l:"Alerts"},{k:"profile",I:User,l:"Profile"}];
  return (
    <div className="flex border-t border-slate-200 bg-white shrink-0">
      {tabs.map(({k,I,l}) => {
        const on = screen===k||(screen==="chat"&&k==="chatList")||(screen==="bizDetail"&&k==="search");
        return (
          <button key={k} onClick={()=>setScreen(k)} className="flex-1 flex flex-col items-center gap-0.5 py-2.5 active:bg-slate-50">
            <I size={20} strokeWidth={on?2.5:1.8} className={on?"text-blue-700":"text-slate-400"}/>
            <span className={`text-xs font-semibold ${on?"text-blue-700":"text-slate-400"}`}>{l}</span>
          </button>
        );
      })}
    </div>
  );
}
function Toast({ msg, type }) {
  if (!msg) return null;
  return (
    <div className={`absolute bottom-20 left-1/2 -translate-x-1/2 text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-xl z-50 flex items-center gap-2 whitespace-nowrap ${type==="error"?"bg-rose-600":"bg-slate-900"}`}>
      {type==="error"?<AlertCircle size={13}/>:<CheckCircle2 size={13} className="text-emerald-400"/>}
      <span className="max-w-[260px] truncate">{msg}</span>
    </div>
  );
}
function Inp({ label, type="text", value, onChange, placeholder, error, autoFocus }) {
  return (
    <div>
      {label && <label className="text-xs font-bold text-slate-500 mb-1 block">{label}</label>}
      <input autoFocus={autoFocus} type={type} value={value} onChange={onChange} placeholder={placeholder}
             className={`w-full border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 ${error?"border-rose-400 bg-rose-50":"border-slate-200 bg-white"}`}/>
      {error && <p className="text-xs text-rose-600 mt-1 font-medium">{error}</p>}
    </div>
  );
}
function Spin({ s=16 }) { return <RefreshCw size={s} className="animate-spin"/>; }
function Err({ msg }) {
  if (!msg) return null;
  return <div className="bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3 flex items-start gap-2.5"><AlertCircle size={14} className="text-rose-500 shrink-0 mt-0.5"/><p className="text-xs text-rose-700 font-medium leading-relaxed">{msg}</p></div>;
}
function Ok({ msg }) {
  if (!msg) return null;
  return <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 flex items-start gap-2.5"><CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5"/><p className="text-xs text-emerald-700 font-medium">{msg}</p></div>;
}
function SRow({ icon:I, label, sub, onClick }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-slate-50">
      <I size={16} className="text-slate-400 shrink-0"/>
      <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-slate-900">{label}</p><p className="text-xs text-slate-400 truncate">{sub}</p></div>
      <ChevronRight size={14} className="text-slate-300 shrink-0"/>
    </button>
  );
}

// ── SPLASH ─────────────────────────────────────────────────────
function SplashScreen({ setScreen }) {
  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-blue-950 via-blue-900 to-slate-900 text-white px-8">
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-5">
        <div className="w-20 h-20 rounded-3xl bg-white/10 border border-white/20 flex items-center justify-center shadow-2xl">
          <Globe size={38} strokeWidth={1.5}/>
        </div>
        <div>
          <h1 className="text-4xl font-black tracking-tight">Raico</h1>
          <p className="text-blue-300 text-xs tracking-[0.2em] mt-1 font-semibold">GLOBAL BUSINESS CONNECT</p>
        </div>
        <p className="text-blue-100/80 text-sm leading-relaxed max-w-[240px]">Trade across 10+ languages with AI-powered live translation.</p>
      </div>
      <div className="pb-10 flex flex-col gap-3">
        <button onClick={()=>setScreen("auth")} className="bg-white text-blue-900 font-black rounded-2xl py-4 text-sm active:scale-95 transition shadow-lg">Get Started</button>
        <button onClick={()=>setScreen("home")} className="text-blue-300 text-xs py-1 font-medium">Continue as guest</button>
      </div>
    </div>
  );
}

// ── AUTH ───────────────────────────────────────────────────────
function AuthScreen({ setScreen, setUser }) {
  const [tab,  setTab]  = useState("login");
  const [name, setName] = useState("");
  const [email,setEmail]= useState("");
  const [pw,   setPw]   = useState("");
  const [npw,  setNpw]  = useState(""); // new password for reset
  const [err,  setErr]  = useState("");
  const [ok,   setOk]   = useState("");
  const [busy, setBusy] = useState(false);

  function reset() { setErr(""); setOk(""); }

  function validate() {
    if (tab==="signup" && !name.trim())                        { setErr("Full name is required."); return false; }
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email))        { setErr("Enter a valid email address."); return false; }
    if (tab==="reset" && npw.length < 6)                      { setErr("New password must be at least 6 characters."); return false; }
    if (tab!=="reset" && pw.length < 6)                       { setErr("Password must be at least 6 characters."); return false; }
    return true;
  }

  function submit() {
    reset();
    if (!validate()) return;
    setBusy(true);
    try {
      if (tab === "signup") {
        const session = authSignUp(email.trim(), pw, name.trim());
        setUser(session);
        setScreen("verifyEmail");
      } else if (tab === "login") {
        const session = authSignIn(email.trim(), pw);
        setUser(session);
        setScreen(session.emailVerified ? "home" : "verifyEmail");
      } else {
        authResetPassword(email.trim(), npw);
        setOk("Password reset! You can now log in with your new password.");
        setTab("login");
      }
    } catch(e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="px-6 pt-10 pb-5">
        <button onClick={()=>setScreen("splash")} className="mb-4 text-slate-400 p-1 -ml-1"><ChevronLeft size={22}/></button>
        <h2 className="text-2xl font-black text-slate-900">
          {tab==="signup"?"Create account":tab==="login"?"Welcome back":"Reset password"}
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          {tab==="signup"?"Join global trade across 10+ languages.":tab==="login"?"Sign in to your Raico account.":"Enter your email and a new password."}
        </p>
      </div>
      <div className="px-6 flex-1 overflow-y-auto pb-8">
        {tab !== "reset" && (
          <div className="flex bg-slate-100 rounded-2xl p-1 mb-5">
            {["signup","login"].map(t => (
              <button key={t} onClick={()=>{setTab(t);reset();}}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition ${tab===t?"bg-white text-blue-700 shadow-sm":"text-slate-500"}`}>
                {t==="signup"?"Sign up":"Log in"}
              </button>
            ))}
          </div>
        )}

        <div className="space-y-3">
          <Err msg={err}/><Ok msg={ok}/>
          {tab==="signup" && <Inp label="Full name" value={name} onChange={e=>setName(e.target.value)} placeholder="Your full name" autoFocus/>}
          <Inp label="Email address" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/>
          {tab==="login"  && <Inp label="Password" type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="Your password"/>}
          {tab==="signup" && <Inp label="Password" type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="Min. 6 characters"/>}
          {tab==="reset"  && <Inp label="New password" type="password" value={npw} onChange={e=>setNpw(e.target.value)} placeholder="Min. 6 characters"/>}
        </div>

        {tab==="login" && (
          <button onClick={()=>{setTab("reset");reset();}} className="text-blue-700 text-xs font-bold mt-2 block">Forgot password?</button>
        )}

        <button onClick={submit} disabled={busy}
                className="w-full bg-blue-700 text-white font-black rounded-2xl py-4 text-sm mt-5 flex items-center justify-center gap-2 active:scale-95 transition disabled:opacity-60 shadow-lg">
          {busy && <Spin/>}
          {tab==="signup"?"Create account":tab==="login"?"Log in":"Reset password"}
        </button>

        {tab==="reset" && (
          <button onClick={()=>{setTab("login");reset();}} className="w-full text-slate-400 text-sm mt-3 py-2 font-medium">← Back to log in</button>
        )}

        <p className="text-xs text-slate-400 text-center mt-6 leading-relaxed">
          By continuing you agree to Raico's Terms of Service.{"\n"}Messages are end-to-end encrypted.
        </p>
      </div>
    </div>
  );
}

// ── VERIFY EMAIL ───────────────────────────────────────────────
function VerifyEmailScreen({ user, setUser, setScreen, toast }) {
  return (
    <div className="h-full flex flex-col bg-white px-6 justify-center">
      <div className="flex flex-col items-center text-center gap-5">
        <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
          <Mail size={28} className="text-blue-700"/>
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-900">Verify your email</h2>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed max-w-xs">
            Tap the button below to verify <b className="text-slate-700">{user?.email}</b> and activate your account.
          </p>
        </div>
        <button onClick={()=>{
          const updated = authVerifyEmail();
          setUser(updated);
          toast("Email verified! Welcome to Raico.");
          setScreen("onboarding");
        }} className="w-full bg-blue-700 text-white font-black rounded-2xl py-4 text-sm flex items-center justify-center gap-2 active:scale-95 transition shadow-lg">
          <CheckCircle2 size={16}/> Verify my email
        </button>
        <button onClick={()=>{authSignOut();setUser(null);setScreen("splash");}} className="text-xs text-slate-400 font-medium">Sign out and use different account</button>
      </div>
    </div>
  );
}

// ── ONBOARDING ─────────────────────────────────────────────────
function OnboardingScreen({ user, setScreen, toast }) {
  const [biz,  setBiz]  = useState("TFS Institute India");
  const [own,  setOwn]  = useState(user?.displayName || "RAICO TFS STUDENT");
  const [ctr,  setCtr]  = useState("India");
  const [ind,  setInd]  = useState("Education & Technology");
  const [busy, setBusy] = useState(false);

  function finish() {
    setBusy(true);
    authUpdateProfile({ business:biz, ownerName:own, country:ctr, industry:ind, initials:biz.slice(0,2).toUpperCase(), onboardingComplete:true });
    setTimeout(()=>{ setScreen("home"); setBusy(false); }, 400);
  }

  return (
    <div className="h-full flex flex-col bg-white">
      <TopBar title="Set up your business" onBack={()=>setScreen("auth")}/>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        <div className="flex flex-col items-center py-3">
          <div className="w-20 h-20 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-300">
            <Camera size={24}/>
          </div>
          <span className="text-xs text-slate-400 mt-1.5 font-medium">Company logo</span>
        </div>
        {[["Business name",biz,setBiz],["Owner name",own,setOwn],["Country",ctr,setCtr],["Industry",ind,setInd]].map(([l,v,s])=>(
          <label key={l} className="block">
            <span className="text-xs font-bold text-slate-500 mb-1 block">{l}</span>
            <input value={v} onChange={e=>s(e.target.value)} className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"/>
          </label>
        ))}
        <div className="bg-slate-50 rounded-2xl px-4 py-3">
          <p className="text-xs text-slate-400 font-medium">Account email</p>
          <p className="text-sm font-bold text-slate-700 mt-0.5">{user?.email}</p>
        </div>
      </div>
      <div className="p-4 border-t border-slate-100">
        <button onClick={finish} disabled={busy} className="w-full bg-blue-700 text-white font-black rounded-2xl py-4 text-sm flex items-center justify-center gap-2 disabled:opacity-60 active:scale-95 transition shadow-lg">
          {busy&&<Spin/>} Finish setup →
        </button>
      </div>
    </div>
  );
}

// ── HOME ───────────────────────────────────────────────────────
function HomeScreen({ setScreen, openBiz, user }) {
  const profile = authGetProfile();
  const name = profile?.business || user?.displayName || "Raico User";
  const initials = (profile?.initials || name.slice(0,2)).toUpperCase();

  return (
    <div className="h-full flex flex-col bg-slate-50">
      <div className="bg-blue-900 text-white px-5 pt-4 pb-8 rounded-b-3xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-blue-300 text-xs font-semibold">Welcome back</p>
            <p className="font-black text-xl leading-tight">{name}</p>
          </div>
          <Avatar initials={initials} color="bg-blue-700"/>
        </div>
        <button onClick={()=>setScreen("search")} className="w-full bg-blue-800/60 border border-blue-700/50 rounded-2xl px-4 py-3 flex items-center gap-2.5 text-blue-200/80 text-sm active:bg-blue-700/50 text-left">
          <Search size={15}/> Search businesses, products, countries…
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-3 gap-2.5 px-4 -mt-5 mb-5">
          {[{I:Eye,v:"248",l:"Views"},{I:Users,v:"36",l:"Connections"},{I:Package,v:"9",l:"Inquiries"}].map(({I,v,l})=>(
            <div key={l} className="bg-white rounded-2xl border border-slate-200 p-3 flex flex-col items-center shadow-sm">
              <I size={15} className="text-blue-700 mb-1"/><span className="font-black text-slate-900 text-base">{v}</span><span className="text-xs text-slate-400 font-medium">{l}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between px-5 mb-3">
          <p className="font-black text-slate-900">Featured businesses</p>
          <button onClick={()=>setScreen("search")} className="text-blue-700 text-xs font-bold flex items-center gap-0.5">See all<ChevronRight size={12}/></button>
        </div>
        <div className="flex gap-3 px-5 overflow-x-auto pb-2">
          {BIZ.slice(0,5).map(b=>(
            <button key={b.id} onClick={()=>openBiz(b)} className="shrink-0 w-44 bg-white rounded-2xl border border-slate-200 p-3.5 text-left active:scale-95 transition shadow-sm">
              <div className="flex items-center justify-between mb-2.5">
                <Avatar initials={b.initials} color={b.color} size="w-10 h-10" text="text-xs"/>
                {b.verified&&<VBadge/>}
              </div>
              <p className="font-black text-sm text-slate-900 leading-tight">{b.name}</p>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">{b.flag} {b.country}</p>
              <span className="inline-block mt-2 text-xs font-bold text-blue-700 bg-blue-50 rounded-full px-2.5 py-0.5">{b.type}</span>
            </button>
          ))}
        </div>
        <div className="mx-5 mt-5 mb-6 bg-gradient-to-br from-slate-900 to-blue-900 text-white rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2"><Sparkles size={14} className="text-amber-400"/><span className="text-xs font-black tracking-widest">COMING SOON</span></div>
          <div className="flex gap-2 flex-wrap">{["Voice translation","Video calls","AI assistant","Marketplace"].map(f=><span key={f} className="text-xs bg-white/10 border border-white/20 rounded-full px-2.5 py-1 font-medium">{f}</span>)}</div>
        </div>
      </div>
    </div>
  );
}

// ── SEARCH ─────────────────────────────────────────────────────
function SearchScreen({ openBiz }) {
  const [q, setQ] = useState("");
  const res = BIZ.filter(b=>!q||[b.name,b.country,b.industry,b.type].some(s=>s.toLowerCase().includes(q.toLowerCase())));
  return (
    <div className="h-full flex flex-col bg-white">
      <TopBar title="Search businesses"/>
      <div className="px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2 bg-slate-100 rounded-2xl px-3.5 py-2.5">
          <Search size={14} className="text-slate-400 shrink-0"/>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Country, industry, product…" className="bg-transparent text-sm flex-1 focus:outline-none font-medium"/>
          {q&&<button onClick={()=>setQ("")}><X size={13} className="text-slate-400"/></button>}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
        <p className="text-xs text-slate-400 font-semibold px-1">{res.length} businesses found</p>
        {res.map(b=>(
          <button key={b.id} onClick={()=>openBiz(b)} className="w-full bg-white border border-slate-200 rounded-2xl p-3.5 flex gap-3 text-left active:scale-95 transition shadow-sm">
            <Avatar initials={b.initials} color={b.color}/>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5"><p className="font-black text-sm text-slate-900 truncate">{b.name}</p>{b.verified&&<VBadge/>}</div>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">{b.flag} {b.country} · {b.industry}</p>
              <span className="inline-block mt-1.5 text-xs font-bold text-blue-700 bg-blue-50 rounded-full px-2.5 py-0.5">{b.type}</span>
            </div>
            <ChevronRight size={15} className="text-slate-300 self-center shrink-0"/>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── BIZ DETAIL ─────────────────────────────────────────────────
function BizDetailScreen({ biz, setScreen, toast }) {
  const [tab,setTab]=useState("about");
  const [conn,setConn]=useState(false);
  if (!biz) return null;
  return (
    <div className="h-full flex flex-col bg-white">
      <TopBar title={biz.name} onBack={()=>setScreen("search")}/>
      <div className="flex-1 overflow-y-auto">
        <div className={`${biz.color} h-20`}/>
        <div className="px-5 -mt-9 mb-4">
          <div className="flex items-end justify-between">
            <Avatar initials={biz.initials} color={biz.color} size="w-16 h-16" text="text-lg"/>
            <button onClick={()=>{setConn(true);toast("Request sent to "+biz.owner);}} disabled={conn}
                    className={`mb-1 px-4 py-2 rounded-full text-xs font-black flex items-center gap-1.5 active:scale-95 transition ${conn?"bg-emerald-50 text-emerald-700 border border-emerald-200":"bg-blue-700 text-white shadow-lg"}`}>
              {conn?<><CheckCircle2 size={12}/>Sent</>:<><Plus size={12}/>Connect</>}
            </button>
          </div>
          <div className="flex items-center gap-1.5 mt-3"><p className="font-black text-lg text-slate-900">{biz.name}</p>{biz.verified&&<VBadge/>}</div>
          <p className="text-sm text-slate-500 mt-0.5 font-medium">{biz.owner} · {biz.flag} {biz.country}</p>
          <p className="text-sm text-slate-600 mt-2.5 leading-relaxed">{biz.tagline}</p>
        </div>
        <div className="flex border-b border-slate-200 px-5">
          {["about","products"].map(t=>(
            <button key={t} onClick={()=>setTab(t)} className={`px-1 py-2.5 mr-6 text-sm font-black capitalize border-b-2 transition ${t===tab?"border-blue-700 text-blue-700":"border-transparent text-slate-400"}`}>{t}</button>
          ))}
        </div>
        {tab==="about"?(
          <div className="px-5 py-4 space-y-2.5">
            {[{I:Mail,l:"Contact",v:`hello@${biz.name.toLowerCase().replace(/[^a-z]/g,"")}.com`},{I:MapPin,l:"Location",v:biz.country+" "+biz.flag},{I:Languages,l:"Language",v:langOf(biz.lang).native}].map(({I,l,v})=>(
              <div key={l} className="flex items-center gap-3 bg-slate-50 rounded-2xl px-4 py-3">
                <I size={14} className="text-blue-700 shrink-0"/><div><p className="text-xs text-slate-400 font-semibold">{l}</p><p className="text-xs font-bold text-slate-700">{v}</p></div>
              </div>
            ))}
          </div>
        ):(
          <div className="px-5 py-4 space-y-3">
            {biz.products.map((p,i)=>(
              <div key={i} className="bg-white border border-slate-200 rounded-2xl p-3.5 flex gap-3">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0"><Package size={20} className="text-slate-300"/></div>
                <div className="flex-1 min-w-0"><p className="font-black text-sm text-slate-900">{p.name}</p><p className="text-blue-700 font-black text-sm mt-0.5">{p.price}</p><p className="text-xs text-slate-400 mt-0.5 font-medium">{p.moq} · {p.avail}</p></div>
                <button onClick={()=>toast('Inquiry sent for "'+p.name+'"')} className="self-center shrink-0 bg-slate-900 text-white text-xs font-black rounded-full px-3 py-1.5 active:scale-95 transition">Inquire</button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="p-4 border-t border-slate-100">
        <button onClick={()=>setScreen("chat")} className="w-full bg-blue-700 text-white font-black rounded-2xl py-4 text-sm flex items-center justify-center gap-2 active:scale-95 transition shadow-lg">
          <MessageCircle size={15}/> Message {biz.owner.split(" ")[0]}
        </button>
      </div>
    </div>
  );
}

// ── CHAT LIST ──────────────────────────────────────────────────
function ChatListScreen({ openBiz }) {
  const recent = [BIZ[0],BIZ[2],BIZ[5],BIZ[7]];
  return (
    <div className="h-full flex flex-col bg-white">
      <TopBar title="Messages" right={<Languages size={17} className="text-slate-400"/>}/>
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {recent.map((b,i)=>(
          <button key={b.id} onClick={()=>openBiz(b,"chat")} className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-slate-50">
            <Avatar initials={b.initials} color={b.color}/>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between"><p className="font-black text-sm text-slate-900 truncate">{b.name}</p><span className="text-xs text-slate-400 font-medium">{["9:07 AM","Yesterday","Mon","Sun"][i]}</span></div>
              <p className="text-xs text-slate-400 truncate mt-0.5 font-medium">Tap to continue conversation</p>
            </div>
            {i<2&&<span className="w-5 h-5 rounded-full bg-blue-700 text-white text-xs font-black flex items-center justify-center shrink-0">{i+1}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── CHAT ───────────────────────────────────────────────────────
function ChatScreen({ biz, setScreen, msgs, setMsgs }) {
  const b = biz||BIZ[0];
  const pl = langOf(b.lang);
  const [input,setInput]=useState("");
  const [busy,setBusy]=useState(false);
  const scrollRef=useRef(null);
  const msgsRef=useRef(msgs);
  useEffect(()=>{msgsRef.current=msgs;},[msgs]);
  useEffect(()=>{if(scrollRef.current)scrollRef.current.scrollTop=scrollRef.current.scrollHeight;},[msgs]);

  async function send(){
    const txt=input.trim();if(!txt||busy)return;
    setInput("");setBusy(true);
    const uId=crypto.randomUUID(),rId=crypto.randomUUID();
    setMsgs(p=>[...p,{id:uId,sender:"me",original:txt,origLang:"English",translated:null,translatedLang:pl.native,time:nowTime(),pending:true}]);
    let xl=txt;
    try{xl=await translate(txt,"English",pl.name);}catch{}
    setMsgs(p=>p.map(m=>m.id===uId?{...m,translated:xl,pending:false}:m));
    setMsgs(p=>[...p,{id:rId,sender:"them",original:"…",origLang:pl.native,translated:null,translatedLang:"English",time:nowTime(),pending:true}]);
    const hist=msgsRef.current.filter(m=>!m.pending&&m.id!==rId).map(m=>({role:m.sender==="me"?"user":"assistant",content:m.sender==="me"?`[EN:${m.original}][${pl.native}:${m.translated||m.original}]`:(m.original||"")}));
    hist.push({role:"user",content:`[EN:${txt}][${pl.native}:${xl}]`});
    const sys=`You are ${b.owner}, owner of "${b.name}", a ${b.type} in ${b.country} specialising in ${b.industry}. Products: ${b.products.map(p=>p.name).join(", ")}. Reply ONLY in ${pl.name} (${pl.native}). 1-3 sentences, directly address the partner's specific message. Never give a generic reply.`;
    let reply="";
    try{reply=await claudeCall(hist,sys,300);}catch(e){reply="[Error: "+e.message+"]";}
    let replyEn=reply;
    try{replyEn=await translate(reply,pl.name,"English");}catch{}
    setMsgs(p=>p.map(m=>m.id===rId?{...m,original:reply,translated:replyEn,pending:false}:m));
    setBusy(false);
  }

  return (
    <div className="h-full flex flex-col bg-slate-50">
      <TopBar title={b.name} onBack={()=>setScreen("chatList")} dark/>
      <div className="bg-blue-800 text-blue-100 text-xs px-4 py-2 flex items-center gap-1.5 shrink-0 font-semibold">
        <Languages size={11}/> Translating to {pl.name} ({pl.native})
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3.5">
        {msgs.map(m=>(
          <div key={m.id} className={"flex "+(m.sender==="me"?"justify-end":"justify-start")}>
            <div className={"rounded-2xl px-3.5 py-2.5 "+(m.sender==="me"?"bg-blue-700 text-white rounded-br-sm shadow-lg":"bg-white border border-slate-200 text-slate-900 rounded-bl-sm shadow-sm")} style={{maxWidth:"80%"}}>
              <p className={"text-xs italic mb-1 "+(m.sender==="me"?"text-blue-200":"text-slate-400")}>{m.original}</p>
              <div className={"h-px mb-1.5 "+(m.sender==="me"?"bg-blue-600":"bg-slate-100")}/>
              {m.pending?(
                <div className="flex gap-1 items-center py-1">
                  {[0,0.15,0.3].map((d,i)=><span key={i} className="w-1.5 h-1.5 rounded-full bg-current animate-bounce opacity-60" style={{animationDelay:d+"s"}}/>)}
                </div>
              ):<p className="text-sm font-semibold leading-snug">{m.translated}</p>}
              <div className="flex items-center justify-between mt-1.5">
                {!m.pending&&<span className="inline-flex items-center gap-0.5 text-xs font-black text-blue-600 bg-blue-50 rounded-full px-1.5 py-0.5 -rotate-1"><Languages size={9}/> AI</span>}
                <span className={"text-xs ml-auto "+(m.sender==="me"?"text-blue-200":"text-slate-400")}>{m.time}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="p-3 border-t border-slate-200 bg-white flex items-center gap-2 shrink-0">
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Type in English…" className="flex-1 bg-slate-100 rounded-full px-4 py-2.5 text-sm focus:outline-none font-medium"/>
        <button onClick={send} disabled={busy} className="w-10 h-10 rounded-full bg-blue-700 text-white flex items-center justify-center shrink-0 active:scale-95 transition disabled:opacity-50 shadow-lg">
          <Send size={15}/>
        </button>
      </div>
    </div>
  );
}

// ── NOTIFICATIONS ──────────────────────────────────────────────
function NotificationsScreen() {
  const items=[
    {I:MessageCircle,c:"text-blue-700 bg-blue-50",t:"Li Wei sent you a message",b:'"Can confirm the order by Friday."',time:"2m",u:true},
    {I:Users,c:"text-emerald-700 bg-emerald-50",t:"New connection request",b:"Stefan Bauer · Hamburg Maritime Parts",time:"1h",u:true},
    {I:Package,c:"text-amber-700 bg-amber-50",t:"Product inquiry received",b:"Camila Rojas asked about your listing",time:"3h",u:true},
    {I:Users,c:"text-emerald-700 bg-emerald-50",t:"Connection accepted",b:"Anjali Sharma accepted your request",time:"Yesterday",u:false},
  ];
  return (
    <div className="h-full flex flex-col bg-white">
      <TopBar title="Notifications"/>
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {items.map((n,i)=>{const Icon=n.I;return(
          <div key={i} className="flex gap-3 px-4 py-3.5">
            <div className={"w-9 h-9 rounded-full flex items-center justify-center shrink-0 "+n.c}><Icon size={14}/></div>
            <div className="flex-1 min-w-0"><p className="text-sm font-black text-slate-900">{n.t}</p><p className="text-xs text-slate-500 mt-0.5 font-medium">{n.b}</p><p className="text-xs text-slate-400 mt-0.5">{n.time} ago</p></div>
            {n.u&&<span className="w-2 h-2 rounded-full bg-blue-700 mt-1.5 shrink-0"/>}
          </div>
        );})}
      </div>
    </div>
  );
}

// ── PROFILE ────────────────────────────────────────────────────
function ProfileScreen({ user, setUser, setScreen, toast }) {
  const [sub,setSub]=useState(null);
  if(sub==="changeEmail")    return <ChangeEmailScreen    back={()=>setSub(null)} user={user} setUser={setUser} toast={toast}/>;
  if(sub==="changePassword") return <ChangePasswordScreen back={()=>setSub(null)} toast={toast}/>;
  if(sub==="security")       return <SecurityScreen       back={()=>setSub(null)} setUser={setUser} setScreen={setScreen} toast={toast}/>;
  if(sub==="signInLog")      return <SignInLogScreen      back={()=>setSub(null)}/>;

  const profile=authGetProfile();
  const name=profile?.business||user?.displayName||"Raico User";
  const initials=(profile?.initials||name.slice(0,2)).toUpperCase();

  return (
    <div className="h-full flex flex-col bg-slate-50">
      <TopBar title="Profile"/>
      <div className="flex-1 overflow-y-auto">
        <div className="bg-white px-5 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3.5">
            <Avatar initials={initials} color={profile?.color||"bg-blue-700"} size="w-14 h-14" text="text-base"/>
            <div className="flex-1 min-w-0">
              <p className="font-black text-slate-900 truncate text-base">{name}</p>
              <p className="text-xs text-slate-500 font-medium">{profile?.ownerName||user?.displayName} · {profile?.flag||"🇮🇳"} {profile?.country||"India"}</p>
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <Mail size={11} className="text-slate-400 shrink-0"/>
                <p className="text-xs text-slate-600 truncate font-medium">{user?.email}</p>
                {user?.emailVerified
                  ?<span className="inline-flex items-center gap-0.5 text-xs font-black text-emerald-700 bg-emerald-50 rounded-full px-1.5 py-0.5"><CheckCircle2 size={9}/> Verified</span>
                  :<span className="inline-flex items-center gap-0.5 text-xs font-black text-amber-700 bg-amber-50 rounded-full px-1.5 py-0.5"><AlertCircle size={9}/> Unverified</span>
                }
              </div>
            </div>
          </div>
        </div>
        <div className="px-5 py-4 space-y-3">
          <button onClick={()=>toast("Business verification submitted.")} className="w-full bg-blue-700 text-white rounded-2xl px-4 py-3.5 flex items-center gap-3 shadow-lg">
            <FileCheck2 size={18}/><div className="text-left flex-1"><p className="text-sm font-black">Get business verified</p><p className="text-xs text-blue-200 font-medium">Build trust with a verified badge</p></div><ChevronRight size={14}/>
          </button>
          <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
            <SRow icon={Edit3}       label="Change email"          sub={user?.email||"—"}               onClick={()=>setSub("changeEmail")}/>
            <SRow icon={Lock}        label="Change password"       sub="Update your password"            onClick={()=>setSub("changePassword")}/>
            <SRow icon={Shield}      label="Security"              sub="Sign-out all devices"            onClick={()=>setSub("security")}/>
            <SRow icon={ShieldCheck} label="Sign-in activity"      sub="View recent logins"              onClick={()=>setSub("signInLog")}/>
            <SRow icon={Settings}    label="App settings"          sub="Notifications, preferences"      onClick={()=>toast("Settings coming soon")}/>
          </div>
          <button onClick={()=>{authSignOut();setUser(null);setScreen("splash");}} className="w-full flex items-center justify-center gap-2 text-rose-600 text-sm font-black py-3.5">
            <LogOut size={14}/> Log out
          </button>
        </div>
      </div>
    </div>
  );
}

// ── CHANGE EMAIL ───────────────────────────────────────────────
function ChangeEmailScreen({ back, user, setUser, toast }) {
  const [newE,setNewE]=useState("");const[pw,setPw]=useState("");const[err,setErr]=useState("");const[busy,setBusy]=useState(false);const[done,setDone]=useState(false);
  function submit(){
    setErr("");
    if(!newE||!/\S+@\S+\.\S+/.test(newE)){setErr("Enter a valid email.");return;}
    if(newE===user?.email){setErr("Must differ from current email.");return;}
    if(!pw){setErr("Enter your current password.");return;}
    setBusy(true);
    try{const updated=authChangeEmail(pw,newE);setUser(updated);setDone(true);toast("Email changed to "+newE);}
    catch(e){setErr(e.message);}finally{setBusy(false);}
  }
  return (
    <div className="h-full flex flex-col bg-white">
      <TopBar title="Change email" onBack={back}/>
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        {done?(
          <div className="flex flex-col items-center text-center gap-4 pt-8">
            <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center"><CheckCircle2 size={26} className="text-emerald-600"/></div>
            <h3 className="font-black text-slate-900 text-lg">Email changed!</h3>
            <p className="text-sm text-slate-500">Your email is now <b className="text-slate-800">{newE}</b></p>
            <button onClick={back} className="w-full bg-blue-700 text-white font-black rounded-2xl py-4 text-sm shadow-lg">Done</button>
          </div>
        ):(
          <>
            <Err msg={err}/>
            <div className="bg-slate-50 rounded-2xl px-4 py-3"><p className="text-xs text-slate-400 font-semibold">Current email</p><p className="text-sm font-black text-slate-700">{user?.email}</p></div>
            <Inp label="New email address" type="email" value={newE} onChange={e=>setNewE(e.target.value)} placeholder="new@example.com"/>
            <Inp label="Current password (to confirm)" type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="Your password"/>
            <button onClick={submit} disabled={busy} className="w-full bg-blue-700 text-white font-black rounded-2xl py-4 text-sm flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg">
              {busy&&<Spin/>} Change email
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── CHANGE PASSWORD ────────────────────────────────────────────
function ChangePasswordScreen({ back, toast }) {
  const [cur,setCur]=useState("");const[nx,setNx]=useState("");const[cf,setCf]=useState("");const[err,setErr]=useState("");const[busy,setBusy]=useState(false);const[done,setDone]=useState(false);
  function submit(){
    setErr("");
    if(!cur){setErr("Enter current password.");return;}
    if(nx.length<6){setErr("New password must be 6+ characters.");return;}
    if(nx!==cf){setErr("Passwords do not match.");return;}
    if(nx===cur){setErr("New password must differ from current.");return;}
    setBusy(true);
    try{authChangePassword(cur,nx);setDone(true);toast("Password updated!");}
    catch(e){setErr(e.message);}finally{setBusy(false);}
  }
  return (
    <div className="h-full flex flex-col bg-white">
      <TopBar title="Change password" onBack={back}/>
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        {done?(
          <div className="flex flex-col items-center text-center gap-4 pt-8">
            <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center"><CheckCircle2 size={26} className="text-emerald-600"/></div>
            <h3 className="font-black text-slate-900 text-lg">Password updated!</h3>
            <p className="text-sm text-slate-500">Use your new password next time you sign in.</p>
            <button onClick={back} className="w-full bg-blue-700 text-white font-black rounded-2xl py-4 text-sm shadow-lg">Done</button>
          </div>
        ):(
          <><Err msg={err}/>
          <Inp label="Current password" type="password" value={cur} onChange={e=>setCur(e.target.value)}/>
          <Inp label="New password" type="password" value={nx} onChange={e=>setNx(e.target.value)} placeholder="Min. 6 characters"/>
          <Inp label="Confirm new password" type="password" value={cf} onChange={e=>setCf(e.target.value)}/>
          <button onClick={submit} disabled={busy} className="w-full bg-blue-700 text-white font-black rounded-2xl py-4 text-sm flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg">
            {busy&&<Spin/>} Update password
          </button></>
        )}
      </div>
    </div>
  );
}

// ── SECURITY ───────────────────────────────────────────────────
function SecurityScreen({ back, setUser, setScreen, toast }) {
  const [pw,setPw]=useState("");const[err,setErr]=useState("");const[busy,setBusy]=useState(false);
  function signOutAll(){
    setErr("");
    if(!pw){setErr("Enter your password.");return;}
    const session=getSession();
    if(!session){setErr("Not signed in.");return;}
    const users=getUsers();
    const user=users[session.email];
    if(!user||user.passwordHash!==hashPw(pw)){setErr("Incorrect password.");return;}
    setBusy(true);
    setTimeout(()=>{authSignOut();setUser(null);setScreen("splash");setBusy(false);},400);
  }
  return (
    <div className="h-full flex flex-col bg-white">
      <TopBar title="Security" onBack={back}/>
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        <div className="bg-blue-50 rounded-2xl px-4 py-3 flex items-start gap-2.5"><Shield size={14} className="text-blue-700 shrink-0 mt-0.5"/><p className="text-xs text-slate-700 font-medium leading-relaxed">Passwords are stored as one-way hashes in your browser's localStorage. No plain-text passwords are ever saved.</p></div>
        <div className="bg-white border border-rose-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2"><LogOut size={15} className="text-rose-600"/><p className="font-black text-sm text-slate-900">Sign out all devices</p></div>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">Enter your password to sign out and clear all session data from this device.</p>
          <Err msg={err}/>
          <Inp type="password" value={pw} onChange={e=>{setPw(e.target.value);setErr("");}} placeholder="Your current password"/>
          <button onClick={signOutAll} disabled={busy} className="w-full bg-rose-600 text-white font-black rounded-2xl py-3.5 text-sm flex items-center justify-center gap-2 disabled:opacity-60">
            {busy?<Spin/>:<LogOut size={13}/>} Sign out all devices
          </button>
        </div>
      </div>
    </div>
  );
}

// ── SIGN-IN LOG ────────────────────────────────────────────────
function SignInLogScreen({ back }) {
  const log = authGetSignInLog();
  return (
    <div className="h-full flex flex-col bg-white">
      <TopBar title="Sign-in activity" onBack={back}/>
      <div className="flex-1 overflow-y-auto">
        {log.length===0?(
          <div className="text-center py-16 text-slate-400"><ShieldCheck size={28} className="mx-auto mb-2 opacity-40"/><p className="text-sm font-semibold">No sign-in activity yet.</p></div>
        ):(
          <div className="divide-y divide-slate-100">
            {log.map((e,i)=>(
              <div key={i} className="px-4 py-3.5 flex gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0"><Smartphone size={13} className="text-blue-700"/></div>
                <div className="min-w-0"><p className="text-xs font-black text-slate-700">{new Date(e.time).toLocaleString()}</p><p className="text-xs text-slate-400 truncate mt-0.5 font-medium">{e.device}</p></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── ROOT APP ───────────────────────────────────────────────────
export default function RaicoApp() {
  const [screen,  setScreen]  = useState("splash");
  const [user,    setUser]    = useState(()=>getSession());
  const [selBiz,  setSelBiz]  = useState(BIZ[0]);
  const [chatHist,setChatHist]= useState({});
  const [toast,   setToast]   = useState({msg:"",type:"success"});

  // Load fonts
  useEffect(()=>{
    if(document.getElementById("raico-gf"))return;
    const l=document.createElement("link");
    l.id="raico-gf";l.rel="stylesheet";
    l.href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap";
    document.head.appendChild(l);
  },[]);

  // Keep session in sync
  function setUserAndSession(u) {
    setUser(u);
    if(u) saveSession(u); else clearSession();
  }

  function showToast(msg,type="success"){
    setToast({msg,type});
    setTimeout(()=>setToast({msg:"",type:"success"}),3000);
  }

  function openBiz(b,target="bizDetail"){
    setSelBiz(b);
    if(!chatHist[b.id]) setChatHist(p=>({...p,[b.id]:b.id===1?[...SEED]:[]}));
    setScreen(target);
  }

  const curMsgs=chatHist[selBiz?.id]||[];
  function setCurMsgs(updater){
    const id=selBiz?.id;
    setChatHist(p=>({...p,[id]:typeof updater==="function"?updater(p[id]||[]):updater}));
  }

  const navScreens=["home","search","chatList","notifications","profile"];
  const showNav=navScreens.includes(screen);
  const darkStatus=screen==="splash"||screen==="home";

  // Route guard
  useEffect(()=>{
    if(["splash","auth","verifyEmail","onboarding"].includes(screen))return;
    if(!user) setScreen("splash");
  },[screen,user]);

  return (
    <div className="min-h-screen w-full bg-slate-300 flex flex-col items-center justify-center py-8 px-4" style={{fontFamily:"'Inter',sans-serif"}}>
      <p className="text-slate-500 text-xs tracking-[0.2em] font-black mb-4">RAICO GLOBAL BUSINESS CONNECT</p>
      <div className="relative bg-white shadow-2xl overflow-hidden flex flex-col" style={{width:390,height:820,borderRadius:"2.75rem",border:"8px solid #0f172a"}}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-5 bg-slate-900 rounded-b-2xl z-20"/>
        <StatusBar dark={darkStatus}/>
        <div className="flex-1 min-h-0 flex flex-col relative overflow-hidden">
          {screen==="splash"        && <SplashScreen setScreen={setScreen}/>}
          {screen==="auth"          && <AuthScreen setScreen={setScreen} setUser={setUserAndSession}/>}
          {screen==="verifyEmail"   && <VerifyEmailScreen user={user} setUser={setUserAndSession} setScreen={setScreen} toast={showToast}/>}
          {screen==="onboarding"    && <OnboardingScreen user={user} setScreen={setScreen} toast={showToast}/>}
          {screen==="home"          && <HomeScreen setScreen={setScreen} openBiz={openBiz} user={user}/>}
          {screen==="search"        && <SearchScreen openBiz={openBiz}/>}
          {screen==="bizDetail"     && <BizDetailScreen biz={selBiz} setScreen={setScreen} toast={showToast}/>}
          {screen==="chatList"      && <ChatListScreen openBiz={openBiz}/>}
          {screen==="chat"          && <ChatScreen key={selBiz?.id} biz={selBiz} setScreen={setScreen} msgs={curMsgs} setMsgs={setCurMsgs}/>}
          {screen==="notifications" && <NotificationsScreen/>}
          {screen==="profile"       && <ProfileScreen user={user} setUser={setUserAndSession} setScreen={setScreen} toast={showToast}/>}
          <Toast msg={toast.msg} type={toast.type}/>
        </div>
        {showNav && <BottomNav screen={screen} setScreen={setScreen}/>}
      </div>
    </div>
  );
}
