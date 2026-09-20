import refurbishedHandler from "../refurbished-laptop-management/api/logout.js";
import { clearSessionCookie } from "./_auth.js";

export default function handler(req, res) {
 if(isRefurbishedHost(req)){return refurbishedHandler(req,res);}

 if(isRefurbishedHost(req)){const m=await import("../refurbished-laptop-management/api/logout.js");return m.default(req,res);}
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error:"Method not allowed" });
  res.setHeader("Set-Cookie", clearSessionCookie());
  return res.status(200).json({ authenticated:false });
}
