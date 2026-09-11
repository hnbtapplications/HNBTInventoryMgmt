import React,{useState}from"react";
import{LogIn,ShieldCheck}from"lucide-react";
import{signInEmployee}from"./supabase";

export default function EmployeeLogin({onAuthenticated,onUseLegacyAdmin}){
 const[email,setEmail]=useState("");const[password,setPassword]=useState("");const[busy,setBusy]=useState(false);const[error,setError]=useState("");
 async function submit(e){e.preventDefault();setBusy(true);setError("");try{const result=await signInEmployee(email,password);onAuthenticated?.(result)}catch(err){setError(err?.message||"Unable to sign in")}finally{setBusy(false)}}
 return <div className="login-screen"><div className="login-card"><div className="login-brand"><img src="/logo.png" alt="Hertz & Bytes Technologies"/><div><h1>Inventory Management</h1><p>Employee Login</p></div></div><div className="login-security"><ShieldCheck size={18}/><span>Individual employee access & activity tracking</span></div><form onSubmit={submit}><label>Email / Login ID</label><input type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} placeholder="employee@hertznbytes.com" required/><label>Password</label><input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter password" required/>{error&&<div className="login-error">{error}</div>}<button className="primary login-submit" type="submit" disabled={busy}><LogIn size={17}/>{busy?"Signing in...":"Sign In"}</button></form>{onUseLegacyAdmin&&<button type="button" className="legacy-login-link" onClick={onUseLegacyAdmin}>Administrator fallback login</button>}<p className="login-footnote">Hertz & Bytes Technologies · Bangalore & Hosur</p></div></div>;
}
