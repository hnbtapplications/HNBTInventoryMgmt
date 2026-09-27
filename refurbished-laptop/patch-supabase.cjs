const fs = require('fs');
let c = fs.readFileSync('src/supabase.js', 'utf8');

c += `

// ======================= USER MANAGEMENT =======================

export async function fetchUsersFromDB() {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('rb_users').select('*').order('created_at', { ascending: true });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error fetching users:', err);
    return null;
  }
}

export async function upsertUserToDB(user) {
  const supabase = getSupabase();
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('rb_users').upsert(user);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error saving user:', err);
    return false;
  }
}

export async function deleteUserFromDB(id) {
  const supabase = getSupabase();
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('rb_users').delete().eq('id', id);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error deleting user:', err);
    return false;
  }
}

export async function authenticateUser(username, password_hash) {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('rb_users').select('*').ilike('username', username).eq('password_hash', password_hash).single();
    if (error) {
      if (error.code === 'PGRST116') return null; // No rows returned (invalid creds)
      throw error;
    }
    return data;
  } catch (err) {
    console.error('Error authenticating user:', err);
    return null;
  }
}
`;

fs.writeFileSync('src/supabase.js', c);
