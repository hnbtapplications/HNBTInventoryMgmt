import { getSession as getRefurbishedSession, readSessionCookie as readRefurbishedSessionCookie, isAuthConfigured as isRefurbishedAuthConfigured } from "./refurbished-auth.js";
import { getSession, isAuthConfigured, readSessionCookie } from "./_auth.js";

const isRefurbishedHost = (req) =>
  String(req?.headers?.host || "").toLowerCase().startsWith("hnbt-refurbished-laptop-standalone");

function sessionResponse(session, configured) {
  if (!session) return { authenticated: false, configured, user: null };
  return {
    authenticated: true,
    configured: true,
    mode: session.mode || "admin",
    user: {
      username: session.username || session.sub,
      full_name: session.full_name || session.username || session.sub,
      role: session.role || "admin",
      branch: session.branch || "Both",
      permissions: session.permissions || {},
      force_password_change: Boolean(session.force_password_change)
    }
  };
}

export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (isRefurbishedHost(req)) {
    const configured = isRefurbishedAuthConfigured();
    const session = getRefurbishedSession(readRefurbishedSessionCookie(req));
    return res.status(200).json(sessionResponse(session, configured));
  }

  const configured = isAuthConfigured();
  const session = getSession(readSessionCookie(req));

  if (!configured) {
    return res.status(503).json({ authenticated: false, configured: false, user: null });
  }

  return res.status(200).json(sessionResponse(session, configured));
}
