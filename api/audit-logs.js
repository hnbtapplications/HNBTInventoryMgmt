import { isAuthConfigured, readSessionCookie, verifySession } from "./_auth.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  if (!isAuthConfigured() || !verifySession(readSessionCookie(req))) return res.status(401).json({ error: "Unauthorized" });

  const url = String(process.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
  const key = process.env.VITE_SUPABASE_ANON_KEY || "";
  if (!url || !key) return res.status(503).json({ error: "Supabase is not configured" });

  try {
    const upstream = await fetch(`${url}/rest/v1/audit_logs?select=*&order=created_at.desc&limit=500`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` }
    });
    const data = await upstream.json().catch(() => []);
    if (!upstream.ok) return res.status(upstream.status).json({ error: data?.message || "Unable to load audit logs" });
    return res.status(200).json({ logs: data });
  } catch (err) {
    return res.status(500).json({ error: err?.message || "Unable to load audit logs" });
  }
}
