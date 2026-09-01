import { createSession, isAuthConfigured, passwordMatches, sessionCookie, usernameMatches } from "./_auth.js";

export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error:"Method not allowed" });
  if (!isAuthConfigured()) return res.status(503).json({ error:"Login has not been configured by the administrator" });

  const { username = "", password = "" } = req.body || {};
  if (!usernameMatches(username) || !passwordMatches(password)) {
    return res.status(401).json({ error:"Invalid username or password" });
  }

  res.setHeader("Set-Cookie", sessionCookie(createSession(String(username).trim())));
  return res.status(200).json({ authenticated:true });
}
