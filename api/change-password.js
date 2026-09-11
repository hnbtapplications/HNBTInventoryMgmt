function send(res,status,payload){res.status(status).json(payload)}

export default async function handler(req,res){
  if(req.method!=="POST")return send(res,405,{error:"Method not allowed"});
  const url=String(process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL||"").replace(/\/$/,"");
  const anonKey=process.env.VITE_SUPABASE_ANON_KEY||"";
  if(!url||!anonKey)return send(res,503,{error:"Supabase is not configured"});
  const auth=String(req.headers.authorization||"");
  if(!auth.startsWith("Bearer "))return send(res,401,{error:"Employee login required"});
  const token=auth.slice(7).trim();
  const {new_password}=req.body||{};
  if(!new_password||String(new_password).length<8)return send(res,400,{error:"New password must be at least 8 characters"});
  try{
    const r=await fetch(`${url}/auth/v1/user`,{method:"PUT",headers:{apikey:anonKey,Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify({password:String(new_password),data:{force_password_change:false}})});
    const data=await r.json().catch(()=>({}));
    if(!r.ok)return send(res,r.status,{error:data?.msg||data?.message||"Unable to change password"});
    return send(res,200,{ok:true,message:"Password changed successfully"});
  }catch(err){return send(res,500,{error:err?.message||"Unable to change password"})}
}
