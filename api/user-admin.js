import{getSession,readSessionCookie}from"./_auth.js";
const URL=()=>String(process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL||"").replace(/\/$/,"");
const KEY=()=>process.env.SUPABASE_SERVICE_ROLE_KEY||"";
function headers(extra={}){return{apikey:KEY(),Authorization:`Bearer ${KEY()}`,"Content-Type":"application/json",...extra}}
async function rest(path,opt={}){const r=await fetch(`${URL()}/rest/v1/${path}`,{...opt,headers:headers(opt.headers)});const t=await r.text();let d=null;try{d=t?JSON.parse(t):null}catch{d=t}if(!r.ok)throw new Error(d?.message||d?.hint||d?.error||t||`Database error ${r.status}`);return d}
async function authAdmin(path,opt={}){const r=await fetch(`${URL()}/auth/v1/admin/${path}`,{...opt,headers:headers(opt.headers)});const t=await r.text();let d=null;try{d=t?JSON.parse(t):null}catch{d=t}if(!r.ok)throw new Error(d?.msg||d?.message||d?.error_description||d?.error||t||`Auth error ${r.status}`);return d}
function admin(s){return s&&s.role==="admin"&&s.permissions?.can_manage_users}
export default async function handler(req,res){
 res.setHeader("Cache-Control","no-store");
 const s=getSession(readSessionCookie(req));
 if(!s)return res.status(401).json({error:"Login required"});
 if(!admin(s))return res.status(403).json({error:"Administrator user-management permission required"});
 if(!URL()||!KEY())return res.status(503).json({error:"Supabase service configuration missing"});
 try{
  const action=String(req.query?.action||"list");
  if(req.method==="GET"&&action==="list"){
   const profiles=await rest("employee_profiles?select=*&order=created_at.asc");
   const users=(profiles||[]).map(p=>({user_id:p.user_id,full_name:p.full_name,role:p.role,branch:p.branch,active:p.active,can_manage_products:Boolean(p.can_manage_products),can_stock_movement:Boolean(p.can_stock_movement),can_view_reports:Boolean(p.can_view_reports),can_manage_masters:Boolean(p.can_manage_masters),can_view_audit_logs:Boolean(p.can_view_audit_logs),can_manage_users:Boolean(p.can_manage_users)}));
   return res.json({users});
  }
  if(req.method==="POST"&&action==="create"){
   const b=req.body||{};const email=String(b.email||"").trim().toLowerCase();const password=String(b.password||"");const full_name=String(b.full_name||"").trim();
   const branch=["Bangalore","Hosur","Both"].includes(b.branch)?b.branch:"Bangalore";
   if(!email||!password||!full_name)return res.status(400).json({error:"Name, email and password are required"});
   if(password.length<8)return res.status(400).json({error:"Password must be at least 8 characters"});
   const created=await authAdmin("users",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password,email_confirm:true,user_metadata:{full_name}})});
   const uid=created?.user?.id;if(!uid)throw new Error("Auth user was not created");
   try{
    await rest("employee_profiles",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({user_id:uid,full_name,role:"employee",branch,active:true,can_manage_products:Boolean(b.can_manage_products),can_stock_movement:Boolean(b.can_stock_movement),can_view_reports:Boolean(b.can_view_reports),can_manage_masters:Boolean(b.can_manage_masters),can_view_audit_logs:Boolean(b.can_view_audit_logs),can_manage_users:false})});
   }catch(e){await fetch(`${URL()}/auth/v1/admin/users/${encodeURIComponent(uid)}`,{method:"DELETE",headers:headers()}).catch(()=>{});throw e}
   return res.status(201).json({ok:true,user_id:uid});
  }
  if(req.method==="POST"&&action==="update"){
   const b=req.body||{};const uid=String(b.user_id||"");if(!uid)return res.status(400).json({error:"User ID required"});
   const allowed=["full_name","branch","active","can_manage_products","can_stock_movement","can_view_reports","can_manage_masters","can_view_audit_logs","can_manage_users"];
   const p={};for(const k of allowed)if(k in b)p[k]=b[k];
   if(p.branch&&!["Bangalore","Hosur","Both"].includes(p.branch))return res.status(400).json({error:"Invalid branch"});
   await rest(`employee_profiles?user_id=eq.${encodeURIComponent(uid)}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify(p)});
   if("active" in p)await authAdmin(`users/${encodeURIComponent(uid)}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({ban_duration:p.active?"none":"876000h"})});
   return res.json({ok:true});
  }
  if(req.method==="POST"&&action==="reset-password"){
   const b=req.body||{};if(!b.user_id||String(b.password||"").length<8)return res.status(400).json({error:"User and password (minimum 8 characters) are required"});
   await authAdmin(`users/${encodeURIComponent(b.user_id)}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:String(b.password)})});
   return res.json({ok:true});
  }
  return res.status(400).json({error:"Unknown user management operation"});
 }catch(e){return res.status(500).json({error:e.message||"Server error"})}
}