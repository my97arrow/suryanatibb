const STORAGE_KEY = "places";
const USERS_KEY = "healthDutyUsers";
const SESSION_KEY = "healthDutySession";
const LOG_KEY = "healthDutyLogs";
const UPDATED_KEY = "healthDutyUpdated";
const BACKUP_KEY = "healthDutyBackups";
const LOCATIONS_KEY = "healthDutyLocations";
const SPECIALTIES_KEY = "healthDutySpecialties";
const REPORTS_KEY = "healthDutyReports";
const APPLICATIONS_KEY = "healthDutyApplications";
function localISODate(d = new Date()) {
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().split("T")[0];
}
const todayISO = localISODate();

const WEEK_DAYS = [
  "الأحد",
  "الاثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت"
];

const SEED_PLACES = [];

function isGeneratedSample(place) {
  const name = (place?.name || "").trim();
  return !!place?.seedSample || /^(صيدلية|عيادة|مشفى|مستوصف|مخبر) النبض \d+$/.test(name);
}

async function purgeSamplePlaces() {
  const toRemove = places.filter(isGeneratedSample);
  if (!toRemove.length) return;

  if (window.supabaseClient) {
    try {
      await Promise.all(
        toRemove
          .filter(p => p.id)
          .map(p => window.supabaseClient.from("places").delete().eq("id", p.id))
      );
    } catch {
      // ignore remote deletion errors
    }
  }

  places = places.filter(p => !isGeneratedSample(p));
  savePlaces();
}

let map = null;
let marker = null;
let dutyPicker = null;
let dutyDates = [];
let pendingIndex = null;
let currentUser = null;
let currentAdminView = "dashboard";
let places = [];
let logs = [];
let locations = {};
let specialties = [];
let editingUser = null;
let selectedSpecialties = [];
let reports = [];
let applications = [];

const defaultLocations = {
  "الرقة": {
    "الرقة": [],
    "الطبقة": [],
    "تل أبيض": [],
    "عين عيسى": [],
    "سلوك": []
  },
  "حلب": {
    "حلب": [],
    "اعزاز": [],
    "جرابلس": [],
    "عين العرب": []
  },
  "دمشق": {
    "دمشق": []
  },
  "ريف دمشق": {
    "دوما": [],
    "داريا": [],
    "يبرود": []
  },
  "حمص": {
    "حمص": [],
    "القصير": [],
    "تدمر": []
  },
  "حماة": {
    "حماة": [],
    "سلمية": []
  },
  "إدلب": {
    "إدلب": [],
    "معرة النعمان": []
  },
  "دير الزور": {
    "دير الزور": [],
    "البوكمال": []
  },
  "الحسكة": {
    "الحسكة": [],
    "القامشلي": []
  },
  "السويداء": {
    "السويداء": []
  },
  "درعا": {
    "درعا": []
  },
  "القنيطرة": {
    "القنيطرة": []
  },
  "طرطوس": {
    "طرطوس": []
  },
  "اللاذقية": {
    "اللاذقية": []
  }
};

const defaultSpecialties = [
  "قلبية",
  "داخلية",
  "هضمية",
  "صدرية",
  "كلوية",
  "غدد",
  "عصبية",
  "جراحة عامة",
  "عظمية",
  "نسائية وتوليد",
  "أطفال",
  "أذن أنف حنجرة",
  "جلدية",
  "عيون",
  "أسنان",
  "أشعة",
  "تحاليل مخبرية",
  "إسعاف",
  "لقاحات"
];

const adminCards = document.getElementById("adminCards");
const adminEmpty = document.getElementById("adminEmpty");
const placeModal = document.getElementById("placeModal");
const importFile = document.getElementById("importFile");
const adminTotal = document.getElementById("adminTotal");
const adminOnDuty = document.getElementById("adminOnDuty");
const adminUpdated = document.getElementById("adminUpdated");
const adminUnverified = document.getElementById("adminUnverified");
const adminLog = document.getElementById("adminLog");
const adminTable = document.getElementById("adminTable");
const selectAll = document.getElementById("selectAll");
const deleteSelected = document.getElementById("deleteSelected");
const adminPagination = document.getElementById("adminPagination");
const logPagination = document.getElementById("logPagination");
const reportsPanel = document.getElementById("reportsPanel");
const reportsTable = document.getElementById("reportsTable");
const reportsEmpty = document.getElementById("reportsEmpty");
const reportFilterStatus = document.getElementById("reportFilterStatus");
const applicationsPanel = document.getElementById("applicationsPanel");
const applicationsTable = document.getElementById("applicationsTable");
const applicationsEmpty = document.getElementById("applicationsEmpty");
const applicationFilterStatus = document.getElementById("applicationFilterStatus");
const applicationFilterType = document.getElementById("applicationFilterType");

const PAGE_SIZE = 10;
let adminPage = 1;
let logPage = 1;

const name = document.getElementById("name");
const type = document.getElementById("type");
const specialty = document.getElementById("specialty");
const specialtyField = document.getElementById("specialtyField");
const specialtySearch = document.getElementById("specialtySearch");
const specialtyChips = document.getElementById("specialtyChips");
const specialtySuggestions = document.getElementById("specialtySuggestions");
const phone = document.getElementById("phone");
const whatsapp = document.getElementById("whatsapp");
const email = document.getElementById("email");
const governorate = document.getElementById("governorate");
const city = document.getElementById("city");
const address = document.getElementById("address");
const hours = document.getElementById("hours");
const hoursStart = document.getElementById("hoursStart");
const hoursEnd = document.getElementById("hoursEnd");
const hours24 = document.getElementById("hours24");
const services = document.getElementById("services");
const notes = document.getElementById("notes");
const image = document.getElementById("image");
const imageFile = document.getElementById("imageFile");
const imagePreview = document.getElementById("imagePreview");
const cropModal = document.getElementById("cropModal");
const cropImage = document.getElementById("cropImage");
const rotateLeft = document.getElementById("rotateLeft");
const rotateRight = document.getElementById("rotateRight");
const cropSave = document.getElementById("cropSave");
const cropCancel = document.getElementById("cropCancel");

let cropper = null;
const lat = document.getElementById("lat");
const lng = document.getElementById("lng");
const editIndex = document.getElementById("editIndex");
const clearDutyDates = document.getElementById("clearDutyDates");
const workdaysAll = document.getElementById("workdaysAll");
const workdaysInputs = [...document.querySelectorAll('input[name="workdays"]')];

const filterType = document.getElementById("filterType");
const filterGov = document.getElementById("filterGov");
const filterCity = document.getElementById("filterCity");

const loginPanel = document.getElementById("loginPanel");
const adminApp = document.getElementById("adminApp");
const dashboardSection = document.getElementById("dashboardSection");
const placesSection = document.getElementById("placesSection");
const activityPanel = document.getElementById("activityPanel");
const specialtyManagement = document.getElementById("specialtyManagement");
const navAddPlace = document.getElementById("navAddPlace");
const adminNavButtons = [...document.querySelectorAll(".admin-nav-btn[data-admin-view]")];
const loginUser = document.getElementById("loginUser");
const loginPass = document.getElementById("loginPass");
const loginBtn = document.getElementById("loginBtn");
const userBadge = document.getElementById("userBadge");
const logoutBtn = document.getElementById("logoutBtn");

const userManagement = document.getElementById("userManagement");
const userName = document.getElementById("userName");
const userPass = document.getElementById("userPass");
const userPhone = document.getElementById("userPhone");
const userAddress = document.getElementById("userAddress");
const userFilter = document.getElementById("userFilter");
const userRole = document.getElementById("userRole");
const userGov = document.getElementById("userGov");
const userCity = document.getElementById("userCity");
const addUserBtn = document.getElementById("addUserBtn");
const updateUserBtn = document.getElementById("updateUserBtn");
const usersList = document.getElementById("usersList");

const locationManagement = document.getElementById("locationManagement");
const locGov = document.getElementById("locGov");
const locCity = document.getElementById("locCity");
const newGov = document.getElementById("newGov");
const newCity = document.getElementById("newCity");
const addGovBtn = document.getElementById("addGovBtn");
const addCityBtn = document.getElementById("addCityBtn");
const removeGovBtn = document.getElementById("removeGovBtn");
const removeCityBtn = document.getElementById("removeCityBtn");
const specialtySelect = document.getElementById("specialtySelect");
const newSpecialty = document.getElementById("newSpecialty");
const addSpecialtyBtn = document.getElementById("addSpecialtyBtn");
const removeSpecialtyBtn = document.getElementById("removeSpecialtyBtn");

function normalize(value) {
  return (value ?? "").toString().trim().toLowerCase();
}

function placeKey(place) {
  return [
    normalize(place.name),
    normalize(place.type),
    normalize(place.governorate),
    normalize(place.city)
  ].join("|");
}

function loadLocations() {
  try {
    const raw = localStorage.getItem(LOCATIONS_KEY);
    if (!raw) return defaultLocations;
    return JSON.parse(raw);
  } catch {
    return defaultLocations;
  }
}

function saveLocations() {
  localStorage.setItem(LOCATIONS_KEY, JSON.stringify(locations));
}

function toSpecialtyArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(item => `${item}`.trim()).filter(Boolean);
  return `${value}`
    .split(/[،,|]/)
    .map(item => item.trim())
    .filter(Boolean);
}

function normalizeSpecialty(value) {
  return (value || "").toString().trim().replace(/\s+/g, " ").toLowerCase();
}

function uniqueSpecialties(list) {
  const map = new Map();
  list.forEach(item => {
    const clean = `${item || ""}`.trim();
    const key = normalizeSpecialty(clean);
    if (clean && !map.has(key)) map.set(key, clean);
  });
  return [...map.values()].sort((a, b) => a.localeCompare(b, "ar"));
}

function loadSpecialties() {
  try {
    const raw = localStorage.getItem(SPECIALTIES_KEY);
    if (!raw) return uniqueSpecialties(defaultSpecialties);
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return uniqueSpecialties(defaultSpecialties);
    return uniqueSpecialties([...defaultSpecialties, ...parsed]);
  } catch {
    return uniqueSpecialties(defaultSpecialties);
  }
}

function saveSpecialties() {
  localStorage.setItem(SPECIALTIES_KEY, JSON.stringify(uniqueSpecialties(specialties)));
}

function loadPlaces() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function loadPlacesFromDb() {
  if (!window.supabaseClient) return null;
  try {
    const { data, error } = await window.supabaseClient
      .from("places")
      .select("*")
      .order("name", { ascending: true });
    if (error) throw error;
    const list = data || [];
    const seen = new Map();
    const duplicates = [];
    list.forEach(item => {
      const key = placeKey(item);
      if (seen.has(key)) {
        duplicates.push(item);
      } else {
        seen.set(key, item);
      }
    });
    if (duplicates.length) {
      await Promise.all(
        duplicates.map(d => window.supabaseClient.from("places").delete().eq("id", d.id))
      );
    }
    return [...seen.values()];
  } catch {
    return null;
  }
}

async function savePlaceToDb(data, id = null) {
  if (!window.supabaseClient) return null;
  const attempt = async payload => {
    if (id) {
      const { data: updated, error } = await window.supabaseClient
        .from("places")
        .update(payload)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      return updated?.id || id;
    }
    const { data: inserted, error } = await window.supabaseClient
      .from("places")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw error;
    return inserted?.id || null;
  };

  try {
    return await attempt(data);
  } catch (error) {
    const message = (error?.message || "").toLowerCase();
    const needsFallback =
      message.includes("workdays") ||
      message.includes("verified") ||
      message.includes("quality_score") ||
      message.includes("updated_by") ||
      message.includes("updated_at") ||
      message.includes("column") ||
      message.includes("schema cache");
    if (!needsFallback) throw error;
    const { workdays, verified, verified_by, verified_at, quality_score, updated_by, updated_at, ...fallback } = data;
    return await attempt(fallback);
  }
}

async function deletePlaceFromDb(id) {
  if (!window.supabaseClient || !id) return;
  await window.supabaseClient.from("places").delete().eq("id", id);
}

function ensureSeedPlaces() {
  // disabled: do not auto-create sample places
}

function savePlaces() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(places));
  localStorage.setItem(UPDATED_KEY, new Date().toISOString());
  backupSnapshot("نسخة تلقائية");
}

function loadUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveUsers(list) {
  localStorage.setItem(USERS_KEY, JSON.stringify(list));
}

function ensureDefaultUser() {
  const users = loadUsers();
  if (!users.length) {
    saveUsers([{ username: "admin", password: "admin123", role: "super" }]);
  }
}

function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveSession(user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function loadLogs() {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function loadReports() {
  try {
    const raw = localStorage.getItem(REPORTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveReports(list = reports) {
  localStorage.setItem(REPORTS_KEY, JSON.stringify(list.slice(0, 1000)));
}

async function loadReportsFromDb() {
  if (!window.supabaseClient) return null;
  try {
    const { data, error } = await window.supabaseClient
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  } catch {
    return null;
  }
}

async function saveReportStatusToDb(report) {
  if (!window.supabaseClient || !report?.id) return;
  await window.supabaseClient
    .from("reports")
    .update({ status: report.status, handled_by: currentUser?.username || "", handled_at: new Date().toISOString() })
    .eq("id", report.id);
}

async function deleteReportFromDb(id) {
  if (!window.supabaseClient || !id) return;
  await window.supabaseClient.from("reports").delete().eq("id", id);
}

function loadApplications() {
  try {
    const raw = localStorage.getItem(APPLICATIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveApplications(list = applications) {
  localStorage.setItem(APPLICATIONS_KEY, JSON.stringify(list.slice(0, 3000)));
}

async function loadApplicationsFromDb() {
  if (!window.supabaseClient) return null;
  try {
    const { data, error } = await window.supabaseClient
      .from("place_applications")
      .select("*")
      .order("submitted_at", { ascending: false });
    if (error) throw error;
    return data || [];
  } catch {
    return null;
  }
}

async function saveApplicationToDb(application) {
  if (!window.supabaseClient || !application?.id) return;
  await window.supabaseClient
    .from("place_applications")
    .update({
      status: application.status,
      review_note: application.review_note || "",
      reviewed_by: currentUser?.username || "",
      reviewed_at: new Date().toISOString()
    })
    .eq("id", application.id);
}

function saveLogs() {
  localStorage.setItem(LOG_KEY, JSON.stringify(logs.slice(0, 50)));
}

function logAction(action) {
  const entry = { action, at: new Date().toISOString(), actor: currentUser?.username || "system" };
  logs.unshift(entry);
  logPage = 1;
  saveLogs();
  renderLogs();
}

function placeQuality(place) {
  let score = 0;
  if (normalize(place.name)) score += 20;
  if (normalize(place.type)) score += 10;
  if (normalize(place.governorate)) score += 10;
  if (normalize(place.city)) score += 10;
  if (place.lat && place.lng) score += 20;
  if (normalize(place.phone) || normalize(place.whatsapp)) score += 15;
  if (normalize(place.address)) score += 10;
  if (normalize(place.specialty)) score += 5;
  const label = score >= 80 ? "عالية" : (score >= 55 ? "متوسطة" : "ضعيفة");
  return { score, label };
}

function isOnDuty(place) {
  const schedule = normalizeSchedule(place.schedule);
  return schedule.includes(todayISO);
}

function normalizeSchedule(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map(d => (d || "").toString().split("T")[0])
      .filter(Boolean);
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map(d => (d || "").toString().split("T")[0]).filter(Boolean);
      }
    } catch {
      // not JSON
    }
    return value
      .split(/[|,]/)
      .map(d => d.trim().split("T")[0])
      .filter(Boolean);
  }
  return [];
}

function buildHoursValue() {
  if (hours24?.checked) return "24 ساعة";
  const start = hoursStart?.value || "";
  const end = hoursEnd?.value || "";
  if (start && end) return `${start} - ${end}`;
  return start || end || "";
}

function fillHoursFields(value) {
  if (!hoursStart || !hoursEnd) return;
  if (hours24) hours24.checked = value === "24 ساعة";
  if (!value) {
    hoursStart.value = "";
    hoursEnd.value = "";
    return;
  }
  if (value === "24 ساعة") {
    hoursStart.value = "";
    hoursEnd.value = "";
    return;
  }
  const parts = value.split("-").map(v => v.trim());
  hoursStart.value = parts[0] || "";
  hoursEnd.value = parts[1] || "";
}

function syncSpecialtyValue() {
  if (!specialty) return;
  specialty.value = selectedSpecialties.join("، ");
}

function renderSpecialtyChips() {
  if (!specialtyChips) return;
  specialtyChips.innerHTML = "";
  selectedSpecialties.forEach(item => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "multi-chip";
    chip.innerHTML = `${item} <i class="fa-solid fa-xmark"></i>`;
    chip.addEventListener("click", () => {
      selectedSpecialties = selectedSpecialties.filter(v => normalizeSpecialty(v) !== normalizeSpecialty(item));
      syncSpecialtyValue();
      renderSpecialtyChips();
      renderSpecialtySuggestions(specialtySearch?.value || "");
    });
    specialtyChips.appendChild(chip);
  });
}

function addSpecialtyToSelection(value) {
  const clean = `${value || ""}`.trim();
  if (!clean) return;
  const normalized = normalizeSpecialty(clean);
  const matched = specialties.find(item => normalizeSpecialty(item) === normalized);
  if (!matched) {
    alert("هذا الاختصاص غير موجود ضمن قائمة الاختصاصات");
    return;
  }
  const exists = selectedSpecialties.some(v => normalizeSpecialty(v) === normalizeSpecialty(clean));
  if (!exists) selectedSpecialties.push(matched);
  syncSpecialtyValue();
  renderSpecialtyChips();
  renderSpecialtySuggestions("");
  if (specialtySearch) specialtySearch.value = "";
}

function setSpecialtiesForm(value) {
  selectedSpecialties = uniqueSpecialties(toSpecialtyArray(value));
  syncSpecialtyValue();
  renderSpecialtyChips();
  renderSpecialtySuggestions("");
}

function renderSpecialtySuggestions(query = "") {
  if (!specialtySuggestions) return;
  const q = normalizeSpecialty(query);
  const selectedKeys = new Set(selectedSpecialties.map(item => normalizeSpecialty(item)));
  const list = specialties.filter(item => {
    const key = normalizeSpecialty(item);
    if (selectedKeys.has(key)) return false;
    if (!q) return true;
    return key.includes(q);
  }).slice(0, 8);

  specialtySuggestions.innerHTML = "";
  if (!list.length) {
    specialtySuggestions.hidden = true;
    return;
  }

  list.forEach(item => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "multi-suggestion";
    btn.textContent = item;
    btn.addEventListener("click", () => addSpecialtyToSelection(item));
    specialtySuggestions.appendChild(btn);
  });
  specialtySuggestions.hidden = false;
}

function getWorkdaysFromForm() {
  const selected = workdaysInputs
    .filter(input => input.checked)
    .map(input => input.value);
  if (workdaysAll?.checked) return WEEK_DAYS;
  return selected;
}

function setWorkdaysForm(values = []) {
  const set = new Set(values);
  workdaysInputs.forEach(input => {
    input.checked = set.has(input.value);
  });
  if (workdaysAll) {
    workdaysAll.checked = WEEK_DAYS.every(day => set.has(day));
  }
}

function syncWorkdaysAll() {
  if (!workdaysAll) return;
  const allChecked = WEEK_DAYS.every(day =>
    workdaysInputs.some(input => input.value === day && input.checked)
  );
  workdaysAll.checked = allChecked;
}
function typeLabel(type) {
  if (type === "hospital") return "مشفى";
  if (type === "dispensary") return "مستوصف";
  if (type === "clinic") return "عيادة";
  if (type === "lab") return "مخبر طبي";
  return "صيدلية";
}

function loadBackups() {
  try {
    const raw = localStorage.getItem(BACKUP_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveBackups(list) {
  localStorage.setItem(BACKUP_KEY, JSON.stringify(list.slice(0, 5)));
}

function backupSnapshot(reason = "نسخة") {
  const backups = loadBackups();
  backups.unshift({ at: new Date().toISOString(), reason, data: places });
  saveBackups(backups);
}

function backupNow() {
  if (currentUser?.role !== "super") {
    alert("هذه العملية للمسؤول المميز فقط");
    return;
  }
  backupSnapshot("نسخة يدوية");
  logAction("تم إنشاء نسخة احتياطية");
  alert("تم إنشاء نسخة احتياطية");
}

function restoreBackup() {
  if (currentUser?.role !== "super") {
    alert("هذه العملية للمسؤول المميز فقط");
    return;
  }
  const backups = loadBackups();
  if (!backups.length) {
    alert("لا توجد نسخ احتياطية");
    return;
  }
  if (!confirm("هل تريد استعادة آخر نسخة احتياطية؟")) return;
  places = backups[0].data || [];
  savePlaces();
  logAction("تمت استعادة نسخة احتياطية");
  renderAdmin();
}

function login() {
  const user = normalize(loginUser?.value);
  const pass = loginPass?.value || "";
  const users = loadUsers();
  const match = users.find(u => normalize(u.username) === user && u.password === pass);
  if (!match) {
    alert("بيانات الدخول غير صحيحة");
    return;
  }
  currentUser = match;
  saveSession(match);
  if (loginPanel) loginPanel.hidden = true;
  if (adminApp) adminApp.hidden = false;
  bootApp();
}

function logout() {
  clearSession();
  currentUser = null;
  if (adminApp) adminApp.hidden = true;
  if (loginPanel) loginPanel.hidden = false;
  if (userBadge) userBadge.hidden = true;
  if (logoutBtn) logoutBtn.hidden = true;
}

function setUserBadge() {
  if (!userBadge || !currentUser) return;
  const scope = currentUser.role === "super"
    ? "مسؤول مميز"
    : currentUser.role === "governorate"
    ? `مسؤول محافظة: ${currentUser.governorate}`
    : currentUser.role === "city"
    ? `مسؤول مدينة: ${currentUser.city}`
    : "مشاهدة فقط";
  userBadge.textContent = `${currentUser.username} (${scope})`;
  userBadge.hidden = false;
}

function canEdit() {
  return currentUser && currentUser.role !== "viewer";
}

function hasScopeForPlace(place) {
  if (!currentUser) return false;
  if (currentUser.role === "super" || currentUser.role === "viewer") return true;
  if (currentUser.role === "governorate") {
    return place.governorate === currentUser.governorate;
  }
  if (currentUser.role === "city") {
    return place.governorate === currentUser.governorate && place.city === currentUser.city;
  }
  return false;
}

function hasScopeForSelection() {
  if (!currentUser) return false;
  if (currentUser.role === "super") return true;
  if (currentUser.role === "viewer") return false;
  if (currentUser.role === "governorate") return governorate.value === currentUser.governorate;
  if (currentUser.role === "city") {
    return governorate.value === currentUser.governorate && city.value === currentUser.city;
  }
  return false;
}

function populateSelect(select, values, placeholder) {
  if (!select) return;
  select.innerHTML = "";
  const opt = document.createElement("option");
  opt.value = "";
  opt.textContent = placeholder;
  select.appendChild(opt);
  values.forEach(value => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
}

function updateCityOptions() {
  if (!governorate || !city) return;
  const gov = governorate.value;
  const cities = gov && locations[gov] ? Object.keys(locations[gov]) : [];
  populateSelect(city, cities, "اختر المدينة");
}

function applyUserScopeToForm() {
  if (!currentUser) return;
  if (currentUser.role === "super") {
    governorate.disabled = false;
    city.disabled = false;
    return;
  }

  if (currentUser.role === "governorate") {
    governorate.value = currentUser.governorate;
    governorate.disabled = true;
    updateCityOptions();
    city.disabled = false;
  }

  if (currentUser.role === "city") {
    governorate.value = currentUser.governorate;
    governorate.disabled = true;
    updateCityOptions();
    city.value = currentUser.city;
    city.disabled = true;
  }

  if (currentUser.role === "viewer") {
    governorate.disabled = true;
    city.disabled = true;
  }
}

function openModal(i = null) {
  if (!placeModal) return;
  if (!canEdit()) {
    alert("صلاحيتك قراءة فقط");
    return;
  }
  if (i !== null && !hasScopeForPlace(places[i])) {
    alert("لا تملك صلاحية لتعديل هذا المكان");
    return;
  }
  placeModal.classList.add("active");
  placeModal.setAttribute("aria-hidden", "false");

  resetForm();
  pendingIndex = i;

  setTimeout(() => {
    initMap();
    map?.invalidateSize();
    if (pendingIndex !== null) {
      fillForm(pendingIndex);
      pendingIndex = null;
    }
  }, 300);
}

function closeModal() {
  if (!placeModal) return;
  placeModal.classList.remove("active");
  placeModal.setAttribute("aria-hidden", "true");
}

function resetForm() {
  [name, type, phone, whatsapp, email, address, hours, services, notes, image, lat, lng]
    .filter(Boolean)
    .forEach(input => input.value = "");
  setSpecialtiesForm([]);
  if (hours24) hours24.checked = false;
  if (hoursStart) hoursStart.value = "";
  if (hoursEnd) hoursEnd.value = "";
  setWorkdaysForm([]);
  dutyDates = [];
  updateImagePreview("");
  if (marker && map) {
    map.removeLayer(marker);
    marker = null;
  }
  if (editIndex) editIndex.value = "";
  initDutyPicker();
  toggleSpecialty();
  populateSelect(governorate, Object.keys(locations), "اختر المحافظة");
  updateCityOptions();
  applyUserScopeToForm();
}

function fillForm(i) {
  const place = places[i];
  if (!place) return;

  editIndex.value = i;
  name.value = place.name || "";
  type.value = place.type || "";
  toggleSpecialty();
  setSpecialtiesForm(place.specialty || "");
  phone.value = place.phone || "";
  whatsapp.value = place.whatsapp || "";
  email.value = place.email || "";
  address.value = place.address || "";
  hours.value = place.hours || "";
  fillHoursFields(place.hours || "");
  services.value = place.services || "";
  notes.value = place.notes || "";
  image.value = place.image || "";
  updateImagePreview(place.image || "");
  lat.value = place.lat || "";
  lng.value = place.lng || "";
  dutyDates = place.schedule || [];
  setWorkdaysForm(place.workdays || []);

  populateSelect(governorate, Object.keys(locations), "اختر المحافظة");
  governorate.value = place.governorate || "";
  updateCityOptions();
  city.value = place.city || "";

  initDutyPicker(dutyDates);
  if (map && place.lat && place.lng) {
    marker = L.marker([place.lat, place.lng]).addTo(map);
    map.setView([place.lat, place.lng], 12);
  }

  applyUserScopeToForm();
}

function updateImagePreview(url) {
  if (!imagePreview) return;
  if (url) {
    imagePreview.classList.add("has-image");
    imagePreview.style.backgroundImage = `url('${url}')`;
    imagePreview.textContent = "";
  } else {
    imagePreview.classList.remove("has-image");
    imagePreview.style.backgroundImage = "none";
    imagePreview.textContent = "لا توجد صورة";
  }
}

function handleImageFile() {
  if (!imageFile || !image) return;
  const file = imageFile.files && imageFile.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    if (!cropModal || !cropImage) return;
    cropModal.classList.add("active");
    cropModal.setAttribute("aria-hidden", "false");
    cropImage.src = reader.result || "";
    cropImage.onload = () => {
      if (cropper) cropper.destroy();
      cropper = new Cropper(cropImage, {
        aspectRatio: 1,
        viewMode: 1,
        autoCropArea: 1,
        background: false,
        movable: true,
        zoomable: true,
        rotatable: true,
        scalable: false
      });
    };
  };
  reader.readAsDataURL(file);
}

function closeCropModal() {
  if (!cropModal) return;
  cropModal.classList.remove("active");
  cropModal.setAttribute("aria-hidden", "true");
  if (cropper) {
    cropper.destroy();
    cropper = null;
  }
  if (imageFile) imageFile.value = "";
}

function saveCroppedImage() {
  if (!cropper) return;
  const size = 256;
  const square = cropper.getCroppedCanvas({
    width: size,
    height: size,
    imageSmoothingEnabled: true,
    imageSmoothingQuality: "high"
  });
  const dataUrl = square.toDataURL("image/jpeg", 1);
  image.value = dataUrl;
  updateImagePreview(image.value);
  closeCropModal();
}

if (type) type.onchange = toggleSpecialty;
function toggleSpecialty() {
  if (!specialtyField || !type) return;
  const specialtyEnabledTypes = ["clinic", "lab", "hospital", "dispensary"];
  const visible = specialtyEnabledTypes.includes(type.value);
  specialtyField.style.display = visible ? "block" : "none";
  if (!visible && specialtySuggestions) specialtySuggestions.hidden = true;
}

function initDutyPicker(d = []) {
  if (dutyPicker) dutyPicker.destroy();
  dutyPicker = flatpickr("#dutyDatesPicker", {
    mode: "multiple",
    dateFormat: "Y-m-d",
    defaultDate: d,
    onChange: (_, s) => dutyDates = s ? s.split(", ") : []
  });
}

function clearDutyDatesHandler() {
  dutyDates = [];
  if (dutyPicker) dutyPicker.clear();
}

function initMap() {
  if (map) return;
  map = L.map("selectMap").setView([36.5, 38], 9);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

  map.on("click", e => {
    lat.value = e.latlng.lat.toFixed(6);
    lng.value = e.latlng.lng.toFixed(6);
    marker ? marker.setLatLng(e.latlng) : (marker = L.marker(e.latlng).addTo(map));
  });
}

function validateForm() {
  if (!name.value || !type.value || !governorate.value || !lat.value || !lng.value) {
    alert("يرجى إكمال البيانات الأساسية قبل الحفظ");
    return false;
  }
  if ((type.value === "clinic" || type.value === "lab" || type.value === "hospital" || type.value === "dispensary") && !specialty.value.trim()) {
    alert("يرجى إدخال اختصاص واحد على الأقل");
    return false;
  }
  if (!hasScopeForSelection()) {
    alert("لا تملك صلاحية للإضافة أو التعديل خارج نطاقك");
    return false;
  }
  const duplicate = places.find((p, idx) => {
    if (idx === Number(editIndex.value)) return false;
    return (
      normalize(p.name) === normalize(name.value) &&
      normalize(p.governorate) === normalize(governorate.value) &&
      normalize(p.city) === normalize(city.value)
    );
  });
  if (duplicate) {
    alert("يوجد مكان مشابه بالاسم والمدينة بالفعل");
    return false;
  }
  return true;
}

function savePlace() {
  if (!canEdit()) {
    alert("صلاحيتك قراءة فقط");
    return;
  }
  if (!validateForm()) return;

  const normalizedSchedule = dutyDates.map(d => (d || "").toString().split("T")[0]);
  const hoursValue = buildHoursValue();
  if (hours) hours.value = hoursValue;
  const nowIso = new Date().toISOString();
  const existing = editIndex.value !== "" ? places[Number(editIndex.value)] : null;
  const quality = placeQuality({
    name: name.value.trim(),
    type: type.value,
    specialty: specialty.value.trim(),
    phone: phone.value.trim(),
    whatsapp: whatsapp.value.trim(),
    governorate: governorate.value.trim(),
    city: city.value.trim(),
    address: address.value.trim(),
    lat: +lat.value,
    lng: +lng.value
  });
  const data = {
    name: name.value.trim(),
    type: type.value,
    specialty: (type.value === "clinic" || type.value === "lab" || type.value === "hospital" || type.value === "dispensary") ? specialty.value.trim() : "",
    phone: phone.value.trim(),
    whatsapp: whatsapp.value.trim(),
    email: email.value.trim(),
    governorate: governorate.value.trim(),
    city: city.value.trim(),
    address: address.value.trim(),
    hours: hoursValue,
    services: services.value.trim(),
    notes: notes.value.trim(),
    image: image.value.trim(),
    lat: +lat.value,
    lng: +lng.value,
    schedule: normalizedSchedule,
    workdays: getWorkdaysFromForm(),
    quality_score: quality.score,
    updated_by: currentUser?.username || "",
    updated_at: nowIso,
    verified: !!existing?.verified,
    verified_by: existing?.verified_by || "",
    verified_at: existing?.verified_at || ""
  };

  (async () => {
    try {
      const key = placeKey(data);
      if (editIndex.value === "") {
        const duplicateIndex = places.findIndex(p => placeKey(p) === key);
        if (duplicateIndex !== -1) {
          editIndex.value = String(duplicateIndex);
        }
      }

      if (editIndex.value !== "") {
        const idx = Number(editIndex.value);
        const existing = places[idx];
        const id = existing?.id || null;
        const savedId = await savePlaceToDb(data, id);
        places[idx] = { ...data, id: savedId || id };
        logAction(`تم تعديل ${data.name}`);
      } else {
        const savedId = await savePlaceToDb(data, null);
        places.push({ ...data, id: savedId });
        logAction(`تمت إضافة ${data.name}`);
      }
      savePlaces();
      closeModal();
      renderAdmin();
    } catch {
      if (editIndex.value !== "") {
        places[editIndex.value] = data;
        logAction(`تم تعديل ${data.name}`);
      } else {
        places.push(data);
        logAction(`تمت إضافة ${data.name}`);
      }
      savePlaces();
      closeModal();
      renderAdmin();
      alert("تعذر الحفظ على الإنترنت، تم الحفظ محلياً فقط");
    }
  })();
}

function deletePlace(i) {
  if (currentUser?.role !== "super") {
    alert("صلاحيتك قراءة فقط");
    return;
  }
  if (!confirm("هل تريد حذف هذا المكان؟")) return;
  if (!hasScopeForPlace(places[i])) {
    alert("لا تملك صلاحية الحذف لهذا المكان");
    return;
  }
  const nameValue = places[i]?.name || "عنصر";
  const id = places[i]?.id;
  (async () => {
    await deletePlaceFromDb(id);
    places.splice(i, 1);
    savePlaces();
    logAction(`تم حذف ${nameValue}`);
    renderAdmin();
  })();
}

function toggleVerify(i) {
  if (currentUser?.role !== "super") {
    alert("هذه العملية للمسؤول المميز فقط");
    return;
  }
  const place = places[i];
  if (!place) return;
  const willVerify = !place.verified;
  const updated = {
    ...place,
    verified: willVerify,
    verified_by: willVerify ? (currentUser?.username || "") : "",
    verified_at: willVerify ? new Date().toISOString() : "",
    updated_by: currentUser?.username || "",
    updated_at: new Date().toISOString()
  };
  (async () => {
    try {
      await savePlaceToDb(updated, place.id || null);
    } catch {
      // keep local update if remote fails
    }
    places[i] = updated;
    savePlaces();
    logAction(`${willVerify ? "تم توثيق" : "تم إلغاء توثيق"} ${place.name}`);
    renderAdmin();
  })();
}

function renderAdmin() {
  if (!adminTable) return;
  const tbody = adminTable.querySelector("tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  if (selectAll) selectAll.checked = false;

  const filtered = places
    .map((place, index) => ({ ...place, _index: index }))
    .filter(place => {
      if (!hasScopeForPlace(place)) return false;
      if (filterType.value !== "all" && place.type !== filterType.value) return false;
      if (filterGov.value && !normalize(place.governorate).includes(normalize(filterGov.value))) return false;
      if (filterCity.value && !normalize(place.city).includes(normalize(filterCity.value))) return false;
      return true;
    });

  if (!filtered.length) {
    if (adminEmpty) adminEmpty.hidden = false;
    updateAdminStats(filtered);
    if (adminPagination) adminPagination.innerHTML = "";
    return;
  }
  if (adminEmpty) adminEmpty.hidden = true;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  if (adminPage > totalPages) adminPage = 1;
  const start = (adminPage - 1) * PAGE_SIZE;
  const slice = filtered.slice(start, start + PAGE_SIZE);
  const isSuper = currentUser?.role === "super";

  slice.forEach(place => {
    const verifiedLabel = place.verified ? "موثّق" : "غير موثّق";
    const updatedLabel = place.updated_at ? new Date(place.updated_at).toLocaleDateString("ar") : "-";
    const row = document.createElement("tr");
    if (!place.verified) row.classList.add("row-unverified");
    row.innerHTML = `
      <td>${isSuper ? `<input type="checkbox" class="row-check" data-index="${place._index}">` : ""}</td>
      <td>
        <strong>${place.name}</strong>
        <div class="muted">${verifiedLabel} • تحديث ${updatedLabel}</div>
      </td>
      <td>${typeLabel(place.type)}</td>
      <td>${place.governorate || ""}</td>
      <td>${place.city || ""}</td>
      <td>${place.phone || ""}</td>
      <td>${place.address || ""}</td>
      <td class="table-row-actions">
        ${canEdit() ? `
          <button class="table-icon-btn" type="button" data-edit="${place._index}" title="تعديل" aria-label="تعديل">
            <i class="fa-solid fa-pen"></i>
          </button>
        ` : ""}
        ${isSuper ? `
          <button class="table-icon-btn ${place.verified ? "warn" : "ok"}" type="button" data-verify="${place._index}" title="${place.verified ? "إلغاء التوثيق" : "توثيق"}" aria-label="${place.verified ? "إلغاء التوثيق" : "توثيق"}">
            <i class="fa-solid ${place.verified ? "fa-shield" : "fa-circle-check"}"></i>
          </button>
        ` : ""}
        ${isSuper ? `
          <button class="table-icon-btn danger" type="button" data-del="${place._index}" title="حذف" aria-label="حذف">
            <i class="fa-solid fa-trash"></i>
          </button>
        ` : ""}
      </td>
    `;
    tbody.appendChild(row);
  });

  updateAdminStats(filtered);
  renderPagination(adminPagination, filtered.length, adminPage, page => {
    adminPage = page;
    renderAdmin();
  });

  tbody.querySelectorAll("[data-edit]").forEach(btn => {
    btn.addEventListener("click", () => openModal(Number(btn.dataset.edit)));
  });
  tbody.querySelectorAll("[data-del]").forEach(btn => {
    btn.addEventListener("click", () => deletePlace(Number(btn.dataset.del)));
  });
  tbody.querySelectorAll("[data-verify]").forEach(btn => {
    btn.addEventListener("click", () => toggleVerify(Number(btn.dataset.verify)));
  });
}

function deleteSelectedRows() {
  if (currentUser?.role !== "super") {
    alert("صلاحيتك قراءة فقط");
    return;
  }
  const checks = document.querySelectorAll(".row-check:checked");
  if (!checks.length) return;
  if (!confirm("هل تريد حذف العناصر المحددة؟")) return;
  const indexes = [...checks].map(c => Number(c.dataset.index)).sort((a, b) => b - a);
  (async () => {
    for (const i of indexes) {
      if (hasScopeForPlace(places[i])) {
        const id = places[i]?.id;
        await deletePlaceFromDb(id);
        places.splice(i, 1);
      }
    }
    savePlaces();
    logAction("تم حذف عناصر محددة");
    renderAdmin();
  })();
}

function updateAdminStats(list) {
  if (adminTotal) adminTotal.textContent = list.length;
  if (adminOnDuty)
    adminOnDuty.textContent = list.filter(p => p.type === "pharmacy" && isOnDuty(p)).length;
  if (adminUnverified) {
    adminUnverified.textContent = list.filter(p => !p.verified).length;
  }
  if (adminUpdated) {
    const last = localStorage.getItem(UPDATED_KEY);
    adminUpdated.textContent = last ? new Date(last).toLocaleString("ar") : "-";
  }
}

function renderLogs() {
  if (!adminLog) return;
  adminLog.innerHTML = "";
  const totalPages = Math.max(1, Math.ceil(logs.length / PAGE_SIZE));
  if (logPage > totalPages) logPage = 1;
  const start = (logPage - 1) * PAGE_SIZE;
  const slice = logs.slice(start, start + PAGE_SIZE);

  slice.forEach(item => {
    const li = document.createElement("li");
    li.textContent = `${item.action} - بواسطة ${item.actor || "system"} - ${new Date(item.at).toLocaleString("ar")}`;
    adminLog.appendChild(li);
  });
  renderPagination(logPagination, logs.length, logPage, page => {
    logPage = page;
    renderLogs();
  });
}

function exportData() {
  if (currentUser?.role !== "super") return;
  const blob = new Blob([JSON.stringify(places, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "health-duty-data.json";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function exportCSV() {
  if (currentUser?.role !== "super") return;
  const headers = [
    "name",
    "type",
    "specialty",
    "phone",
    "workdays",
    "governorate",
    "city",
    "address",
    "lat",
    "lng",
    "schedule"
  ];
  const rows = places.map(p => [
    p.name,
    p.type,
    p.specialty || "",
    p.phone || "",
    Array.isArray(p.workdays) ? p.workdays.join("|") : "",
    p.governorate || "",
    p.city || "",
    p.address || "",
    p.lat || "",
    p.lng || "",
    Array.isArray(p.schedule) ? p.schedule.join("|") : ""
  ]);
  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "health-duty-data.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  logAction("تم تصدير CSV");
}

function triggerImport() {
  if (currentUser?.role !== "super") {
    alert("صلاحيتك قراءة فقط");
    return;
  }
  importFile?.click();
}

function importData(event) {
  if (currentUser?.role !== "super") {
    alert("هذه العملية للمسؤول المميز فقط");
    return;
  }
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data)) throw new Error("invalid");
      places = data;
      savePlaces();
      renderAdmin();
      logAction("تم استيراد البيانات");
      alert("تم استيراد البيانات بنجاح");
    } catch {
      alert("ملف الاستيراد غير صالح");
    }
  };
  reader.readAsText(file);
}

function clearAll() {
  if (!confirm("سيتم حذف جميع البيانات، هل أنت متأكد؟")) return;
  if (currentUser?.role !== "super") {
    alert("لا تملك صلاحية حذف الكل");
    return;
  }
  places = [];
  savePlaces();
  logAction("تم حذف جميع البيانات");
  renderAdmin();
}

function renderUsers() {
  if (!usersList) return;
  usersList.innerHTML = "";
  const filter = normalize(userFilter?.value || "");
  const users = loadUsers().filter(u => {
    if (!filter) return true;
    const hay = `${u.username} ${u.role} ${u.governorate || ""} ${u.city || ""} ${u.phone || ""}`.toLowerCase();
    return hay.includes(filter);
  });
  users.forEach(user => {
    const item = document.createElement("div");
    item.className = "user-item";
    const scope = user.role === "super"
      ? "مسؤول مميز"
      : user.role === "governorate"
      ? `محافظة: ${user.governorate}`
      : user.role === "city"
      ? `مدينة: ${user.city}`
      : "مشاهدة فقط";
    item.innerHTML = `
      <span>${user.username} - ${scope}</span>
      <span>${user.phone || ""}</span>
      <span>${user.address || ""}</span>
      <div>
        <button class="btn ghost" data-edit="${user.username}">تعديل</button>
        ${user.username === "admin" ? "" : `<button class="btn danger" data-user="${user.username}">إزالة</button>`}
      </div>
    `;
    usersList.appendChild(item);
  });

  usersList.querySelectorAll("[data-user]").forEach(btn => {
    btn.addEventListener("click", () => {
      const users = loadUsers().filter(u => u.username !== btn.dataset.user);
      saveUsers(users);
      logAction("تم حذف مستخدم");
      renderUsers();
    });
  });

  usersList.querySelectorAll("[data-edit]").forEach(btn => {
    btn.addEventListener("click", () => {
      const user = loadUsers().find(u => u.username === btn.dataset.edit);
      if (!user) return;
      editingUser = user.username;
      userName.value = user.username;
      userPass.value = user.password;
      userPhone.value = user.phone || "";
      userAddress.value = user.address || "";
      userRole.value = user.role || "viewer";
      populateUserScopeOptions();
      userGov.value = user.governorate || "";
      updateUserScopeForm();
      userCity.value = user.city || "";
      updateUserBtn.hidden = false;
      addUserBtn.hidden = true;
    });
  });
}

function addUser() {
  const username = normalize(userName?.value);
  const password = userPass?.value || "";
  const role = userRole?.value || "super";
  const gov = userGov?.value || "";
  const cityVal = userCity?.value || "";
  const phone = userPhone?.value || "";
  const addressVal = userAddress?.value || "";

  if (!username || !password) {
    alert("يرجى إدخال اسم المستخدم وكلمة المرور");
    return;
  }

  if ((role === "governorate" && !gov) || (role === "city" && (!gov || !cityVal))) {
    alert("يرجى تحديد المحافظة والمدينة حسب الدور");
    return;
  }

  const users = loadUsers();
  if (users.some(u => normalize(u.username) === username)) {
    alert("اسم المستخدم موجود بالفعل");
    return;
  }

  const newUser = { username, password, role, governorate: gov, city: cityVal, phone, address: addressVal };
  users.push(newUser);
  saveUsers(users);
  logAction("تمت إضافة مستخدم");
  renderUsers();

  userName.value = "";
  userPass.value = "";
  userPhone.value = "";
  userAddress.value = "";
}

function updateUser() {
  if (!editingUser) return;
  const users = loadUsers();
  const idx = users.findIndex(u => u.username === editingUser);
  if (idx === -1) return;

  users[idx] = {
    ...users[idx],
    password: userPass?.value || users[idx].password,
    role: userRole?.value || users[idx].role,
    governorate: userGov?.value || "",
    city: userCity?.value || "",
    phone: userPhone?.value || "",
    address: userAddress?.value || ""
  };
  saveUsers(users);
  logAction("تم تحديث بيانات مستخدم");
  renderUsers();

  editingUser = null;
  addUserBtn.hidden = false;
  updateUserBtn.hidden = true;
  userName.value = "";
  userPass.value = "";
  userPhone.value = "";
  userAddress.value = "";
}

function updateUserScopeForm() {
  if (!userRole) return;
  const role = userRole.value;
  if (role === "super" || role === "viewer") {
    userGov.disabled = true;
    userCity.disabled = true;
    userGov.value = "";
    userCity.value = "";
    return;
  }
  userGov.disabled = false;
  if (role === "governorate") {
    userCity.disabled = true;
    userCity.value = "";
  } else {
    userCity.disabled = false;
  }
}

function populateUserScopeOptions() {
  populateSelect(userGov, Object.keys(locations), "اختر المحافظة");
  userGov.addEventListener("change", () => {
    const gov = userGov.value;
    const cities = gov && locations[gov] ? Object.keys(locations[gov]) : [];
    populateSelect(userCity, cities, "اختر المدينة");
  });
}

function refreshLocationManagement() {
  const prevGov = locGov?.value || "";
  populateSelect(locGov, Object.keys(locations), "اختر المحافظة");
  if (prevGov && locations[prevGov]) locGov.value = prevGov;
  if (!locGov.value) {
    const firstGov = Object.keys(locations)[0];
    if (firstGov) locGov.value = firstGov;
  }
  const gov = locGov?.value;
  const cities = gov && locations[gov] ? Object.keys(locations[gov]) : [];
  const prevCity = locCity?.value || "";
  populateSelect(locCity, cities, "اختر المدينة");
  if (prevCity && cities.includes(prevCity)) locCity.value = prevCity;
}

function refreshSpecialtyManagement() {
  if (!specialtySelect) return;
  const prev = specialtySelect.value;
  specialtySelect.innerHTML = "";
  specialties.forEach(item => {
    const option = document.createElement("option");
    option.value = item;
    option.textContent = item;
    specialtySelect.appendChild(option);
  });
  if (prev && specialties.includes(prev)) specialtySelect.value = prev;
}

function addSpecialty() {
  if (currentUser?.role !== "super") {
    alert("هذه العملية للمسؤول المميز فقط");
    return;
  }
  const value = newSpecialty?.value?.trim();
  if (!value) return;
  specialties = uniqueSpecialties([...specialties, value]);
  saveSpecialties();
  refreshSpecialtyManagement();
  newSpecialty.value = "";
  logAction("تمت إضافة اختصاص");
}

function removeSpecialty() {
  if (currentUser?.role !== "super") {
    alert("هذه العملية للمسؤول المميز فقط");
    return;
  }
  const value = specialtySelect?.value;
  if (!value) return;
  if (!confirm("هل تريد حذف هذا الاختصاص من القائمة؟")) return;
  specialties = specialties.filter(item => normalizeSpecialty(item) !== normalizeSpecialty(value));
  selectedSpecialties = selectedSpecialties.filter(item => normalizeSpecialty(item) !== normalizeSpecialty(value));
  saveSpecialties();
  refreshSpecialtyManagement();
  syncSpecialtyValue();
  renderSpecialtyChips();
  renderSpecialtySuggestions(specialtySearch?.value || "");
  logAction("تم حذف اختصاص");
}

function addGovernorate() {
  if (currentUser?.role !== "super") {
    alert("هذه العملية للمسؤول المميز فقط");
    return;
  }
  const value = newGov?.value?.trim();
  if (!value) return;
  if (!locations[value]) {
    locations[value] = {};
    saveLocations();
    logAction("تمت إضافة محافظة");
  }
  newGov.value = "";
  refreshLocationManagement();
}

function addCity() {
  if (currentUser?.role !== "super") {
    alert("هذه العملية للمسؤول المميز فقط");
    return;
  }
  const gov = locGov?.value || Object.keys(locations)[0] || "";
  const value = newCity?.value?.trim();
  if (!gov) {
    alert("يرجى اختيار المحافظة أولاً");
    return;
  }
  if (!value) return;
  if (!locations[gov]) locations[gov] = {};
  if (!locations[gov][value]) locations[gov][value] = [];
  saveLocations();
  logAction("تمت إضافة مدينة");
  newCity.value = "";
  refreshLocationManagement();
}

function removeGovernorate() {
  if (currentUser?.role !== "super") {
    alert("هذه العملية للمسؤول المميز فقط");
    return;
  }
  const gov = locGov?.value;
  if (!gov) return;
  if (!confirm("هل تريد حذف المحافظة بكل مدنها؟")) return;
  delete locations[gov];
  saveLocations();
  logAction("تم حذف محافظة");
  refreshLocationManagement();
}

function removeCity() {
  if (currentUser?.role !== "super") {
    alert("هذه العملية للمسؤول المميز فقط");
    return;
  }
  const gov = locGov?.value;
  const cityVal = locCity?.value;
  if (!gov || !cityVal) return;
  if (!confirm("هل تريد حذف المدينة بكل قراها؟")) return;
  delete locations[gov][cityVal];
  saveLocations();
  logAction("تم حذف مدينة");
  refreshLocationManagement();
}

function reportTypeLabel(type) {
  if (type === "wrong_phone") return "رقم غير صحيح";
  if (type === "closed_place") return "المكان مغلق";
  if (type === "wrong_location") return "موقع غير دقيق";
  if (type === "wrong_hours") return "ساعات غير صحيحة";
  return "أخرى";
}

function reportStatusLabel(status) {
  if (status === "in_progress") return "قيد المعالجة";
  if (status === "resolved") return "مغلق";
  return "مفتوح";
}

function renderReports() {
  if (!reportsTable) return;
  const tbody = reportsTable.querySelector("tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  const statusFilter = reportFilterStatus?.value || "all";
  const list = reports.filter(r => statusFilter === "all" || (r.status || "open") === statusFilter);

  if (!list.length) {
    if (reportsEmpty) reportsEmpty.hidden = false;
    return;
  }
  if (reportsEmpty) reportsEmpty.hidden = true;

  list.forEach((report, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${report.place_name || "-"}</td>
      <td>${report.governorate || ""} ${report.city ? "- " + report.city : ""}</td>
      <td>${reportTypeLabel(report.report_type)}</td>
      <td>${reportStatusLabel(report.status || "open")}</td>
      <td>${report.note || "-"}</td>
      <td>${report.created_at ? new Date(report.created_at).toLocaleString("ar") : "-"}</td>
      <td>
        <button class="btn ghost" data-report-status="${index}" data-next="open">فتح</button>
        <button class="btn ghost" data-report-status="${index}" data-next="in_progress">معالجة</button>
        <button class="btn ghost" data-report-status="${index}" data-next="resolved">إغلاق</button>
        <button class="btn danger" data-report-del="${index}">حذف</button>
      </td>
    `;
    tbody.appendChild(row);
  });

  tbody.querySelectorAll("[data-report-status]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const idx = Number(btn.dataset.reportStatus);
      const next = btn.dataset.next || "open";
      const report = list[idx];
      if (!report) return;
      report.status = next;
      report.handled_by = currentUser?.username || "";
      report.handled_at = new Date().toISOString();
      const reportIdx = reports.findIndex(r => r === report || (r.id && report.id && r.id === report.id));
      if (reportIdx !== -1) reports[reportIdx] = report;
      saveReports();
      try {
        await saveReportStatusToDb(report);
      } catch {
        // keep local
      }
      logAction(`تحديث حالة بلاغ ${report.place_name || ""} إلى ${reportStatusLabel(next)}`);
      renderReports();
    });
  });

  tbody.querySelectorAll("[data-report-del]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const idx = Number(btn.dataset.reportDel);
      const report = list[idx];
      if (!report) return;
      const reportIdx = reports.findIndex(r => r === report || (r.id && report.id && r.id === report.id));
      if (reportIdx === -1) return;
      reports.splice(reportIdx, 1);
      saveReports();
      try {
        await deleteReportFromDb(report.id);
      } catch {
        // keep local
      }
      logAction(`حذف بلاغ ${report.place_name || ""}`);
      renderReports();
    });
  });
}

function applicationTypeLabel(type) {
  return type === "update" ? "تعديل" : "إضافة";
}

function applicationStatusLabel(status) {
  if (status === "approved") return "مقبول";
  if (status === "rejected") return "مرفوض";
  if (status === "needs_changes") return "يتطلب تعديل";
  if (status === "in_review") return "قيد المراجعة";
  return "معلق";
}

async function applyApprovedApplication(application) {
  const payload = application?.payload || {};
  if (!payload.name || !payload.type || !payload.governorate || !payload.city || !payload.lat || !payload.lng) {
    throw new Error("missing required payload");
  }

  if (application.type === "update") {
    let idx = places.findIndex(p => p.id && application.place_id && p.id === application.place_id);
    if (idx === -1) {
      idx = places.findIndex(p =>
        normalize(p.name) === normalize(payload.name) &&
        normalize(p.governorate) === normalize(payload.governorate) &&
        normalize(p.city) === normalize(payload.city)
      );
    }
    if (idx === -1) throw new Error("target place not found");
    const merged = { ...places[idx], ...payload };
    const placeId = places[idx]?.id || null;
    const savedId = await savePlaceToDb(merged, placeId);
    places[idx] = { ...merged, id: savedId || placeId };
    return savedId || placeId || null;
  } else {
    const savedId = await savePlaceToDb(payload, null);
    places.push({ ...payload, id: savedId || null });
    return savedId || null;
  }
}

function persistPlacesAfterApproval() {
  savePlaces();
}

function renderApplications() {
  if (!applicationsTable) return;
  const tbody = applicationsTable.querySelector("tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  const statusFilter = applicationFilterStatus?.value || "all";
  const typeFilter = applicationFilterType?.value || "all";
  const list = applications
    .filter(a => statusFilter === "all" || (a.status || "pending") === statusFilter)
    .filter(a => typeFilter === "all" || (a.type || "create") === typeFilter);

  if (!list.length) {
    if (applicationsEmpty) applicationsEmpty.hidden = false;
    return;
  }
  if (applicationsEmpty) applicationsEmpty.hidden = true;

  list.forEach((app, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${applicationTypeLabel(app.type || "create")}</td>
      <td>${app.payload?.name || "-"}</td>
      <td>${app.submitted_by_name || "-"}<br><span class="muted">${app.submitted_by_phone || ""}</span></td>
      <td>${applicationStatusLabel(app.status || "pending")}</td>
      <td>${app.submitted_at ? new Date(app.submitted_at).toLocaleString("ar") : "-"}</td>
      <td class="table-row-actions">
        <button class="table-icon-btn" type="button" data-app-status="${index}" data-next="in_review" title="قيد المراجعة" aria-label="قيد المراجعة">
          <i class="fa-solid fa-eye"></i>
        </button>
        <button class="table-icon-btn ok" type="button" data-app-status="${index}" data-next="approved" title="قبول" aria-label="قبول">
          <i class="fa-solid fa-check"></i>
        </button>
        <button class="table-icon-btn danger" type="button" data-app-status="${index}" data-next="rejected" title="رفض" aria-label="رفض">
          <i class="fa-solid fa-xmark"></i>
        </button>
        <button class="table-icon-btn warn" type="button" data-app-status="${index}" data-next="needs_changes" title="طلب تعديل" aria-label="طلب تعديل">
          <i class="fa-solid fa-pen-to-square"></i>
        </button>
      </td>
    `;
    tbody.appendChild(row);
  });

  tbody.querySelectorAll("[data-app-status]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const idx = Number(btn.dataset.appStatus);
      const next = btn.dataset.next || "in_review";
      const app = list[idx];
      if (!app) return;
      const appIdx = applications.findIndex(a => a === app || (a.id && app.id && a.id === app.id) || (a.local_id && app.local_id && a.local_id === app.local_id));
      if (appIdx === -1) return;

      let reviewNote = "";
      if (next === "rejected" || next === "needs_changes") {
        reviewNote = prompt("أدخل سبب القرار:", app.review_note || "") || "";
      }

        try {
          if (next === "approved") {
            const approvedPlaceId = await applyApprovedApplication(app);
            if (approvedPlaceId) {
              app.place_id = approvedPlaceId;
            }
            persistPlacesAfterApproval();
          }
        applications[appIdx] = {
          ...applications[appIdx],
          status: next,
          review_note: reviewNote,
          reviewed_by: currentUser?.username || "",
          reviewed_at: new Date().toISOString()
        };
        saveApplications();
        try {
          await saveApplicationToDb(applications[appIdx]);
        } catch {
          // keep local
        }
        logAction(`تحديث طلب ${app.payload?.name || ""} إلى ${applicationStatusLabel(next)}`);
        if (next === "approved" && applicationFilterStatus && applicationFilterStatus.value === "all") {
          applicationFilterStatus.value = "pending";
        }
        renderApplications();
        renderAdmin();
      } catch {
        alert("تعذر تطبيق الطلب، تحقق من البيانات المطلوبة");
      }
    });
  });
}

function isSuperOnlyView(view) {
  return ["users", "locations", "specialties", "applications", "reports"].includes(view);
}

function canAccessView(view) {
  if (!view) return false;
  if (!isSuperOnlyView(view)) return true;
  return currentUser?.role === "super";
}

function applyAdminView(view) {
  const selectedView = canAccessView(view) ? view : "dashboard";
  currentAdminView = selectedView;
  const sections = [
    dashboardSection,
    placesSection,
    userManagement,
    locationManagement,
    specialtyManagement,
    activityPanel,
    reportsPanel,
    applicationsPanel
  ].filter(Boolean);
  sections.forEach(section => {
    const sectionView = section.dataset?.view;
    section.hidden = sectionView !== selectedView;
  });
  adminNavButtons.forEach(btn => {
    btn.classList.toggle("active", btn.dataset.adminView === selectedView);
  });
}

function configureAdminSidebarByRole() {
  const isSuper = currentUser?.role === "super";
  document.querySelectorAll(".admin-nav-btn[data-super-only='true']").forEach(btn => {
    btn.hidden = !isSuper;
  });
  if (!canAccessView(currentAdminView)) {
    applyAdminView("dashboard");
  }
}

function updateToolbarByRole() {
  const buttons = document.querySelectorAll(".admin-toolbar button");
  buttons.forEach(btn => {
    if (btn.textContent.includes("إضافة مكان")) {
      btn.disabled = !canEdit();
    }
  });
  const isSuper = currentUser?.role === "super";
  document.querySelectorAll(".toolbar-actions .btn").forEach(btn => {
    btn.hidden = !isSuper;
  });
  if (deleteSelected) deleteSelected.hidden = !isSuper;
  if (selectAll) {
    selectAll.disabled = !isSuper;
    const th = selectAll.closest("th");
    if (th) th.hidden = !isSuper;
  }
}

function renderPagination(container, totalItems, current, onPage) {
  if (!container) return;
  if (totalItems <= PAGE_SIZE) {
    container.innerHTML = "";
    return;
  }
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  container.innerHTML = "";
  if (totalPages <= 1) return;
  for (let i = 1; i <= totalPages; i += 1) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = i;
    if (i === current) btn.classList.add("active");
    btn.addEventListener("click", () => onPage(i));
    container.appendChild(btn);
  }
}

async function bootApp() {
  if (!currentUser) return;
  if (loginPanel) loginPanel.hidden = true;
  if (adminApp) adminApp.hidden = false;
  if (logoutBtn) logoutBtn.hidden = false;
  setUserBadge();

  locations = loadLocations();
  specialties = loadSpecialties();
  places = (await loadPlacesFromDb()) || loadPlaces();
  reports = (await loadReportsFromDb()) || loadReports();
  applications = (await loadApplicationsFromDb()) || loadApplications();
  specialties = uniqueSpecialties([
    ...specialties,
    ...places.flatMap(place => toSpecialtyArray(place.specialty))
  ]);
  saveSpecialties();
  ensureSeedPlaces();
  await purgeSamplePlaces();
  logs = loadLogs();
  adminPage = 1;
  logPage = 1;

  renderLogs();
  renderAdmin();
  updateToolbarByRole();
  configureAdminSidebarByRole();

  if (currentUser.role === "super") {
    populateUserScopeOptions();
    updateUserScopeForm();
    renderUsers();
    refreshLocationManagement();
    refreshSpecialtyManagement();
    renderReports();
    renderApplications();
  }

  applyAdminView("dashboard");
  populateSelect(governorate, Object.keys(locations), "اختر المحافظة");
  updateCityOptions();
  setSpecialtiesForm([]);
  applyUserScopeToForm();
}

if (governorate) governorate.addEventListener("change", () => {
  updateCityOptions();
  applyUserScopeToForm();
});
adminNavButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const view = btn.dataset.adminView;
    applyAdminView(view || "dashboard");
  });
});
if (navAddPlace) {
  navAddPlace.addEventListener("click", () => {
    applyAdminView("places");
    openModal();
  });
}
if (image) image.addEventListener("input", () => updateImagePreview(image.value.trim()));
if (imageFile) imageFile.addEventListener("change", handleImageFile);
if (rotateLeft) rotateLeft.addEventListener("click", () => cropper?.rotate(-90));
if (rotateRight) rotateRight.addEventListener("click", () => cropper?.rotate(90));
if (cropSave) cropSave.addEventListener("click", saveCroppedImage);
if (cropCancel) cropCancel.addEventListener("click", closeCropModal);
if (importFile) importFile.addEventListener("change", importData);
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
if (logoutBtn) logoutBtn.addEventListener("click", logout);
if (addUserBtn) addUserBtn.addEventListener("click", addUser);
if (userRole) userRole.addEventListener("change", updateUserScopeForm);
if (updateUserBtn) updateUserBtn.addEventListener("click", updateUser);
if (userFilter) userFilter.addEventListener("input", renderUsers);
if (clearDutyDates) clearDutyDates.addEventListener("click", clearDutyDatesHandler);
if (selectAll) {
  selectAll.addEventListener("change", () => {
    document.querySelectorAll(".row-check").forEach(c => {
      c.checked = selectAll.checked;
    });
  });
}
if (deleteSelected) deleteSelected.addEventListener("click", deleteSelectedRows);
if (workdaysAll) {
  workdaysAll.addEventListener("change", () => {
    workdaysInputs.forEach(input => {
      input.checked = workdaysAll.checked;
    });
  });
}
workdaysInputs.forEach(input => {
  input.addEventListener("change", syncWorkdaysAll);
});

if (locGov) locGov.addEventListener("change", refreshLocationManagement);
if (locCity) locCity.addEventListener("change", refreshLocationManagement);
if (addGovBtn) addGovBtn.addEventListener("click", addGovernorate);
if (addCityBtn) addCityBtn.addEventListener("click", addCity);
if (removeGovBtn) removeGovBtn.addEventListener("click", removeGovernorate);
if (removeCityBtn) removeCityBtn.addEventListener("click", removeCity);
if (reportFilterStatus) reportFilterStatus.addEventListener("change", renderReports);
if (applicationFilterStatus) applicationFilterStatus.addEventListener("change", renderApplications);
if (applicationFilterType) applicationFilterType.addEventListener("change", renderApplications);
if (addSpecialtyBtn) addSpecialtyBtn.addEventListener("click", addSpecialty);
if (removeSpecialtyBtn) removeSpecialtyBtn.addEventListener("click", removeSpecialty);
if (newSpecialty) {
  newSpecialty.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      addSpecialty();
    }
  });
}

if (specialtySearch) {
  specialtySearch.addEventListener("focus", () => renderSpecialtySuggestions(specialtySearch.value));
  specialtySearch.addEventListener("input", () => renderSpecialtySuggestions(specialtySearch.value));
  specialtySearch.addEventListener("keydown", event => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    addSpecialtyToSelection(specialtySearch.value);
  });
}

document.addEventListener("click", event => {
  if (!specialtySuggestions || !specialtyField) return;
  if (specialtyField.contains(event.target)) return;
  specialtySuggestions.hidden = true;
});

[filterType, filterGov, filterCity]
  .filter(Boolean)
  .forEach(el => el.addEventListener("input", () => {
    adminPage = 1;
    renderAdmin();
  }));

function updateMarkerFromInputs() {
  if (!map) return;
  const latVal = parseFloat(lat?.value);
  const lngVal = parseFloat(lng?.value);
  if (Number.isNaN(latVal) || Number.isNaN(lngVal)) return;
  const point = [latVal, lngVal];
  if (marker) {
    marker.setLatLng(point);
  } else {
    marker = L.marker(point).addTo(map);
  }
  map.setView(point, 12);
}


if (lat) lat.addEventListener("input", updateMarkerFromInputs);
if (lng) lng.addEventListener("input", updateMarkerFromInputs);
if (hours24) {
  hours24.addEventListener("change", () => {
    if (hours24.checked) {
      if (hoursStart) hoursStart.value = "";
      if (hoursEnd) hoursEnd.value = "";
    }
  });
}

ensureDefaultUser();
locations = loadLocations();
specialties = loadSpecialties();
const session = loadSession();
if (session) {
  currentUser = session;
  bootApp();
} else {
  if (loginPanel) loginPanel.hidden = false;
  if (adminApp) adminApp.hidden = true;
}
