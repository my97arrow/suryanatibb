const STORAGE_KEY = "places";
const USERS_KEY = "healthDutyUsers";
const SESSION_KEY = "healthDutySession";
const LOG_KEY = "healthDutyLogs";
const UPDATED_KEY = "healthDutyUpdated";
const BACKUP_KEY = "healthDutyBackups";
const LOCATIONS_KEY = "healthDutyLocations";
const todayISO = new Date().toISOString().split("T")[0];

const SEED_PLACES = [
  {
    name: "صيدلية الشفاء",
    type: "pharmacy",
    specialty: "",
    phone: "0950000000",
    whatsapp: "963950000000",
    email: "",
    governorate: "دمشق",
    city: "دمشق",
    address: "شارع الثورة - جانب مشفى الهلال",
    hours: "24 ساعة",
    services: "قياس ضغط، سكري، إسعافات أولية",
    notes: "",
    image: "",
    lat: 33.5138,
    lng: 36.2765,
    schedule: [todayISO]
  },
  {
    name: "عيادة الدكتور أمجد",
    type: "clinic",
    specialty: "قلبية",
    phone: "0941111111",
    whatsapp: "",
    email: "",
    governorate: "حلب",
    city: "حلب",
    address: "السبيل - مقابل مشفى الجامعة",
    hours: "9:00 - 20:00",
    services: "استشارات قلبية، تخطيط قلب",
    notes: "",
    image: "",
    lat: 36.2021,
    lng: 37.1343,
    schedule: []
  },
  {
    name: "مخبر الأمل الطبي",
    type: "lab",
    specialty: "تحاليل",
    phone: "0932222222",
    whatsapp: "",
    email: "",
    governorate: "حمص",
    city: "حمص",
    address: "الزهراء - قرب الدوار",
    hours: "8:00 - 19:00",
    services: "تحاليل شاملة، سحب منزلي",
    notes: "",
    image: "",
    lat: 34.7309,
    lng: 36.7094,
    schedule: []
  }
];

let map = null;
let marker = null;
let dutyPicker = null;
let dutyDates = [];
let pendingIndex = null;
let currentUser = null;
let places = [];
let logs = [];
let locations = {};
let editingUser = null;

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

const adminCards = document.getElementById("adminCards");
const adminEmpty = document.getElementById("adminEmpty");
const placeModal = document.getElementById("placeModal");
const importFile = document.getElementById("importFile");
const adminTotal = document.getElementById("adminTotal");
const adminOnDuty = document.getElementById("adminOnDuty");
const adminUpdated = document.getElementById("adminUpdated");
const adminLog = document.getElementById("adminLog");
const adminTable = document.getElementById("adminTable");
const selectAll = document.getElementById("selectAll");
const deleteSelected = document.getElementById("deleteSelected");
const adminPagination = document.getElementById("adminPagination");
const logPagination = document.getElementById("logPagination");

const PAGE_SIZE = 10;
let adminPage = 1;
let logPage = 1;

const name = document.getElementById("name");
const type = document.getElementById("type");
const specialty = document.getElementById("specialty");
const phone = document.getElementById("phone");
const whatsapp = document.getElementById("whatsapp");
const email = document.getElementById("email");
const governorate = document.getElementById("governorate");
const city = document.getElementById("city");
const address = document.getElementById("address");
const hours = document.getElementById("hours");
const services = document.getElementById("services");
const notes = document.getElementById("notes");
const image = document.getElementById("image");
const imagePreview = document.getElementById("imagePreview");
const lat = document.getElementById("lat");
const lng = document.getElementById("lng");
const editIndex = document.getElementById("editIndex");
const clearDutyDates = document.getElementById("clearDutyDates");

const filterType = document.getElementById("filterType");
const filterGov = document.getElementById("filterGov");
const filterCity = document.getElementById("filterCity");

const loginPanel = document.getElementById("loginPanel");
const adminApp = document.getElementById("adminApp");
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
  if (id) {
    const { data: updated, error } = await window.supabaseClient
      .from("places")
      .update(data)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return updated?.id || id;
  }
  const { data: inserted, error } = await window.supabaseClient
    .from("places")
    .insert(data)
    .select("*")
    .single();
  if (error) throw error;
  return inserted?.id || null;
}

async function deletePlaceFromDb(id) {
  if (!window.supabaseClient || !id) return;
  await window.supabaseClient.from("places").delete().eq("id", id);
}

function ensureSeedPlaces() {
  if (!places.length) {
    (async () => {
      if (window.supabaseClient) {
        await window.supabaseClient.from("places").insert(SEED_PLACES);
      }
      places = SEED_PLACES;
      savePlaces();
    })();
  }
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

function saveLogs() {
  localStorage.setItem(LOG_KEY, JSON.stringify(logs.slice(0, 50)));
}

function logAction(action) {
  const entry = { action, at: new Date().toISOString() };
  logs.unshift(entry);
  logPage = 1;
  saveLogs();
  renderLogs();
}

function isOnDuty(place) {
  return Array.isArray(place.schedule) && place.schedule.includes(todayISO);
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
  [name, type, specialty, phone, whatsapp, email, address, hours, services, notes, image, lat, lng]
    .filter(Boolean)
    .forEach(input => input.value = "");
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
  specialty.value = place.specialty || "";
  phone.value = place.phone || "";
  whatsapp.value = place.whatsapp || "";
  email.value = place.email || "";
  address.value = place.address || "";
  hours.value = place.hours || "";
  services.value = place.services || "";
  notes.value = place.notes || "";
  image.value = place.image || "";
  updateImagePreview(place.image || "");
  lat.value = place.lat || "";
  lng.value = place.lng || "";
  dutyDates = place.schedule || [];

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

if (type) type.onchange = toggleSpecialty;
function toggleSpecialty() {
  if (!specialty || !type) return;
  specialty.style.display = type.value === "clinic" || type.value === "lab" ? "block" : "none";
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
  if ((type.value === "clinic" || type.value === "lab") && !specialty.value) {
    alert("يرجى إدخال الاختصاص للعيادات والمخابر");
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

  const data = {
    name: name.value.trim(),
    type: type.value,
    specialty: specialty.value.trim(),
    phone: phone.value.trim(),
    whatsapp: whatsapp.value.trim(),
    email: email.value.trim(),
    governorate: governorate.value.trim(),
    city: city.value.trim(),
    address: address.value.trim(),
    hours: hours.value.trim(),
    services: services.value.trim(),
    notes: notes.value.trim(),
    image: image.value.trim(),
    lat: +lat.value,
    lng: +lng.value,
    schedule: dutyDates
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
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${isSuper ? `<input type="checkbox" class="row-check" data-index="${place._index}">` : ""}</td>
      <td>${place.name}</td>
      <td>${typeLabel(place.type)}</td>
      <td>${place.governorate || ""}</td>
      <td>${place.city || ""}</td>
      <td>${place.phone || ""}</td>
      <td>${place.address || ""}</td>
      <td>
        ${canEdit() ? `<button class="btn ghost" data-edit="${place._index}">تعديل</button>` : ""}
        ${isSuper ? `<button class="btn danger" data-del="${place._index}">حذف</button>` : ""}
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
    li.textContent = `${item.action} - ${new Date(item.at).toLocaleString("ar")}`;
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
  places = (await loadPlacesFromDb()) || loadPlaces();
  ensureSeedPlaces();
  logs = loadLogs();
  adminPage = 1;
  logPage = 1;

  renderLogs();
  renderAdmin();
  updateToolbarByRole();

  if (currentUser.role === "super") {
    if (userManagement) userManagement.hidden = false;
    if (locationManagement) locationManagement.hidden = false;
    populateUserScopeOptions();
    updateUserScopeForm();
    renderUsers();
    refreshLocationManagement();
  } else {
    if (userManagement) userManagement.hidden = true;
    if (locationManagement) locationManagement.hidden = true;
  }

  populateSelect(governorate, Object.keys(locations), "اختر المحافظة");
  updateCityOptions();
  applyUserScopeToForm();
}

if (governorate) governorate.addEventListener("change", () => {
  updateCityOptions();
  applyUserScopeToForm();
});
if (image) image.addEventListener("input", () => updateImagePreview(image.value.trim()));
if (importFile) importFile.addEventListener("change", importData);
if (loginBtn) loginBtn.addEventListener("click", login);
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

if (locGov) locGov.addEventListener("change", refreshLocationManagement);
if (locCity) locCity.addEventListener("change", refreshLocationManagement);
if (addGovBtn) addGovBtn.addEventListener("click", addGovernorate);
if (addCityBtn) addCityBtn.addEventListener("click", addCity);
if (removeGovBtn) removeGovBtn.addEventListener("click", removeGovernorate);
if (removeCityBtn) removeCityBtn.addEventListener("click", removeCity);

[filterType, filterGov, filterCity]
  .filter(Boolean)
  .forEach(el => el.addEventListener("input", () => {
    adminPage = 1;
    renderAdmin();
  }));

ensureDefaultUser();
locations = loadLocations();
const session = loadSession();
if (session) {
  currentUser = session;
  bootApp();
} else {
  if (loginPanel) loginPanel.hidden = false;
  if (adminApp) adminApp.hidden = true;
}
