import { createClient } from "@supabase/supabase-js";

// Retrieve Supabase URL & Key from Environment Variables or LocalStorage
export function getSupabaseCredentials() {
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  // Fallback to local storage (shared with inventory app or inputted by user)
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

// ======================= DB CRUD OPERATIONS =======================

export async function fetchLaptopsFromDB() {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("rb_laptops")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throw error;
    // Map data back from JSONB wrapper
    return data ? data.map(row => ({ ...row.data, "Laptop ID": row.id })) : [];
  } catch (err) {
    console.error("Error fetching laptops from Supabase:", err);
    return null;
  }
}

export async function upsertLaptopToDB(laptop) {
  const supabase = getSupabase();
  if (!supabase) return false;
  try {
    const id = laptop["Laptop ID"];
    if (!id) throw new Error("Laptop ID is missing");
    
    const payload = {
      id: id,
      data: laptop
    };
    
    const { error } = await supabase.from("rb_laptops").upsert(payload);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("Error saving laptop to Supabase:", err);
    return false;
  }
}

export async function deleteLaptopFromDB(id) {
  const supabase = getSupabase();
  if (!supabase) return false;
  try {
    const { error } = await supabase.from("rb_laptops").delete().eq("id", id);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("Error deleting laptop from Supabase:", err);
    return false;
  }
}

export async function fetchMovementsFromDB() {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("rb_movements")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ? data.map(row => ({ ...row.data, id: row.id, laptopId: row.laptop_id })) : [];
  } catch (err) {
    console.error("Error fetching movements from Supabase:", err);
    return null;
  }
}

export async function upsertMovementToDB(movement) {
  const supabase = getSupabase();
  if (!supabase) return false;
  try {
    const id = movement.id;
    const laptopId = movement.laptopId;
    if (!id || !laptopId) throw new Error("Movement ID or Laptop ID missing");

    const payload = {
      id: id,
      laptop_id: laptopId,
      data: movement
    };
    
    const { error } = await supabase.from("rb_movements").upsert(payload);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("Error saving movement to Supabase:", err);
    return false;
  }
}
