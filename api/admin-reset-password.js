import { readSessionCookie, verifySession } from "./_auth.js";

function send(res,status,payload){res.status(status).json(payload)}

export default async function handler(req,res){
  if(req.method!=="POST")return send(res,405,{error:"Method not allowed"});
  if(!verifySession(readSessionCookie(req)))return send(res,401,{error:"Administrator login required"});

  const url=String(process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL||"").replace(/\/$/,"");
  const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY||"";
  if(!url||!serviceKey)return send(res,503,{error:"Supabase admin service is not configured"});

  const {user_id,new_password}=req.body||{};
  if(!user_id||!new_password)return send(res,400,{error:"Employee and new password are required"});
  if(String(new_password).length<8)return send(res,400,{error:"Password must be at least 8 characters"});

  try{
    const authResp=await fetch(`${url}/auth/v1/admin/users/${encodeURIComponent(user_id)}`,{
      method:"PUT",
      headers:{apikey:serviceKey,Authorization:`Bearer ${serviceKey}`,"Content-Type":"application/json"},
      body:JSON.stringify({password:String(new_password),user_metadata:{force_password_change:true}})
    });
    const authData=await authResp.json().catch(()=>({}));
    if(!authResp.ok)return send(res,authResp.status,{error:authData?.msg||authData?.message||"Unable to reset password"});
    return send(res,200,{ok:true,message:"Temporary password set. Employee must change it after login."});
  }catch(err){return send(res,500,{error:err?.message||"Unable to reset password"})}
}
