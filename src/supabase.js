export function getSupabaseCredentials(){const url=(import.meta.env.VITE_SUPABASE_URL||"").trim();const key=(import.meta.env.VITE_SUPABASE_ANON_KEY||"").trim();return{url,key,isEnv:Boolean(url&&key)}}
export function isSupabaseConfigured(){return Boolean(import.meta.env.VITE_SUPABASE_URL)}
export function saveSupabaseCredentials(){/* Production credentials are server/environment managed. */}
async function api(op,{method="GET",body}={}){const r=await fetch(`/api/inventory?op=${encodeURIComponent(op)}`,{method,credentials:"same-origin",headers:body?{"Content-Type":"application/json"}:undefined,body:body?JSON.stringify(body):undefined,cache:"no-store"});const d=await r.json().catch(()=>null);if(!r.ok)throw new Error(d?.error||"Request failed");return d}
export async function fetchProductsFromDB(){try{return await api("products")}catch(e){console.error(e);return null}}
export async function upsertProductToDB(product){try{await api("product-upsert",{method:"POST",body:{product}});return true}catch(e){console.error(e);return false}}
export async function deleteProductFromDB(id){try{await api("product-delete",{method:"POST",body:{id}});return true}catch(e){console.error(e);return false}}
export async function fetchMovementsFromDB(){try{return await api("movements")}catch(e){console.error(e);return null}}
export async function upsertMovementToDB(movement){try{return await api("movement-upsert",{method:"POST",body:{movement}})}catch(e){console.error(e);throw e}}
export async function deleteMovementFromDB(id){try{return await api("movement-delete",{method:"POST",body:{id}})}catch(e){console.error(e);throw e}}
export async function fetchAuditLogsFromDB(){try{return await api("audit")}catch(e){console.error(e);return null}}
export async function writeAuditLogToDB(){return false}
export async function fetchMastersFromDB(){try{return await api("masters")}catch(e){console.error(e);return null}}
export async function saveMasterItemToDB(table,name){try{await api("master-save",{method:"POST",body:{table,name}});return true}catch(e){console.error(e);return false}}
export async function deleteMasterItemFromDB(table,name){try{await api("master-delete",{method:"POST",body:{table,name}});return true}catch(e){console.error(e);return false}}
export async function fetchEmployeeProfiles(){const r=await fetch("/api/admin-users",{credentials:"same-origin",cache:"no-store"});const d=await r.json().catch(()=>[]);if(!r.ok)throw new Error(d?.error||"Unable to load employees");return d}
export async function updateEmployeeProfile(userId,changes){const r=await fetch("/api/admin-users",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({user_id:userId,changes})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d?.error||"Unable to update employee");return true}
export async function signInEmployee(){throw new Error("Use the application username login.")}
export async function signOutEmployee(){await fetch("/api/logout",{method:"POST",credentials:"same-origin"})}
export async function getEmployeeSession(){const r=await fetch("/api/session",{credentials:"same-origin",cache:"no-store"});const d=await r.json().catch(()=>null);return d?.authenticated?d:null}
export async function fetchEmployeeProfile(){const s=await getEmployeeSession();return s?.user||null}
export async function syncAllLocalToDB(){throw new Error("Bulk browser sync is disabled in secure multi-user mode.")}
