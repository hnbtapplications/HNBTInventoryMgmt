import crypto from "node:crypto";

const COOKIE_NAME = "hb_inventory_session";
const SESSION_SECONDS = 8 * 60 * 60;

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export function passwordMatches(password) {
  const expected = process.env.ADMIN_PASSWORD_HASH || "";
  const actual = crypto.createHash("sha256").update(String(password)).digest("hex");
  return Boolean(expected) && safeEqual(actual, expected);
}

export function usernameMatches(username) {
  const expected = process.env.ADMIN_USERNAME || "";
  return Boolean(expected) && safeEqual(String(username).trim(), expected);
}

function signature(value) {
  const secret = process.env.SESSION_SECRET || "";
  if (secret.length < 32) return "";
  return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

export function createSession(user) {
  const info=typeof user==="string"?{username:String(user).trim(),role:"admin",branch:"Both",mode:"admin"}:{...(user||{})};
  const payload = Buffer.from(JSON.stringify({
    sub:String(info.username||info.full_name||"").trim(),
    username:String(info.username||"").trim(),
    full_name:String(info.full_name||info.username||"").trim(),
    role:info.role||"employee",
    branch:info.branch||"Both",
    mode:info.mode||"employee",
    permissions:info.permissions||{},
    force_password_change:Boolean(info.force_password_change),
    exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS
  })).toString("base64url");
  return `${payload}.${signature(payload)}`;
}

export function getSession(token) {
  if (!token || !token.includes(".")) return null;
  const [payload, supplied] = token.split(".");
  const expected = signature(payload);
  if (!expected || !safeEqual(supplied, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!data.sub || Number(data.exp) <= Math.floor(Date.now() / 1000)) return null;
    return data;
  } catch {
    return null;
  }
}

export function verifySession(token) { return Boolean(getSession(token)); }
export function readSessionCookie(req) { const cookies=String(req.headers.cookie||"").split(";");for(const item of cookies){const[name,...value]=item.trim().split("=");if(name===COOKIE_NAME)return decodeURIComponent(value.join("="));}return ""; }
export function sessionCookie(token) { return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_SECONDS}`; }
export function clearSessionCookie() { return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`; }
export function isAuthConfigured() { return Boolean(process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD_HASH && (process.env.SESSION_SECRET || "").length >= 32); }
