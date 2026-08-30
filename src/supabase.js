import { createClient } from "@supabase/supabase-js";

// Retrieve Supabase URL & Key from Environment Variables or LocalStorage
export function getSupabaseCredentials() {
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const localUrl = localStorage.getItem("hb_supabase_url") || "";
  const localKey = localStorage.getItem("hb_supabase_key") || "";

  return {
    url: (envUrl || localUrl || "").trim(),
    key: (envKey || localKey || "").trim(),
    isEnv: Boolean(envUrl && envKey)
  };
}

let cachedClient = null;
let lastUrl = "";
let lastKey = "";

export function getSupabase() {
  const { url, key } = getSupabaseCredentials();
  if (!url || !key) return null;

  if (cachedClient && lastUrl === url && lastKey === key) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(url, key);
    lastUrl = url;
    lastKey = key;
    return cachedClient;
  } catch (err) {
    console.error("Failed to initialize Supabase client:", err);
    return null;
  }
}

export function isSupabaseConfigured() {
  const { url, key } = getSupabaseCredentials();
  return Boolean(url && key);
}

export function saveSupabaseCredentials(url, key) {
  if (url) localStorage.setItem("hb_supabase_url", url.trim());
  else localStorage.removeItem("hb_supabase_url");

  if (key) localStorage.setItem("hb_supabase_key", key.trim());
  else localStorage.removeItem("hb_supabase_key");

  cachedClient = null;
  lastUrl = "";
  lastKey = "";
}

// ======================= DB CRUD OPERATIONS =======================

export async function fetchProductsFromDB() {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("Error fetching products from Supabase:", err);
    return null;
  }
}

export async function upsertProductToDB(product) {
  const supabase = getSupabase();
  if (!supabase) return false;
  try {
    const payload = {
      id: product.id,
      name: product.name,
      brand: product.brand || "",
      category: product.category || "",
      unit: product.unit || "Nos",
      purchase: Number(product.purchase) || 0,
      sale: Number(product.sale) || 0,
      min: Number(product.min) || 5,
      bangalore: Number(product.bangalore) || 0,
      hosur: Number(product.hosur) || 0
    };
    const { error } = await supabase.from("products").upsert(payload);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("Error saving product to Supabase:", err);
    return false;
  }
}

export async function deleteProductFromDB(id) {
  const supabase = getSupabase();
  if (!supabase) return false;
  try {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("Error deleting product from Supabase:", err);
    return false;
  }
}

export async function fetchMovementsFromDB() {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("movements")
      .select("*")
      .order("timestamp", { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("Error fetching movements from Supabase:", err);
    return null;
  }
}

export async function upsertMovementToDB(movement) {
  const supabase = getSupabase();
  if (!supabase) return false;
  try {
    const payload = {
      id: movement.id,
      timestamp: movement.timestamp || movement.id,
      date: movement.date,
      type: movement.type,
      productId: movement.productId || "",
      product: movement.product || "",
      branch: movement.branch || "Bangalore",
      qty: Number(movement.qty) || 0,
      note: movement.note || ""
    };
    const { error } = await supabase.from("movements").upsert(payload);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("Error saving movement to Supabase:", err);
    return false;
  }
}

export async function deleteMovementFromDB(id) {
  const supabase = getSupabase();
  if (!supabase) return false;
  try {
    const { error } = await supabase.from("movements").delete().eq("id", id);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("Error deleting movement from Supabase:", err);
    return false;
  }
}

export async function fetchMastersFromDB() {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const [bRes, cRes, uRes] = await Promise.all([
      supabase.from("brands").select("name"),
      supabase.from("categories").select("name"),
      supabase.from("units").select("name")
    ]);

    return {
      brands: bRes.data ? bRes.data.map(i => i.name) : null,
      categories: cRes.data ? cRes.data.map(i => i.name) : null,
      units: uRes.data ? uRes.data.map(i => i.name) : null
    };
  } catch (err) {
    console.error("Error fetching masters from Supabase:", err);
    return null;
  }
}

export async function saveMasterItemToDB(table, name) {
  const supabase = getSupabase();
  if (!supabase) return false;
  try {
    const { error } = await supabase.from(table).upsert({ name });
    if (error) throw error;
    return true;
  } catch (err) {
    console.error(`Error saving to ${table} in Supabase:`, err);
    return false;
  }
}

export async function deleteMasterItemFromDB(table, name) {
  const supabase = getSupabase();
  if (!supabase) return false;
  try {
    const { error } = await supabase.from(table).delete().eq("name", name);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error(`Error deleting from ${table} in Supabase:`, err);
    return false;
  }
}

// Sync all local data into Supabase Cloud
export async function syncAllLocalToDB({ products, movements, brands, categories, units }) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not configured yet.");

  // 1. Sync Brands
  if (brands && brands.length) {
    const brandPayload = brands.map(name => ({ name }));
    await supabase.from("brands").upsert(brandPayload);
  }

  // 2. Sync Categories
  if (categories && categories.length) {
    const catPayload = categories.map(name => ({ name }));
    await supabase.from("categories").upsert(catPayload);
  }

  // 3. Sync Units
  if (units && units.length) {
    const unitPayload = units.map(name => ({ name }));
    await supabase.from("units").upsert(unitPayload);
  }

  // 4. Sync Products
  if (products && products.length) {
    const prodPayload = products.map(p => ({
      id: p.id,
      name: p.name,
      brand: p.brand || "",
      category: p.category || "",
      unit: p.unit || "Nos",
      purchase: Number(p.purchase) || 0,
      sale: Number(p.sale) || 0,
      min: Number(p.min) || 5,
      bangalore: Number(p.bangalore) || 0,
      hosur: Number(p.hosur) || 0
    }));
    await supabase.from("products").upsert(prodPayload);
  }

  // 5. Sync Movements
  if (movements && movements.length) {
    const movPayload = movements.map(m => ({
      id: m.id,
      timestamp: m.timestamp || m.id,
      date: m.date,
      type: m.type,
      productId: m.productId || "",
      product: m.product || "",
      branch: m.branch || "Bangalore",
      qty: Number(m.qty) || 0,
      note: m.note || ""
    }));
    await supabase.from("movements").upsert(movPayload);
  }

  return true;
}
