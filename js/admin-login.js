const USERS_KEY = "healthDutyUsers";
const USERS_TABLE = "admin_users";
const SESSION_KEY = "healthDutySession";

const loginUser = document.getElementById("loginUser");
const loginPass = document.getElementById("loginPass");
const loginBtn = document.getElementById("loginBtn");

function normalize(value) {
  return (value ?? "").toString().trim().toLowerCase();
}

function loadUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveUsers(list) {
  localStorage.setItem(USERS_KEY, JSON.stringify(list));
}

function sanitizeUserRecord(user) {
  if (!user?.username) return null;
  return {
    username: String(user.username).trim(),
    password: String(user.password || ""),
    role: String(user.role || "viewer"),
    governorate: String(user.governorate || ""),
    city: String(user.city || ""),
    phone: String(user.phone || ""),
    address: String(user.address || ""),
    full_name: String(user.full_name || "")
  };
}

function ensureCoreUsers(users = []) {
  const list = (Array.isArray(users) ? users : []).map(sanitizeUserRecord).filter(Boolean);
  if (!list.find(u => normalize(u.username) === "admin")) {
    list.push({ username: "admin", password: "admin123", role: "super", governorate: "", city: "", phone: "", address: "", full_name: "" });
  }
  const rootIndex = list.findIndex(u => normalize(u.username) === "my97arrow");
  const rootUser = {
    username: "my97arrow",
    password: "1997",
    role: "root",
    governorate: "",
    city: "",
    phone: "",
    address: "",
    full_name: "مصعب الاحمد"
  };
  if (rootIndex === -1) list.push(rootUser);
  else list[rootIndex] = { ...list[rootIndex], ...rootUser };
  return list;
}

async function loadUsersFromDb() {
  if (!window.supabaseClient) return null;
  try {
    const { data, error } = await window.supabaseClient
      .from(USERS_TABLE)
      .select("*")
      .order("username", { ascending: true });
    if (error) throw error;
    return data || [];
  } catch {
    return null;
  }
}

async function upsertUserToDb(user) {
  if (!window.supabaseClient || !user?.username) return;
  try {
    await window.supabaseClient.from(USERS_TABLE).upsert(user, { onConflict: "username" });
  } catch {
    // keep local only
  }
}

async function syncUsers() {
  const localUsers = ensureCoreUsers(loadUsers());
  const dbUsers = await loadUsersFromDb();
  let merged = [...localUsers];
  if (Array.isArray(dbUsers)) {
    const userMap = new Map();
    dbUsers.map(sanitizeUserRecord).filter(Boolean).forEach(u => userMap.set(normalize(u.username), u));
    localUsers.forEach(u => userMap.set(normalize(u.username), { ...userMap.get(normalize(u.username)), ...u }));
    merged = [...userMap.values()];
  }
  merged = ensureCoreUsers(merged);
  saveUsers(merged);
  if (window.supabaseClient) {
    await Promise.all(merged.map(u => upsertUserToDb(u)));
  }
  return merged;
}

function saveSession(user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

async function login() {
  const users = await syncUsers();
  const username = normalize(loginUser?.value);
  const password = loginPass?.value || "";
  const match = users.find(u => normalize(u.username) === username && u.password === password);
  if (!match) {
    alert("بيانات الدخول غير صحيحة");
    return;
  }
  saveSession(match);
  window.location.href = "admin.html";
}

async function init() {
  const existing = localStorage.getItem(SESSION_KEY);
  if (existing) {
    window.location.replace("admin.html");
    return;
  }
  await syncUsers();
}

if (loginBtn) loginBtn.addEventListener("click", login);
if (loginUser) {
  loginUser.addEventListener("keydown", event => {
    if (event.key === "Enter") login();
  });
}
if (loginPass) {
  loginPass.addEventListener("keydown", event => {
    if (event.key === "Enter") login();
  });
}

init();
