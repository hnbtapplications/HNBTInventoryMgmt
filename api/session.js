import { getSession, isAuthConfigured, readSessionCookie } from "./_auth.js";

export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).json({ error:"Method not allowed" });
  if (!isAuthConfigured()) return res.status(503).json({ authenticated:false, configured:false, user:null });
  const session = getSession(readSessionCookie(req));
  return res.status(200).json({
    authenticated:Boolean(session),
    configured:true,
    user:session ? { username:session.username } : null
  });
}
