import { createSession, isAuthConfigured, passwordMatches, sessionCookie, usernameMatches } from "./_auth.js";

function cleanUsername(value){return String(value||"").trim().toLowerCase().replace(/[^a-z0-9._-]/g,"")}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error:"Method not allowed" });

  const { username = "", password = "" } = req.body || {};

  // Preserve the existing administrator login as a safe fallback.
  if (isAuthConfigured() && usernameMatches(username) && passwordMatches(password)) {
    res.setHeader("Set-Cookie", sessionCookie(createSession(String(username).trim())));
    return res.status(200).json({ authenticated:true, mode:"admin", user:{ username:String(username).trim(), role:"admin", branch:"Both" } });
  }

  // Employee accounts use a username in the UI. Supabase receives an internal-only email alias.
  const loginId=cleanUsername(username);
  const url=String(process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL||"").replace(/\/$/,"");
  const anonKey=process.env.VITE_SUPABASE_ANON_KEY||"";
  const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY||"";
  if(!loginId||!password||!url||!anonKey||!serviceKey)return res.status(401).json({error:"Invalid username or password"});

  try{
    const tokenResp=await fetch(`${url}/auth/v1/token?grant_type=password`,{method:"POST",headers:{apikey:anonKey,"Content-Type":"application/json"},body:JSON.stringify({email:`${loginId}@hnbt.local`,password:String(password)})});
    const tokenData=await tokenResp.json().catch(()=>({}));
    if(!tokenResp.ok||!tokenData?.user?.id)return res.status(401).json({error:"Invalid username or password"});

    const profileResp=await fetch(`${url}/rest/v1/employee_profiles?user_id=eq.${encodeURIComponent(tokenData.user.id)}&select=*`,{headers:{apikey:serviceKey,Authorization:`Bearer ${serviceKey}`}});
    const profiles=await profileResp.json().catch(()=>[]);
    const profile=Array.isArray(profiles)?profiles[0]:null;
    if(!profile||profile.active===false)return res.status(403).json({error:"This employee account is disabled"});

    const displayName=profile.full_name||loginId;
    res.setHeader("Set-Cookie", sessionCookie(createSession(displayName)));
    return res.status(200).json({authenticated:true,mode:"employee",user:{username:loginId,full_name:displayName,role:profile.role,branch:profile.branch,permissions:{can_manage_products:profile.can_manage_products,can_stock_movement:profile.can_stock_movement,can_view_reports:profile.can_view_reports,can_manage_masters:profile.can_manage_masters,can_view_audit_logs:profile.can_view_audit_logs,can_manage_users:profile.can_manage_users}},force_password_change:Boolean(tokenData.user?.user_metadata?.force_password_change),access_token:tokenData.access_token});
  }catch{
    return res.status(401).json({error:"Invalid username or password"});
  }
}
