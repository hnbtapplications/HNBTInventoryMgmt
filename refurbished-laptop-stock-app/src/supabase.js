const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://fsioffaauefrkkaqbwvg.supabase.co";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_uIgr-4YFwg0bEu8MSDAm_A_2toq_A1W";
const SESSION_KEY = "refurb_supabase_session_v1";

function headers(token, extra={}) {
  return { apikey: SUPABASE_KEY, Authorization: `Bearer ${token || SUPABASE_KEY}`, ...extra };
}

async function request(path, options={}) {
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: headers(options.token, options.headers || {}),
  });
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) {
    const message = body?.message || body?.error_description || body?.hint || body?.error || text || `Supabase request failed (${response.status})`;
    throw new Error(message);
  }
  return body;
}

export function getSession(){
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch { return null; }
}
export function clearSession(){ localStorage.removeItem(SESSION_KEY); }

export async function signIn(usernameOrEmail, password){
  const aliases = {
    hertznbytes: "ganesan@hertznbytes.com",
    ganesan: "ganesan@hertznbytes.com",
    blorestock: "blorestock@hnbt.local",
    dakshinamoorthi: "dakshinamoothi@hnbt.local",
    dakshinamoothi: "dakshinamoothi@hnbt.local",
    admin: "admin@hertznbytes.com",
  };
  const key = String(usernameOrEmail || "").trim().toLowerCase();
  const email = aliases[key] || usernameOrEmail.trim();
  const data = await request("/auth/v1/token?grant_type=password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!data?.access_token || !data?.user?.id) throw new Error("Supabase did not return a valid session.");
  const session = { ...data, expires_at: Math.floor(Date.now()/1000) + Number(data.expires_in || 3600) };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export async function getCurrentUser(){
  const session = getSession();
  if (!session?.access_token) return null;
  try {
    const user = await request("/auth/v1/user", { token: session.access_token });
    return user;
  } catch {
    clearSession();
    return null;
  }
}

export async function signOut(){
  const session = getSession();
  if (session?.access_token) {
    await request("/auth/v1/logout", { method: "POST", token: session.access_token }).catch(() => {});
  }
  clearSession();
}

function query(path, token){ return request(path, { token }); }
function jsonBody(method, path, body, token, prefer="return=representation") {
  return request(path, { method, token, headers: { "Content-Type": "application/json", Prefer: prefer }, body: JSON.stringify(body) });
}

const esc = value => encodeURIComponent(String(value));

function toLaptop(row){
  const c = row.condition_data || {};
  return {
    "Laptop ID": row.laptop_id, Brand: row.brand, Model: row.model, "Serial Number": row.serial_number,
    Configuration: row.configuration, Location: row.location, Processor: row.processor, "Processor Gen": row.processor_gen,
    "RAM Slot 1 Size (GB)": row.ram_slot_1_size, "RAM Slot 1 Type": row.ram_slot_1_type,
    "RAM Slot 2 Size (GB)": row.ram_slot_2_size || "", "RAM Slot 2 Type": row.ram_slot_2_type || "",
    "Storage 1 Capacity": row.storage_1_capacity, "Storage 1 Type": row.storage_1_type,
    "Storage 2 Capacity": row.storage_2_capacity || "", "Storage 2 Type": row.storage_2_type || "",
    "Screen Size": row.screen_size, "Power Adapter Type": row.power_adapter_type, "Stock Status": row.stock_status,
    "Date Received": row.date_received || "", "Purchase / Reference No.": row.purchase_reference_no || "", Remarks: row.remarks || "",
    ...c, __dbId: row.id, __createdAt: row.created_at, __updatedAt: row.updated_at,
  };
}

function fromLaptop(item, userId){
  const condition = {};
  const known = new Set(["Laptop ID","Brand","Model","Serial Number","Configuration","Location","Processor","Processor Gen",
    "RAM Slot 1 Size (GB)","RAM Slot 1 Type","RAM Slot 2 Size (GB)","RAM Slot 2 Type","Storage 1 Capacity","Storage 1 Type",
    "Storage 2 Capacity","Storage 2 Type","Screen Size","Power Adapter Type","Stock Status","Date Received","Purchase / Reference No.","Remarks",
    "__dbId","__createdAt","__updatedAt"]);
  Object.keys(item).forEach(k=>{ if(!known.has(k)) condition[k]=item[k]; });
  return {
    laptop_id: String(item["Laptop ID"] || "").trim(), brand: String(item.Brand || "").trim(), model: String(item.Model || "").trim(),
    serial_number: String(item["Serial Number"] || "").trim(), configuration: String(item.Configuration || "").trim(),
    location: item.Location || "Bangalore", processor: String(item.Processor || "").trim(), processor_gen: String(item["Processor Gen"] || "").trim(),
    ram_slot_1_size: String(item["RAM Slot 1 Size (GB)"] || "").trim(), ram_slot_1_type: String(item["RAM Slot 1 Type"] || "").trim(),
    ram_slot_2_size: String(item["RAM Slot 2 Size (GB)"] || "").trim() || null, ram_slot_2_type: String(item["RAM Slot 2 Type"] || "").trim() || null,
    storage_1_capacity: String(item["Storage 1 Capacity"] || "").trim(), storage_1_type: String(item["Storage 1 Type"] || "").trim(),
    storage_2_capacity: String(item["Storage 2 Capacity"] || "").trim() || null, storage_2_type: String(item["Storage 2 Type"] || "").trim() || null,
    screen_size: String(item["Screen Size"] || "").trim(), power_adapter_type: String(item["Power Adapter Type"] || "").trim(),
    stock_status: item["Stock Status"] || "Need to be Checked", date_received: item["Date Received"] || null,
    purchase_reference_no: item["Purchase / Reference No."] || null, remarks: item.Remarks || null, condition_data: condition,
    ...(userId ? {updated_by:userId} : {}),
  };
}

export async function fetchLaptops(){
  const s=getSession(); if(!s?.access_token) throw new Error("Supabase session missing. Please sign in again.");
  const rows=await query("/rest/v1/refurb_laptops?select=*&order=created_at.desc",s.access_token);
  return (rows||[]).map(toLaptop);
}

export async function upsertLaptop(item){
  const s=getSession(); if(!s?.access_token) throw new Error("Supabase session missing. Please sign in again.");
  const payload=fromLaptop(item,s.user?.id), id=item.__dbId;
  const rows=id ? await jsonBody("PATCH",`/rest/v1/refurb_laptops?id=eq.${esc(id)}`,payload,s.access_token)
    : await jsonBody("POST","/rest/v1/refurb_laptops",{...payload,created_by:s.user?.id},s.access_token);
  return toLaptop(Array.isArray(rows)?rows[0]:rows);
}

export async function deleteLaptop(item){
  const s=getSession(); if(!s?.access_token) throw new Error("Supabase session missing. Please sign in again.");
  const id=item.__dbId; if(!id) return;
  await request(`/rest/v1/refurb_laptops?id=eq.${esc(id)}`,{method:"DELETE",token:s.access_token,headers:{Prefer:"return=minimal"}});
}

function toMovement(row,laptops){
  const laptop=laptops.find(x=>x.__dbId===row.laptop_id);
  return {id:row.id,laptopId:laptop?.["Laptop ID"]||row.laptop_id,type:row.movement_type,from:row.from_location,to:row.to_location,
    date:row.movement_at,reference:row.reference_no||"",amount:row.amount??"",paymentDate:row.payment_date||"",paymentMode:row.payment_mode||"",
    remarks:row.remarks||"",version:row.version_no||1,correctionReason:row.correction_reason||"",correctedMovementId:row.corrected_movement_id||null,
    createdAt:row.created_at,history:[],__dbId:row.id};
}
export async function fetchMovements(laptops){
  const s=getSession(); if(!s?.access_token) throw new Error("Supabase session missing. Please sign in again.");
  const rows=await query("/rest/v1/refurb_stock_movements?select=*&order=movement_at.desc",s.access_token);
  return (rows||[]).map(r=>toMovement(r,laptops));
}

export async function insertMovement(m){
  const s=getSession(); if(!s?.access_token) throw new Error("Supabase session missing. Please sign in again.");
  if(!m.__laptopDbId) throw new Error("Laptop database record not found. Refresh and try again.");
  const payload={laptop_id:m.__laptopDbId,movement_type:m.type,from_location:m.from,to_location:m.to,movement_at:m.date||new Date().toISOString(),
    reference_no:m.reference||null,amount:m.amount===""?null:Number(m.amount),payment_date:m.paymentDate||null,payment_mode:m.paymentMode||null,
    remarks:m.remarks||null,version_no:1,created_by:s.user?.id};
  const rows=await jsonBody("POST","/rest/v1/refurb_stock_movements",payload,s.access_token); return rows[0];
}

export async function upsertLaptopStatus(item, tokenUserId){
  const s=getSession(); if(!s?.access_token) throw new Error("Supabase session missing. Please sign in again.");
  const payload=fromLaptop(item,tokenUserId||s.user?.id);
  await jsonBody("PATCH",`/rest/v1/refurb_laptops?id=eq.${esc(item.__dbId)}`,payload,s.access_token);
}

export async function audit(action,entityType,entityId,entityName,details={}){
  const s=getSession(); if(!s?.access_token) return;
  await jsonBody("POST","/rest/v1/refurb_audit_log",{user_id:s.user?.id,action,entity_type:entityType,entity_id:entityId||null,entity_name:entityName||null,details},s.access_token,"return=minimal").catch(console.error);
}

export async function updateMovement(m){
  const s=getSession(); if(!s?.access_token) throw new Error("Supabase session missing. Please sign in again.");
  const id=m.id || m.__dbId; if(!id) throw new Error("Movement record not found.");
  const existing=await query(`/rest/v1/refurb_stock_movements?id=eq.${esc(id)}&select=*`,s.access_token);
  const old=existing?.[0]; if(!old) throw new Error("Movement record no longer exists. Refresh the page.");
  await jsonBody("POST","/rest/v1/refurb_movement_history",{movement_id:id,version_no:old.version_no||1,snapshot:old,correction_reason:m.correctionReason||null,created_by:s.user?.id},s.access_token,"return=minimal");
  const payload={movement_type:m.type,from_location:m.from,to_location:m.to,movement_at:m.date||old.movement_at,reference_no:m.reference||null,
    amount:m.amount===""?null:Number(m.amount),payment_date:m.paymentDate||null,payment_mode:m.paymentMode||null,remarks:m.remarks||null,
    version_no:(old.version_no||1)+1,correction_reason:m.correctionReason||null,created_by:old.created_by||s.user?.id};
  const rows=await jsonBody("PATCH",`/rest/v1/refurb_stock_movements?id=eq.${esc(id)}`,payload,s.access_token);
  return Array.isArray(rows)?rows[0]:rows;
}
