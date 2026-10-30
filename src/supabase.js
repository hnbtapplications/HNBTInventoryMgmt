export function getSupabaseCredentials() {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL || "").trim();
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();
  const localUrl = (localStorage.getItem("hb_supabase_url") || "").trim();
  const localKey = (localStorage.getItem("hb_supabase_key") || "").trim();
  const url = envUrl || localUrl;
  const key = envKey || localKey;
  return { url, key, isEnv: Boolean(envUrl && envKey) };
}

export function isSupabaseConfigured() {
  return true;
}

export function saveSupabaseCredentials(url, key) {
  if (url) localStorage.setItem("hb_supabase_url", String(url).trim());
  else localStorage.removeItem("hb_supabase_url");
  if (key) localStorage.setItem("hb_supabase_key", String(key).trim());
  else localStorage.removeItem("hb_supabase_key");
}

async function api(op, { method = "GET", body } = {}) {
  const r = await fetch(`/api/inventory?op=${encodeURIComponent(op)}`, {
    method,
    credentials: "same-origin",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store"
  });
  const d = await r.json().catch(() => null);
  if (!r.ok) throw new Error(d?.error || "Request failed");
  return d;
}

export async function fetchProductsFromDB() {
  return await api("products");
}

export async function upsertProductToDB(product) {
  try {
    await api("product-upsert", { method: "POST", body: { product } });
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}

export async function deleteProductFromDB(id) {
  try {
    await api("product-delete", { method: "POST", body: { id } });
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}

export async function fetchMovementsFromDB() {
  return await api("movements");
}

export async function upsertMovementToDB(movement) {
  try {
    return await api("movement-upsert", { method: "POST", body: { movement } });
  } catch (e) {
    console.error(e);
    throw e;
  }
}

export async function deleteMovementFromDB(id) {
  try {
    return await api("movement-delete", { method: "POST", body: { id } });
  } catch (e) {
    console.error(e);
    throw e;
  }
}

export async function fetchAuditLogsFromDB() {
  try {
    return await api("audit");
  } catch (e) {
    console.error(e);
    return null;
  }
}

export async function writeAuditLogToDB() {
  return false;
}

export async function fetchMastersFromDB() {
  try {
    return await api("masters");
  } catch (e) {
    console.error(e);
    return null;
  }
}

export async function saveMasterItemToDB(table, name) {
  try {
    await api("master-save", { method: "POST", body: { table, name } });
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}

export async function deleteMasterItemFromDB(table, name) {
  try {
    await api("master-delete", { method: "POST", body: { table, name } });
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}

export async function fetchEmployeeProfiles() {
  const r = await fetch("/api/admin-users", { credentials: "same-origin", cache: "no-store" });
  const d = await r.json().catch(() => []);
  if (!r.ok) throw new Error(d?.error || "Unable to load employees");
  return d;
}

export async function updateEmployeeProfile(userId, changes) {
  const r = await fetch("/api/admin-users", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, changes })
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d?.error || "Unable to update employee");
  return true;
}

export async function signInEmployee() {
  throw new Error("Use the application username login.");
}

export async function signOutEmployee() {
  await fetch("/api/logout", { method: "POST", credentials: "same-origin" });
}

export async function getEmployeeSession() {
  const r = await fetch("/api/session", { credentials: "same-origin", cache: "no-store" });
  const d = await r.json().catch(() => null);
  return d?.authenticated ? d : null;
}

export async function fetchEmployeeProfile() {
  const s = await getEmployeeSession();
  return s?.user || null;
}

export async function syncAllLocalToDB(payload) {
  try {
    return await api("sync-all", { method: "POST", body: payload });
  } catch (e) {
    console.warn("sync-all batch endpoint failed, attempting sequential sync:", e);
    const { products = [], movements = [], brands = [], categories = [], units = [] } = payload || {};
    if (brands?.length) {
      for (const b of brands) await saveMasterItemToDB("brands", b).catch(() => {});
    }
    if (categories?.length) {
      for (const c of categories) await saveMasterItemToDB("categories", c).catch(() => {});
    }
    if (units?.length) {
      for (const u of units) await saveMasterItemToDB("units", u).catch(() => {});
    }
    if (products?.length) {
      for (const p of products) await upsertProductToDB(p).catch(() => {});
    }
    if (movements?.length) {
      for (const m of movements) await upsertMovementToDB(m).catch(() => {});
    }
    return { ok: true, fallback: true };
  }
}
