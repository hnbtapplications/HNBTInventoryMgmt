const fs = require('fs');
let c = fs.readFileSync('src/main.jsx', 'utf8');

c = c.replace(
  /import \{ fetchLaptopsFromDB, upsertLaptopToDB, deleteLaptopFromDB, fetchMovementsFromDB, upsertMovementToDB \} from "\.\/supabase";/,
  'import { fetchLaptopsFromDB, upsertLaptopToDB, deleteLaptopFromDB, fetchMovementsFromDB, upsertMovementToDB, authenticateUser, fetchUsersFromDB, upsertUserToDB, deleteUserFromDB } from "./supabase";'
);

c = c.replace(
  /FileText, LogOut, LockKeyhole\} from "lucide-react";/,
  'FileText, LogOut, LockKeyhole, Users} from "lucide-react";'
);

// Replace Root and LoginScreen entirely
const newLoginAndRoot = `
function LoginScreen({onLogin}){
 const [username,setUsername]=useState("");
 const [password,setPassword]=useState("");
 const [error,setError]=useState("");
 const [busy,setBusy]=useState(false);
 const submit=async e=>{
   e.preventDefault();
   setBusy(true);setError("");
   const passwordHash=await sha256(password);
   const user = await authenticateUser(username, passwordHash);
   if(user) {
     onLogin(user);
     return;
   }
   setError("Incorrect username or password.");
   setBusy(false);
 };
 return <div className="loginPage"><div className="loginVisual"><div className="loginVisualContent"><span className="eyebrow">SANDROGEN TECHNOLOGIES</span><h1>Refurbished Laptop Inventory</h1><p>Manage laptop configuration, inspection, stock transfers and sales across Bangalore and Hosur.</p><div className="loginHighlights"><span>Secure access</span><span>Stock visibility</span><span>Condition tracking</span></div></div></div><div className="loginPanel"><form className="loginCard" onSubmit={submit}><img src={companyLogo} alt="SandroGen Technologies"/><div className="loginIcon"><LockKeyhole/></div><div><h2>Welcome back</h2><p>Sign in to open the inventory application.</p></div><label>Username<input autoFocus autoComplete="username" value={username} onChange={e=>setUsername(e.target.value)} placeholder="Enter username" required/></label><label>Password<input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter password" required/></label>{error&&<div className="loginError">{error}</div>}<button className="loginButton" disabled={busy}>{busy?"Signing in...":"Sign In"}</button><small>Authorized personnel only</small></form></div></div>
}

function Root(){
 const [currentUser, setCurrentUser]=useState(()=>{
   const stored = sessionStorage.getItem("hnb_user");
   if(stored) return JSON.parse(stored);
   return null;
 });
 const login=(user)=>{sessionStorage.setItem("hnb_user",JSON.stringify(user));setCurrentUser(user)};
 const logout=()=>{sessionStorage.removeItem("hnb_user");setCurrentUser(null)};
 return currentUser?<App currentUser={currentUser} onLogout={logout}/>:<LoginScreen onLogin={login}/>;
}
`;

c = c.replace(/function LoginScreen\(\{onLogin\}\)\{[\s\S]*?function Root\(\)\{[\s\S]*?\}\n/, newLoginAndRoot);

// Change App signature
c = c.replace(/function App\(\{onLogout\}\)\{/, 'function App({currentUser, onLogout}){');

// Add canEdit utility inside App component body (before return)
const canEditLogic = `
  const canEdit = (laptop) => {
    if (currentUser.role === "Admin") return true;
    return currentUser.role === (laptop.Location || "Bangalore");
  };
`;
c = c.replace(/(const movementStatus=[\s\S]*?;)/, '$1' + canEditLogic);

// Sidebar
c = c.replace(
  /<button className=\{page==="reports"\?"active":""\} onClick=\{\(\)=>setPage\("reports"\)\}><FileText\/>Reports<\/button>/,
  '<button className={page==="reports"?"active":""} onClick={()=>setPage("reports")}><FileText/>Reports</button>\n        {currentUser.role==="Admin" && <button className={page==="users"?"active":""} onClick={()=>setPage("users")}><Users/>User Management</button>}'
);

c = c.replace(
  /page==="movements"\?"Stock Movement":"Reports"\}/,
  'page==="movements"?"Stock Movement":page==="users"?"User Management":"Reports"}'
);

c = c.replace(
  /"Refurbished laptop tracking & component health ledger"\}/,
  'page==="users"?"Manage system access, roles, and branch permissions":"Refurbished laptop tracking & component health ledger"}'
);

// Laptops Table Actions
c = c.replace(
  /<td className="actions"><button title="Edit laptop entry" onClick=\{\(\)=>\{setEditing\(\{...x,__originalId:x\["Laptop ID"\]\}\);setPage\("add-laptop"\)\}\}><Pencil\/><\/button><button onClick=\{\(\)=>removeLaptop\(x\["Laptop ID"\]\)\}><Trash2\/><\/button><\/td>/g,
  '<td className="actions">{canEdit(x) && <><button title="Edit laptop entry" onClick={()=>{setEditing({...x,__originalId:x["Laptop ID"]});setPage("add-laptop")}}><Pencil/></button><button onClick={()=>removeLaptop(x["Laptop ID"])}><Trash2/></button></>}</td>'
);

// addLaptop initial value
c = c.replace(
  /"Location":"Bangalore"/,
  '"Location":currentUser.role === "Admin" ? "Bangalore" : currentUser.role'
);

// Inject users page
const usersPageLogic = `
      {page==="users" && currentUser.role === "Admin" && <UserManagementPage />}
`;
c = c.replace(/\{page==="reports"&&<Reports[\s\S]*?\/>\}/, match => match + usersPageLogic);


// Pass currentUser to sub-components
c = c.replace(/<AddLaptopPage item=\{editing\} onClose=\{/, '<AddLaptopPage currentUser={currentUser} item={editing} onClose={');
c = c.replace(/<ConditionPage laptops=\{laptops\} onSave=\{saveCondition\}\/>/, '<ConditionPage currentUser={currentUser} laptops={laptops} onSave={saveCondition}/>');
c = c.replace(/<MovementModal laptops=\{laptops\} onClose=/, '<MovementModal currentUser={currentUser} laptops={laptops} onClose=');
c = c.replace(/<MovementModal item=\{editingMovement\} laptops=\{laptops\}/, '<MovementModal currentUser={currentUser} item={editingMovement} laptops={laptops}');

// Sub-components definition updates
c = c.replace(/function AddLaptopPage\(\{item,onClose,onSave\}\)\{/, 'function AddLaptopPage({currentUser,item,onClose,onSave}){');
c = c.replace(/function ConditionPage\(\{laptops,onSave\}\)\{/, 'function ConditionPage({currentUser,laptops,onSave}){');
c = c.replace(/function MovementModal\(\{item,laptops,onClose,onSave\}\)\{/, 'function MovementModal({currentUser,item,laptops,onClose,onSave}){');

// Disable Location edit in AddLaptopPage
c = c.replace(
  /if\(opts\) return <select required=\{mandatoryFields\.has\(f\)\} value=\{v\[f\]\?\?""\} onChange=\{e=>update\(f,e\.target\.value\)\}>/,
  'const dis = (f==="Location" && currentUser.role !== "Admin");\n   if(opts) return <select disabled={dis} required={mandatoryFields.has(f)} value={v[f]??""} onChange={e=>update(f,e.target.value)}>'
);

// Restrict ConditionPage save
c = c.replace(
  /const submit=\(\)=>\{if\(!v\)\{alert\("Please select a valid Laptop ID\."\);return\}/,
  'const submit=()=>{if(!v){alert("Please select a valid Laptop ID.");return} if(currentUser.role !== "Admin" && currentUser.role !== (v.Location||"Bangalore")){alert("You can only modify condition for laptops in your branch.");return;}'
);

// Restrict MovementModal laptops dropdown & form submit
c = c.replace(
  /const first=laptops\.find\(x=>\(x\["Stock Status"\]\|\|"In Stock"\)!=="Sold"\)\|\|laptops\[0\];/,
  'const filteredLaptops=laptops.filter(x=>(x["Stock Status"]||"In Stock")!=="Sold" && (currentUser.role === "Admin" || currentUser.role === (x.Location||"Bangalore")));\n const first=filteredLaptops[0]||laptops[0];'
);
c = c.replace(
  /\{laptops\.filter\(x=>\(x\["Stock Status"\]\|\|"In Stock"\)!=="Sold"\)\.map\(x=>/,
  '{filteredLaptops.map(x=>'
);


// Append UserManagementPage component to end of file
const userManagementComponent = `

function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Bangalore");

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    const dbUsers = await fetchUsersFromDB();
    if(dbUsers) setUsers(dbUsers);
    setLoading(false);
  }

  async function handleAddUser(e) {
    e.preventDefault();
    if(!username || !password) return alert("Username and password are required.");
    const hash = await sha256(password);
    const success = await upsertUserToDB({ username, password_hash: hash, role });
    if(success) {
      setUsername(""); setPassword(""); setRole("Bangalore");
      loadUsers();
    } else {
      alert("Failed to add user. Ensure username is unique.");
    }
  }

  async function handleDeleteUser(id) {
    if(confirm("Delete this user?")) {
      const success = await deleteUserFromDB(id);
      if(success) loadUsers();
    }
  }

  if(loading) return <div style={{padding:"30px"}}>Loading users...</div>;

  return (
    <section>
      <div className="panel" style={{marginBottom: "20px"}}>
        <div className="panelHead"><h3>Add / Reset User</h3></div>
        <form onSubmit={handleAddUser} className="formgrid">
          <label>Username<input value={username} onChange={e=>setUsername(e.target.value)} required/></label>
          <label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required/></label>
          <label>Role
            <select value={role} onChange={e=>setRole(e.target.value)}>
              <option value="Bangalore">Bangalore Employee</option>
              <option value="Hosur">Hosur Employee</option>
              <option value="Admin">Admin</option>
            </select>
          </label>
          <div className="full"><button className="primary"><Save/> Save User</button></div>
        </form>
      </div>

      <div className="tableWrap">
        <table>
          <thead>
            <tr>
              <th>Username</th>
              <th>Role</th>
              <th>Created At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td><b>{u.username}</b></td>
                <td><span className="pill">{u.role}</span></td>
                <td>{new Date(u.created_at).toLocaleString()}</td>
                <td className="actions">
                  <button onClick={() => handleDeleteUser(u.id)} title="Delete User"><Trash2/></button>
                </td>
              </tr>
            ))}
            {users.length === 0 && <tr><td colSpan="4">No users found.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
`;

c += userManagementComponent;
fs.writeFileSync('src/main.jsx', c);
