const APPLICATIONS_KEY = "healthDutyApplications";
const LOCATIONS_KEY = "healthDutyLocations";
const STORAGE_KEY = "places";

const ownerName = document.getElementById("ownerName");
const ownerPhone = document.getElementById("ownerPhone");
const ownerEmail = document.getElementById("ownerEmail");
const ownerNote = document.getElementById("ownerNote");
const requestType = document.getElementById("requestType");
const existingPlace = document.getElementById("existingPlace");

const nameInput = document.getElementById("name");
const typeInput = document.getElementById("type");
const specialtyInput = document.getElementById("specialty");
const governorateInput = document.getElementById("governorate");
const cityInput = document.getElementById("city");
const addressInput = document.getElementById("address");
const phoneInput = document.getElementById("phone");
const whatsappInput = document.getElementById("whatsapp");
const latInput = document.getElementById("lat");
const lngInput = document.getElementById("lng");

const submitBtn = document.getElementById("submitApplication");
const trackPhone = document.getElementById("trackPhone");
const trackBtn = document.getElementById("trackBtn");
const ownerRequestsTable = document.getElementById("ownerRequestsTable");
const toast = document.getElementById("toast");

let places = [];
let locations = {};

function normalize(value) {
  return (value ?? "").toString().trim().toLowerCase();
}

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.hidden = false;
  toast.classList.add("show");
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => {
    toast.hidden = true;
    toast.classList.remove("show");
  }, 2300);
}

function loadLocal(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveLocal(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function uniqueByIdOrLocal(items) {
  const seen = new Set();
  return items.filter(item => {
    const key = item?.id ? `id:${item.id}` : `local:${item?.local_id || ""}`;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function loadPlacesFromDb() {
  if (!window.supabaseClient) return null;
  try {
    const { data, error } = await window.supabaseClient.from("places").select("*").order("name", { ascending: true });
    if (error) throw error;
    return data || [];
  } catch {
    return null;
  }
}

async function loadApplicationsByPhoneFromDb(phone) {
  if (!window.supabaseClient || !phone) return null;
  try {
    const { data, error } = await window.supabaseClient
      .from("place_applications")
      .select("*")
      .eq("submitted_by_phone", phone)
      .order("submitted_at", { ascending: false });
    if (error) throw error;
    return data || [];
  } catch {
    return null;
  }
}

async function saveApplicationToDb(application) {
  if (!window.supabaseClient) return null;
  try {
    const { data, error } = await window.supabaseClient
      .from("place_applications")
      .insert(application)
      .select("*")
      .single();
    if (error) throw error;
    return data?.id || null;
  } catch {
    return null;
  }
}

function populateSelect(select, values, firstLabel) {
  if (!select) return;
  select.innerHTML = `<option value="">${firstLabel}</option>`;
  values.forEach(value => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
}

function updateCities() {
  const gov = governorateInput?.value;
  const cities = gov && locations[gov] ? Object.keys(locations[gov]) : [];
  populateSelect(cityInput, cities, "اختر المدينة");
}

function fillExistingPlaces() {
  if (!existingPlace) return;
  existingPlace.innerHTML = `<option value="">اختر المكان (لتعديل فقط)</option>`;
  places.forEach(place => {
    const option = document.createElement("option");
    option.value = place.id || `${place.name}|${place.city}|${place.governorate}`;
    option.textContent = `${place.name} - ${place.city || ""}`;
    option.dataset.place = JSON.stringify(place);
    existingPlace.appendChild(option);
  });
}

function onExistingPlaceChange() {
  const selected = existingPlace?.selectedOptions?.[0];
  if (!selected?.dataset?.place) return;

  let place;
  try {
    place = JSON.parse(selected.dataset.place);
  } catch {
    return;
  }
  if (!place) return;

  nameInput.value = place.name || "";
  typeInput.value = place.type || "pharmacy";
  specialtyInput.value = place.specialty || "";
  governorateInput.value = place.governorate || "";
  updateCities();
  cityInput.value = place.city || "";
  addressInput.value = place.address || "";
  phoneInput.value = place.phone || "";
  whatsappInput.value = place.whatsapp || "";
  latInput.value = place.lat || "";
  lngInput.value = place.lng || "";
}

function syncUpdateMode() {
  const isUpdate = (requestType?.value || "create") === "update";
  if (!existingPlace) return;
  existingPlace.disabled = !isUpdate;
  if (!isUpdate) existingPlace.value = "";
}

function requestTypeLabel(type) {
  return type === "update" ? "تعديل" : "إضافة";
}

function statusLabel(status) {
  if (status === "approved") return "مقبول";
  if (status === "rejected") return "مرفوض";
  if (status === "needs_changes") return "يتطلب تعديل";
  if (status === "in_review") return "قيد المراجعة";
  return "معلق";
}

function mergeApplications(localItems, remoteItems) {
  const merged = uniqueByIdOrLocal([...(remoteItems || []), ...(localItems || [])]);
  merged.sort((a, b) => new Date(b.submitted_at || 0) - new Date(a.submitted_at || 0));
  return merged;
}

async function renderOwnerRequests() {
  const tbody = ownerRequestsTable?.querySelector("tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  const phone = trackPhone?.value.trim();
  if (!phone) return;

  const localList = loadLocal(APPLICATIONS_KEY, []).filter(r => normalize(r.submitted_by_phone) === normalize(phone));
  const remoteList = await loadApplicationsByPhoneFromDb(phone);
  const list = mergeApplications(localList, remoteList);

  if (!list.length) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="5" class="muted">لا توجد طلبات لهذا الرقم.</td>`;
    tbody.appendChild(row);
    return;
  }

  list.forEach(item => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${requestTypeLabel(item.type)}</td>
      <td>${item.payload?.name || "-"}</td>
      <td>${statusLabel(item.status)}</td>
      <td>${item.review_note || "-"}</td>
      <td>${item.submitted_at ? new Date(item.submitted_at).toLocaleString("ar") : "-"}</td>
    `;
    tbody.appendChild(row);
  });
}

function validateForm() {
  if (!ownerName.value.trim() || !ownerPhone.value.trim()) {
    showToast("يرجى إدخال بيانات صاحب الطلب");
    return false;
  }

  if ((requestType.value || "create") === "update" && !existingPlace.value) {
    showToast("اختر المكان المراد تعديله أولاً");
    return false;
  }

  if (!nameInput.value.trim() || !typeInput.value || !governorateInput.value || !cityInput.value) {
    showToast("يرجى إدخال اسم المكان والنوع والمحافظة والمدينة");
    return false;
  }

  const lat = Number(latInput.value);
  const lng = Number(lngInput.value);
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    showToast("يرجى إدخال خط العرض والطول بشكل صحيح");
    return false;
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    showToast("الإحداثيات خارج النطاق الصحيح");
    return false;
  }

  return true;
}

async function submitApplication() {
  if (!validateForm()) return;

  const type = requestType.value || "create";
  const selected = existingPlace?.selectedOptions?.[0];
  let placeId = null;
  if (type === "update" && selected?.dataset?.place) {
    try {
      const place = JSON.parse(selected.dataset.place);
      placeId = place?.id || null;
    } catch {
      placeId = null;
    }
  }

  const payload = {
    name: nameInput.value.trim(),
    type: typeInput.value,
    specialty: specialtyInput.value.trim(),
    governorate: governorateInput.value,
    city: cityInput.value,
    address: addressInput.value.trim(),
    phone: phoneInput.value.trim(),
    whatsapp: whatsappInput.value.trim(),
    lat: Number(latInput.value),
    lng: Number(lngInput.value)
  };

  const application = {
    local_id: `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    status: "pending",
    place_id: placeId,
    payload,
    submitted_by_name: ownerName.value.trim(),
    submitted_by_phone: ownerPhone.value.trim(),
    submitted_by_email: ownerEmail.value.trim(),
    owner_note: ownerNote.value.trim(),
    submitted_at: new Date().toISOString(),
    review_note: ""
  };

  const local = loadLocal(APPLICATIONS_KEY, []);
  local.unshift(application);
  saveLocal(APPLICATIONS_KEY, local.slice(0, 2000));

  const insertedId = await saveApplicationToDb(application);
  if (insertedId) {
    const updated = loadLocal(APPLICATIONS_KEY, []);
    const idx = updated.findIndex(item => item.local_id === application.local_id);
    if (idx !== -1) {
      updated[idx].id = insertedId;
      saveLocal(APPLICATIONS_KEY, updated);
    }
    showToast("تم إرسال الطلب بنجاح");
  } else {
    showToast("تم حفظ الطلب محلياً، وقد يتأخر ظهوره للمسؤول");
  }

  trackPhone.value = ownerPhone.value.trim();
  await renderOwnerRequests();
}

async function init() {
  locations = loadLocal(LOCATIONS_KEY, {});
  const remotePlaces = await loadPlacesFromDb();
  places = remotePlaces || loadLocal(STORAGE_KEY, []);

  populateSelect(governorateInput, Object.keys(locations), "اختر المحافظة");
  updateCities();
  fillExistingPlaces();
  syncUpdateMode();
}

if (governorateInput) governorateInput.addEventListener("change", updateCities);
if (requestType) {
  requestType.addEventListener("change", syncUpdateMode);
}
if (existingPlace) existingPlace.addEventListener("change", onExistingPlaceChange);
if (submitBtn) submitBtn.addEventListener("click", submitApplication);
if (trackBtn) trackBtn.addEventListener("click", renderOwnerRequests);
if (trackPhone) {
  trackPhone.addEventListener("keydown", event => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    renderOwnerRequests();
  });
}

init();
