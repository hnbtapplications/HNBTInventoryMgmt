import { readSessionCookie, verifySession } from "./_auth.js";

function send(res,status,payload){res.status(status).json(payload)}

export default async function handler(req,res){
  if(req.method!=="POST")return send(res,405,{error:"Method not allowed"});
  if(!verifySession(readSessionCookie(req)))return send(res,401,{error:"Administrator login required"});

  const url=String(process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL||"").replace(/\/$/,"");
  const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY||"";
  if(!url||!serviceKey)return send(res,503,{error:"Supabase admin service is not configured"});

  const {email,password,full_name,branch="Both",role="employee"}=req.body||{};
  if(!email||!password||!full_name)return send(res,400,{error:"Name, email and password are required"});
  if(String(password).length<8)return send(res,400,{error:"Password must be at least 8 characters"});
  if(!["Bangalore","Hosur","Both"].includes(branch))return send(res,400,{error:"Invalid branch"});
  if(!["admin","employee"].includes(role))return send(res,400,{error:"Invalid role"});

  try{
    const authResp=await fetch(`${url}/auth/v1/admin/users`,{method:"POST",headers:{apikey:serviceKey,Authorization:`Bearer ${serviceKey}`,"Content-Type":"application/json"},body:JSON.stringify({email:String(email).trim().toLowerCase(),password:String(password),email_confirm:true,user_metadata:{full_name:String(full_name).trim()}})});
    const authData=await authResp.json();
    if(!authResp.ok)return send(res,authResp.status,{error:authData?.msg||authData?.message||"Unable to create employee"});
    const isAdmin=role==="admin";
    const profile={user_id:authData.id,full_name:String(full_name).trim(),role,branch,active:true,can_manage_products:isAdmin,can_stock_movement:true,can_view_reports:true,can_manage_masters:isAdmin,can_view_audit_logs:isAdmin,can_manage_users:isAdmin};
    const profileResp=await fetch(`${url}/rest/v1/employee_profiles`,{method:"POST",headers:{apikey:serviceKey,Authorization:`Bearer ${serviceKey}`,"Content-Type":"application/json",Prefer:"return=representation"},body:JSON.stringify(profile)});
    const profileData=await profileResp.json();
    if(!profileResp.ok){await fetch(`${url}/auth/v1/admin/users/${authData.id}`,{method:"DELETE",headers:{apikey:serviceKey,Authorization:`Bearer ${serviceKey}`}}).catch(()=>{});return send(res,500,{error:profileData?.message||"Employee profile creation failed"})}
    return send(res,201,{ok:true,user:{id:authData.id,email:authData.email},profile:profileData?.[0]||profile});
  }catch(err){return send(res,500,{error:err?.message||"Unable to create employee"})}
}
