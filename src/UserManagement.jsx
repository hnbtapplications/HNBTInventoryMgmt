import React,{useEffect,useState}from"react";
import{RefreshCw,ShieldCheck,UserCheck,UserX}from"lucide-react";
import{fetchEmployeeProfiles,updateEmployeeProfile}from"./supabase";

const permissions=[
 ["can_manage_products","Products"],["can_stock_movement","Stock Movement"],["can_view_reports","Reports"],["can_manage_masters","Masters"],["can_view_audit_logs","Audit Logs"],["can_manage_users","User Management"]
];
export default function UserManagement({currentProfile}){
 const[users,setUsers]=useState([]),[busy,setBusy]=useState(true),[error,setError]=useState("");
 const isAdmin=currentProfile?.role==="admin"&&currentProfile?.can_manage_users;
 async function load(){setBusy(true);setError("");try{setUsers(await fetchEmployeeProfiles())}catch(e){setError(e?.message||"Unable to load employees")}finally{setBusy(false)}}
 useEffect(()=>{if(isAdmin)load()},[isAdmin]);
 async function patch(userId,changes){try{await updateEmployeeProfile(userId,changes);setUsers(u=>u.map(x=>x.user_id===userId?{...x,...changes}:x))}catch(e){setError(e?.message||"Unable to update employee")}}
 if(!isAdmin)return <div className="empty"><ShieldCheck size={28}/><h3>Administrator access required</h3><p>You do not have permission to manage employee accounts.</p></div>;
 return <section className="user-management"><div className="section-head"><div><h2>Employee User Management</h2><p>Control branch access, roles and application permissions.</p></div><button className="secondary" onClick={load} disabled={busy}><RefreshCw size={16}/>{busy?"Loading...":"Refresh"}</button></div>{error&&<div className="login-error">{error}</div>}<div className="employee-grid">{users.map(u=><article className="employee-card" key={u.user_id}><div className="employee-title"><div><strong>{u.full_name}</strong><small>{u.role==="admin"?"Administrator":"Employee"}</small></div><span className={u.active?"status active":"status disabled"}>{u.active?<UserCheck size={15}/>:<UserX size={15}/>} {u.active?"Active":"Disabled"}</span></div><div className="employee-fields"><label>Role<select value={u.role} onChange={e=>patch(u.user_id,{role:e.target.value})}><option value="employee">Employee</option><option value="admin">Administrator</option></select></label><label>Branch<select value={u.branch} onChange={e=>patch(u.user_id,{branch:e.target.value})}><option>Bangalore</option><option>Hosur</option><option>Both</option></select></label></div><div className="permission-grid">{permissions.map(([key,label])=><label key={key}><input type="checkbox" checked={Boolean(u[key])} onChange={e=>patch(u.user_id,{[key]:e.target.checked})}/><span>{label}</span></label>)}</div><button className={u.active?"danger-outline":"secondary"} onClick={()=>patch(u.user_id,{active:!u.active})}>{u.active?"Disable User":"Enable User"}</button></article>)}</div>{!busy&&!users.length&&<div className="empty">No employee profiles found.</div>}</section>;
}
