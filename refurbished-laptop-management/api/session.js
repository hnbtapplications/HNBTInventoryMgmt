import { getSession, isAuthConfigured, readSessionCookie } from "./_auth.js";

export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).json({ error:"Method not allowed" });

  // Session discovery is a read-only bootstrap endpoint. Missing legacy/admin
  // fallback credentials must not turn the entire application into a 503:
  // employee authentication can use Supabase Auth independently.
  const configured = isAuthConfigured();
  const session = getSession(readSessionCookie(req));
  if(!session)return res.status(200).json({authenticated:false,configured,user:null});

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
