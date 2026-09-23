import{getSession,readSessionCookie}from"./_auth.js";
const URL=()=>String(process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL||"").replace(/\/$/,"");const KEY=()=>process.env.SUPABASE_SERVICE_ROLE_KEY||"";
function perm(s,k){return s&&(s.role==="admin"||s.permissions?.[k])}function branchOK(s,b){return s&&(s.role==="admin"||s.branch==="Both"||String(s.branch)===String(b))}function headers(extra={}){return{apikey:KEY(),Authorization:`Bearer ${KEY()}`,"Content-Type":"application/json",...extra}}async function rest(path,opt={}){const r=await fetch(`${URL()}/rest/v1/${path}`,{...opt,headers:headers(opt.headers)});const text=await r.text();let data=null;try{data=text?JSON.parse(text):null}catch{data=text}if(!r.ok)throw new Error(data?.message||data?.error||`Database error ${r.status}`);return data}function actor(s){return s.full_name||s.username||s.sub||"Unknown"}async function audit(s,e){await rest("audit_logs",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({actor:actor(s),actor_user_id:s.user_id||null,action:e.action,entity_type:e.entity_type||"inventory",entity_id:String(e.entity_id||""),entity_name:String(e.entity_name||""),branch:String(e.branch||""),old_value:e.old_value??null,new_value:e.new_value??null,details:String(e.details||"")})})}function cleanProduct(p){return{id:String(p.id||""),name:String(p.name||"").trim(),brand:String(p.brand||""),category:String(p.category||""),unit:String(p.unit||"Nos"),purchase:Number(p.purchase)||0,sale:Number(p.sale)||0,min:Number(p.min)||5,bangalore:Math.max(0,Number(p.bangalore)||0),hosur:Math.max(0,Number(p.hosur)||0)}}function cleanMovement(m){return{id:String(m.id||""),timestamp:m.timestamp||m.id,date:String(m.date||""),type:m.type==="OUT"?"OUT":"IN",productId:String(m.productId||""),product:String(m.product||""),branch:String(m.branch||""),qty:Math.max(0,Number(m.qty)||0),note:String(m.note||"")}}
export default async function handler(req,res){res.setHeader("Cache-Control","no-store");const s=getSession(readSessionCookie(req));if(!s)return res.status(401).json({error:"Login required"});if(!URL()||!KEY())return res.status(503).json({error:"Database is not configured"});const op=String(req.query?.op||req.body?.op||"");try{
 if(req.method==="GET"&&op==="products"){let rows=await rest("products?select=*&order=id.asc");if(s.role!=="admin"&&s.branch!=="Both")rows=(rows||[]).map(p=>({...p,[s.branch==="Hosur"?"bangalore":"hosur"]:0}));return res.json(rows||[])}
 if(req.method==="GET"&&op==="movements"){let q="movements?select=*&order=timestamp.desc";if(s.role!=="admin"&&s.branch!=="Both")q+=`&branch=eq.${encodeURIComponent(s.branch)}`;return res.json(await rest(q)||[])}
 if(req.method==="GET"&&op==="masters")return res.json({brands:(await rest("brands?select=name")||[]).map(x=>x.name),categories:(await rest("categories?select=name")||[]).map(x=>x.name),units:(await rest("units?select=name")||[]).map(x=>x.name)});
 if(req.method==="GET"&&op==="audit"){if(!perm(s,"can_view_audit_logs"))return res.status(403).json({error:"Not permitted"});let q="audit_logs?select=*&order=created_at.desc&limit=500";if(s.role!=="admin"&&s.branch!=="Both")q+=`&branch=eq.${encodeURIComponent(s.branch)}`;return res.json(await rest(q)||[])}
 if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});const b=req.body||{};
 if(op==="product-upsert"){if(!perm(s,"can_manage_products"))return res.status(403).json({error:"Product management permission required"});const p=cleanProduct(b.product||{});if(!p.id||!p.name)return res.status(400).json({error:"Product ID and name are required"});const old=(await rest(`products?id=eq.${encodeURIComponent(p.id)}&select=*`))[0]||null;if(s.role!=="admin"&&s.branch!=="Both"){const other=s.branch==="Hosur"?"bangalore":"hosur";p[other]=old?.[other]||0}await rest("products?on_conflict=id",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify(p)});await audit(s,{action:old?"PRODUCT_UPDATED":"PRODUCT_ADDED",entity_type:"product",entity_id:p.id,entity_name:p.name,branch:s.branch||"Both",old_value:old,new_value:p,details:old?"Product updated":"Product added"});return res.json({ok:true})}
 if(op==="product-delete"){if(!perm(s,"can_manage_products"))return res.status(403).json({error:"Product management permission required"});if(s.role!=="admin"&&s.branch!=="Both")return res.status(403).json({error:"Only users with Both-branch access or Administrator can delete a product catalog item"});const id=String(b.id||"");if(!id)return res.status(400).json({error:"Product ID required"});const old=(await rest(`products?id=eq.${encodeURIComponent(id)}&select=*`))[0]||null;if(!old)return res.status(404).json({error:"Product not found"});await rest(`products?id=eq.${encodeURIComponent(id)}`,{method:"DELETE",headers:{Prefer:"return=minimal"}});await audit(s,{action:"PRODUCT_DELETED",entity_type:"product",entity_id:id,entity_name:old.name||id,branch:s.branch||"Both",old_value:old,details:"Product deleted"});return res.json({ok:true})}
 if(op==="movement-upsert"){
   if(!perm(s,"can_stock_movement"))return res.status(403).json({error:"Stock movement permission required"});
   const m=cleanMovement(b.movement||{});
   if(!m.id||!m.productId||!m.product||!m.branch||m.qty<=0)return res.status(400).json({error:"Valid movement, product, branch and quantity are required"});
   if(!["Bangalore","Hosur"].includes(m.branch))return res.status(400).json({error:"Invalid branch"});
   if(!branchOK(s,m.branch))return res.status(403).json({error:"You cannot modify another branch"});

   const old=(await rest(`movements?id=eq.${encodeURIComponent(m.id)}&select=*`))[0]||null;
   if(old&&!branchOK(s,old.branch))return res.status(403).json({error:"You cannot edit a movement belonging to another branch"});

   const newProduct=(await rest(`products?id=eq.${encodeURIComponent(m.productId)}&select=*`))[0]||null;
   if(!newProduct)return res.status(404).json({error:"Product not found"});

   let oldProduct=null;
   if(old){
     oldProduct=(await rest(`products?id=eq.${encodeURIComponent(String(old.productId||""))}&select=*`))[0]||null;
     if(!oldProduct&&old.product)oldProduct=(await rest(`products?name=eq.${encodeURIComponent(old.product)}&select=*`))[0]||null;
     if(!oldProduct)return res.status(409).json({error:"The product linked to the existing movement no longer exists"});
   }

   const changed={};
   const applyDelta=(product,branch,type,qty)=>{
     const key=String(branch).toLowerCase();
     const current=Number(product[key])||0;
     const delta=type==="IN"?Number(qty)||0:-(Number(qty)||0);
     const next=current+delta;
     if(next<0)throw new Error(`Stock Out quantity exceeds available stock for ${product.name} at ${branch}. Available: ${current}`);
     product[key]=next;
   };
   const reverseMovement=(product,movement)=>{
     const key=String(movement.branch).toLowerCase();
     const current=Number(product[key])||0;
     const next=movement.type==="IN"?current-(Number(movement.qty)||0):current+(Number(movement.qty)||0);
     product[key]=Math.max(0,next);
   };

   try{
     if(old&&oldProduct.id===newProduct.id){
       const product={...newProduct};
       reverseMovement(product,old);
       applyDelta(product,m.branch,m.type,m.qty);
       changed[product.id]=product;
     }else{
       if(old){
         const reversed={...oldProduct};
         reverseMovement(reversed,old);
         changed[reversed.id]=reversed;
       }
       const target={...newProduct};
       applyDelta(target,m.branch,m.type,m.qty);
       changed[target.id]=target;
     }

     for(const product of Object.values(changed)){
       const p=cleanProduct(product);
       await rest(`products?id=eq.${encodeURIComponent(p.id)}`,{
         method:"PATCH",
         headers:{Prefer:"return=representation"},
         body:JSON.stringify({
           name:p.name,brand:p.brand,category:p.category,unit:p.unit,
           purchase:p.purchase,sale:p.sale,min:p.min,bangalore:p.bangalore,hosur:p.hosur
         })
       });
     }

     await rest("movements?on_conflict=id",{
       method:"POST",
       headers:{Prefer:"resolution=merge-duplicates,return=minimal"},
       body:JSON.stringify(m)
     });

     const savedProducts=[];
     for(const product of Object.values(changed)){
       const saved=(await rest(`products?id=eq.${encodeURIComponent(product.id)}&select=*`))[0];
       if(saved)savedProducts.push(saved);
     }

     await audit(s,{
       action:old?"MOVEMENT_UPDATED":m.type==="OUT"?"STOCK_OUT":"STOCK_IN",
       entity_type:"movement",entity_id:m.id,entity_name:m.product,branch:m.branch,
       old_value:old,new_value:m,
       details:old?"Stock movement edited and inventory quantity recalculated":`${m.type} ${m.qty} ${m.product}; inventory quantity updated`
     });

     return res.json({ok:true,movement:m,products:savedProducts});
   }catch(e){
     console.error(e);
     return res.status(409).json({error:e.message||"Unable to apply stock movement"});
   }
 }
 if(op==="movement-delete"){
   if(!perm(s,"can_stock_movement"))return res.status(403).json({error:"Stock movement permission required"});
   const id=String(b.id||"");if(!id)return res.status(400).json({error:"Movement ID required"});
   const old=(await rest(`movements?id=eq.${encodeURIComponent(id)}&select=*`))[0]||null;
   if(!old)return res.status(404).json({error:"Movement not found"});
   if(!branchOK(s,old.branch))return res.status(403).json({error:"You cannot modify another branch"});

   let product=(await rest(`products?id=eq.${encodeURIComponent(String(old.productId||""))}&select=*`))[0]||null;
   if(!product&&old.product)product=(await rest(`products?name=eq.${encodeURIComponent(old.product)}&select=*`))[0]||null;
   if(!product)return res.status(409).json({error:"The product linked to this movement no longer exists"});

   const key=String(old.branch).toLowerCase();
   const current=Number(product[key])||0;
   const qty=Number(old.qty)||0;
   product[key]=old.type==="IN"?Math.max(0,current-qty):current+qty;

   const p=cleanProduct(product);
   await rest(`products?id=eq.${encodeURIComponent(p.id)}`,{
     method:"PATCH",
     headers:{Prefer:"return=representation"},
     body:JSON.stringify({
       name:p.name,brand:p.brand,category:p.category,unit:p.unit,
       purchase:p.purchase,sale:p.sale,min:p.min,bangalore:p.bangalore,hosur:p.hosur
     })
   });
   await rest(`movements?id=eq.${encodeURIComponent(id)}`,{method:"DELETE",headers:{Prefer:"return=minimal"}});
   await audit(s,{action:"MOVEMENT_DELETED",entity_type:"movement",entity_id:id,entity_name:old.product||id,branch:old.branch||"",old_value:old,details:"Stock movement deleted and inventory quantity reversed"});
   const saved=(await rest(`products?id=eq.${encodeURIComponent(p.id)}&select=*`))[0]||p;
   return res.json({ok:true,movement:old,product:saved});
 }
 if(op==="master-save"||op==="master-delete"){if(!perm(s,"can_manage_masters"))return res.status(403).json({error:"Master management permission required"});const table=String(b.table||"");if(!["brands","categories","units"].includes(table))return res.status(400).json({error:"Invalid master"});const name=String(b.name||"").trim();if(!name)return res.status(400).json({error:"Name required"});if(op==="master-save")await rest(`${table}?on_conflict=name`,{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({name})});else await rest(`${table}?name=eq.${encodeURIComponent(name)}`,{method:"DELETE",headers:{Prefer:"return=minimal"}});await audit(s,{action:op==="master-save"?"MASTER_SAVED":"MASTER_DELETED",entity_type:table,entity_id:name,entity_name:name,branch:s.branch||"Both"});return res.json({ok:true})}
 return res.status(400).json({error:"Unknown operation"});
 }catch(e){console.error(e);return res.status(500).json({error:e.message||"Server error"})}}
