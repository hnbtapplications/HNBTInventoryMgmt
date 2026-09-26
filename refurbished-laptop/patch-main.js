const fs = require('fs');

let content = fs.readFileSync('src/main.jsx', 'utf8');

// 1. Add imports
content = content.replace(
  'import React, {useMemo, useState} from "react";',
  'import React, {useMemo, useState, useEffect} from "react";\nimport { fetchLaptopsFromDB, upsertLaptopToDB, deleteLaptopFromDB, fetchMovementsFromDB, upsertMovementToDB } from "./supabase";'
);

// 2. Change App signature and state initialization
content = content.replace(
  /function App\({onLogout}\){[\s\S]*?const persistMov=\(next\)=>{setMovements\(next\);localStorage\.setItem\(movKey,JSON\.stringify\(next\)\)}/,
  `function App({onLogout}){
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
    // Upsert the latest changes (assuming the changed item is at the end or we can just upsert all, 
    // but typically we'll upsert individually in the save functions instead to save bandwidth. 
    // However, to keep it simple, we'll let individual functions handle DB syncs)
  };
  const persistMov = async (next) => {
    setMovements(next);
    localStorage.setItem(movKey, JSON.stringify(next));
  };`
);

// 3. Update saveLaptop
content = content.replace(
  /function saveLaptop\(item\){[\s\S]*?persist\(next\);setEditing\(null\);setPage\("laptops"\)\n  }/,
  `async function saveLaptop(item){
    const originalId=item.__originalId;
    const clean={...item};delete clean.__originalId;
    if(laptops.some(x=>x["Laptop ID"]===clean["Laptop ID"]&&x["Laptop ID"]!==originalId)){alert("This Laptop ID already exists.");return}
    const exists=Boolean(originalId)||laptops.some(x=>x["Laptop ID"]===clean["Laptop ID"]);
    const next=exists?laptops.map(x=>x["Laptop ID"]===(originalId||clean["Laptop ID"])?clean:x):[...laptops,clean];
    await upsertLaptopToDB(clean);
    persist(next);setEditing(null);setPage("laptops")
  }`
);

// 4. Update saveCondition
content = content.replace(
  /function saveCondition\(item\){[\s\S]*?persist\(laptops\.map\(x=>x\["Laptop ID"\]===item\["Laptop ID"\]\?item:x\)\);\n  }/,
  `async function saveCondition(item){
    await upsertLaptopToDB(item);
    persist(laptops.map(x=>x["Laptop ID"]===item["Laptop ID"]?item:x));
  }`
);

// 5. Update removeLaptop
content = content.replace(
  /function removeLaptop\(id\){[\s\S]*?if\(confirm\("Delete this laptop record\?"\)\) persist\(laptops\.filter\(x=>x\["Laptop ID"\]!==id\)\);\n  }/,
  `async function removeLaptop(id){
    if(confirm("Delete this laptop record?")) {
      await deleteLaptopFromDB(id);
      persist(laptops.filter(x=>x["Laptop ID"]!==id));
    }
  }`
);

// 6. Update addMovement
content = content.replace(
  /function addMovement\(m\){[\s\S]*?persist\(updated\);setShowMovement\(false\);\n  }/,
  `async function addMovement(m){
    const now=new Date().toISOString();
    const record={...m,id:crypto.randomUUID(),date:m.date||now};
    await upsertMovementToDB(record);
    const next=[record,...movements];persistMov(next);
    const updated=laptops.map(x=>x["Laptop ID"]===m.laptopId?{...x,"Stock Status":movementStatus(m.type,x["Stock Status"]),"Location":m.to==="Bangalore"||m.to==="Hosur"?m.to:x.Location}:x);
    const updatedLaptop = updated.find(x => x["Laptop ID"] === m.laptopId);
    if (updatedLaptop) await upsertLaptopToDB(updatedLaptop);
    persist(updated);setShowMovement(false);
  }`
);

// 7. Update saveMovement
content = content.replace(
  /function saveMovement\(m\){[\s\S]*?setEditingMovement\(null\);\n  }/,
  `async function saveMovement(m){
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
  }`
);

// 8. Add Loading State UI
content = content.replace(
  /return <div className="app">/,
  `return <div className="app">
    {loadingDb && <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(255,255,255,0.8)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999}}><h2>Loading Data from Database...</h2></div>}`
);

fs.writeFileSync('src/main.jsx', content);
console.log('main.jsx patched successfully!');
