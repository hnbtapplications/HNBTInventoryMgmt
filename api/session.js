import refurbishedHandler from "./refurbished-session.js";
const isRefurbishedHost=(req)=>String(req?.headers?.host||"").toLowerCase().startsWith("hnbt-refurbished-laptop-standalone");
import { getSession, isAuthConfigured, readSessionCookie } from "./_auth.js";

export default function handler(req, res) {
  if(isRefurbishedHost(req)) return refurbishedHandler(req,res);
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).json({ error:"Method not allowed" });
  if (!isAuthConfigured()) return res.status(503).json({ authenticated:false, configured:false, user:null });
  const session = getSession(readSessionCookie(req));
  if(!session)return res.status(200).json({authenticated:false,configured:true,user:null});
  return res.status(200).json({
    authenticated:true,
    configured:true,
    mode:session.mode||"admin",
    user:{
      username:session.username||session.sub,
      full_name:session.full_name||session.username||session.sub,
      role:session.role||"admin",
      branch:session.branch||"Both",
      permissions:session.permissions||{},
      force_password_change:Boolean(session.force_password_change)
    }
  });
}

