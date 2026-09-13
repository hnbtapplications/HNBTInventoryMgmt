import {createSession,getSession,readSessionCookie,sessionCookie} from "./_auth.js";
function send(res,status,payload){res.status(status).json(payload)}
export default async function handler(req,res){
 if(req.method!=="POST")return send(res,405,{error:"Method not allowed"});
 const session=getSession(readSessionCookie(req));
 if(!session||session.mode!=="employee"||!session.user_id)return send(res,401,{error:"Employee login required"});
 const {new_password}=req.body||{};
 const password=String(new_password||"");
 if(password.length<8)return send(res,400,{error:"New password must be at least 8 characters"});
 if(!/[A-Z]/.test(password)||!/[a-z]/.test(password)||!/[0-9]/.test(password))return send(res,400,{error:"Password must contain uppercase, lowercase and a number"});
 const url=String(process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL||"").replace(/\/$/,"");
 const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY||"";
 if(!url||!serviceKey)return send(res,503,{error:"Supabase admin service is not configured"});
 try{
  const r=await fetch(`${url}/auth/v1/admin/users/${encodeURIComponent(session.user_id)}`,{method:"PUT",headers:{apikey:serviceKey,Authorization:`Bearer ${serviceKey}`,"Content-Type":"application/json"},body:JSON.stringify({password,user_metadata:{force_password_change:false}})});
  const data=await r.json().catch(()=>({}));
  if(!r.ok)return send(res,r.status,{error:data?.msg||data?.message||"Unable to change password"});
  const next={...session,force_password_change:false};
  res.setHeader("Set-Cookie",sessionCookie(createSession(next)));
  return send(res,200,{ok:true,message:"Password changed successfully",force_password_change:false});
 }catch(err){return send(res,500,{error:err?.message||"Unable to change password"})}
}
