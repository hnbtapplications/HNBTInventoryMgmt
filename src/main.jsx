import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Package, Search, Plus, Pencil, Trash2, ArrowDownToLine,
  RefreshCw, Download, X, AlertTriangle, Boxes, IndianRupee, Tags,
  BarChart3, FileText, Calendar, Printer, ArrowRight, ArrowUpRight,
  ArrowDownRight, Layers, CheckCircle2, TrendingDown, Cloud, CloudOff,
  Database, UploadCloud
} from "lucide-react";
import "./styles.css";
import {
  getSupabaseCredentials,
  isSupabaseConfigured,
  saveSupabaseCredentials,
  fetchProductsFromDB,
  upsertProductToDB,
  deleteProductFromDB,
  fetchMovementsFromDB,
  upsertMovementToDB,
  deleteMovementFromDB,
  fetchMastersFromDB,
  saveMasterItemToDB,
  deleteMasterItemFromDB,
  syncAllLocalToDB
} from "./supabase";

const defaultBrands = ["Dell", "Logitech", "Crucial", "HP", "Lenovo", "Samsung", "Kingston", "Asus", "Acer"];
const defaultCategories = ["Mouse", "Keyboard", "RAM", "SSD", "Cable", "Monitor", "Power Supply", "Motherboard", "Accessories"];
const defaultUnits = ["Nos", "Pcs", "Box", "Set", "Mtr", "Kg", "Pkt", "Roll"];

const seedProducts = [
  { id:"HB-001", name:"Dell MS116 USB Mouse", category:"Mouse", brand:"Dell", unit:"Nos", purchase:350, sale:450, min:10, bangalore:20, hosur:10 },
  { id:"HB-002", name:"Dell KB216 Keyboard", category:"Keyboard", brand:"Dell", unit:"Nos", purchase:650, sale:800, min:5, bangalore:15, hosur:1 },
  { id:"HB-003", name:"Dell WM126 Wireless Mouse", category:"Mouse", brand:"Dell", unit:"Nos", purchase:650, sale:850, min:10, bangalore:43, hosur:28 },
  { id:"HB-004", name:"Logitech M170 Wireless Mouse", category:"Mouse", brand:"Logitech", unit:"Nos", purchase:650, sale:850, min:5, bangalore:0, hosur:10 },
  { id:"HB-005", name:"Crucial 8GB DDR4 Laptop RAM", category:"RAM", brand:"Crucial", unit:"Nos", purchase:1400, sale:1800, min:5, bangalore:24, hosur:0 },
  { id:"HB-006", name:"Crucial 16GB DDR4 Laptop RAM", category:"RAM", brand:"Crucial", unit:"Nos", purchase:2500, sale:3100, min:3, bangalore:11, hosur:0 },
];

function getMovementTime(m){
  if (m.timestamp) return Number(m.timestamp);
  if (typeof m.id === "number" && m.id > 1600000000000) return m.id;
  const parsed = Date.parse(m.date);
  if (!isNaN(parsed)) return parsed;
  return 0;
}

function getProductStockAt(p, branch, timestamp, allMovements){
  const b = (branch || "all").toLowerCase();
  let baseStock = 0;
  if (b === "all") {
    baseStock = (Number(p.bangalore) || 0) + (Number(p.hosur) || 0);
  } else {
    baseStock = Number(p[b]) || 0;
  }

  const laterMovements = allMovements.filter(m => {
    const isSameProd = m.productId === p.id || m.product === p.name;
    const mBranch = (m.branch || "bangalore").toLowerCase();
    const isBranchMatch = b === "all" || mBranch === b;
    const mTime = getMovementTime(m);
    return isSameProd && isBranchMatch && mTime > timestamp;
  });

  let stockAtTime = baseStock;
  for (const m of laterMovements) {
    const q = Number(m.qty) || 0;
    if (m.type === "IN") {
      stockAtTime -= q;
    } else if (m.type === "OUT") {
      stockAtTime += q;
    }
  }
  return stockAtTime;
}

function getTodayString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getStartOfMonthString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

function App(){
  const [currentTab, setCurrentTab] = useState("inventory"); // "inventory" | "reports"
  const [reportType, setReportType] = useState("product-ledger"); // "product-ledger" | "all-movements" | "low-stock" | "monthly-statement"

  const [products,setProducts] = useState(() => JSON.parse(localStorage.getItem("hb_products") || "null") || seedProducts);
  const [movements,setMovements] = useState(() => JSON.parse(localStorage.getItem("hb_movements") || "[]"));
  const [brands,setBrands] = useState(() => JSON.parse(localStorage.getItem("hb_brands") || "null") || defaultBrands);
  const [categories,setCategories] = useState(() => JSON.parse(localStorage.getItem("hb_categories") || "null") || defaultCategories);
  const [units,setUnits] = useState(() => JSON.parse(localStorage.getItem("hb_units") || "null") || defaultUnits);

  // Cloud Database State
  const [isCloudConnected, setIsCloudConnected] = useState(() => isSupabaseConfigured());
  const [showCloudModal, setShowCloudModal] = useState(false);
  const [cloudUrl, setCloudUrl] = useState(() => getSupabaseCredentials().url);
  const [cloudKey, setCloudKey] = useState(() => getSupabaseCredentials().key);
  const [cloudSyncing, setCloudSyncing] = useState(false);
  const [cloudSyncMsg, setCloudSyncMsg] = useState("");

  // Inventory search & filters
  const [search,setSearch] = useState("");
  const [category,setCategory] = useState("All");
  const [branch,setBranch] = useState("All");

  // Modals state
  const [showForm,setShowForm] = useState(false);
  const [editing,setEditing] = useState(null);
  const [form,setForm] = useState(emptyForm());

  const [showMovement,setShowMovement] = useState(false);
  const [editingMovement,setEditingMovement] = useState(null);
  const [movement,setMovement] = useState({type:"IN", productId:"", branch:"Bangalore", qty:1, note:""});

  const [showMasterModal,setShowMasterModal] = useState(false);
  const [masterTab,setMasterTab] = useState("brands");
  const [newMasterInput,setNewMasterInput] = useState("");

  // Report 1: Single Product Ledger Filter State
  const [ledgerProduct, setLedgerProduct] = useState("");
  const [ledgerFrom, setLedgerFrom] = useState(getStartOfMonthString());
  const [ledgerTo, setLedgerTo] = useState(getTodayString());
  const [ledgerBranch, setLedgerBranch] = useState("All");

  // Report 2: All Products Movement Filter State
  const [allFrom, setAllFrom] = useState(getStartOfMonthString());
  const [allTo, setAllTo] = useState(getTodayString());
  const [allBranch, setAllBranch] = useState("All");
  const [allCategory, setAllCategory] = useState("All");
  const [allBrand, setAllBrand] = useState("All");
  const [allType, setAllType] = useState("All");
  const [allViewMode, setAllViewMode] = useState("movements"); // "movements" | "summary"

  // Report 3: Low Stock Filter State
  const [lowBranch, setLowBranch] = useState("All");
  const [lowCategory, setLowCategory] = useState("All");
  const [lowStatus, setLowStatus] = useState("all"); // "all" | "out" | "low"

  // Report 4: Monthly Statement Filter State
  const [monthVal, setMonthVal] = useState(new Date().getMonth() + 1);
  const [yearVal, setYearVal] = useState(new Date().getFullYear());
  const [monthBranch, setMonthBranch] = useState("All");
  const [monthCategory, setMonthCategory] = useState("All");

  // Local storage persistence
  useEffect(()=>localStorage.setItem("hb_products",JSON.stringify(products)),[products]);
  useEffect(()=>localStorage.setItem("hb_movements",JSON.stringify(movements)),[movements]);
  useEffect(()=>localStorage.setItem("hb_brands",JSON.stringify(brands)),[brands]);
  useEffect(()=>localStorage.setItem("hb_categories",JSON.stringify(categories)),[categories]);
  useEffect(()=>localStorage.setItem("hb_units",JSON.stringify(units)),[units]);

  // Initial fetch from Supabase Cloud on mount
  useEffect(() => {
    async function loadCloudData() {
      if (!isSupabaseConfigured()) return;
      setIsCloudConnected(true);
      try {
        const [cloudProds, cloudMovs, cloudMasters] = await Promise.all([
          fetchProductsFromDB(),
          fetchMovementsFromDB(),
          fetchMastersFromDB()
        ]);

        if (cloudProds && cloudProds.length > 0) {
          setProducts(cloudProds);
        }
        if (cloudMovs && cloudMovs.length > 0) {
          setMovements(cloudMovs);
        }
        if (cloudMasters) {
          if (cloudMasters.brands && cloudMasters.brands.length) setBrands(cloudMasters.brands);
          if (cloudMasters.categories && cloudMasters.categories.length) setCategories(cloudMasters.categories);
          if (cloudMasters.units && cloudMasters.units.length) setUnits(cloudMasters.units);
        }
      } catch (err) {
        console.error("Cloud data loading error:", err);
      }
    }
    loadCloudData();
  }, []);

  // Set default ledger product once products load
  useEffect(() => {
    if (!ledgerProduct && products.length > 0) {
      setLedgerProduct(products[0].id);
    }
  }, [products, ledgerProduct]);

  const filterCategories = useMemo(()=>["All",...new Set([...categories, ...products.map(p=>p.category)].filter(Boolean))],[categories, products]);
  const filterBrands = useMemo(()=>["All",...new Set([...brands, ...products.map(p=>p.brand)].filter(Boolean))],[brands, products]);

  const rows = products.filter(p=>{
    const text = `${p.name} ${p.brand || ""} ${p.category || ""} ${p.id}`.toLowerCase();
    const matchesSearch = text.includes(search.toLowerCase());
    const matchesCategory = category==="All" || p.category===category;
    const stock = branch==="All" ? (p.bangalore || 0) + (p.hosur || 0) : Number(p[branch.toLowerCase()] || 0);
    return matchesSearch && matchesCategory && (branch==="All" || stock >= 0);
  });

  const totalUnits = products.reduce((s,p)=>s+(p.bangalore || 0)+(p.hosur || 0),0);
  const stockValue = products.reduce((s,p)=>s+((p.bangalore || 0)+(p.hosur || 0))*(Number(p.purchase)||0),0);
  const lowStock = products.filter(p=>((p.bangalore || 0)+(p.hosur || 0)) <= (p.min || 5)).length;
  const outOfStock = products.filter(p=>((p.bangalore || 0)+(p.hosur || 0)) === 0).length;

  function saveProduct(e){
    e.preventDefault();
    const payload = {
      name: form.name.trim(),
      brand: form.brand.trim(),
      category: form.category.trim(),
      unit: form.unit || "Nos",
      purchase: Number(form.purchase) || 0,
      sale: Number(form.sale) || 0,
      min: Number(form.min) || 0,
      bangalore: Number(form.bangalore) || 0,
      hosur: Number(form.hosur) || 0
    };

    if(payload.brand && !brands.includes(payload.brand)) {
      setBrands(b=>[...b, payload.brand]);
      if(isSupabaseConfigured()) saveMasterItemToDB("brands", payload.brand).catch(console.error);
    }
    if(payload.category && !categories.includes(payload.category)) {
      setCategories(c=>[...c, payload.category]);
      if(isSupabaseConfigured()) saveMasterItemToDB("categories", payload.category).catch(console.error);
    }
    if(payload.unit && !units.includes(payload.unit)) {
      setUnits(u=>[...u, payload.unit]);
      if(isSupabaseConfigured()) saveMasterItemToDB("units", payload.unit).catch(console.error);
    }

    const targetProduct = editing ? { ...editing, ...payload } : { ...payload, id: `HB-${String(Date.now()).slice(-6)}` };
    if(editing) setProducts(ps=>ps.map(p=>p.id===editing.id?targetProduct:p));
    else setProducts(ps=>[...ps, targetProduct]);

    if(isSupabaseConfigured()) {
      upsertProductToDB(targetProduct).catch(console.error);
    }

    closeForm();
  }

  function closeForm(){
    setShowForm(false);
    setEditing(null);
    setForm(emptyForm());
  }

  function editProduct(p){
    setEditing(p);
    setForm({
      name: p.name || "",
      brand: p.brand || "",
      category: p.category || "",
      unit: p.unit || "Nos",
      purchase: p.purchase ?? 0,
      sale: p.sale ?? 0,
      min: p.min ?? 5,
      bangalore: p.bangalore ?? 0,
      hosur: p.hosur ?? 0
    });
    setShowForm(true);
  }

  function deleteProduct(pOrId){
    const prod = typeof pOrId === "object" && pOrId !== null ? pOrId : products.find(p => p.id === pOrId);
    if (!prod) return;
    
    const totalStock = (Number(prod.bangalore) || 0) + (Number(prod.hosur) || 0);
    let msg = `Are you sure you want to permanently delete "${prod.name}" (${prod.id}) from the product catalog?`;
    if (totalStock > 0) {
      msg = `⚠️ NOTICE: "${prod.name}" still has ${totalStock} unit(s) recorded in stock (Bangalore: ${prod.bangalore || 0}, Hosur: ${prod.hosur || 0}).\n\nDeleting this product will remove it from the inventory list and stock movements. Are you sure you want to delete / discontinue this item?`;
    }
    
    if (confirm(msg)) {
      setProducts(ps => ps.filter(p => p.id !== prod.id));
      if(isSupabaseConfigured()) {
        deleteProductFromDB(prod.id).catch(console.error);
      }
      if (showForm) closeForm();
    }
  }

  function openMaster(tab){
    setMasterTab(tab);
    setNewMasterInput("");
    setShowMasterModal(true);
  }

  function addMasterItem(e){
    e?.preventDefault();
    const val = newMasterInput.trim();
    if(!val) return;
    if(masterTab === "brands"){
      if(!brands.includes(val)) {
        setBrands(b=>[...b, val]);
        if(isSupabaseConfigured()) saveMasterItemToDB("brands", val).catch(console.error);
      }
      if(showForm) setForm(f=>({...f, brand: val}));
    } else if(masterTab === "categories"){
      if(!categories.includes(val)) {
        setCategories(c=>[...c, val]);
        if(isSupabaseConfigured()) saveMasterItemToDB("categories", val).catch(console.error);
      }
      if(showForm) setForm(f=>({...f, category: val}));
    } else if(masterTab === "units"){
      if(!units.includes(val)) {
        setUnits(u=>[...u, val]);
        if(isSupabaseConfigured()) saveMasterItemToDB("units", val).catch(console.error);
      }
      if(showForm) setForm(f=>({...f, unit: val}));
    }
    setNewMasterInput("");
  }

  function deleteMasterItem(item){
    if(!confirm(`Delete "${item}"?`)) return;
    if(masterTab === "brands") {
      setBrands(b=>b.filter(i=>i!==item));
      if(isSupabaseConfigured()) deleteMasterItemFromDB("brands", item).catch(console.error);
    } else if(masterTab === "categories") {
      setCategories(c=>c.filter(i=>i!==item));
      if(isSupabaseConfigured()) deleteMasterItemFromDB("categories", item).catch(console.error);
    } else if(masterTab === "units") {
      setUnits(u=>u.filter(i=>i!==item));
      if(isSupabaseConfigured()) deleteMasterItemFromDB("units", item).catch(console.error);
    }
  }

  async function handleSaveCloudCredentials(e) {
    e?.preventDefault();
    setCloudSyncMsg("Testing connection to Supabase...");
    saveSupabaseCredentials(cloudUrl, cloudKey);
    const configured = isSupabaseConfigured();
    setIsCloudConnected(configured);

    if (!cloudUrl || !cloudKey) {
      setCloudSyncMsg("Credentials cleared. Switched to Local Storage mode.");
      return;
    }

    const prods = await fetchProductsFromDB();
    if (prods !== null) {
      setCloudSyncMsg("✅ Connected successfully to Supabase! Cloud storage is active.");
      if (prods.length > 0) {
        setProducts(prods);
      }
      const movs = await fetchMovementsFromDB();
      if (movs && movs.length > 0) setMovements(movs);
      const masters = await fetchMastersFromDB();
      if (masters) {
        if (masters.brands?.length) setBrands(masters.brands);
        if (masters.categories?.length) setCategories(masters.categories);
        if (masters.units?.length) setUnits(masters.units);
      }
    } else {
      setCloudSyncMsg("⚠️ Could not reach tables in Supabase. Please ensure you ran supabase-schema.sql in your Supabase SQL Editor.");
    }
  }

  async function handleSyncAllToCloud() {
    if (!isSupabaseConfigured()) {
      setCloudSyncMsg("Please enter and save your Supabase URL and Key first.");
      return;
    }
    setCloudSyncing(true);
    setCloudSyncMsg("Syncing local products, movements, and masters to Supabase...");
    try {
      await syncAllLocalToDB({ products, movements, brands, categories, units });
      setCloudSyncMsg(`✅ Successfully synced ${products.length} products and ${movements.length} movements to Supabase Cloud!`);
    } catch (err) {
      console.error(err);
      setCloudSyncMsg(`❌ Sync error: ${err.message || "Failed to sync"}`);
    } finally {
      setCloudSyncing(false);
    }
  }

  function handleDisconnectCloud() {
    if (confirm("Disconnect Supabase cloud? Your current data will remain safe in Local Storage.")) {
      saveSupabaseCredentials("", "");
      setCloudUrl("");
      setCloudKey("");
      setIsCloudConnected(false);
      setCloudSyncMsg("Disconnected from Supabase. Working in Local Storage mode.");
    }
  }

  function closeMovementModal(){
    setShowMovement(false);
    setEditingMovement(null);
    setMovement({type:"IN",productId:"",branch:"Bangalore",qty:1,note:""});
  }

  function editMovement(m){
    const prod = products.find(p => p.id === m.productId || p.name === m.product);
    setEditingMovement(m);
    setMovement({
      type: m.type,
      productId: prod ? prod.id : m.productId || "",
      branch: m.branch || "Bangalore",
      qty: m.qty,
      note: m.note || ""
    });
    setShowMovement(true);
  }

  function deleteMovement(m){
    if(!confirm(`Delete this stock movement (${m.type} ${m.qty} ${m.product})? Stock will be adjusted back.`)) return;
    const oldProd = products.find(p => p.id === m.productId || p.name === m.product);
    const key = (m.branch || "Bangalore").toLowerCase();
    const qty = Number(m.qty) || 0;

    if(oldProd){
      const updatedProd = {
        ...oldProd,
        [key]: m.type === "IN" ? Math.max(0, Number(oldProd[key] || 0) - qty) : Number(oldProd[key] || 0) + qty
      };
      setProducts(ps => ps.map(p => p.id === oldProd.id ? updatedProd : p));
      if(isSupabaseConfigured()) upsertProductToDB(updatedProd).catch(console.error);
    }

    setMovements(ms => ms.filter(item => item.id !== m.id));
    if(isSupabaseConfigured()) deleteMovementFromDB(m.id).catch(console.error);
  }

  // Available stock calculations for Stock Movement modal
  const activeMovementProduct = useMemo(() => {
    return products.find(p => p.id === movement.productId) || null;
  }, [products, movement.productId]);

  const activeBranchStock = useMemo(() => {
    if (!activeMovementProduct) return { bangalore: 0, hosur: 0, current: 0, availableForOut: 0 };
    const bgStock = Number(activeMovementProduct.bangalore) || 0;
    const hsStock = Number(activeMovementProduct.hosur) || 0;
    const currentBranchKey = (movement.branch || "Bangalore").toLowerCase();
    const currentVal = currentBranchKey === "hosur" ? hsStock : bgStock;

    let availableForOut = currentVal;
    if (editingMovement) {
      const isSameProd = editingMovement.productId === activeMovementProduct.id || editingMovement.product === activeMovementProduct.name;
      const isSameBranch = (editingMovement.branch || "Bangalore").toLowerCase() === currentBranchKey;
      if (isSameProd && isSameBranch) {
        if (editingMovement.type === "OUT") {
          availableForOut += Number(editingMovement.qty) || 0;
        } else if (editingMovement.type === "IN") {
          availableForOut = Math.max(0, availableForOut - (Number(editingMovement.qty) || 0));
        }
      }
    }

    return {
      bangalore: bgStock,
      hosur: hsStock,
      current: currentVal,
      availableForOut
    };
  }, [activeMovementProduct, movement.branch, editingMovement]);

  const isOutwardExceeding = movement.type === "OUT" && Number(movement.qty) > activeBranchStock.availableForOut;

  function saveMovement(e){
    e.preventDefault();
    const qty = Math.max(1, Number(movement.qty) || 1);
    const newProduct = products.find(p => p.id === movement.productId);
    if(!newProduct){
      alert("Please select a product.");
      return;
    }
    const newKey = (movement.branch || "Bangalore").toLowerCase();

    if(editingMovement){
      const oldProd = products.find(p => p.id === editingMovement.productId || p.name === editingMovement.product);
      const oldKey = (editingMovement.branch || "Bangalore").toLowerCase();
      const oldQty = Number(editingMovement.qty) || 0;
      const oldType = editingMovement.type;

      let intermediateProducts = products.map(p => {
        if(oldProd && p.id === oldProd.id){
          const current = Number(p[oldKey] || 0);
          return {
            ...p,
            [oldKey]: oldType === "IN" ? current - oldQty : current + oldQty
          };
        }
        return p;
      });

      const targetProd = intermediateProducts.find(p => p.id === newProduct.id);
      const available = Number(targetProd ? targetProd[newKey] || 0 : 0);
      if(movement.type === "OUT" && qty > available){
        alert(`⚠️ Stock Out Alert!\n\nOutward quantity (${qty} ${newProduct.unit || 'Nos'}) exceeds the available stock in ${movement.branch} (${available} ${newProduct.unit || 'Nos'}).\n\nPlease enter a quantity less than or equal to ${available}.`);
        return;
      }

      const finalProducts = intermediateProducts.map(p => {
        if(p.id === newProduct.id){
          const current = Number(p[newKey] || 0);
          return {
            ...p,
            [newKey]: movement.type === "IN" ? current + qty : current - qty
          };
        }
        return p;
      });

      const updatedMovement = {
        ...editingMovement,
        type: movement.type,
        productId: newProduct.id,
        product: newProduct.name,
        branch: movement.branch,
        qty,
        note: movement.note
      };

      setProducts(finalProducts);
      setMovements(ms => ms.map(m => m.id === editingMovement.id ? updatedMovement : m));

      if(isSupabaseConfigured()){
        upsertMovementToDB(updatedMovement).catch(console.error);
        const updatedNewProd = finalProducts.find(p => p.id === newProduct.id);
        const updatedOldProd = oldProd && oldProd.id !== newProduct.id ? finalProducts.find(p => p.id === oldProd.id) : null;
        if(updatedNewProd) upsertProductToDB(updatedNewProd).catch(console.error);
        if(updatedOldProd) upsertProductToDB(updatedOldProd).catch(console.error);
      }

      closeMovementModal();
      return;
    }

    const current = Number(newProduct[newKey] || 0);
    if(movement.type === "OUT" && qty > current){
      alert(`⚠️ Stock Out Alert!\n\nOutward quantity (${qty} ${newProduct.unit || 'Nos'}) exceeds the available stock in ${movement.branch} (${current} ${newProduct.unit || 'Nos'}).\n\nPlease enter a quantity less than or equal to ${current}.`);
      return;
    }

    const updatedProduct = {
      ...newProduct,
      [newKey]: movement.type === "IN" ? current + qty : current - qty
    };
    const newMovementItem = {
      id: Date.now(),
      timestamp: Date.now(),
      date: new Date().toLocaleString("en-IN"),
      type: movement.type,
      productId: newProduct.id,
      product: newProduct.name,
      branch: movement.branch,
      qty,
      note: movement.note
    };

    setProducts(ps => ps.map(p => p.id === newProduct.id ? updatedProduct : p));
    setMovements(ms => [newMovementItem, ...ms]);

    if(isSupabaseConfigured()){
      upsertMovementToDB(newMovementItem).catch(console.error);
      upsertProductToDB(updatedProduct).catch(console.error);
    }
    closeMovementModal();
  }

  function exportInventoryCSV(){
    const header=["Product ID","Product","Category","Brand","Unit","Purchase","Selling","Min Stock","Bangalore","Hosur","Total Stock","Stock Value"];
    const body=products.map(p=>[
      p.id,
      p.name,
      p.category || "",
      p.brand || "",
      p.unit || "Nos",
      p.purchase || 0,
      p.sale || 0,
      p.min || 0,
      p.bangalore || 0,
      p.hosur || 0,
      (p.bangalore || 0) + (p.hosur || 0),
      ((p.bangalore || 0) + (p.hosur || 0)) * (p.purchase || 0)
    ]);
    downloadCSV("inventory-products.csv", [header, ...body]);
  }

  function downloadCSV(filename, rowsArray){
    const csv=rowsArray.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");
    const blob=new Blob([csv],{type:"text/csv;charset=utf-8"});
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=filename; a.click();
  }

  // ===================== REPORT 1 CALCULATIONS =====================
  const selectedProductObj = useMemo(() => {
    return products.find(p => p.id === ledgerProduct) || products[0] || null;
  }, [products, ledgerProduct]);

  const ledgerData = useMemo(() => {
    if (!selectedProductObj) return { openingStock: 0, items: [], totalIn: 0, totalOut: 0, closingStock: 0 };
    const fromMs = new Date(`${ledgerFrom}T00:00:00`).getTime();
    const toMs = new Date(`${ledgerTo}T23:59:59.999`).getTime();

    const openingStock = getProductStockAt(selectedProductObj, ledgerBranch, fromMs - 1, movements);

    const periodMovements = movements.filter(m => {
      const isMatchProd = m.productId === selectedProductObj.id || m.product === selectedProductObj.name;
      const isMatchBranch = ledgerBranch === "All" || (m.branch || "").toLowerCase() === ledgerBranch.toLowerCase();
      const mTime = getMovementTime(m);
      return isMatchProd && isMatchBranch && mTime >= fromMs && mTime <= toMs;
    }).sort((a, b) => getMovementTime(a) - getMovementTime(b));

    let running = openingStock;
    let totalIn = 0;
    let totalOut = 0;
    const items = periodMovements.map(m => {
      const q = Number(m.qty) || 0;
      if (m.type === "IN") {
        running += q;
        totalIn += q;
      } else {
        running -= q;
        totalOut += q;
      }
      return {
        ...m,
        balance: running
      };
    });

    return {
      openingStock,
      items,
      totalIn,
      totalOut,
      closingStock: openingStock + totalIn - totalOut
    };
  }, [selectedProductObj, ledgerBranch, ledgerFrom, ledgerTo, movements]);

  function exportProductLedgerCSV(){
    if (!selectedProductObj) return;
    const header=["Date","Type","Product","Branch","Quantity","Running Balance","Reference/Note"];
    const body=ledgerData.items.map(m=>[
      m.date,
      m.type,
      m.product,
      m.branch,
      m.qty,
      m.balance,
      m.note || "-"
    ]);
    const summaryRows=[
      ["", "", "", "", "", "", ""],
      ["Report:", "Single Product Stock Movement Ledger", "", "", "", "", ""],
      ["Product:", `${selectedProductObj.name} (${selectedProductObj.id})`, "", "", "", "", ""],
      ["Period:", `${ledgerFrom} to ${ledgerTo}`, "Branch:", ledgerBranch, "", "", ""],
      ["Opening Stock:", ledgerData.openingStock, "Total IN:", ledgerData.totalIn, "Total OUT:", ledgerData.totalOut, "Closing Stock:", ledgerData.closingStock]
    ];
    downloadCSV(`movement-ledger-${selectedProductObj.id}.csv`, [...summaryRows, ["", "", "", "", "", "", ""], header, ...body]);
  }

  // ===================== REPORT 2 CALCULATIONS =====================
  const allPeriodMovements = useMemo(() => {
    const fromMs = new Date(`${allFrom}T00:00:00`).getTime();
    const toMs = new Date(`${allTo}T23:59:59.999`).getTime();

    return movements.filter(m => {
      const prod = products.find(p => p.id === m.productId || p.name === m.product);
      const isBranch = allBranch === "All" || (m.branch || "").toLowerCase() === allBranch.toLowerCase();
      const isCat = allCategory === "All" || (prod && prod.category === allCategory);
      const isBrand = allBrand === "All" || (prod && prod.brand === allBrand);
      const isType = allType === "All" || m.type === allType;
      const mTime = getMovementTime(m);
      return isBranch && isCat && isBrand && isType && mTime >= fromMs && mTime <= toMs;
    }).sort((a, b) => getMovementTime(b) - getMovementTime(a));
  }, [movements, products, allFrom, allTo, allBranch, allCategory, allBrand, allType]);

  const allProductsPeriodSummary = useMemo(() => {
    const fromMs = new Date(`${allFrom}T00:00:00`).getTime();
    const toMs = new Date(`${allTo}T23:59:59.999`).getTime();

    return products.filter(p => {
      const matchesCategory = allCategory === "All" || p.category === allCategory;
      const matchesBrand = allBrand === "All" || p.brand === allBrand;
      return matchesCategory && matchesBrand;
    }).map(p => {
      const opening = getProductStockAt(p, allBranch, fromMs - 1, movements);
      const pIn = movements.filter(m => (m.productId === p.id || m.product === p.name) && (allBranch === "All" || (m.branch || "").toLowerCase() === allBranch.toLowerCase()) && getMovementTime(m) >= fromMs && getMovementTime(m) <= toMs && m.type === "IN").reduce((s, m) => s + (Number(m.qty) || 0), 0);
      const pOut = movements.filter(m => (m.productId === p.id || m.product === p.name) && (allBranch === "All" || (m.branch || "").toLowerCase() === allBranch.toLowerCase()) && getMovementTime(m) >= fromMs && getMovementTime(m) <= toMs && m.type === "OUT").reduce((s, m) => s + (Number(m.qty) || 0), 0);
      const closing = opening + pIn - pOut;
      return {
        ...p,
        opening,
        in: pIn,
        out: pOut,
        netChange: pIn - pOut,
        closing
      };
    });
  }, [products, movements, allFrom, allTo, allBranch, allCategory, allBrand]);

  const totalAllIn = allPeriodMovements.filter(m => m.type === "IN").reduce((s, m) => s + (Number(m.qty) || 0), 0);
  const totalAllOut = allPeriodMovements.filter(m => m.type === "OUT").reduce((s, m) => s + (Number(m.qty) || 0), 0);

  function exportAllMovementsCSV(){
    if (allViewMode === "movements") {
      const header=["Date","Type","Product ID","Product","Branch","Quantity","Reference/Note"];
      const body=allPeriodMovements.map(m=>[
        m.date,
        m.type,
        m.productId || "-",
        m.product,
        m.branch,
        m.qty,
        m.note || "-"
      ]);
      downloadCSV(`all-stock-movements-${allFrom}-to-${allTo}.csv`, [header, ...body]);
    } else {
      const header=["Product ID","Product","Category","Brand","Unit","Opening Stock","Total IN","Total OUT","Net Change","Closing Stock","Valuation (₹)"];
      const body=allProductsPeriodSummary.map(p=>[
        p.id,
        p.name,
        p.category || "",
        p.brand || "",
        p.unit || "Nos",
        p.opening,
        p.in,
        p.out,
        p.netChange,
        p.closing,
        p.closing * (p.purchase || 0)
      ]);
      downloadCSV(`product-movement-summary-${allFrom}-to-${allTo}.csv`, [header, ...body]);
    }
  }

  // ===================== REPORT 3 CALCULATIONS =====================
  const lowStockRows = useMemo(() => {
    return products.map(p => {
      const currentStock = lowBranch === "All" ? (p.bangalore || 0) + (p.hosur || 0) : Number(p[lowBranch.toLowerCase()] || 0);
      const min = Number(p.min) || 5;
      const isOut = currentStock === 0;
      const isLow = currentStock <= min;
      const deficit = Math.max(0, min - currentStock);
      const reorderCost = deficit * (Number(p.purchase) || 0);
      const status = isOut ? "OUT" : isLow ? "LOW" : "OK";
      return {
        ...p,
        currentStock,
        min,
        isOut,
        isLow,
        deficit,
        reorderCost,
        status
      };
    }).filter(p => {
      const matchesCategory = lowCategory === "All" || p.category === lowCategory;
      if (!matchesCategory) return false;
      if (lowStatus === "out") return p.isOut;
      if (lowStatus === "low") return p.isLow && !p.isOut;
      return p.isLow; // default: all low & out of stock
    });
  }, [products, lowBranch, lowCategory, lowStatus]);

  const totalLowCount = lowStockRows.filter(p => !p.isOut).length;
  const totalOutCount = lowStockRows.filter(p => p.isOut).length;
  const totalReorderUnits = lowStockRows.reduce((s, p) => s + p.deficit, 0);
  const totalReorderCost = lowStockRows.reduce((s, p) => s + p.reorderCost, 0);

  function exportLowStockCSV(){
    const header=["Product ID","Product","Category","Brand","Unit","Bangalore Stock","Hosur Stock","Total Stock","Min Alert Level","Deficit Units","Purchase Price","Est. Reorder Cost","Status"];
    const body=lowStockRows.map(p=>[
      p.id,
      p.name,
      p.category || "",
      p.brand || "",
      p.unit || "Nos",
      p.bangalore || 0,
      p.hosur || 0,
      p.currentStock,
      p.min,
      p.deficit,
      p.purchase || 0,
      p.reorderCost,
      p.status
    ]);
    downloadCSV("low-stock-reorder-report.csv", [header, ...body]);
  }

  function quickReorder(p){
    setEditingMovement(null);
    setMovement({
      type: "IN",
      productId: p.id,
      branch: lowBranch === "Hosur" ? "Hosur" : "Bangalore",
      qty: p.deficit > 0 ? p.deficit : p.min || 1,
      note: "Restock order"
    });
    setShowMovement(true);
  }

  // ===================== REPORT 4 CALCULATIONS =====================
  const monthlyStatementData = useMemo(() => {
    const monthStart = new Date(yearVal, monthVal - 1, 1, 0, 0, 0, 0).getTime();
    const monthEnd = new Date(yearVal, monthVal, 0, 23, 59, 59, 999).getTime();

    const items = products.filter(p => {
      return monthCategory === "All" || p.category === monthCategory;
    }).map(p => {
      // 1st day of month stock (Opening)
      const openingQty = getProductStockAt(p, monthBranch, monthStart - 1, movements);
      // Month inward and outward movements
      const mIn = movements.filter(m => (m.productId === p.id || m.product === p.name) && (monthBranch === "All" || (m.branch || "").toLowerCase() === monthBranch.toLowerCase()) && getMovementTime(m) >= monthStart && getMovementTime(m) <= monthEnd && m.type === "IN").reduce((s, m) => s + (Number(m.qty) || 0), 0);
      const mOut = movements.filter(m => (m.productId === p.id || m.product === p.name) && (monthBranch === "All" || (m.branch || "").toLowerCase() === monthBranch.toLowerCase()) && getMovementTime(m) >= monthStart && getMovementTime(m) <= monthEnd && m.type === "OUT").reduce((s, m) => s + (Number(m.qty) || 0), 0);
      // Last day of month stock (Closing)
      const closingQty = openingQty + mIn - mOut;
      
      // Difference between last day and 1st day of month
      const qtyDiff = closingQty - openingQty; // Equivalent to (mIn - mOut)
      
      const purchasePrice = Number(p.purchase) || 0;
      const salePrice = Number(p.sale) || 0;
      
      // Valuation on 1st day and last day
      const openingValue = openingQty * purchasePrice;
      const closingValue = closingQty * purchasePrice;
      
      // Valuation difference between last day and 1st day (for P&L balance change)
      const valueDiff = closingValue - openingValue; // Equivalent to (qtyDiff * purchasePrice)
      
      const inflowCost = mIn * purchasePrice;
      const outflowCost = mOut * purchasePrice;
      const outflowRevenue = mOut * salePrice;
      const grossProfit = outflowRevenue - outflowCost;

      const bgClosing = getProductStockAt(p, "bangalore", monthEnd, movements);
      const hsClosing = getProductStockAt(p, "hosur", monthEnd, movements);

      let status = "No Change";
      if (qtyDiff > 0) status = "Increased";
      else if (qtyDiff < 0) status = "Decreased";

      return {
        ...p,
        openingQty,
        monthIn: mIn,
        monthOut: mOut,
        closingQty,
        qtyDiff,
        openingValue,
        closingValue,
        valueDiff,
        inflowCost,
        outflowCost,
        outflowRevenue,
        grossProfit,
        status,
        bgClosing,
        hsClosing
      };
    });

    const totalOpeningQty = items.reduce((s, p) => s + p.openingQty, 0);
    const totalClosingQty = items.reduce((s, p) => s + p.closingQty, 0);
    const totalQtyDiff = totalClosingQty - totalOpeningQty;

    const totalMonthIn = items.reduce((s, p) => s + p.monthIn, 0);
    const totalMonthOut = items.reduce((s, p) => s + p.monthOut, 0);

    const totalOpeningVal = items.reduce((s, p) => s + p.openingValue, 0);
    const totalClosingVal = items.reduce((s, p) => s + p.closingValue, 0);
    const totalValueDiff = totalClosingVal - totalOpeningVal;

    const totalInflowCost = items.reduce((s, p) => s + p.inflowCost, 0);
    const totalOutflowCost = items.reduce((s, p) => s + p.outflowCost, 0);
    const totalOutflowRevenue = items.reduce((s, p) => s + p.outflowRevenue, 0);
    const totalGrossProfit = items.reduce((s, p) => s + p.grossProfit, 0);

    const increasedCount = items.filter(p => p.qtyDiff > 0).length;
    const decreasedCount = items.filter(p => p.qtyDiff < 0).length;
    const unchangedCount = items.filter(p => p.qtyDiff === 0).length;

    return {
      items,
      totalOpeningQty,
      totalClosingQty,
      totalQtyDiff,
      totalMonthIn,
      totalMonthOut,
      totalOpeningVal,
      totalClosingVal,
      totalValueDiff,
      totalInflowCost,
      totalOutflowCost,
      totalOutflowRevenue,
      totalGrossProfit,
      increasedCount,
      decreasedCount,
      unchangedCount
    };
  }, [products, movements, monthVal, yearVal, monthBranch, monthCategory]);

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  function exportMonthlyStockCSV(){
    const d = monthlyStatementData;
    const header=[
      "Product ID",
      "Product",
      "Category",
      "Brand",
      "Unit",
      "Purchase Price (₹)",
      "Selling Price (₹)",
      "1st Day Stock (Units)",
      "1st Day Valuation (₹)",
      "Month IN (Units)",
      "Month OUT (Units)",
      "Last Day Stock (Units)",
      "Last Day Valuation (₹)",
      "Stock Difference (Qty)",
      "Valuation Difference (₹)",
      "Status",
      "Bangalore Closing",
      "Hosur Closing"
    ];
    const body=d.items.map(p=>[
      p.id,
      p.name,
      p.category || "",
      p.brand || "",
      p.unit || "Nos",
      p.purchase || 0,
      p.sale || 0,
      p.openingQty,
      p.openingValue,
      p.monthIn,
      p.monthOut,
      p.closingQty,
      p.closingValue,
      p.qtyDiff >= 0 ? `+${p.qtyDiff}` : `${p.qtyDiff}`,
      p.valueDiff >= 0 ? `+${p.valueDiff}` : `${p.valueDiff}`,
      p.status,
      p.bgClosing,
      p.hsClosing
    ]);
    const summaryRows=[
      ["MONTHLY STOCK COMPARISON REPORT (1ST DAY vs LAST DAY)", `${monthNames[monthVal - 1]} ${yearVal}`, "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["Branch Filter:", monthBranch, "Category Filter:", monthCategory, "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["--- STOCK COMPARISON SUMMARY ---", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["1st Day Total Stock (Units):", d.totalOpeningQty, "1st Day Total Valuation (₹):", d.totalOpeningVal, "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["Month Total Inward (+):", d.totalMonthIn, "Month Total Outward (-):", d.totalMonthOut, "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["Last Day Total Stock (Units):", d.totalClosingQty, "Last Day Total Valuation (₹):", d.totalClosingVal, "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["Total Stock Qty Difference:", d.totalQtyDiff >= 0 ? `+${d.totalQtyDiff}` : `${d.totalQtyDiff}`, "Total Valuation Difference (₹):", d.totalValueDiff >= 0 ? `+${d.totalValueDiff}` : `${d.totalValueDiff}`, "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["Items Increased:", d.increasedCount, "Items Decreased:", d.decreasedCount, "Items Unchanged:", d.unchangedCount, "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]
    ];
    downloadCSV(`monthly-stock-comparison-${monthNames[monthVal - 1]}-${yearVal}.csv`, [...summaryRows, header, ...body]);
  }

  return <div className="app">
    <header className="topbar">
      <div className="brand">
        <img 
          src="/logo.png" 
          alt="Hertz & Bytes Technologies" 
          className="brand-logo-img" 
          onError={(e)=>{ e.target.style.display='none'; const fb = document.getElementById('brand-text-fallback'); if(fb) fb.style.display='flex'; }}
        />
        <div id="brand-text-fallback" style={{display:"none", alignItems:"center", gap:"10px"}}>
          <div className="logo">H&B</div>
          <div><strong>Hertz & Bytes Technologies</strong><small>Inventory Management</small></div>
        </div>
      </div>

      <nav className="top-nav">
        <button className={`nav-tab ${currentTab==="inventory"?"active":""}`} onClick={()=>setCurrentTab("inventory")}>
          <Boxes size={16}/> Products & Stock
        </button>
        <button className={`nav-tab ${currentTab==="reports"?"active":""}`} onClick={()=>setCurrentTab("reports")}>
          <BarChart3 size={16}/> Reports & Analytics
        </button>
      </nav>

      <div className="top-actions">
        <button 
          className={`cloud-badge ${isCloudConnected ? "connected" : "disconnected"}`}
          onClick={()=>setShowCloudModal(true)}
          title={isCloudConnected ? "Supabase Cloud Database: Active" : "Local Storage Mode (Click to connect Cloud)"}
        >
          {isCloudConnected ? <Cloud size={14}/> : <CloudOff size={14}/>}
          {isCloudConnected ? "Cloud Sync Active" : "Local Storage (Connect Cloud)"}
        </button>
        <button className="ghost" onClick={()=>location.reload()}><RefreshCw size={16}/> Refresh</button>
        <button className="ghost" onClick={()=>openMaster("brands")}><Tags size={16}/> Manage Masters</button>
        <button className="primary" onClick={()=>{ setEditingMovement(null); setMovement({type:"IN", productId: products[0]?.id || "", branch:"Bangalore", qty:1, note:""}); setShowMovement(true); }}><ArrowDownToLine size={16}/> Stock Movement</button>
        <button className="primary" onClick={()=>{ setEditing(null); setForm(emptyForm()); setShowForm(true); }}><Plus size={16}/> Add Product</button>
      </div>
    </header>

    <main>
      {currentTab === "inventory" ? (
        <>
          <div className="page-title">
            <div><h1>Product / Inventory</h1><p>Manage products, branch stock, purchase price and selling price.</p></div>
            <div className="page-actions">
              <button className="ghost" onClick={exportInventoryCSV}><Download size={16}/> Export CSV</button>
            </div>
          </div>

          <section className="cards">
            <Metric icon={<Boxes/>} title="Total Products" value={products.length}/>
            <Metric icon={<Package/>} title="Total Units" value={totalUnits.toLocaleString("en-IN")}/>
            <Metric icon={<IndianRupee/>} title="Stock Value" value={`₹${stockValue.toLocaleString("en-IN")}`}/>
            <Metric icon={<AlertTriangle/>} title="Low / Out of Stock" value={`${lowStock} / ${outOfStock}`} warn={lowStock > 0}/>
          </section>

          <section className="panel">
            <div className="filters">
              <div className="search"><Search size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search product, brand, category or product ID..."/></div>
              <select value={category} onChange={e=>setCategory(e.target.value)}>{filterCategories.map(c=><option key={c}>{c}</option>)}</select>
              <select value={branch} onChange={e=>setBranch(e.target.value)}>
                <option>All</option><option>Bangalore</option><option>Hosur</option>
              </select>
            </div>

            <div className="table-wrap">
              <table>
                <thead><tr>
                  <th>Product</th><th>Category</th><th>Brand</th><th>Unit</th><th>Purchase</th><th>Selling</th>
                  <th>Bangalore</th><th>Hosur</th><th>Total</th><th>Status</th><th>Actions</th>
                </tr></thead>
                <tbody>
                  {rows.map(p=>{
                    const total=(p.bangalore || 0)+(p.hosur || 0);
                    const status=total===0?"OUT":total<=(p.min || 5)?"LOW":"OK";
                    return <tr key={p.id}>
                      <td><strong>{p.name}</strong><small>{p.id}</small></td>
                      <td><span className="tag">{p.category || "-"}</span></td>
                      <td>{p.brand || "-"}</td>
                      <td>{p.unit || "Nos"}</td>
                      <td>₹{Number(p.purchase || 0).toLocaleString("en-IN")}</td>
                      <td>₹{Number(p.sale || 0).toLocaleString("en-IN")}</td>
                      <td>{p.bangalore || 0}</td><td>{p.hosur || 0}</td><td><strong>{total}</strong></td>
                      <td><span className={`status ${status.toLowerCase()}`}>{status}</span></td>
                      <td className="actions">
                        <button onClick={()=>editProduct(p)} title="Edit Product"><Pencil size={16}/></button>
                        <button className="btn-delete" onClick={()=>deleteProduct(p)} title="Delete / Discontinue Product"><Trash2 size={16}/></button>
                      </td>
                    </tr>
                  })}
                </tbody>
              </table>
              {!rows.length && <div className="empty">No products found matching your search.</div>}
            </div>
          </section>

          <section className="panel movement-panel">
            <div className="panel-head">
              <div><h2>Recent Stock Movements</h2><p>Every stock-in and stock-out is recorded here.</p></div>
              <button className="ghost" onClick={() => { setCurrentTab("reports"); setReportType("all-movements"); }}>
                View All Movements <ArrowRight size={14}/>
              </button>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Product</th>
                    <th>Branch</th>
                    <th>Qty</th>
                    <th>Note</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.slice(0,10).map(m=>(
                    <tr key={m.id}>
                      <td>{m.date}</td>
                      <td><span className={`status ${m.type==="IN"?"ok":"out"}`}>{m.type}</span></td>
                      <td>{m.product}</td>
                      <td>{m.branch}</td>
                      <td>{m.qty}</td>
                      <td>{m.note||"-"}</td>
                      <td className="actions">
                        <button onClick={()=>editMovement(m)} title="Modify Movement"><Pencil size={16}/></button>
                        <button onClick={()=>deleteMovement(m)} title="Delete Movement"><Trash2 size={16}/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!movements.length && <div className="empty">No stock movements yet.</div>}
            </div>
          </section>
        </>
      ) : (
        /* ============================================================ */
        /* ======================= REPORTS VIEW ======================= */
        /* ============================================================ */
        <div className="reports-container">
          <div className="page-title">
            <div>
              <h1>Inventory Reports & Analytics</h1>
              <p>Filter, analyze, and export product movement ledgers, low stock alerts, and monthly opening/closing valuations.</p>
            </div>
            <div className="page-actions">
              <button className="ghost" onClick={() => window.print()}><Printer size={16}/> Print Report</button>
            </div>
          </div>

          <div className="report-nav">
            <button className={`report-pill ${reportType==="product-ledger"?"active":""}`} onClick={()=>setReportType("product-ledger")}>
              <FileText size={16}/> Product Movement Ledger
            </button>
            <button className={`report-pill ${reportType==="all-movements"?"active":""}`} onClick={()=>setReportType("all-movements")}>
              <Layers size={16}/> All Products Movement
            </button>
            <button className={`report-pill ${reportType==="low-stock"?"active":""}`} onClick={()=>setReportType("low-stock")}>
              <TrendingDown size={16}/> Low Stock & Reorder
            </button>
            <button className={`report-pill ${reportType==="monthly-statement"?"active":""}`} onClick={()=>setReportType("monthly-statement")}>
              <Calendar size={16}/> Monthly Stock Comparison (1st vs Last Day)
            </button>
          </div>

          {/* ---------------- 1. PRODUCT MOVEMENT LEDGER ---------------- */}
          {reportType === "product-ledger" && (
            <section className="panel">
              <div className="report-filter-bar">
                <div className="filter-item" style={{minWidth:"280px"}}>
                  <span>Select Product</span>
                  <select value={ledgerProduct} onChange={e=>setLedgerProduct(e.target.value)}>
                    {products.map(p=><option key={p.id} value={p.id}>{p.name} ({p.id})</option>)}
                  </select>
                </div>
                <div className="filter-item">
                  <span>From Date</span>
                  <input type="date" value={ledgerFrom} onChange={e=>setLedgerFrom(e.target.value)}/>
                </div>
                <div className="filter-item">
                  <span>To Date</span>
                  <input type="date" value={ledgerTo} onChange={e=>setLedgerTo(e.target.value)}/>
                </div>
                <div className="filter-item">
                  <span>Branch</span>
                  <select value={ledgerBranch} onChange={e=>setLedgerBranch(e.target.value)}>
                    <option>All</option><option>Bangalore</option><option>Hosur</option>
                  </select>
                </div>
                <div style={{marginLeft:"auto"}}>
                  <button className="primary" onClick={exportProductLedgerCSV}><Download size={16}/> Export Ledger CSV</button>
                </div>
              </div>

              <div style={{padding:"20px 20px 0"}}>
                <div className="cards cards-5">
                  <Metric icon={<Boxes/>} title="Opening Stock" value={ledgerData.openingStock}/>
                  <Metric icon={<ArrowDownToLine/>} title="Total Inflow (IN)" value={ledgerData.totalIn} />
                  <Metric icon={<TrendingDown/>} title="Total Outflow (OUT)" value={ledgerData.totalOut} />
                  <Metric 
                    icon={<BarChart3/>} 
                    title="Net Period Flow" 
                    value={`${ledgerData.totalIn - ledgerData.totalOut > 0 ? "+" : ""}${ledgerData.totalIn - ledgerData.totalOut}`}
                  />
                  <Metric icon={<Package/>} title="Closing Stock" value={ledgerData.closingStock}/>
                </div>
              </div>

              <div className="table-wrap" style={{marginTop:"10px"}}>
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Branch</th>
                      <th>Quantity</th>
                      <th>Running Balance</th>
                      <th>Reference / Note</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="table-highlight-row">
                      <td><em>Period Start ({ledgerFrom})</em></td>
                      <td><span className="tag">OPENING</span></td>
                      <td>{ledgerBranch}</td>
                      <td>-</td>
                      <td><strong>{ledgerData.openingStock}</strong></td>
                      <td><em>Opening balance before period</em></td>
                      <td>-</td>
                    </tr>
                    {ledgerData.items.map(m=>(
                      <tr key={m.id}>
                        <td>{m.date}</td>
                        <td><span className={m.type==="IN"?"badge-in":"badge-out"}>{m.type}</span></td>
                        <td>{m.branch}</td>
                        <td><strong>{m.type==="IN"?`+${m.qty}`:`-${m.qty}`}</strong></td>
                        <td><strong>{m.balance}</strong></td>
                        <td>{m.note || "-"}</td>
                        <td className="actions">
                          <button onClick={()=>editMovement(m)} title="Modify Movement"><Pencil size={16}/></button>
                          <button onClick={()=>deleteMovement(m)} title="Delete Movement"><Trash2 size={16}/></button>
                        </td>
                      </tr>
                    ))}
                    {!ledgerData.items.length && (
                      <tr>
                        <td colSpan={7} className="empty">No stock movements recorded for this product during the selected period.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ---------------- 2. ALL PRODUCTS MOVEMENT ---------------- */}
          {reportType === "all-movements" && (
            <section className="panel">
              <div className="report-filter-bar">
                <div className="filter-item">
                  <span>From Date</span>
                  <input type="date" value={allFrom} onChange={e=>setAllFrom(e.target.value)}/>
                </div>
                <div className="filter-item">
                  <span>To Date</span>
                  <input type="date" value={allTo} onChange={e=>setAllTo(e.target.value)}/>
                </div>
                <div className="filter-item">
                  <span>Branch</span>
                  <select value={allBranch} onChange={e=>setAllBranch(e.target.value)}>
                    <option>All</option><option>Bangalore</option><option>Hosur</option>
                  </select>
                </div>
                <div className="filter-item">
                  <span>Category</span>
                  <select value={allCategory} onChange={e=>setAllCategory(e.target.value)}>
                    {filterCategories.map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="filter-item">
                  <span>Brand</span>
                  <select value={allBrand} onChange={e=>setAllBrand(e.target.value)}>
                    {filterBrands.map(b=><option key={b}>{b}</option>)}
                  </select>
                </div>
                {allViewMode === "movements" && (
                  <div className="filter-item">
                    <span>Type</span>
                    <select value={allType} onChange={e=>setAllType(e.target.value)}>
                      <option>All</option><option>IN</option><option>OUT</option>
                    </select>
                  </div>
                )}
                <div className="view-switch" style={{marginLeft:"auto"}}>
                  <button className={allViewMode==="movements"?"active":""} onClick={()=>setAllViewMode("movements")}>
                    Detailed Movement Log
                  </button>
                  <button className={allViewMode==="summary"?"active":""} onClick={()=>setAllViewMode("summary")}>
                    Product-wise Summary
                  </button>
                </div>
                <button className="primary" onClick={exportAllMovementsCSV}><Download size={16}/> Export CSV</button>
              </div>

              <div style={{padding:"20px 20px 0"}}>
                <div className="cards">
                  <Metric icon={<Layers/>} title="Total Movements" value={allPeriodMovements.length}/>
                  <Metric icon={<ArrowDownToLine/>} title="Total Units IN" value={totalAllIn.toLocaleString("en-IN")}/>
                  <Metric icon={<TrendingDown/>} title="Total Units OUT" value={totalAllOut.toLocaleString("en-IN")}/>
                  <Metric 
                    icon={<BarChart3/>} 
                    title="Net Units Change" 
                    value={`${totalAllIn - totalAllOut > 0 ? "+" : ""}${(totalAllIn - totalAllOut).toLocaleString("en-IN")}`}
                  />
                </div>
              </div>

              <div className="table-wrap" style={{marginTop:"10px"}}>
                {allViewMode === "movements" ? (
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Product</th>
                        <th>Branch</th>
                        <th>Quantity</th>
                        <th>Reference / Note</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allPeriodMovements.map(m=>(
                        <tr key={m.id}>
                          <td>{m.date}</td>
                          <td><span className={m.type==="IN"?"badge-in":"badge-out"}>{m.type}</span></td>
                          <td><strong>{m.product}</strong><small>{m.productId || "-"}</small></td>
                          <td>{m.branch}</td>
                          <td><strong>{m.qty}</strong></td>
                          <td>{m.note || "-"}</td>
                          <td className="actions">
                            <button onClick={()=>editMovement(m)} title="Modify Movement"><Pencil size={16}/></button>
                            <button onClick={()=>deleteMovement(m)} title="Delete Movement"><Trash2 size={16}/></button>
                          </td>
                        </tr>
                      ))}
                      {!allPeriodMovements.length && (
                        <tr><td colSpan={7} className="empty">No stock movements found matching the selected filters.</td></tr>
                      )}
                    </tbody>
                  </table>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Category</th>
                        <th>Brand</th>
                        <th>Unit</th>
                        <th>Period Opening</th>
                        <th>Total IN</th>
                        <th>Total OUT</th>
                        <th>Net Flow</th>
                        <th>Period Closing</th>
                        <th>Stock Valuation (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allProductsPeriodSummary.map(p=>(
                        <tr key={p.id}>
                          <td><strong>{p.name}</strong><small>{p.id}</small></td>
                          <td><span className="tag">{p.category}</span></td>
                          <td>{p.brand}</td>
                          <td>{p.unit}</td>
                          <td>{p.opening}</td>
                          <td><span className="badge-in">+{p.in}</span></td>
                          <td><span className="badge-out">-{p.out}</span></td>
                          <td><strong>{p.netChange > 0 ? `+${p.netChange}` : p.netChange}</strong></td>
                          <td><strong>{p.closing}</strong></td>
                          <td>₹{(p.closing * (p.purchase || 0)).toLocaleString("en-IN")}</td>
                        </tr>
                      ))}
                      {!allProductsPeriodSummary.length && (
                        <tr><td colSpan={10} className="empty">No products found.</td></tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          )}

          {/* ---------------- 3. LOW STOCK & REORDER REPORT ---------------- */}
          {reportType === "low-stock" && (
            <section className="panel">
              <div className="report-filter-bar">
                <div className="filter-item">
                  <span>Branch Filter</span>
                  <select value={lowBranch} onChange={e=>setLowBranch(e.target.value)}>
                    <option>All</option><option>Bangalore</option><option>Hosur</option>
                  </select>
                </div>
                <div className="filter-item">
                  <span>Category</span>
                  <select value={lowCategory} onChange={e=>setLowCategory(e.target.value)}>
                    {filterCategories.map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="filter-item">
                  <span>Stock Status</span>
                  <select value={lowStatus} onChange={e=>setLowStatus(e.target.value)}>
                    <option value="all">All Low & Out of Stock</option>
                    <option value="out">Out of Stock Only</option>
                    <option value="low">Low Stock Only</option>
                  </select>
                </div>
                <div style={{marginLeft:"auto"}}>
                  <button className="primary" onClick={exportLowStockCSV}><Download size={16}/> Export Low Stock CSV</button>
                </div>
              </div>

              <div style={{padding:"20px 20px 0"}}>
                <div className="cards">
                  <Metric icon={<AlertTriangle/>} title="Low Stock Items" value={totalLowCount} warn={totalLowCount > 0}/>
                  <Metric icon={<TrendingDown/>} title="Out of Stock Items" value={totalOutCount} warn={totalOutCount > 0}/>
                  <Metric icon={<Package/>} title="Total Units Needed" value={totalReorderUnits.toLocaleString("en-IN")}/>
                  <Metric icon={<IndianRupee/>} title="Est. Reorder Cost" value={`₹${totalReorderCost.toLocaleString("en-IN")}`}/>
                </div>
              </div>

              <div className="table-wrap" style={{marginTop:"10px"}}>
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Category</th>
                      <th>Brand</th>
                      <th>Bangalore</th>
                      <th>Hosur</th>
                      <th>Current Stock</th>
                      <th>Min Alert</th>
                      <th>Deficit (Units Needed)</th>
                      <th>Purchase Price</th>
                      <th>Est. Reorder Cost</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStockRows.map(p=>(
                      <tr key={p.id}>
                        <td><strong>{p.name}</strong><small>{p.id}</small></td>
                        <td><span className="tag">{p.category}</span></td>
                        <td>{p.brand}</td>
                        <td>{p.bangalore || 0}</td>
                        <td>{p.hosur || 0}</td>
                        <td><strong>{p.currentStock} {p.unit}</strong></td>
                        <td>{p.min} {p.unit}</td>
                        <td><strong style={{color:"#dc2626"}}>+{p.deficit} {p.unit}</strong></td>
                        <td>₹{Number(p.purchase || 0).toLocaleString("en-IN")}</td>
                        <td>₹{Number(p.reorderCost || 0).toLocaleString("en-IN")}</td>
                        <td><span className={`status ${p.status.toLowerCase()}`}>{p.status}</span></td>
                        <td>
                          <button className="quick-btn" onClick={()=>quickReorder(p)}>
                            <Plus size={12}/> Restock
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!lowStockRows.length && (
                      <tr>
                        <td colSpan={12} className="empty" style={{color:"#16703a"}}>
                          <CheckCircle2 size={32} style={{marginBottom:"8px",display:"inline-block"}}/><br/>
                          All product inventory levels are healthy! No low stock or out-of-stock items found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ---------------- 4. MONTHLY 1ST DAY vs LAST DAY STOCK COMPARISON ---------------- */}
          {reportType === "monthly-statement" && (
            <section className="panel">
              <div className="report-filter-bar">
                <div className="filter-item">
                  <span>Month</span>
                  <select value={monthVal} onChange={e=>setMonthVal(Number(e.target.value))}>
                    {monthNames.map((m, idx)=><option key={m} value={idx + 1}>{m}</option>)}
                  </select>
                </div>
                <div className="filter-item">
                  <span>Year</span>
                  <select value={yearVal} onChange={e=>setYearVal(Number(e.target.value))}>
                    {[2024, 2025, 2026, 2027, 2028].map(y=><option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div className="filter-item">
                  <span>Branch</span>
                  <select value={monthBranch} onChange={e=>setMonthBranch(e.target.value)}>
                    <option>All</option><option>Bangalore</option><option>Hosur</option>
                  </select>
                </div>
                <div className="filter-item">
                  <span>Category</span>
                  <select value={monthCategory} onChange={e=>setMonthCategory(e.target.value)}>
                    {filterCategories.map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{marginLeft:"auto"}}>
                  <button className="primary" onClick={exportMonthlyStockCSV}>
                    <Download size={16}/> Export Comparison CSV
                  </button>
                </div>
              </div>

              {/* Top 5 Comparison Overview Cards */}
              <div style={{padding:"20px 20px 0"}}>
                <div className="cards cards-5">
                  <Metric 
                    icon={<Boxes/>} 
                    title={`1st Day Stock (1st ${monthNames[monthVal - 1]})`} 
                    value={`${monthlyStatementData.totalOpeningQty.toLocaleString("en-IN")} Units`}
                  />
                  <Metric 
                    icon={<ArrowDownToLine/>} 
                    title="Month Inward (+)" 
                    value={`+${monthlyStatementData.totalMonthIn.toLocaleString("en-IN")}`}
                  />
                  <Metric 
                    icon={<TrendingDown/>} 
                    title="Month Outward (-)" 
                    value={`-${monthlyStatementData.totalMonthOut.toLocaleString("en-IN")}`}
                  />
                  <Metric 
                    icon={<Package/>} 
                    title={`Last Day Stock (End of ${monthNames[monthVal - 1]})`} 
                    value={`${monthlyStatementData.totalClosingQty.toLocaleString("en-IN")} Units`}
                  />
                  <Metric 
                    icon={<IndianRupee/>} 
                    title="Net Quantity Difference" 
                    value={`${monthlyStatementData.totalQtyDiff >= 0 ? "+" : ""}${monthlyStatementData.totalQtyDiff.toLocaleString("en-IN")} Units`}
                  />
                </div>
              </div>

              {/* 1st Day vs Last Day Comparison Summary Banner */}
              <div className="pnl-container">
                <div className="pnl-head">
                  <h3>
                    <BarChart3 size={16}/> 
                    Monthly Stock Comparison (1st Day vs Last Day) — {monthNames[monthVal - 1]} {yearVal}
                  </h3>
                </div>
                <div className="pnl-grid">
                  <div className="pnl-card">
                    <small>1st Day Total Stock (1st {monthNames[monthVal - 1]})</small>
                    <strong>{monthlyStatementData.totalOpeningQty.toLocaleString("en-IN")} Units</strong>
                    <div style={{fontSize:"11px",color:"#64748b",marginTop:"2px"}}>
                      Valuation: ₹{monthlyStatementData.totalOpeningVal.toLocaleString("en-IN")}
                    </div>
                  </div>
                  <div className="pnl-card">
                    <small>Last Day Total Stock (Last Day of {monthNames[monthVal - 1]})</small>
                    <strong>{monthlyStatementData.totalClosingQty.toLocaleString("en-IN")} Units</strong>
                    <div style={{fontSize:"11px",color:"#64748b",marginTop:"2px"}}>
                      Valuation: ₹{monthlyStatementData.totalClosingVal.toLocaleString("en-IN")}
                    </div>
                  </div>
                  <div className={`pnl-card ${monthlyStatementData.totalQtyDiff > 0 ? "profit" : monthlyStatementData.totalQtyDiff < 0 ? "delta-neg" : ""}`}>
                    <small>Overall Quantity Difference (Last vs 1st Day)</small>
                    <strong>
                      {monthlyStatementData.totalQtyDiff > 0 ? "+" : ""}{monthlyStatementData.totalQtyDiff.toLocaleString("en-IN")} Units
                    </strong>
                    <div style={{fontSize:"11px",fontWeight:600,marginTop:"2px",color:monthlyStatementData.totalQtyDiff >= 0 ? "#15803d" : "#b91c1c"}}>
                      {monthlyStatementData.totalQtyDiff > 0 ? "Net Stock Increase" : monthlyStatementData.totalQtyDiff < 0 ? "Net Stock Reduction" : "No Net Change"}
                    </div>
                  </div>
                  <div className={`pnl-card ${monthlyStatementData.totalValueDiff >= 0 ? "profit" : "delta-neg"}`}>
                    <small>Total Valuation Difference (for P&L)</small>
                    <strong>
                      {monthlyStatementData.totalValueDiff >= 0 ? "+" : ""}₹{monthlyStatementData.totalValueDiff.toLocaleString("en-IN")}
                    </strong>
                    <div style={{fontSize:"11px",color:"#64748b",marginTop:"2px"}}>
                      {monthlyStatementData.totalValueDiff >= 0 ? "Inventory Value Grew" : "Inventory Value Consumed"}
                    </div>
                  </div>
                  <div className="pnl-card">
                    <small>Product Count Summary</small>
                    <div style={{fontSize:"12px",display:"flex",flexDirection:"column",gap:"2px",marginTop:"2px"}}>
                      <span style={{color:"#15803d",fontWeight:600}}>📈 {monthlyStatementData.increasedCount} Items Increased</span>
                      <span style={{color:"#b91c1c",fontWeight:600}}>📉 {monthlyStatementData.decreasedCount} Items Decreased</span>
                      <span style={{color:"#64748b"}}>➖ {monthlyStatementData.unchangedCount} Items Unchanged</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Product-by-Product Comparison Table */}
              <div className="table-wrap" style={{marginTop:"10px"}}>
                <table>
                  <thead>
                    <tr>
                      <th colSpan={5} style={{textAlign:"center",background:"#f1f5f9",borderBottom:"1px solid #cbd5e1"}}>PRODUCT DETAILS</th>
                      <th colSpan={2} style={{textAlign:"center",background:"#e0f2fe",borderBottom:"1px solid #93c5fd",color:"#0369a1"}}>1ST DAY OF MONTH (OPENING)</th>
                      <th colSpan={2} style={{textAlign:"center",background:"#f8fafc",borderBottom:"1px solid #cbd5e1"}}>MONTH MOVEMENTS</th>
                      <th colSpan={2} style={{textAlign:"center",background:"#f0fdf4",borderBottom:"1px solid #86efac",color:"#15803d"}}>LAST DAY OF MONTH (CLOSING)</th>
                      <th colSpan={3} style={{textAlign:"center",background:"#fef3c7",borderBottom:"1px solid #fcd34d",color:"#92400e"}}>DIFFERENCE (LAST DAY vs 1ST DAY)</th>
                      <th colSpan={2} style={{textAlign:"center",background:"#f1f5f9",borderBottom:"1px solid #cbd5e1"}}>BRANCH CLOSING</th>
                    </tr>
                    <tr>
                      <th>Product</th>
                      <th>Category</th>
                      <th>Brand</th>
                      <th>Unit</th>
                      <th>Cost (₹)</th>
                      
                      {/* 1st Day */}
                      <th className="th-group-start">1st Day Qty</th>
                      <th>1st Day Value (₹)</th>
                      
                      {/* Month Movements */}
                      <th className="th-group-start">Inward (+)</th>
                      <th>Outward (-)</th>
                      
                      {/* Last Day */}
                      <th className="th-group-start">Last Day Qty</th>
                      <th>Last Day Value (₹)</th>
                      
                      {/* Difference */}
                      <th className="th-group-start th-diff-header">Qty Diff</th>
                      <th className="th-diff-header">Value Diff (₹)</th>
                      <th className="th-diff-header">Status</th>
                      
                      {/* Branch Closing */}
                      <th className="th-group-start">Bangalore</th>
                      <th>Hosur</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyStatementData.items.map(p=>(
                      <tr key={p.id}>
                        <td><strong>{p.name}</strong><small>{p.id}</small></td>
                        <td><span className="tag">{p.category}</span></td>
                        <td>{p.brand}</td>
                        <td>{p.unit}</td>
                        <td>₹{Number(p.purchase || 0).toLocaleString("en-IN")}</td>
                        
                        {/* 1st Day */}
                        <td className="td-group-start"><strong>{p.openingQty}</strong></td>
                        <td>₹{p.openingValue.toLocaleString("en-IN")}</td>
                        
                        {/* Movements */}
                        <td className="td-group-start"><span className="badge-in">+{p.monthIn}</span></td>
                        <td><span className="badge-out">-{p.monthOut}</span></td>
                        
                        {/* Last Day */}
                        <td className="td-group-start"><strong>{p.closingQty}</strong></td>
                        <td><strong>₹{p.closingValue.toLocaleString("en-IN")}</strong></td>
                        
                        {/* Difference */}
                        <td className="td-group-start">
                          {p.qtyDiff > 0 ? (
                            <span className="badge-diff-pos">+{p.qtyDiff}</span>
                          ) : p.qtyDiff < 0 ? (
                            <span className="badge-diff-neg">{p.qtyDiff}</span>
                          ) : (
                            <span className="badge-diff-zero">0</span>
                          )}
                        </td>
                        <td style={{fontWeight:700,color:p.valueDiff > 0 ? "#15803d" : p.valueDiff < 0 ? "#b91c1c" : "#64748b"}}>
                          {p.valueDiff > 0 ? "+" : ""}₹{p.valueDiff.toLocaleString("en-IN")}
                        </td>
                        <td>
                          {p.qtyDiff > 0 ? (
                            <span style={{color:"#15803d",fontWeight:600}}>📈 Increased</span>
                          ) : p.qtyDiff < 0 ? (
                            <span style={{color:"#b91c1c",fontWeight:600}}>📉 Decreased</span>
                          ) : (
                            <span style={{color:"#64748b"}}>➖ No Change</span>
                          )}
                        </td>
                        
                        {/* Branch Closing */}
                        <td className="td-group-start">{p.bgClosing}</td>
                        <td>{p.hsClosing}</td>
                      </tr>
                    ))}
                    {!monthlyStatementData.items.length && (
                      <tr><td colSpan={16} className="empty">No products found for this comparison statement.</td></tr>
                    )}
                  </tbody>
                  {monthlyStatementData.items.length > 0 && (
                    <tfoot>
                      <tr>
                        <td colSpan={5}><strong>TOTALS ACROSS ALL PRODUCTS</strong></td>
                        <td className="td-group-start"><strong>{monthlyStatementData.totalOpeningQty}</strong></td>
                        <td><strong>₹{monthlyStatementData.totalOpeningVal.toLocaleString("en-IN")}</strong></td>
                        <td className="td-group-start"><strong>+{monthlyStatementData.totalMonthIn}</strong></td>
                        <td><strong>-{monthlyStatementData.totalMonthOut}</strong></td>
                        <td className="td-group-start"><strong>{monthlyStatementData.totalClosingQty}</strong></td>
                        <td><strong>₹{monthlyStatementData.totalClosingVal.toLocaleString("en-IN")}</strong></td>
                        <td className="td-group-start">
                          <strong>
                            {monthlyStatementData.totalQtyDiff >= 0 ? "+" : ""}{monthlyStatementData.totalQtyDiff}
                          </strong>
                        </td>
                        <td style={{color:monthlyStatementData.totalValueDiff >= 0 ? "#15803d" : "#b91c1c"}}>
                          <strong>
                            {monthlyStatementData.totalValueDiff >= 0 ? "+" : ""}₹{monthlyStatementData.totalValueDiff.toLocaleString("en-IN")}
                          </strong>
                        </td>
                        <td>
                          <strong>
                            {monthlyStatementData.totalQtyDiff > 0 ? "📈 Net Inflow" : monthlyStatementData.totalQtyDiff < 0 ? "📉 Net Outflow" : "➖ Balanced"}
                          </strong>
                        </td>
                        <td colSpan={2} className="td-group-start"></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </section>
          )}
        </div>
      )}
    </main>

    {showForm && <Modal title={editing?"Edit Product":"Add Product"} close={closeForm}>
      <form onSubmit={saveProduct} className="form">
        <div className="grid2">
          <Field label="Product Name">
            <input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="e.g. Dell MS116 USB Mouse"/>
          </Field>

          <Field label={
            <div className="field-header">
              <span>Brand</span>
              <button type="button" className="link-btn" onClick={()=>openMaster("brands")}>+ Add Brand</button>
            </div>
          }>
            <select required value={form.brand} onChange={e=>setForm({...form,brand:e.target.value})}>
              <option value="">Select Brand</option>
              {brands.map(b=><option key={b} value={b}>{b}</option>)}
            </select>
          </Field>

          <Field label={
            <div className="field-header">
              <span>Category</span>
              <button type="button" className="link-btn" onClick={()=>openMaster("categories")}>+ Add Category</button>
            </div>
          }>
            <select required value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>
              <option value="">Select Category</option>
              {categories.map(c=><option key={c}>{c}</option>)}
            </select>
          </Field>

          <Field label={
            <div className="field-header">
              <span>Unit</span>
              <button type="button" className="link-btn" onClick={()=>openMaster("units")}>+ Add Unit</button>
            </div>
          }>
            <select required value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})}>
              <option value="">Select Unit</option>
              {units.map(u=><option key={u} value={u}>{u}</option>)}
            </select>
          </Field>

          <Field label="Purchase Price (₹)">
            <input type="number" min="0" value={form.purchase} onChange={e=>setForm({...form,purchase:e.target.value})}/>
          </Field>

          <Field label="Selling Price (₹)">
            <input type="number" min="0" value={form.sale} onChange={e=>setForm({...form,sale:e.target.value})}/>
          </Field>

          <Field label="Minimum Stock Alert">
            <input type="number" min="0" value={form.min} onChange={e=>setForm({...form,min:e.target.value})}/>
          </Field>

          <Field label="Bangalore Stock">
            <input type="number" min="0" value={form.bangalore} onChange={e=>setForm({...form,bangalore:e.target.value})}/>
          </Field>

          <Field label="Hosur Stock">
            <input type="number" min="0" value={form.hosur} onChange={e=>setForm({...form,hosur:e.target.value})}/>
          </Field>
        </div>
        <div className="modal-actions" style={{justifyContent: editing ? "space-between" : "flex-end", alignItems: "center"}}>
          {editing && (
            <button 
              type="button" 
              className="danger-btn" 
              onClick={()=>deleteProduct(editing)}
              title="Delete or discontinue this product"
            >
              <Trash2 size={15}/> Delete Product
            </button>
          )}
          <div style={{display:"flex", gap:"8px"}}>
            <button type="button" className="ghost" onClick={closeForm}>Cancel</button>
            <button className="primary">{editing?"Update Product":"Save Product"}</button>
          </div>
        </div>
      </form>
    </Modal>}

    {showMasterModal && <Modal title={`Manage ${masterTab === "brands" ? "Brands" : masterTab === "categories" ? "Categories" : "Units"}`} close={()=>setShowMasterModal(false)}>
      <div className="form">
        <div className="seg">
          <button type="button" className={masterTab==="brands"?"active":""} onClick={()=>{setMasterTab("brands");setNewMasterInput("");}}>Brands ({brands.length})</button>
          <button type="button" className={masterTab==="categories"?"active":""} onClick={()=>{setMasterTab("categories");setNewMasterInput("");}}>Categories ({categories.length})</button>
          <button type="button" className={masterTab==="units"?"active":""} onClick={()=>{setMasterTab("units");setNewMasterInput("");}}>Units ({units.length})</button>
        </div>

        <form onSubmit={addMasterItem} className="add-inline-row">
          <input 
            required
            value={newMasterInput}
            onChange={e=>setNewMasterInput(e.target.value)}
            placeholder={`Enter new ${masterTab==="brands"?"brand name":masterTab==="categories"?"category name":"unit (e.g. Nos, Pcs)"}...`}
          />
          <button className="primary" type="submit">
            <Plus size={16}/> Add {masterTab==="brands"?"Brand":masterTab==="categories"?"Category":"Unit"}
          </button>
        </form>

        <div style={{marginTop:"16px"}}>
          <span style={{fontSize:"12px",fontWeight:"600",color:"#4b5565",display:"block",marginBottom:"8px"}}>
            Existing {masterTab==="brands"?"Brands":masterTab==="categories"?"Categories":"Units"}
          </span>
          <div className="chip-grid">
            {(masterTab==="brands"?brands:masterTab==="categories"?categories:units).map(item=>(
              <div key={item} className="chip">
                <span>{item}</span>
                <button type="button" onClick={()=>deleteMasterItem(item)} title="Delete item">
                  <X size={14}/>
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-actions" style={{marginTop:"20px"}}>
          <button type="button" className="primary" onClick={()=>setShowMasterModal(false)}>Done</button>
        </div>
      </div>
    </Modal>}

    {showMovement && <Modal title={editingMovement ? "Modify Stock Movement" : "Stock In / Stock Out"} close={closeMovementModal}>
      <form onSubmit={saveMovement} className="form">
        <div className="seg">
          <button type="button" className={movement.type==="IN"?"active":""} onClick={()=>setMovement({...movement,type:"IN"})}>
            Stock In
          </button>
          <button type="button" className={movement.type==="OUT"?"active":""} onClick={()=>setMovement({...movement,type:"OUT"})}>
            Stock Out
          </button>
        </div>

        <Field label="Product">
          <SearchableProductSelect
            products={products}
            value={movement.productId}
            branch={movement.branch}
            movementType={movement.type}
            onChange={prodId => setMovement({ ...movement, productId: prodId })}
          />
        </Field>

        {activeMovementProduct && (
          <div className="stock-info-strip">
            <span className="stock-title">Available Inventory:</span>
            <div className="stock-pills">
              <span className={`stock-pill ${movement.branch==="Bangalore"?"active-branch":""}`}>
                Bangalore: {activeMovementProduct.bangalore || 0} {activeMovementProduct.unit || "Nos"}
              </span>
              <span className={`stock-pill ${movement.branch==="Hosur"?"active-branch":""}`}>
                Hosur: {activeMovementProduct.hosur || 0} {activeMovementProduct.unit || "Nos"}
              </span>
              <span className="stock-pill">
                Total: {(activeMovementProduct.bangalore || 0) + (activeMovementProduct.hosur || 0)} {activeMovementProduct.unit || "Nos"}
              </span>
            </div>
          </div>
        )}

        {isOutwardExceeding && (
          <div className="stock-alert-box">
            <AlertTriangle size={18} style={{flexShrink:0}}/>
            <div>
              <strong>Exceeds Available Stock!</strong>
              <div>
                You entered <strong>{movement.qty}</strong> units, but only <strong>{activeBranchStock.availableForOut} {activeMovementProduct?.unit || "Nos"}</strong> are available in {movement.branch}.
              </div>
            </div>
            {activeBranchStock.availableForOut > 0 && (
              <button type="button" onClick={()=>setMovement({...movement, qty: activeBranchStock.availableForOut})}>
                Set to Max ({activeBranchStock.availableForOut})
              </button>
            )}
          </div>
        )}

        <div className="grid2">
          <Field label="Branch">
            <select value={movement.branch} onChange={e=>setMovement({...movement,branch:e.target.value})}>
              <option>Bangalore</option>
              <option>Hosur</option>
            </select>
          </Field>

          <Field label={
            <div className="field-header">
              <span>Quantity</span>
              {movement.type === "OUT" && (
                <span className={`available-badge ${activeBranchStock.availableForOut === 0 ? "zero" : activeBranchStock.availableForOut <= (activeMovementProduct?.min || 5) ? "low" : ""}`}>
                  Available in {movement.branch}: {activeBranchStock.availableForOut} {activeMovementProduct?.unit || "Nos"}
                </span>
              )}
            </div>
          }>
            <input 
              type="number" 
              min="1" 
              required 
              className={isOutwardExceeding ? "input-error" : ""}
              value={movement.qty} 
              onChange={e=>setMovement({...movement,qty:e.target.value})}
              placeholder="Enter quantity"
            />
          </Field>
        </div>

        <Field label="Reference / Note">
          <input value={movement.note} onChange={e=>setMovement({...movement,note:e.target.value})} placeholder="Purchase invoice, sales invoice, transfer etc."/>
        </Field>

        <div className="modal-actions">
          <button type="button" className="ghost" onClick={closeMovementModal}>Cancel</button>
          <button className="primary" disabled={movement.type === "OUT" && activeBranchStock.availableForOut === 0}>
            {editingMovement ? "Update Movement" : "Save Movement"}
          </button>
        </div>
      </form>
    </Modal>}

    {showCloudModal && (
      <Modal title="Supabase Cloud Database Settings" close={()=>setShowCloudModal(false)}>
        <div className="form">
          <div className="cloud-setup-box">
            <h4><Database size={16}/> Permanent Cloud Storage</h4>
            <p>
              Connect to <strong>Supabase (PostgreSQL)</strong> to store all products, movements, and masters in the cloud so your inventory syncs in real-time and remains permanently stored online.
            </p>
            <div style={{display:"flex", gap:"12px", alignItems:"center", flexWrap:"wrap"}}>
              <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="cloud-sql-link">
                Open Supabase Dashboard <ArrowUpRight size={13}/>
              </a>
              <span style={{fontSize:"11px", color:"#94a3b8"}}>•</span>
              <span style={{fontSize:"12px", color:"#64748b"}}>
                Tip: Run the included <code>supabase-schema.sql</code> script in Supabase SQL Editor once to set up all tables.
              </span>
            </div>
          </div>

          {cloudSyncMsg && (
            <div className={`cloud-status-banner ${cloudSyncMsg.startsWith("✅") ? "success" : cloudSyncMsg.startsWith("⚠️") ? "warning" : "error"}`}>
              {cloudSyncMsg}
            </div>
          )}

          <Field label="Supabase Project URL">
            <input 
              value={cloudUrl} 
              onChange={e=>setCloudUrl(e.target.value)} 
              placeholder="https://xyzproject.supabase.co"
            />
          </Field>

          <Field label="Supabase Anon / Public API Key">
            <input 
              type="password"
              value={cloudKey} 
              onChange={e=>setCloudKey(e.target.value)} 
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            />
          </Field>

          <div style={{display:"flex", gap:"10px", marginTop:"14px", flexWrap:"wrap", alignItems:"center"}}>
            <button 
              type="button" 
              className="primary"
              onClick={handleSaveCloudCredentials}
            >
              <CheckCircle2 size={16}/> Save & Connect Database
            </button>
            <button 
              type="button" 
              className="ghost"
              disabled={!isCloudConnected || cloudSyncing}
              onClick={handleSyncAllToCloud}
              title="Upload current local inventory and movement history into Supabase Cloud"
            >
              <UploadCloud size={16}/> {cloudSyncing ? "Syncing..." : "Sync Local Data to Cloud"}
            </button>
            {isCloudConnected && (
              <button 
                type="button" 
                className="danger-btn"
                onClick={handleDisconnectCloud}
              >
                Disconnect Cloud
              </button>
            )}
          </div>
        </div>
      </Modal>
    )}
  </div>
}

function SearchableProductSelect({ products, value, onChange, branch, movementType, placeholder = "Type to search product name, ID, brand or category..." }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = React.useRef(null);
  const inputRef = React.useRef(null);

  const selectedProduct = useMemo(() => {
    return products.find(p => p.id === value) || null;
  }, [products, value]);

  useEffect(() => {
    if (selectedProduct) {
      setQuery(`${selectedProduct.name} (${selectedProduct.id})`);
    } else {
      setQuery("");
    }
  }, [selectedProduct]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        if (selectedProduct) {
          setQuery(`${selectedProduct.name} (${selectedProduct.id})`);
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedProduct]);

  const filteredProducts = useMemo(() => {
    if (!query) return products;
    const q = query.toLowerCase().trim();
    if (selectedProduct && query === `${selectedProduct.name} (${selectedProduct.id})`) {
      return products;
    }
    return products.filter(p => {
      const full = `${p.name} ${p.id} ${p.brand || ""} ${p.category || ""}`.toLowerCase();
      return full.includes(q);
    });
  }, [products, query, selectedProduct]);

  function handleSelect(p) {
    onChange(p.id);
    setQuery(`${p.name} (${p.id})`);
    setOpen(false);
    if (inputRef.current) {
      inputRef.current.blur();
    }
  }

  function handleClear(e) {
    e.stopPropagation();
    e.preventDefault();
    onChange("");
    setQuery("");
    setOpen(true);
    inputRef.current?.focus();
  }

  return (
    <div className="combobox" ref={containerRef}>
      <div className="combobox-input-wrap">
        <Search size={16} className="combobox-icon" />
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onChange={e => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={e => {
            if (e.key === "Escape") {
              setOpen(false);
              inputRef.current?.blur();
            } else if (e.key === "Enter" && filteredProducts.length > 0 && open) {
              e.preventDefault();
              handleSelect(filteredProducts[0]);
            }
          }}
        />
        {query ? (
          <button type="button" className="combobox-clear" onMouseDown={handleClear} title="Clear search">
            <X size={14} />
          </button>
        ) : null}
      </div>

      {open && (
        <div className="combobox-menu">
          {filteredProducts.map(p => {
            const bKey = (branch || "Bangalore").toLowerCase();
            const branchStock = Number(p[bKey] || 0);
            const isSelected = p.id === value;

            return (
              <div
                key={p.id}
                className={`combobox-item ${isSelected ? "selected" : ""}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelect(p);
                }}
              >
                <div className="combobox-item-info">
                  <span className="combobox-item-name">{p.name}</span>
                  <span className="combobox-item-meta">
                    <strong>{p.id}</strong>
                    {p.brand && <span>• {p.brand}</span>}
                    {p.category && <span>• {p.category}</span>}
                  </span>
                </div>
                <div>
                  <span
                    className={`combobox-stock-badge ${
                      branchStock === 0 ? "out" : branchStock <= (p.min || 5) ? "low" : ""
                    }`}
                  >
                    {branch || "Bangalore"}: {branchStock} {p.unit || "Nos"}
                  </span>
                </div>
              </div>
            );
          })}
          {!filteredProducts.length && (
            <div className="combobox-empty">
              No products found matching "{query}".
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function emptyForm(){return {name:"",brand:"",category:"",unit:"Nos",purchase:0,sale:0,min:5,bangalore:0,hosur:0}}
function Metric({icon,title,value,warn}){return <div className="metric"><div className="metric-icon">{icon}</div><div><small>{title}</small><strong className={warn?"warn":""}>{value}</strong></div></div>}
function Field({label,children}){return <label className="field"><span>{label}</span>{children}</label>}
function Modal({title,close,children}){return <div className="overlay"><div className="modal"><div className="modal-head"><h2>{title}</h2><button onClick={close}><X/></button></div>{children}</div></div>}

createRoot(document.getElementById("root")).render(<App/>);