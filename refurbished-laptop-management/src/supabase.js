async function api(op,{method="GET",body}={}){const r=await fetch(`/api/refurbished?op=${encodeURIComponent(op)}`,{method,credentials:"same-origin",headers:body?{"Content-Type":"application/json"}:undefined,body:body?JSON.stringify(body):undefined,cache:"no-store"});const d=await r.json().catch(()=>null);if(!r.ok)throw new Error(d?.error||"Request failed");return d}
export async function signIn(username,password){const r=await fetch("/api/login",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({username,password})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d?.error||"Invalid username or password");return d}
export async function getCurrentUser(){const r=await fetch("/api/session",{credentials:"same-origin",cache:"no-store"});const d=await r.json().catch(()=>null);return d?.authenticated?d.user:null}
export async function signOut(){await fetch("/api/logout",{method:"POST",credentials:"same-origin"}).catch(()=>{})}
function toMovement(r,laptops){const x=laptops.find(z=>z.__dbId===r.laptop_id);return{id:r.id,laptopId:x?.["Laptop ID"]||r.laptop_id,type:r.movement_type,from:r.from_location,to:r.to_location,date:r.movement_at,reference:r.reference_no||"",amount:r.amount??"",paymentDate:r.payment_date||"",paymentMode:r.payment_mode||"",personHandedOver:r.person_handed_over||"",remarks:r.remarks||"",version:r.version_no||1,correctionReason:r.correction_reason||"",__dbId:r.id}}
export async function fetchLaptops(){return await api("laptops")}
export async function upsertLaptop(x){return await api("laptop-save",{method:"POST",body:{item:x}})}
export async function deleteLaptop(x){return await api("laptop-delete",{method:"POST",body:{id:x.__dbId}})}
export async function fetchMovements(laptops){return(await api("movements")||[]).map(r=>toMovement(r,laptops))}
export async function fetchAuditLog(){return await api("audit-log")}
export async function insertMovement(x){return await api("movement-save",{method:"POST",body:{movement:x}})}
export async function updateMovement(x){return await api("movement-correct",{method:"POST",body:{movement:x}})}
export async function audit(){return true}
export async function fetchUsers(){const r=await fetch("/api/user-admin?action=list",{credentials:"same-origin",cache:"no-store"});const d=await r.json().catch(()=>null);if(!r.ok)throw new Error(d?.error||"Unable to load users");return d.users||[]}
async function userAdmin(action,body){const r=await fetch(`/api/user-admin?action=${encodeURIComponent(action)}`,{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});const d=await r.json().catch(()=>null);if(!r.ok)throw new Error(d?.error||"User management request failed");return d}
export async function createUser(v){return userAdmin("create",v)}
export async function updateUser(v){return userAdmin("update",v)}
export async function resetUserPassword(user_id,password){return userAdmin("reset-password",{user_id,password})}
export async function deleteUser(user_id){return userAdmin("delete",{user_id})}
export async function fetchRepairJobs(){return await api("repair-jobs")}
export async function saveRepairJob(job){return await api("repair-save",{method:"POST",body:{job}})}

export async function fetchLifecycle(laptopId){return await api("lifecycle",{query:{laptop_id:laptopId}})}
