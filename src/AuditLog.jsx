import React,{useEffect,useMemo,useState}from"react";
import{RefreshCw,Search,ShieldCheck}from"lucide-react";
import{fetchAuditLogsFromDB}from"./supabase";
export default function AuditLog({currentProfile}){
 const[logs,setLogs]=useState([]),[busy,setBusy]=useState(true),[error,setError]=useState(""),[q,setQ]=useState("");
 const allowed=currentProfile?.role==="admin"||currentProfile?.permissions?.can_view_audit_logs||currentProfile?.can_view_audit_logs;
 async function load(){setBusy(true);setError("");try{setLogs(await fetchAuditLogsFromDB(500)||[])}catch(e){setError(e?.message||"Unable to load audit logs")}finally{setBusy(false)}}
 useEffect(()=>{if(allowed)load();else setBusy(false)},[allowed]);
 const rows=useMemo(()=>logs.filter(x=>`${x.actor} ${x.action} ${x.entity_name} ${x.branch} ${x.details}`.toLowerCase().includes(q.toLowerCase())),[logs,q]);
 if(!allowed)return <div className="empty"><ShieldCheck size={28}/><h3>Access restricted</h3><p>You do not have permission to view Audit Logs.</p></div>;
 return <section className="panel"><div className="panel-head"><div><h2>Audit Logs</h2><p>Who changed what, when and from which branch.</p></div><button className="ghost" onClick={load} disabled={busy}><RefreshCw size={16}/>{busy?"Loading...":"Refresh"}</button></div>{error&&<div className="login-error">{error}</div>}<div className="filters"><div className="search"><Search size={18}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search employee, action, product or branch..."/></div></div><div className="table-wrap"><table><thead><tr><th>Date / Time</th><th>Employee</th><th>Action</th><th>Item</th><th>Branch</th><th>Details</th></tr></thead><tbody>{rows.map(x=><tr key={x.id}><td>{x.created_at?new Date(x.created_at).toLocaleString("en-IN"):"-"}</td><td><strong>{x.actor||"Unknown"}</strong></td><td><span className="tag">{x.action}</span></td><td>{x.entity_name||x.entity_id||"-"}</td><td>{x.branch||"-"}</td><td>{x.details||"-"}</td></tr>)}</tbody></table>{!busy&&!rows.length&&<div className="empty">No audit log entries found.</div>}</div></section>;
}
