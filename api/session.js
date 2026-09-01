import { isAuthConfigured, readSessionCookie, verifySession } from "./_auth.js";

export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).json({ error:"Method not allowed" });
  if (!isAuthConfigured()) return res.status(503).json({ authenticated:false, configured:false });
  return res.status(200).json({ authenticated:verifySession(readSessionCookie(req)), configured:true });
}
