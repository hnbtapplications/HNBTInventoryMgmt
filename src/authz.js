export const FULL_PERMISSIONS={can_manage_products:true,can_stock_movement:true,can_view_reports:true,can_manage_masters:true,can_view_audit_logs:true,can_manage_users:true};
export function normalizeUser(user){if(!user)return null;const isAdmin=user.role==="admin"||user.mode==="admin";return{...user,branch:user.branch||"Both",permissions:isAdmin?FULL_PERMISSIONS:{...(user.permissions||{})}}}
export function can(user,key){const u=normalizeUser(user);return Boolean(u&&(u.role==="admin"||u.permissions?.[key]));}
export function allowedBranches(user,{includeAll=true}={}){const u=normalizeUser(user);if(!u)return[];if(u.role==="admin"||u.branch==="Both")return includeAll?["All","Bangalore","Hosur"]:["Bangalore","Hosur"];return[u.branch];}
export function defaultBranch(user){const u=normalizeUser(user);return u&&(u.branch==="Bangalore"||u.branch==="Hosur")?u.branch:"Bangalore";}
export function branchAllowed(user,branch){const u=normalizeUser(user);if(!u)return false;if(u.role==="admin"||u.branch==="Both")return true;return String(branch||"").toLowerCase()===String(u.branch).toLowerCase();}
export function restrictBranch(user,requested,{allowAll=true}={}){const options=allowedBranches(user,{includeAll:allowAll});return options.includes(requested)?requested:(options[0]||defaultBranch(user));}
