import React, {useMemo, useState, useEffect} from "react";
import { fetchLaptopsFromDB, upsertLaptopToDB, deleteLaptopFromDB, fetchMovementsFromDB, upsertMovementToDB } from "./supabase";
import {createRoot} from "react-dom/client";
import {LayoutDashboard, Laptop, ClipboardCheck, ArrowLeftRight, Search, Plus, Pencil, Trash2, Save, X, History, FileText, LogOut, LockKeyhole} from "lucide-react";
import "./styles.css";

const companyLogo="/company-logo.png";
const adminUsername="Hertznbytes";
const adminPasswordHash="240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9";
async function sha256(value){const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));return [...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,"0")).join("")}

function LoginScreen({onLogin}){
 const [username,setUsername]=useState("");
 const [password,setPassword]=useState("");
 const [error,setError]=useState("");
 const [busy,setBusy]=useState(false);
 const submit=async e=>{e.preventDefault();setBusy(true);setError("");const passwordHash=await sha256(password);if(username.trim().toLowerCase()===adminUsername.toLowerCase()&&passwordHash===adminPasswordHash){onLogin();return}setError("Incorrect username or password.");setBusy(false)};
 return <div className="loginPage"><div className="loginVisual"><div className="loginVisualContent"><span className="eyebrow">HERTZ & BYTES TECHNOLOGIES</span><h1>Refurbished Laptop Inventory</h1><p>Manage laptop configuration, inspection, stock transfers and sales across Bangalore and Hosur.</p><div className="loginHighlights"><span>Secure access</span><span>Stock visibility</span><span>Condition tracking</span></div></div></div><div className="loginPanel"><form className="loginCard" onSubmit={submit}><img src={companyLogo} alt="SandroGen Technologies"/><div className="loginIcon"><LockKeyhole/></div><div><h2>Welcome back</h2><p>Sign in to open the inventory application.</p></div><label>Username<input autoFocus autoComplete="username" value={username} onChange={e=>setUsername(e.target.value)} placeholder="Enter username" required/></label><label>Password<input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter password" required/></label>{error&&<div className="loginError">{error}</div>}<button className="loginButton" disabled={busy}>{busy?"Signing in...":"Sign In"}</button><small>Authorized personnel only</small></form></div></div>
}

function Root(){
 const [authenticated,setAuthenticated]=useState(()=>sessionStorage.getItem("hnb_authenticated")==="yes");
 const login=()=>{sessionStorage.setItem("hnb_authenticated","yes");setAuthenticated(true)};
 const logout=()=>{sessionStorage.removeItem("hnb_authenticated");setAuthenticated(false)};
 return authenticated?<App onLogout={logout}/>:<LoginScreen onLogin={login}/>;
}

const seed = [{"Laptop ID": "LNK-001", "Brand": "Lenovo", "Model": "ThinkPad X1 Carbon Gen 9", "Serial Number": "R90X8F32", "Processor Model": "Intel i7-1185G7", "Processor Gen": "11th Gen", "RAM Slot 1 Size (GB)": 16, "RAM Slot 1 Type": "DDR4", "RAM Slot 2 Size (GB)": 16, "RAM Slot 2 Type": "DDR4", "Storage 1 Capacity": "512GB", "Storage 1 Type": "NVMe SSD", "Storage 2 Capacity": "", "Storage 2 Type": "", "Screen Size": "14\"", "Battery Health (%)": 88, "Battery Cycle Count": 142, "Battery Backup Time": "2.30 Hrs ", "CPU Stress Test": "Passed", "RAM Diagnostics": "Passed", "Drive Health Status": "Passed (Healthy)", "Graphics Stability Test": "Passed", "Keyboard Mechanical Check": "Passed", "Keyboard Backlight (Y/N)": "Yes", "Trackpad Responsiveness": "Passed", "Webcam Functionality": "Grade A (No Scratches)", "Wi-Fi Connectivity": "Passed", "Bluetooth Pair Test": "Passed", "Internal Speakers Status": "Passed", "Microphone Audio Quality": "Passed", "Display Panel Grading (A/B/C)": "Grade A", "Overall Cosmetic Status": "ABH Ok, C NTR, D NTR"}, {"Laptop ID": "LNK-002", "Brand": "Dell", "Model": "Latitude 7420", "Serial Number": "7XYZ891", "Processor Model": "Intel i5-1185G7", "Processor Gen": "11th Gen", "RAM Slot 1 Size (GB)": 16, "RAM Slot 1 Type": "DDR4", "RAM Slot 2 Size (GB)": 16, "RAM Slot 2 Type": "DDR4", "Storage 1 Capacity": "256GB", "Storage 1 Type": "NVMe SSD", "Storage 2 Capacity": "", "Storage 2 Type": "", "Screen Size": "15\"", "Battery Health (%)": 92, "Battery Cycle Count": 85, "Battery Backup Time": "2 Hrs", "CPU Stress Test": "Passed", "RAM Diagnostics": "Passed", "Drive Health Status": "Passed (Healthy)", "Graphics Stability Test": "Passed", "Keyboard Mechanical Check": "Passed", "Keyboard Backlight (Y/N)": "No", "Trackpad Responsiveness": "Passed", "Webcam Functionality": "Grade A (Pristine)", "Wi-Fi Connectivity": "Passed", "Bluetooth Pair Test": "Passed", "Internal Speakers Status": "Passed", "Microphone Audio Quality": "Passed", "Display Panel Grading (A/B/C)": "Grade A", "Overall Cosmetic Status": "Pristine Condition"}, {"Laptop ID": "LNK-003", "Brand": "HP", "Model": "EliteBook 840 G8", "Serial Number": "CND1234XYZ", "Processor Model": "Intel i7-1185G7", "Processor Gen": "11th Gen", "RAM Slot 1 Size (GB)": 32, "RAM Slot 1 Type": "DDR4", "RAM Slot 2 Size (GB)": 32, "RAM Slot 2 Type": "DDR4", "Storage 1 Capacity": "1TB", "Storage 1 Type": "NVMe SSD", "Storage 2 Capacity": "", "Storage 2 Type": "", "Screen Size": "14\"", "Battery Health (%)": 84, "Battery Cycle Count": 210, "Battery Backup Time": "2.45 Hrs", "CPU Stress Test": "Passed", "RAM Diagnostics": "Passed", "Drive Health Status": "Passed (Healthy)", "Graphics Stability Test": "Passed", "Keyboard Mechanical Check": "Passed", "Keyboard Backlight (Y/N)": "Yes", "Trackpad Responsiveness": "Passed", "Webcam Functionality": "Grade B (Minor Spot)", "Wi-Fi Connectivity": "Passed", "Bluetooth Pair Test": "Passed", "Internal Speakers Status": "Passed", "Microphone Audio Quality": "Passed", "Display Panel Grading (A/B/C)": "Grade B", "Overall Cosmetic Status": "Scratched Lid"}];

const idKey = "rb_laptops_v1";
const movKey = "rb_movements_v1";

function load(key, fallback){ try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback } }
function normalizeLaptop(x){
  const oldProcessor=x["Processor Model"]||"";
  const processor=x.Processor||(String(oldProcessor).match(/i3/i)?"Core i3":String(oldProcessor).match(/i5/i)?"Core i5":String(oldProcessor).match(/i7/i)?"Core i7":"");
  const oldStatus=x["Stock Status"]||"";
  const stockStatus=oldStatus==="Sold"?"Sold":oldStatus==="Service"?"Spares Need to be Replaced":oldStatus==="Scrap"?"Scrap":oldStatus==="Spares Need to be Replaced"?"Spares Need to be Replaced":"Need to be Checked";
  return {
    ...x,
    "Location":x["Location"]||"Bangalore",
    "Configuration":x["Configuration"]||x["Product Type"]||"",
    "Top Case with Bazel":x["Top Case with Bazel"]||x["Top Case with Bezel"]||x["Display Panel Grading (A/B/C)"]||"",
    "Touchpad":x["Touchpad"]||x["Body Condition"]||"",
    "Bottom Case":x["Bottom Case"]||x["Lid Condition"]||"",
    "Trackpad":x["Trackpad"]||"",
    "Processor":processor,
    "Power Adapter Type":x["Power Adapter Type"]||"",
    "Stock Status":stockStatus,
    "Remarks":x["Remarks"]||x["Received From"]||""
  };
}
function App({onLogout}){
  const [laptops,setLaptops]=useState([]);
  const [movements,setMovements]=useState([]);
  const [loadingDb, setLoadingDb]=useState(true);
  const [page,setPage]=useState("dashboard");
  const [query,setQuery]=useState("");
  const [status,setStatus]=useState("All");
  const [editing,setEditing]=useState(null);
  const [showMovement,setShowMovement]=useState(false);
  const [editingMovement,setEditingMovement]=useState(null);
  const [historyMovement,setHistoryMovement]=useState(null);
  const [reportType,setReportType]=useState("laptop-details");

  useEffect(() => {
    async function loadData() {
      const dbLaptops = await fetchLaptopsFromDB();
      const dbMovements = await fetchMovementsFromDB();
      
      if (dbLaptops && dbLaptops.length > 0) {
        setLaptops(dbLaptops.map(normalizeLaptop));
      } else {
        // Fallback to local storage if empty, and push to DB
        const localLaptops = load(idKey, seed).map(normalizeLaptop);
        setLaptops(localLaptops);
        for (const lp of localLaptops) await upsertLaptopToDB(lp);
      }
      
      if (dbMovements && dbMovements.length > 0) {
        setMovements(dbMovements);
      } else {
        const localMovs = load(movKey, []);
        setMovements(localMovs);
        for (const m of localMovs) await upsertMovementToDB(m);
      }
      setLoadingDb(false);
    }
    loadData();
  }, []);

  const persist = async (next) => {
    setLaptops(next);
    localStorage.setItem(idKey, JSON.stringify(next));
  };
  const persistMov = async (next) => {
    setMovements(next);
    localStorage.setItem(movKey, JSON.stringify(next));
  };

  const filtered=useMemo(()=>laptops.filter(x=>{
    const text=Object.values(x).join(" ").toLowerCase();
    const matches=text.includes(query.toLowerCase());
    const s=(x["Stock Status"]||"In Stock");
    return matches && (status==="All" || s===status);
  }),[laptops,query,status]);

  const stats={
    total:laptops.length,
    available:laptops.filter(x=>(x["Stock Status"]||"Need to be Checked")==="Need to be Checked").length,
    sold:laptops.filter(x=>x["Stock Status"]==="Sold").length,
    service:laptops.filter(x=>x["Stock Status"]==="Spares Need to be Replaced").length
  };

  function addLaptop(){
    setEditing({
      "Laptop ID":"LNK-"+String(laptops.length+1).padStart(3,"0"),
      "Brand":"","Model":"","Serial Number":"","Configuration":"","Location":"Bangalore","Processor":"","Processor Gen":"",
      "RAM Slot 1 Size (GB)":"","RAM Slot 1 Type":"","RAM Slot 2 Size (GB)":"","RAM Slot 2 Type":"",
      "Storage 1 Capacity":"","Storage 1 Type":"","Storage 2 Capacity":"","Storage 2 Type":"",
      "Screen Size":"","Power Adapter Type":"","Battery Health (%)":"","Battery Cycle Count":"","Battery Backup Time":"",
      "CPU Stress Test":"Pending","RAM Diagnostics":"Pending","Drive Health Status":"Pending",
      "Graphics Stability Test":"Pending","Keyboard Mechanical Check":"Pending","Keyboard Backlight (Y/N)":"",
      "Trackpad Responsiveness":"Pending","Webcam Functionality":"Pending","Wi-Fi Connectivity":"Pending",
      "Bluetooth Pair Test":"Pending","Internal Speakers Status":"Pending","Microphone Audio Quality":"Pending",
      "HDMI":"Not Tested","USB-A 2.0":"Not Tested","USB-A 3.0":"Not Tested","USB-C":"Not Tested","USB-C Charging":"Not Tested","USB-C Display":"Not Tested","Headphone / Audio Jack":"Not Tested","SD Card Reader":"Not Tested","LAN / RJ45":"Not Tested",
      "Top Case with Bazel":"","Keyboard Condition":"","Touchpad":"","Bottom Case":"","Hinges Condition":"","Overall Cosmetic Status":"","Trackpad":"","Stock Status":"Need to be Checked","Remarks":"","Date Received":"","Purchase / Reference No.":""
    })
    setPage("add-laptop")
  }
  async function saveLaptop(item){
    const originalId=item.__originalId;
    const clean={...item};delete clean.__originalId;
    if(laptops.some(x=>x["Laptop ID"]===clean["Laptop ID"]&&x["Laptop ID"]!==originalId)){alert("This Laptop ID already exists.");return}
    const exists=Boolean(originalId)||laptops.some(x=>x["Laptop ID"]===clean["Laptop ID"]);
    const next=exists?laptops.map(x=>x["Laptop ID"]===(originalId||clean["Laptop ID"])?clean:x):[...laptops,clean];
    await upsertLaptopToDB(clean);
    persist(next);setEditing(null);setPage("laptops")
  }
  async function saveCondition(item){
    await upsertLaptopToDB(item);
    persist(laptops.map(x=>x["Laptop ID"]===item["Laptop ID"]?item:x));
  }
  async function removeLaptop(id){
    if(confirm("Delete this laptop record?")) {
      await deleteLaptopFromDB(id);
      persist(laptops.filter(x=>x["Laptop ID"]!==id));
    }
  }
  async function addMovement(m){
    const now=new Date().toISOString();
    const record={...m,id:crypto.randomUUID(),date:m.date||now};
    await upsertMovementToDB(record);
    const next=[record,...movements];persistMov(next);
    const updated=laptops.map(x=>x["Laptop ID"]===m.laptopId?{...x,"Stock Status":movementStatus(m.type,x["Stock Status"]),"Location":m.to==="Bangalore"||m.to==="Hosur"?m.to:x.Location}:x);
    const updatedLaptop = updated.find(x => x["Laptop ID"] === m.laptopId);
    if (updatedLaptop) await upsertLaptopToDB(updatedLaptop);
    persist(updated);setShowMovement(false);
  }
  async function saveMovement(m){
    const previous=movements.find(x=>x.id===m.id);
    if(!previous)return;
    const snapshot={...previous,history:undefined,correctedAt:new Date().toISOString()};
    const record={...m,history:[...(previous.history||[]),snapshot],updatedAt:new Date().toISOString()};
    await upsertMovementToDB(record);
    persistMov(movements.map(x=>x.id===m.id?record:x));
    const latestByLaptop=[record,...movements.filter(x=>x.id!==m.id)].filter(x=>x.laptopId===m.laptopId).sort((a,b)=>new Date(b.date)-new Date(a.date))[0];
    const updated=laptops.map(x=>x["Laptop ID"]===m.laptopId?{...x,"Stock Status":movementStatus(latestByLaptop.type,x["Stock Status"]),"Location":latestByLaptop.to==="Bangalore"||latestByLaptop.to==="Hosur"?latestByLaptop.to:x.Location}:x);
    const updatedLaptop = updated.find(x => x["Laptop ID"] === m.laptopId);
    if (updatedLaptop) await upsertLaptopToDB(updatedLaptop);
    persist(updated);
    setEditingMovement(null);
  }
  const movementStatus=(type,current)=>type==="Sale"?"Sold":type==="Return"||type==="Receipt"?"In Stock":type==="Service"?"Service":current;

  return <div className="app">
    {loadingDb && <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(255,255,255,0.8)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999}}><h2>Loading Data from Database...</h2></div>}
    <aside className="sidebar">
      <div className="brand"><img src={companyLogo} alt="SandroGen Technologies"/><span>Refurbished Laptop Management</span></div>
      <nav>
        <button className={page==="dashboard"?"active":""} onClick={()=>setPage("dashboard")}><LayoutDashboard/>Dashboard</button>
        <button className={page==="laptops"?"active":""} onClick={()=>setPage("laptops")}><Laptop/>Laptop Inventory</button>
        <button className={page==="add-laptop"?"active":""} onClick={addLaptop}><Plus/>Add Laptop</button>
        <button className={page==="condition"?"active":""} onClick={()=>setPage("condition")}><ClipboardCheck/>Add / Update Condition</button>
        <button className={page==="movements"?"active":""} onClick={()=>setPage("movements")}><ArrowLeftRight/>Stock Movement</button>
        <button className={page==="reports"?"active":""} onClick={()=>setPage("reports")}><FileText/>Reports</button>
      </nav>
      <div className="sideBottom"><small>Data is stored in this browser.</small><button onClick={onLogout}><LogOut/>Sign Out</button></div>
    </aside>

    <main>
      <header><div><h1>{page==="dashboard"?"Inventory Dashboard":page==="laptops"?"Laptop Inventory":page==="add-laptop"?"Add Laptop":page==="condition"?"Add / Update Product Condition":page==="movements"?"Stock Movement":"Reports"}</h1><p>{page==="add-laptop"?"Record basic information, configuration and receipt details":page==="condition"?"Select a laptop and update its inspection results":"Refurbished laptop tracking & component health ledger"}</p></div>{page==="laptops"&&<button className="primary" onClick={addLaptop}><Plus/> Add Laptop</button>}{page==="movements"&&<button className="primary" onClick={()=>setShowMovement(true)}><Plus/> New Movement</button>}</header>

      {page==="dashboard" && <Dashboard stats={stats} laptops={laptops} movements={movements} setPage={setPage}/>}
      {page==="laptops" && <section>
        <div className="toolbar"><div className="search"><Search/><input placeholder="Search ID, serial, brand, model..." value={query} onChange={e=>setQuery(e.target.value)}/></div>
        <select value={status} onChange={e=>setStatus(e.target.value)}><option>All</option><option>Need to be Checked</option><option>Spares Need to be Replaced</option><option>Sold</option><option>Scrap</option></select></div>
        <div className="tableWrap"><table><thead><tr><th>ID</th><th>Brand / Model</th><th>Serial</th><th>Processor</th><th>RAM</th><th>Storage</th><th>Battery</th><th>Location</th><th>Status</th><th></th></tr></thead>
        <tbody>{filtered.map(x=><tr key={x["Laptop ID"]}><td><b>{x["Laptop ID"]}</b></td><td>{x.Brand}<br/><span>{x.Model}</span></td><td>{x["Serial Number"]}</td><td>{x.Processor}<br/><span>{x["Processor Gen"]}</span></td><td>{[x["RAM Slot 1 Size (GB)"],x["RAM Slot 2 Size (GB)"]].filter(Boolean).map(v=>String(v).includes("GB")?v:`${v}GB`).join(" + ")}</td><td>{x["Storage 1 Capacity"]} {x["Storage 1 Type"]}</td><td>{x["Battery Health (%)"]}%<br/><span>{x["Battery Backup Time"]}</span></td><td><span className="pill location">{x.Location||"Bangalore"}</span></td><td><span className="pill">{x["Stock Status"]||"Need to be Checked"}</span></td><td className="actions"><button title="Edit laptop entry" onClick={()=>{setEditing({...x,__originalId:x["Laptop ID"]});setPage("add-laptop")}}><Pencil/></button><button onClick={()=>removeLaptop(x["Laptop ID"])}><Trash2/></button></td></tr>)}</tbody></table></div>
        <div className="count">{filtered.length} of {laptops.length} records</div>
      </section>}

      {page==="movements" && <section><div className="toolbar"><div className="search"><Search/><input placeholder="Search movement..." value={query} onChange={e=>setQuery(e.target.value)}/></div></div>
      <div className="movementSummary"><div><b>Stock Transfers</b><strong>{movements.filter(m=>m.type==="Transfer").length}</strong></div><div><b>Sales</b><strong>{movements.filter(m=>m.type==="Sale").length}</strong></div></div>
      <div className="tableWrap"><table><thead><tr><th>Date</th><th>Laptop</th><th>Section</th><th>From</th><th>To</th><th>Reference</th><th>Amount / Payment</th><th>Remarks</th><th>Actions</th></tr></thead><tbody>
      {movements.filter(m=>Object.values(m).join(" ").toLowerCase().includes(query.toLowerCase())).map(m=><tr key={m.id}><td>{new Date(m.date).toLocaleString()}</td><td><b>{m.laptopId}</b></td><td><span className="pill movement">{m.type==="Sale"?"Sales":"Stock Transfer"}</span></td><td>{m.from}</td><td>{m.type==="Sale"?"—":m.to}</td><td>{m.reference||"—"}</td><td>{m.type==="Sale"?<><b>₹{Number(m.amount||0).toLocaleString("en-IN")}</b><br/><span>{m.paymentMode||"—"} · {m.paymentDate||"—"}</span></>:"—"}</td><td>{m.remarks||"—"}</td><td className="actions"><button title="Edit movement" onClick={()=>setEditingMovement(m)}><Pencil/></button><button title="View correction history" onClick={()=>setHistoryMovement(m)}><History/></button></td></tr>)}</tbody></table></div>
      {!movements.length&&<div className="empty">No stock movements yet. Click <b>New Movement</b> to record the first one.</div>}</section>}
      {page==="add-laptop"&&editing&&<AddLaptopPage item={editing} onClose={()=>{setEditing(null);setPage("laptops")}} onSave={saveLaptop}/>} 
      {page==="condition"&&<ConditionPage laptops={laptops} onSave={saveCondition}/>} 
      {page==="reports"&&<Reports laptops={laptops} movements={movements} reportType={reportType} setReportType={setReportType}/>} 
    </main>

    {showMovement&&<MovementModal laptops={laptops} onClose={()=>setShowMovement(false)} onSave={addMovement}/>}
    {editingMovement&&<MovementModal item={editingMovement} laptops={laptops} onClose={()=>setEditingMovement(null)} onSave={saveMovement}/>}
    {historyMovement&&<HistoryModal movement={historyMovement} onClose={()=>setHistoryMovement(null)}/>}
  </div>
}

function Dashboard({stats,laptops,movements,setPage}){
 return <section>
  <div className="cards"><Card title="Total Laptops" value={stats.total}/><Card title="Need to be Checked" value={stats.available}/><Card title="Sold" value={stats.sold}/><Card title="Spares Replacement" value={stats.service}/></div>
  <div className="grid2"><div className="panel"><div className="panelHead"><h3>Recent Stock Movement</h3><button onClick={()=>setPage("movements")}>View all</button></div>{movements.slice(0,6).map(m=><div className="movementRow" key={m.id}><div><b>{m.laptopId}</b><span>{m.type} · {m.remarks||"No remarks"}</span></div><time>{new Date(m.date).toLocaleDateString()}</time></div>)}{!movements.length&&<div className="empty">No movements recorded.</div>}</div>
  <div className="panel"><div className="panelHead"><h3>Current Inventory</h3><button onClick={()=>setPage("laptops")}>Open inventory</button></div>{laptops.map(x=><div className="mini" key={x["Laptop ID"]}><div><b>{x["Laptop ID"]} · {x.Brand}</b><span>{x.Model}</span></div><span className={"pill "+((x["Stock Status"]||"In Stock").replace(" ","").toLowerCase())}>{x["Stock Status"]||"In Stock"}</span></div>)}</div></div>
 </section>
}
function Card({title,value}){return <div className="card"><span>{title}</span><strong>{value}</strong></div>}

function Reports({laptops,movements,reportType,setReportType}){
 const [laptopId,setLaptopId]=useState(laptops[0]?.["Laptop ID"]||"");
 const [fromDate,setFromDate]=useState(()=>new Date(new Date().getFullYear(),new Date().getMonth(),1).toISOString().slice(0,10));
 const [toDate,setToDate]=useState(()=>new Date().toISOString().slice(0,10));
 const [conditionProcessor,setConditionProcessor]=useState("");
 const [conditionRam,setConditionRam]=useState("");
 const [conditionStorage,setConditionStorage]=useState("");
 const [conditionSpare,setConditionSpare]=useState("");
 const laptop=laptops.find(x=>x["Laptop ID"]===laptopId);
 const sales=movements.filter(m=>m.type==="Sale"&&String(m.date).slice(0,10)>=fromDate&&String(m.date).slice(0,10)<=toDate);
 const inHand=laptops.filter(x=>(x["Stock Status"]||"In Stock")!=="Sold");
 const detailFields=fieldGroups.flatMap(g=>g.fields).filter((f,i,a)=>a.indexOf(f)===i);
 const spareFields=["CPU Stress Test","RAM Diagnostics","Drive Health Status","Graphics Stability Test","Keyboard Mechanical Check","Trackpad Responsiveness","Keyboard Backlight (Y/N)","HDMI","USB-A 2.0","USB-A 3.0","USB-C","USB-C Charging","USB-C Display","Headphone / Audio Jack","SD Card Reader","LAN / RJ45","Wi-Fi Connectivity","Bluetooth Pair Test","Webcam Functionality","Microphone Audio Quality","Internal Speakers Status","Top Case with Bazel","Keyboard Condition","Touchpad","Bottom Case","Hinges Condition","Trackpad","Overall Cosmetic Status"];
 const isDefective=value=>/(faulty|failed|damaged|warning|loose|distorted|low|re-test required)/i.test(String(value||""));
 const conditionRows=laptops.filter(x=>{
   const ramValues=[x["RAM Slot 1 Size (GB)"],x["RAM Slot 2 Size (GB)"]].map(v=>String(v||"").replace(/GB/i,""));
   const storageValues=[x["Storage 1 Type"],x["Storage 2 Type"]];
   const processorOK=!conditionProcessor||x.Processor===conditionProcessor;
   const ramOK=!conditionRam||ramValues.includes(conditionRam);
   const storageOK=!conditionStorage||storageValues.includes(conditionStorage);
   const spareOK=!conditionSpare||(conditionSpare==="Any Defective Spare"?spareFields.some(f=>isDefective(x[f])):isDefective(x[conditionSpare]));
   return processorOK&&ramOK&&storageOK&&spareOK;
 });
 return <section>
  <div className="reportTabs">
   <button className={reportType==="laptop-details"?"active":""} onClick={()=>setReportType("laptop-details")}>1. Laptop Complete Details</button>
   <button className={reportType==="sales-period"?"active":""} onClick={()=>setReportType("sales-period")}>2. Sales by Period</button>
   <button className={reportType==="stock-location"?"active":""} onClick={()=>setReportType("stock-location")}>3. Stock in Hand</button>
   <button className={reportType==="condition-search"?"active":""} onClick={()=>setReportType("condition-search")}>4. Condition-Based List</button>
  </div>
  {reportType==="laptop-details"&&<div className="reportPanel"><div className="reportFilters"><label>Laptop ID<input list="report-laptops" value={laptopId} onChange={e=>setLaptopId(e.target.value)} placeholder="Type or search Laptop ID"/></label><datalist id="report-laptops">{laptops.map(x=><option key={x["Laptop ID"]} value={x["Laptop ID"]}>{x.Brand} {x.Model}</option>)}</datalist></div>{laptop?<><div className="reportTitle"><div><h2>{laptop["Laptop ID"]} · {laptop.Brand} {laptop.Model}</h2><p>{laptop.Configuration||"No configuration description entered"}</p></div><span className="pill">{laptop["Stock Status"]||"In Stock"} · {laptop.Location||"Bangalore"}</span></div><div className="detailGrid">{detailFields.map(f=><div key={f}><small>{f}</small><strong>{laptop[f]!==""&&laptop[f]!=null?String(laptop[f]):"—"}</strong></div>)}</div></>:<div className="empty">Select a valid Laptop ID to display its complete details.</div>}</div>}
  {reportType==="sales-period"&&<div className="reportPanel"><div className="reportFilters"><label>From Date<input type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)}/></label><label>To Date<input type="date" value={toDate} onChange={e=>setToDate(e.target.value)}/></label></div><div className="reportTitle"><h2>Sales from {fromDate} to {toDate}</h2><strong>₹{sales.reduce((sum,m)=>sum+Number(m.amount||0),0).toLocaleString("en-IN")}</strong></div><div className="tableWrap"><table><thead><tr><th>Date</th><th>Laptop ID</th><th>Description</th><th>From</th><th>Invoice</th><th>Amount</th><th>Payment</th><th>Remarks</th></tr></thead><tbody>{sales.map(m=>{const x=laptops.find(l=>l["Laptop ID"]===m.laptopId);return <tr key={m.id}><td>{new Date(m.date).toLocaleString()}</td><td><b>{m.laptopId}</b></td><td>{x?.Configuration||"—"}</td><td>{m.from}</td><td>{m.reference||"—"}</td><td><b>₹{Number(m.amount||0).toLocaleString("en-IN")}</b></td><td>{m.paymentMode||"—"}<br/><span>{m.paymentDate||"—"}</span></td><td>{m.remarks||"—"}</td></tr>})}</tbody></table></div>{!sales.length&&<div className="empty">No Sales movements found for this period.</div>}</div>}
  {reportType==="stock-location"&&<div className="reportPanel">{["Bangalore","Hosur"].map(location=>{const rows=inHand.filter(x=>(x.Location||"Bangalore")===location);return <div className="locationReport" key={location}><div className="reportTitle"><h2>{location} Stock in Hand</h2><span className="pill">{rows.length} laptop{rows.length===1?"":"s"}</span></div><div className="tableWrap"><table><thead><tr><th>Laptop ID</th><th>Brand / Model</th><th>Serial Number</th><th>Configuration Description</th><th>Processor</th><th>RAM</th><th>Storage</th><th>Screen</th><th>Status</th></tr></thead><tbody>{rows.map(x=><tr key={x["Laptop ID"]}><td><b>{x["Laptop ID"]}</b></td><td>{x.Brand} {x.Model}</td><td>{x["Serial Number"]||"—"}</td><td>{x.Configuration||"—"}</td><td>{x.Processor||"—"}<br/><span>{x["Processor Gen"]||""}</span></td><td>{[x["RAM Slot 1 Size (GB)"],x["RAM Slot 2 Size (GB)"]].filter(Boolean).map(v=>String(v).includes("GB")?v:`${v}GB`).join(" + ")||"—"}</td><td>{x["Storage 1 Capacity"]||"—"} {x["Storage 1 Type"]||""}</td><td>{x["Screen Size"]||"—"}</td><td>{x["Stock Status"]||"Need to be Checked"}</td></tr>)}</tbody></table></div>{!rows.length&&<div className="empty">No laptops currently available at {location}.</div>}</div>})}</div>}
  {reportType==="condition-search"&&<div className="reportPanel"><div className="conditionFilters"><label>Processor<select value={conditionProcessor} onChange={e=>setConditionProcessor(e.target.value)}><option value="">All Processors</option><option>Core i3</option><option>Core i5</option><option>Core i7</option></select></label><label>RAM Size<select value={conditionRam} onChange={e=>setConditionRam(e.target.value)}><option value="">All RAM Sizes</option><option value="4">4GB</option><option value="8">8GB</option><option value="16">16GB</option><option value="32">32GB</option></select></label><label>Storage Type<select value={conditionStorage} onChange={e=>setConditionStorage(e.target.value)}><option value="">All Storage Types</option><option>HDD</option><option>SATA SSD</option><option>NVMe SSD</option><option>eMMC</option></select></label><label>Defective Spare / Component<select value={conditionSpare} onChange={e=>setConditionSpare(e.target.value)}><option value="">All Conditions</option><option>Any Defective Spare</option>{spareFields.map(f=><option key={f}>{f}</option>)}</select></label></div><div className="reportTitle"><h2>Laptops Matching Selected Conditions</h2><span className="pill">{conditionRows.length} result{conditionRows.length===1?"":"s"}</span></div><div className="tableWrap"><table><thead><tr><th>Laptop ID</th><th>Brand / Model</th><th>Configuration</th><th>Processor</th><th>RAM</th><th>Storage</th><th>Location</th><th>Defective Spare / Condition</th><th>Status</th></tr></thead><tbody>{conditionRows.map(x=>{const defects=spareFields.filter(f=>isDefective(x[f]));return <tr key={x["Laptop ID"]}><td><b>{x["Laptop ID"]}</b></td><td>{x.Brand} {x.Model}</td><td>{x.Configuration||"—"}</td><td>{x.Processor||"—"}<br/><span>{x["Processor Gen"]||""}</span></td><td>{[x["RAM Slot 1 Size (GB)"],x["RAM Slot 2 Size (GB)"]].filter(Boolean).join(" + ")||"—"}</td><td>{x["Storage 1 Capacity"]} {x["Storage 1 Type"]}{x["Storage 2 Capacity"]?<><br/><span>{x["Storage 2 Capacity"]} {x["Storage 2 Type"]}</span></>:null}</td><td>{x.Location||"Bangalore"}</td><td>{defects.length?defects.map(f=><div key={f}><b>{f}:</b> {x[f]}</div>):"No defect recorded"}</td><td>{x["Stock Status"]||"Need to be Checked"}</td></tr>})}</tbody></table></div>{!conditionRows.length&&<div className="empty">No laptops match the selected conditions.</div>}</div>}
 </section>
}

const fieldGroups = [
 {title:"Basic Information", fields:["Laptop ID","Brand","Model","Serial Number","Configuration","Location"]},
 {title:"Configuration", fields:["Processor","Processor Gen","RAM Slot 1 Size (GB)","RAM Slot 1 Type","RAM Slot 2 Size (GB)","RAM Slot 2 Type","Storage 1 Capacity","Storage 1 Type","Storage 2 Capacity","Storage 2 Type","Screen Size","Power Adapter Type"]},
 {title:"Battery", fields:["Battery Health (%)","Battery Cycle Count","Battery Backup Time"]},
 {title:"Performance & Hardware Tests", fields:["CPU Stress Test","RAM Diagnostics","Drive Health Status","Graphics Stability Test"]},
 {title:"Keyboard / Input", fields:["Keyboard Mechanical Check","Keyboard Backlight (Y/N)","Trackpad Responsiveness"]},
 {title:"Connectivity & Multimedia", fields:["HDMI","USB-A 2.0","USB-A 3.0","USB-C","USB-C Charging","USB-C Display","Headphone / Audio Jack","SD Card Reader","LAN / RJ45","Wi-Fi Connectivity","Bluetooth Pair Test","Webcam Functionality","Microphone Audio Quality","Internal Speakers Status"]},
 {title:"Physical Condition", fields:["Top Case with Bazel","Keyboard Condition","Touchpad","Bottom Case","Hinges Condition","Trackpad","Overall Cosmetic Status"]},
 {title:"Stock / Receipt", fields:["Stock Status","Remarks","Date Received","Purchase / Reference No."]}
];

const options = {
 "Brand":["Lenovo","Dell","HP","Acer","ASUS","Apple","Microsoft","Other"],
 "Location":["Bangalore","Hosur"],
 "Processor":["Core i3","Core i5","Core i7"],
 "Processor Gen":["8th Gen","9th Gen","10th Gen","11th Gen","12th Gen","13th Gen","14th Gen","Ultra","Ryzen","Other"],
 "RAM Slot 1 Type":["DDR3","DDR3L","DDR4","DDR5","LPDDR3","LPDDR4","LPDDR4X","LPDDR5","LPDDR5X","Other"],
 "RAM Slot 2 Type":["DDR3","DDR3L","DDR4","DDR5","LPDDR3","LPDDR4","LPDDR4X","LPDDR5","LPDDR5X","Other"],
 "RAM Slot 1 Size (GB)":["4GB","8GB","16GB","32GB"],
 "RAM Slot 2 Size (GB)":["4GB","8GB","16GB","32GB"],
 "Storage 1 Type":["HDD","SATA SSD","NVMe SSD","eMMC","Other"],
 "Storage 2 Type":["HDD","SATA SSD","NVMe SSD","eMMC","Other"],
 "Storage 1 Capacity":["128GB","256GB","512GB","1TB","2TB","Other"],
 "Storage 2 Capacity":["128GB","256GB","512GB","1TB","2TB","Other"],
 "Screen Size":["11.6\"","12.5\"","13.3\"","13.6\"","14\"","15\"","15.6\"","16\"","17.3\"","Other"],
 "CPU Stress Test":["Passed","Failed","Not Tested","Re-test Required"],
 "RAM Diagnostics":["Passed","Failed","Not Tested","Re-test Required"],
 "Drive Health Status":["Passed (Healthy)","Passed","Warning","Failed","Not Tested","Re-test Required"],
 "Graphics Stability Test":["Passed","Failed","Not Tested","Re-test Required"],
 "Keyboard Mechanical Check":["Passed","Failed","Not Tested","Re-test Required"],
 "Keyboard Backlight (Y/N)":["Yes","No"],
 "Trackpad Responsiveness":["Passed","Failed","Intermittent","Not Tested","Re-test Required"],
 "HDMI":["Available","Not Available","Faulty","Not Tested"],
 "USB-A 2.0":["Available","Not Available","Faulty","Not Tested"],
 "USB-A 3.0":["Available","Not Available","Faulty","Not Tested"],
 "USB-C":["Available","Not Available","Faulty","Not Tested"],
 "USB-C Charging":["Available","Not Available","Faulty","Not Tested"],
 "USB-C Display":["Available","Not Available","Faulty","Not Tested"],
 "Headphone / Audio Jack":["Available","Not Available","Faulty","Not Tested"],
 "SD Card Reader":["Available","Not Available","Faulty","Not Tested"],
 "LAN / RJ45":["Available","Not Available","Faulty","Not Tested"],
 "Webcam Functionality":["Passed","Failed","Not Tested","Re-test Required"],
 "Wi-Fi Connectivity":["Passed","Failed","Intermittent","Not Tested","Re-test Required"],
 "Bluetooth Pair Test":["Passed","Failed","Intermittent","Not Tested","Re-test Required"],
 "Internal Speakers Status":["Passed","Failed","Distorted","Not Tested","Re-test Required"],
 "Microphone Audio Quality":["Passed","Failed","Low","Distorted","Not Tested","Re-test Required"],
 "Top Case with Bazel":["Good (No Scratches)","Minor Scratches","Damaged (Need to be Replaced)","Replaced"],
 "Keyboard Condition":["Good (No Scratches)","Minor Scratches","Damaged (Need to be Replaced)","Replaced"],
 "Touchpad":["Good (No Scratches)","Minor Scratches","Damaged (Need to be Replaced)","Replaced"],
 "Bottom Case":["Good (No Scratches)","Minor Scratches","Damaged (Need to be Replaced)","Replaced"],
 "Hinges Condition":["Good (No Scratches)","Minor Scratches","Damaged (Need to be Replaced)","Replaced"],
 "Trackpad":["Good (No Scratches)","Minor Scratches","Damaged (Need to be Replaced)","Replaced"],
 "Overall Cosmetic Status":["Good (No Scratches)","Minor Scratches","Damaged (Need to be Replaced)","Replaced"],
 "Stock Status":["Need to be Checked","Spares Need to be Replaced","Sold","Scrap"]
};

const optionalSecondSlotFields = new Set(["RAM Slot 2 Size (GB)","RAM Slot 2 Type","Storage 2 Capacity","Storage 2 Type"]);
const mandatoryFields = new Set([...fieldGroups[0].fields,...fieldGroups[1].fields].filter(f=>!optionalSecondSlotFields.has(f)));

function AddLaptopPage({item,onClose,onSave}){
 const [v,setV]=useState({...item});
 const update=(f,val)=>setV({...v,[f]:val});
 const control=(f)=>{
   const opts=options[f];
   if(opts) return <select required={mandatoryFields.has(f)} value={v[f]??""} onChange={e=>update(f,e.target.value)}><option value="">Select...</option>{opts.map(o=><option key={o}>{o}</option>)}</select>;
   return <input required={mandatoryFields.has(f)} value={v[f]??""} onChange={e=>update(f,e.target.value)} placeholder={f==="Configuration"?"Type complete laptop description":f==="Power Adapter Type"?"e.g. 65W USB-C or 90W barrel":f==="Battery Health (%)"?"e.g. 88":f==="Battery Cycle Count"?"e.g. 142":""}/>;
 };
 const submit=()=>{const missing=[...mandatoryFields].filter(f=>String(v[f]??"").trim()==="");if(missing.length){alert(`Please complete all mandatory Basic Information and Configuration fields:\n\n${missing.join(", ")}`);return}onSave(v)};
 const entryGroups=fieldGroups.filter(g=>["Basic Information","Configuration","Stock / Receipt"].includes(g.title));
 return <section className="editorPage"><div className="workflowNote"><b>Initial laptop entry</b><span>Enter the laptop and configuration now. Inspection and condition details can be completed later from Add / Update Product Condition.</span></div><div className="formSections"><div className="requiredNote">* All Basic Information and Configuration fields are mandatory. RAM Slot 2 and Storage 2 are optional.</div>{entryGroups.map(g=><div className="formSection" key={g.title}><h3>{g.title}{(g.title==="Basic Information"||g.title==="Configuration")&&<span className="requiredBadge">Required</span>}</h3><div className="formgrid">{g.fields.map(f=><label key={f}>{f}{mandatoryFields.has(f)&&<em>*</em>}{control(f)}</label>)}</div></div>)}</div><div className="pageActions"><button onClick={onClose}>Cancel</button><button className="primary" onClick={submit}><Save/> {item.Brand||item.Model?"Save Changes":"Add Laptop"}</button></div></section>
}

function ConditionPage({laptops,onSave}){
 const first=laptops[0];
 const [laptopId,setLaptopId]=useState(first?.["Laptop ID"]||"");
 const [v,setV]=useState(first?{...first}:null);
 const [saved,setSaved]=useState(false);
 const chooseLaptop=id=>{const found=laptops.find(x=>x["Laptop ID"]===id);setLaptopId(id);setV(found?{...found}:null);setSaved(false)};
 const update=(f,val)=>{setV({...v,[f]:val});setSaved(false)};
 const conditionGroups=fieldGroups.filter(g=>["Battery","Performance & Hardware Tests","Keyboard / Input","Connectivity & Multimedia","Physical Condition"].includes(g.title));
 const control=f=>{const opts=options[f];return opts?<select value={v?.[f]??""} onChange={e=>update(f,e.target.value)}><option value="">Select...</option>{opts.map(o=><option key={o}>{o}</option>)}</select>:<input value={v?.[f]??""} onChange={e=>update(f,e.target.value)} placeholder={f==="Battery Health (%)"?"e.g. 88":f==="Battery Cycle Count"?"e.g. 142":""}/>};
 const submit=()=>{if(!v){alert("Please select a valid Laptop ID.");return}onSave(v);setSaved(true)};
 return <section className="editorPage"><div className="conditionSelector"><label>Laptop ID (type or select)<input list="condition-laptops" value={laptopId} onChange={e=>chooseLaptop(e.target.value)} placeholder="Type or select Laptop ID"/><datalist id="condition-laptops">{laptops.map(x=><option value={x["Laptop ID"]} key={x["Laptop ID"]}>{x.Brand} {x.Model}</option>)}</datalist></label>{v?<div className="identityGrid"><div><small>Brand</small><strong>{v.Brand||"—"}</strong></div><div><small>Model</small><strong>{v.Model||"—"}</strong></div><div><small>Configuration</small><strong>{v.Configuration||"—"}</strong></div></div>:<div className="empty">Select a valid Laptop ID to load its product condition.</div>}</div>{v&&<><div className="formSections">{conditionGroups.map(g=><div className="formSection" key={g.title}><h3>{g.title}</h3><div className="formgrid">{g.fields.map(f=><label key={f}>{f}{control(f)}</label>)}</div></div>)}</div><div className="pageActions">{saved&&<span className="saveSuccess">Product condition saved successfully.</span>}<button className="primary" onClick={submit}><Save/> Save Product Condition</button></div></>}</section>
}
function MovementModal({item,laptops,onClose,onSave}){
 const first=laptops.find(x=>(x["Stock Status"]||"In Stock")!=="Sold")||laptops[0];
 const initialLocation=first?.Location||"Bangalore";
 const [v,setV]=useState(item?{amount:"",paymentDate:"",paymentMode:"",remarks:"",reference:"",...item,type:item.type==="Sale"?"Sale":"Transfer",date:String(item.date).slice(0,16)}:{laptopId:first?.["Laptop ID"]||"",type:"Transfer",from:initialLocation,to:initialLocation==="Bangalore"?"Hosur":"Bangalore",reference:"",amount:"",paymentDate:"",paymentMode:"",remarks:"",date:new Date().toISOString().slice(0,16)});
 const selected=laptops.find(x=>x["Laptop ID"]===v.laptopId);
 const chooseLaptop=(id)=>{
   const laptop=laptops.find(x=>x["Laptop ID"]===id);
   const from=laptop?.Location||"";
   setV({...v,laptopId:id,from,to:v.type==="Sale"?"":from==="Bangalore"?"Hosur":from==="Hosur"?"Bangalore":""});
 };
 const setType=(type)=>setV({...v,type,to:type==="Sale"?"":v.from==="Bangalore"?"Hosur":v.from==="Hosur"?"Bangalore":""});
 const submit=()=>{
   if(!selected){alert("Please select a valid Laptop ID.");return}
   if(v.type==="Transfer"&&!v.to){alert("Please select the destination location.");return}
   if(v.type==="Sale"&&(!v.reference||!v.amount||!v.paymentDate||!v.paymentMode)){alert("Please complete all Sales payment fields.");return}
   onSave({...v,to:v.type==="Sale"?"Customer":v.to});
 };
 return <Modal title={item?"Edit Stock Movement":"New Stock Movement"} onClose={onClose} onSave={submit} saveLabel={item?"Save Correction":"Save Movement"}>
  <div className="movementTabs"><button type="button" className={v.type==="Transfer"?"active":""} onClick={()=>setType("Transfer")}>1. Stock Transfer</button><button type="button" className={v.type==="Sale"?"active":""} onClick={()=>setType("Sale")}>2. Sales</button></div>
  <div className="movementSection"><h3>{v.type==="Transfer"?"Stock Transfer Details":"Sales Details"}</h3><div className="formgrid">
  <label>Laptop ID<input list="movement-laptops" value={v.laptopId} onChange={e=>chooseLaptop(e.target.value)} placeholder="Type Laptop ID, brand or model..."/><datalist id="movement-laptops">{laptops.filter(x=>(x["Stock Status"]||"In Stock")!=="Sold"||x["Laptop ID"]===v.laptopId).map(x=><option value={x["Laptop ID"]} key={x["Laptop ID"]}>{x.Brand} {x.Model} · {x.Location||"Bangalore"}</option>)}</datalist>{selected&&<small>{selected.Brand} {selected.Model} · Available at {selected.Location||"Bangalore"}</small>}</label>
  {selected&&<div className="configurationPreview"><small>Configuration / Description</small><strong>{selected.Configuration||"No configuration description entered"}</strong></div>}
  <label>From<input value={v.from} disabled title="Automatically taken from the laptop's current location"/></label>
  {v.type==="Transfer"&&<label>To<select value={v.to} onChange={e=>setV({...v,to:e.target.value})}><option value="">Select destination</option><option disabled={v.from==="Bangalore"}>Bangalore</option><option disabled={v.from==="Hosur"}>Hosur</option></select></label>}
  <label>Date & Time<input type="datetime-local" value={v.date} onChange={e=>setV({...v,date:e.target.value})}/></label>
  {v.type==="Transfer"?<label className="full">Remarks<textarea value={v.remarks} onChange={e=>setV({...v,remarks:e.target.value})} placeholder="Transfer purpose or notes"/></label>:<>
  <label>Reference / Invoice<input value={v.reference} onChange={e=>setV({...v,reference:e.target.value})} placeholder="Invoice or reference number"/></label>
  <label>Amount (₹)<input type="number" min="0" step="0.01" value={v.amount} onChange={e=>setV({...v,amount:e.target.value})}/></label>
  <label>Payment Date<input type="date" value={v.paymentDate} onChange={e=>setV({...v,paymentDate:e.target.value})}/></label>
  <label>Payment Mode<select value={v.paymentMode} onChange={e=>setV({...v,paymentMode:e.target.value})}><option value="">Select payment mode</option><option>Cash</option><option>UPI</option><option>Bank Transfer</option><option>Credit Card</option><option>Debit Card</option><option>Cheque</option><option>Credit</option><option>Other</option></select></label>
  <label className="full">Remarks<textarea value={v.remarks} onChange={e=>setV({...v,remarks:e.target.value})} placeholder="Sales notes, customer details or payment remarks"/></label>
  </>}</div></div>
 </Modal>
}
function HistoryModal({movement,onClose}){const entries=[...(movement.history||[]),movement];return <div className="overlay"><div className="modal historyModal"><div className="modalHead"><div><h2>Movement Correction History</h2><small>{movement.laptopId} · {entries.length} version{entries.length===1?"":"s"}</small></div><button onClick={onClose}><X/></button></div><div className="historyList">{entries.map((m,i)=><div className="historyItem" key={i}><b>{i===entries.length-1?"Current version":`Version ${i+1}`}</b><span>{new Date(m.correctedAt||m.updatedAt||m.date).toLocaleString()}</span><p>{m.type}: {m.from} → {m.to}</p><small>Reference: {m.reference||"—"} · Remarks: {m.remarks||"—"}</small></div>)}</div><div className="modalFoot"><button onClick={onClose}>Close</button></div></div></div>}
function Modal({title,onClose,onSave,saveLabel="Save",children}){return <div className="overlay"><div className="modal"><div className="modalHead"><h2>{title}</h2><button onClick={onClose}><X/></button></div>{children}<div className="modalFoot"><button onClick={onClose}>Cancel</button><button className="primary" onClick={onSave}><Save/> {saveLabel}</button></div></div></div>}

createRoot(document.getElementById("root")).render(<Root/>);
