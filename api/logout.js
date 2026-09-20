import refurbishedHandler from "./refurbished-logout.js";
const isRefurbishedHost=(req)=>String(req?.headers?.host||"").toLowerCase().startsWith("hnbt-refurbished-laptop-standalone");
import { clearSessionCookie } from "./_auth.js";

export default function handler(req, res) {
  if(isRefurbishedHost(req)) return refurbishedHandler(req,res);
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error:"Method not allowed" });
  res.setHeader("Set-Cookie", clearSessionCookie());
  return res.status(200).json({ authenticated:false });
}

