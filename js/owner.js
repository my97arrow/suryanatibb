const APPLICATIONS_KEY = "healthDutyApplications";
const LOCATIONS_KEY = "healthDutyLocations";
const LOCATIONS_TABLE = "managed_locations";
const STORAGE_KEY = "places";
const SPECIALTIES_KEY = "healthDutySpecialties";
const THEME_KEY = "healthDutyTheme";
const WEEK_DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const DEFAULT_SPECIALTIES = [
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
const DEFAULT_LOCATIONS = {
  "الرقة": { "الرقة": [], "الطبقة": [], "تل أبيض": [], "عين عيسى": [], "سلوك": [] },
  "حلب": { "حلب": [], "اعزاز": [], "جرابلس": [], "عين العرب": [] },
  "دمشق": { "دمشق": [] },
  "ريف دمشق": { "دوما": [], "داريا": [], "يبرود": [] },
  "حمص": { "حمص": [], "القصير": [], "تدمر": [] },
  "حماة": { "حماة": [], "سلمية": [] },
  "إدلب": { "إدلب": [], "معرة النعمان": [] },
  "دير الزور": { "دير الزور": [], "البوكمال": [] },
  "الحسكة": { "الحسكة": [], "القامشلي": [] },
  "السويداء": { "السويداء": [] },
  "درعا": { "درعا": [] },
  "القنيطرة": { "القنيطرة": [] },
  "طرطوس": { "طرطوس": [] },
  "اللاذقية": { "اللاذقية": [] }
};

const ownerName = document.getElementById("ownerName");
const ownerPhone = document.getElementById("ownerPhone");
const ownerEmail = document.getElementById("ownerEmail");
const ownerNote = document.getElementById("ownerNote");
const requestType = document.getElementById("requestType");
const existingPlace = document.getElementById("existingPlace");

const nameInput = document.getElementById("name");
const typeInput = document.getElementById("type");
const specialtyInput = document.getElementById("specialty");
const specialtyField = document.getElementById("specialtyMulti");
const specialtySearch = document.getElementById("specialtySearch");
const specialtyChips = document.getElementById("specialtyChips");
const specialtySuggestions = document.getElementById("specialtySuggestions");
const emailInput = document.getElementById("email");
const governorateInput = document.getElementById("governorate");
const cityInput = document.getElementById("city");
const addressInput = document.getElementById("address");
const phoneInput = document.getElementById("phone");
const whatsappInput = document.getElementById("whatsapp");
const hoursInput = document.getElementById("hours");
const hoursStart = document.getElementById("hoursStart");
const hoursEnd = document.getElementById("hoursEnd");
const hours24 = document.getElementById("hours24");
const servicesInput = document.getElementById("services");
const notesInput = document.getElementById("notes");
const imageInput = document.getElementById("image");
const imageFileInput = document.getElementById("imageFile");
const imagePreview = document.getElementById("imagePreview");
const cropModal = document.getElementById("cropModal");
const cropImage = document.getElementById("cropImage");
const rotateLeft = document.getElementById("rotateLeft");
const rotateRight = document.getElementById("rotateRight");
const cropSave = document.getElementById("cropSave");
const cropCancel = document.getElementById("cropCancel");
const latInput = document.getElementById("lat");
const lngInput = document.getElementById("lng");
const workdaysAll = document.getElementById("workdaysAll");
const workdaysInputs = [...document.querySelectorAll('input[name="workdays"]')];

const submitBtn = document.getElementById("submitApplication");
const trackPhone = document.getElementById("trackPhone");
const trackBtn = document.getElementById("trackBtn");
const ownerRequestsTable = document.getElementById("ownerRequestsTable");
const toast = document.getElementById("toast");
const ownerThemeToggle = document.getElementById("ownerThemeToggle");

let places = [];
let locations = {};
let ownerPlaces = [];
let map = null;
let marker = null;
let cropper = null;
let loadPlacesTimer = null;
let specialties = [];
let selectedSpecialties = [];
const intlPhoneInstances = new Map();
let intlCountriesLocalized = false;

function localizeIntlCountryNamesAr() {
  if (intlCountriesLocalized) return;
  const globals = window.intlTelInputGlobals;
  if (!globals?.getCountryData || !window.Intl?.DisplayNames) return;
  try {
    const regionNames = new Intl.DisplayNames(["ar"], { type: "region" });
    globals.getCountryData().forEach(country => {
      const code = (country?.iso2 || "").toUpperCase();
      const translated = code ? regionNames.of(code) : "";
      if (translated) country.name = translated;
    });
    intlCountriesLocalized = true;
  } catch {
    // keep default labels
  }
}

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

function normalizeLocationsShape(input) {
  const output = {};
  Object.entries(input || {}).forEach(([gov, cities]) => {
    if (!gov) return;
    output[gov] = output[gov] || {};
    if (Array.isArray(cities)) {
      cities.forEach(city => {
        if (city) output[gov][city] = [];
      });
      return;
    }
    if (cities && typeof cities === "object") {
      Object.keys(cities).forEach(city => {
        if (city) output[gov][city] = [];
      });
    }
  });
  return output;
}

function mergeLocationsTrees(...trees) {
  const merged = {};
  trees.forEach(tree => {
    Object.entries(normalizeLocationsShape(tree)).forEach(([gov, cities]) => {
      if (!merged[gov]) merged[gov] = {};
      Object.keys(cities || {}).forEach(city => {
        merged[gov][city] = [];
      });
    });
  });
  return merged;
}

function buildLocationsFromPlaces(items = []) {
  const map = {};
  items.forEach(place => {
    const gov = (place?.governorate || "").trim();
    const city = (place?.city || "").trim();
    if (!gov || !city) return;
    map[gov] = map[gov] || {};
    map[gov][city] = [];
  });
  return map;
}

function rowsToLocationsTree(rows = []) {
  const tree = {};
  rows.forEach(item => {
    const governorate = (item?.governorate || "").trim();
    const city = (item?.city || "").trim();
    if (!governorate || !city) return;
    if (!tree[governorate]) tree[governorate] = {};
    tree[governorate][city] = [];
  });
  return tree;
}

function initIntlPhoneInputs() {
  if (!window.intlTelInput) return;
  localizeIntlCountryNamesAr();
  [ownerPhone, phoneInput, whatsappInput, trackPhone]
    .filter(Boolean)
    .forEach(input => {
      if (intlPhoneInstances.has(input)) return;
      const iti = window.intlTelInput(input, {
        initialCountry: "sy",
        separateDialCode: true,
        nationalMode: false,
        preferredCountries: ["sy", "tr", "sa", "iq", "ae"]
      });
      intlPhoneInstances.set(input, iti);
    });
}

function getIntlPhoneValue(input) {
  if (!input) return "";
  const iti = intlPhoneInstances.get(input);
  if (!iti) return input.value.trim();
  const full = iti.getNumber();
  return (full || input.value || "").trim();
}

function setIntlPhoneValue(input, value) {
  if (!input) return;
  const iti = intlPhoneInstances.get(input);
  const safeValue = (value || "").toString();
  if (!iti || !safeValue) {
    input.value = safeValue;
    return;
  }
  try {
    iti.setNumber(safeValue);
  } catch {
    input.value = safeValue;
  }
}

function applyTheme(mode) {
  const dark = mode === "dark";
  document.body.classList.toggle("dark", dark);
  if (ownerThemeToggle) {
    ownerThemeToggle.innerHTML = dark
      ? `<i class="fa-solid fa-sun"></i>`
      : `<i class="fa-solid fa-moon"></i>`;
  }
}

function initTheme() {
  const mode = localStorage.getItem(THEME_KEY) || "light";
  applyTheme(mode);
}

function unique(items, keyGetter) {
  const seen = new Set();
  return items.filter(item => {
    const key = keyGetter(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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
  (list || []).forEach(item => {
    const clean = `${item || ""}`.trim();
    const key = normalizeSpecialty(clean);
    if (clean && !map.has(key)) map.set(key, clean);
  });
  return [...map.values()].sort((a, b) => a.localeCompare(b, "ar"));
}

function loadSpecialties() {
  const local = loadLocal(SPECIALTIES_KEY, []);
  const fromPlaces = (places || []).flatMap(place => toSpecialtyArray(place.specialty));
  const list = uniqueSpecialties([...(Array.isArray(local) ? local : []), ...DEFAULT_SPECIALTIES, ...fromPlaces]);
  saveLocal(SPECIALTIES_KEY, list);
  return list;
}

function syncSpecialtyValue() {
  if (!specialtyInput) return;
  specialtyInput.value = selectedSpecialties.join("، ");
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
    showToast("هذا الاختصاص غير موجود ضمن القائمة");
    return;
  }
  const exists = selectedSpecialties.some(v => normalizeSpecialty(v) === normalized);
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
  }).slice(0, 10);

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

function initSpecialtyField() {
  if (!specialtyInput) return;
  setSpecialtiesForm([]);
}

function statusClass(status) {
  if (status === "approved") return "status-approved";
  if (status === "rejected") return "status-rejected";
  if (status === "needs_changes") return "status-needs-changes";
  if (status === "in_review") return "status-in-review";
  return "status-pending";
}

function statusLabel(status) {
  if (status === "approved") return "مقبول";
  if (status === "rejected") return "مرفوض";
  if (status === "needs_changes") return "يتطلب تعديل";
  if (status === "in_review") return "قيد المراجعة";
  return "معلق";
}

function requestTypeLabel(type) {
  return type === "update" ? "تعديل" : "إضافة";
}

function parseHoursFromInputs() {
  if (hours24?.checked) return "24 ساعة";
  const start = hoursStart?.value || "";
  const end = hoursEnd?.value || "";
  if (!start && !end) return "";
  if (start && end) return `${start} - ${end}`;
  return start || end;
}

function fillHoursInputs(value = "") {
  if (!hours24 || !hoursStart || !hoursEnd) return;
  hours24.checked = value === "24 ساعة";
  if (hours24.checked) {
    hoursStart.value = "";
    hoursEnd.value = "";
    if (hoursInput) hoursInput.value = "24 ساعة";
    return;
  }
  const parts = String(value).split("-").map(v => v.trim());
  hoursStart.value = parts[0] || "";
  hoursEnd.value = parts[1] || "";
  if (hoursInput) hoursInput.value = value || "";
}

function getWorkdaysFromForm() {
  if (workdaysAll?.checked) return [...WEEK_DAYS];
  return workdaysInputs.filter(input => input.checked).map(input => input.value);
}

function setWorkdaysForm(workdays = []) {
  const set = new Set((Array.isArray(workdays) ? workdays : []).map(String));
  workdaysInputs.forEach(input => {
    input.checked = set.has(input.value);
  });
  if (workdaysAll) {
    workdaysAll.checked = WEEK_DAYS.every(day => set.has(day));
  }
}

function syncWorkdaysAll() {
  if (!workdaysAll) return;
  workdaysAll.checked = WEEK_DAYS.every(day => workdaysInputs.some(input => input.value === day && input.checked));
}

function updateImagePreview(src) {
  if (!imagePreview) return;
  const value = (src || "").trim();
  if (!value) {
    imagePreview.textContent = "لا توجد صورة";
    return;
  }
  imagePreview.innerHTML = `<img src="${value}" alt="معاينة الصورة">`;
}

function handleImageFile() {
  const file = imageFileInput?.files?.[0];
  if (!file) return;
  if (!window.Cropper || !cropModal || !cropImage) {
    const reader = new FileReader();
    reader.onload = () => {
      imageInput.value = reader.result;
      updateImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
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
  if (imageFileInput) imageFileInput.value = "";
}

function saveCroppedImage() {
  if (!cropper) return;
  const square = cropper.getCroppedCanvas({
    width: 256,
    height: 256,
    imageSmoothingEnabled: true,
    imageSmoothingQuality: "high"
  });
  const dataUrl = square.toDataURL("image/jpeg", 1);
  imageInput.value = dataUrl;
  updateImagePreview(dataUrl);
  closeCropModal();
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
  const current = cityInput?.value || "";
  populateSelect(cityInput, cities, "اختر المدينة");
  if (current && cities.includes(current)) cityInput.value = current;
}

function setMarker(lat, lng, zoom = 14) {
  if (!map || Number.isNaN(lat) || Number.isNaN(lng)) return;
  const point = [lat, lng];
  if (marker) marker.setLatLng(point);
  else marker = L.marker(point).addTo(map);
  map.setView(point, zoom);
}

function updateMarkerFromInputs() {
  const lat = Number(latInput?.value);
  const lng = Number(lngInput?.value);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return;
  setMarker(lat, lng);
}

function initMap() {
  if (map) return;
  map = L.map("ownerMap").setView([35.95, 39.0], 8);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19
  }).addTo(map);
  map.on("click", event => {
    const { lat, lng } = event.latlng;
    latInput.value = lat.toFixed(6);
    lngInput.value = lng.toFixed(6);
    setMarker(lat, lng);
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

async function loadLocationsFromDb() {
  if (!window.supabaseClient) return null;
  try {
    const { data, error } = await window.supabaseClient
      .from(LOCATIONS_TABLE)
      .select("governorate, city")
      .order("governorate", { ascending: true })
      .order("city", { ascending: true });
    if (error) throw error;
    return rowsToLocationsTree(data || []);
  } catch {
    return null;
  }
}

async function loadOwnerApplicationsFromDb(phone) {
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
  } catch (error) {
    saveApplicationToDb.lastError = error;
    return null;
  }
}

async function syncPendingApplicationsToDb() {
  const local = loadLocal(APPLICATIONS_KEY, []);
  if (!Array.isArray(local) || !local.length) return { synced: 0, failed: 0 };
  let synced = 0;
  let failed = 0;
  for (let i = 0; i < local.length; i += 1) {
    if (local[i]?.id) continue;
    const insertedId = await saveApplicationToDb(local[i]);
    if (insertedId) {
      local[i].id = insertedId;
      synced += 1;
    } else {
      failed += 1;
    }
  }
  saveLocal(APPLICATIONS_KEY, local);
  return { synced, failed };
}

function placeKey(place) {
  if (place?.id) return `id:${place.id}`;
  return `n:${normalize(place?.name)}|g:${normalize(place?.governorate)}|c:${normalize(place?.city)}`;
}

function findPlaceFromPayload(payload) {
  return places.find(p =>
    normalize(p.name) === normalize(payload?.name) &&
    normalize(p.governorate) === normalize(payload?.governorate) &&
    normalize(p.city) === normalize(payload?.city)
  );
}

function buildOwnerPlaces(apps) {
  const approved = (apps || []).filter(app => (app.status || "pending") === "approved");
  const candidates = [];
  approved.forEach(app => {
    let place = null;
    if (app.place_id) {
      place = places.find(p => p.id && Number(p.id) === Number(app.place_id));
    }
    if (!place && app.payload) {
      place = findPlaceFromPayload(app.payload);
    }
    if (!place && app.payload) {
      place = { ...app.payload, _fromPayload: true, _application_id: app.id || app.local_id || null };
    }
    if (place) candidates.push(place);
  });
  return unique(candidates, placeKey);
}

function fillExistingPlaces() {
  if (!existingPlace) return;
  existingPlace.innerHTML = `<option value="">اختر المكان (لتعديل فقط)</option>`;
  ownerPlaces.forEach(place => {
    const option = document.createElement("option");
    option.value = place.id || place._application_id || placeKey(place);
    option.textContent = `${place.name} - ${place.city || ""}`;
    option.dataset.place = JSON.stringify(place);
    existingPlace.appendChild(option);
  });
}

function clearPlaceForm() {
  nameInput.value = "";
  typeInput.value = "pharmacy";
  setSpecialtiesForm([]);
  emailInput.value = "";
  governorateInput.value = "";
  updateCities();
  cityInput.value = "";
  addressInput.value = "";
  setIntlPhoneValue(phoneInput, "");
  setIntlPhoneValue(whatsappInput, "");
  if (hoursInput) hoursInput.value = "";
  fillHoursInputs("");
  setWorkdaysForm([]);
  servicesInput.value = "";
  notesInput.value = "";
  imageInput.value = "";
  if (imageFileInput) imageFileInput.value = "";
  updateImagePreview("");
  latInput.value = "";
  lngInput.value = "";
  if (marker && map) {
    map.removeLayer(marker);
    marker = null;
  }
}

function onExistingPlaceChange() {
  const selected = existingPlace?.selectedOptions?.[0];
  if (!selected?.dataset?.place) return;
  let place = null;
  try {
    place = JSON.parse(selected.dataset.place);
  } catch {
    return;
  }
  if (!place) return;
  nameInput.value = place.name || "";
  typeInput.value = place.type || "pharmacy";
  setSpecialtiesForm(place.specialty || "");
  emailInput.value = place.email || "";
  governorateInput.value = place.governorate || "";
  updateCities();
  cityInput.value = place.city || "";
  addressInput.value = place.address || "";
  setIntlPhoneValue(phoneInput, place.phone || "");
  setIntlPhoneValue(whatsappInput, place.whatsapp || "");
  fillHoursInputs(place.hours || "");
  setWorkdaysForm(place.workdays || []);
  servicesInput.value = place.services || "";
  notesInput.value = place.notes || "";
  imageInput.value = place.image || "";
  updateImagePreview(place.image || "");
  latInput.value = place.lat || "";
  lngInput.value = place.lng || "";
  updateMarkerFromInputs();
}

async function refreshOwnerPlacesByPhone() {
  if ((requestType?.value || "create") !== "update") return;
  const phone = getIntlPhoneValue(ownerPhone);
  if (!phone) {
    ownerPlaces = [];
    fillExistingPlaces();
    return;
  }

  const localApps = loadLocal(APPLICATIONS_KEY, []).filter(app => normalize(app.submitted_by_phone) === normalize(phone));
  const remoteApps = await loadOwnerApplicationsFromDb(phone);
  const mergedApps = unique([...(remoteApps || []), ...localApps], app => {
    if (app?.id) return `id:${app.id}`;
    return `local:${app?.local_id || ""}`;
  });

  ownerPlaces = buildOwnerPlaces(mergedApps);
  fillExistingPlaces();

  if (!ownerPlaces.length) {
    showToast("لا توجد أماكن معتمدة مرتبطة بهذا الرقم");
  }
}

function scheduleRefreshOwnerPlaces() {
  clearTimeout(loadPlacesTimer);
  loadPlacesTimer = setTimeout(() => {
    refreshOwnerPlacesByPhone();
  }, 300);
}

function syncUpdateMode() {
  const isUpdate = (requestType?.value || "create") === "update";
  if (existingPlace) {
    existingPlace.disabled = !isUpdate;
    if (!isUpdate) existingPlace.value = "";
  }
  if (!isUpdate) return;
  refreshOwnerPlacesByPhone();
}

function validateForm() {
  if (!ownerName.value.trim() || !getIntlPhoneValue(ownerPhone)) {
    showToast("يرجى إدخال بيانات صاحب الطلب");
    return false;
  }
  const isUpdate = (requestType.value || "create") === "update";
  if (isUpdate && !existingPlace.value) {
    showToast("أدخل رقم الهاتف ثم اختر المكان المراد تعديله");
    return false;
  }
  if (!nameInput.value.trim() || !typeInput.value || !governorateInput.value || !cityInput.value) {
    showToast("يرجى إدخال اسم المكان والنوع والمحافظة والمدينة");
    return false;
  }
  const lat = Number(latInput.value);
  const lng = Number(lngInput.value);
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    showToast("يرجى إدخال الإحداثيات بشكل صحيح");
    return false;
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    showToast("الإحداثيات خارج النطاق الصحيح");
    return false;
  }
  return true;
}

function buildPayload() {
  const hours = parseHoursFromInputs();
  if (hoursInput) hoursInput.value = hours;
  return {
    name: nameInput.value.trim(),
    type: typeInput.value,
    specialty: specialtyInput.value.trim(),
    email: emailInput.value.trim(),
    governorate: governorateInput.value,
    city: cityInput.value,
    address: addressInput.value.trim(),
    phone: getIntlPhoneValue(phoneInput),
    whatsapp: getIntlPhoneValue(whatsappInput),
    hours,
    workdays: getWorkdaysFromForm(),
    services: servicesInput.value.trim(),
    notes: notesInput.value.trim(),
    image: imageInput.value.trim(),
    lat: Number(latInput.value),
    lng: Number(lngInput.value)
  };
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

  const application = {
    local_id: `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    status: "pending",
    place_id: placeId,
    payload: buildPayload(),
    submitted_by_name: ownerName.value.trim(),
    submitted_by_phone: getIntlPhoneValue(ownerPhone),
    submitted_by_email: ownerEmail.value.trim(),
    owner_note: ownerNote.value.trim(),
    submitted_at: new Date().toISOString(),
    review_note: ""
  };

  const local = loadLocal(APPLICATIONS_KEY, []);
  local.unshift(application);
  saveLocal(APPLICATIONS_KEY, local.slice(0, 3000));

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
    const errCode = saveApplicationToDb.lastError?.code || "";
    if (errCode === "PGRST205") {
      showToast("تعذر الحفظ على الإنترنت: جدول الطلبات غير مفعّل في Supabase");
    } else {
      showToast("تم الحفظ محلياً فقط، سيُعاد الإرسال تلقائياً عند توفر الاتصال");
    }
  }

  setIntlPhoneValue(trackPhone, getIntlPhoneValue(ownerPhone));
  await syncPendingApplicationsToDb();
  await renderOwnerRequests();
}

async function renderOwnerRequests() {
  const tbody = ownerRequestsTable?.querySelector("tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  const phone = getIntlPhoneValue(trackPhone);
  if (!phone) return;

  const localApps = loadLocal(APPLICATIONS_KEY, []).filter(app => normalize(app.submitted_by_phone) === normalize(phone));
  const remoteApps = await loadOwnerApplicationsFromDb(phone);
  const list = unique([...(remoteApps || []), ...localApps], app => {
    if (app?.id) return `id:${app.id}`;
    return `local:${app?.local_id || ""}`;
  }).sort((a, b) => new Date(b.submitted_at || 0) - new Date(a.submitted_at || 0));

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
      <td><span class="owner-status ${statusClass(item.status)}">${statusLabel(item.status)}</span></td>
      <td>${item.review_note || "-"}</td>
      <td>${item.submitted_at ? new Date(item.submitted_at).toLocaleString("ar") : "-"}</td>
    `;
    tbody.appendChild(row);
  });
}

async function init() {
  const localLocations = normalizeLocationsShape(loadLocal(LOCATIONS_KEY, {}));
  const remoteLocations = await loadLocationsFromDb();
  const remotePlaces = await loadPlacesFromDb();
  places = remotePlaces || loadLocal(STORAGE_KEY, []);
  const fromPlaces = buildLocationsFromPlaces(places);
  locations = mergeLocationsTrees(remoteLocations || {}, localLocations, fromPlaces);
  if (!Object.keys(locations).length) {
    locations = DEFAULT_LOCATIONS;
  }
  saveLocal(LOCATIONS_KEY, locations);
  specialties = loadSpecialties();

  populateSelect(governorateInput, Object.keys(locations), "اختر المحافظة");
  initSpecialtyField();
  updateCities();
  fillHoursInputs("");
  setWorkdaysForm([]);
  updateImagePreview("");
  syncUpdateMode();
  initMap();
  await syncPendingApplicationsToDb();
}

if (governorateInput) governorateInput.addEventListener("change", updateCities);
if (ownerThemeToggle) {
  ownerThemeToggle.addEventListener("click", () => {
    const dark = !document.body.classList.contains("dark");
    const mode = dark ? "dark" : "light";
    applyTheme(mode);
    localStorage.setItem(THEME_KEY, mode);
  });
}
if (requestType) requestType.addEventListener("change", syncUpdateMode);
if (existingPlace) existingPlace.addEventListener("change", onExistingPlaceChange);
if (ownerPhone) ownerPhone.addEventListener("input", scheduleRefreshOwnerPlaces);
if (submitBtn) submitBtn.addEventListener("click", submitApplication);
if (trackBtn) trackBtn.addEventListener("click", renderOwnerRequests);
if (trackPhone) {
  trackPhone.addEventListener("keydown", event => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    renderOwnerRequests();
  });
}
if (imageInput) imageInput.addEventListener("input", () => updateImagePreview(imageInput.value.trim()));
if (imageFileInput) imageFileInput.addEventListener("change", handleImageFile);
if (rotateLeft) rotateLeft.addEventListener("click", () => cropper?.rotate(-90));
if (rotateRight) rotateRight.addEventListener("click", () => cropper?.rotate(90));
if (cropSave) cropSave.addEventListener("click", saveCroppedImage);
if (cropCancel) cropCancel.addEventListener("click", closeCropModal);
if (latInput) latInput.addEventListener("input", updateMarkerFromInputs);
if (lngInput) lngInput.addEventListener("input", updateMarkerFromInputs);
if (specialtySearch) {
  specialtySearch.addEventListener("focus", () => renderSpecialtySuggestions(specialtySearch.value));
  specialtySearch.addEventListener("input", () => renderSpecialtySuggestions(specialtySearch.value));
  specialtySearch.addEventListener("keydown", event => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    addSpecialtyToSelection(specialtySearch.value);
  });
}
window.addEventListener("online", () => {
  syncPendingApplicationsToDb();
});
document.addEventListener("click", event => {
  if (!specialtySuggestions || !specialtyField) return;
  if (specialtyField.contains(event.target)) return;
  if (specialtySuggestions.contains(event.target)) return;
  specialtySuggestions.hidden = true;
});
if (hours24) {
  hours24.addEventListener("change", () => {
    if (hours24.checked) {
      if (hoursStart) hoursStart.value = "";
      if (hoursEnd) hoursEnd.value = "";
    }
    if (hoursInput) hoursInput.value = parseHoursFromInputs();
  });
}
if (hoursStart) hoursStart.addEventListener("input", () => {
  if (hours24) hours24.checked = false;
  if (hoursInput) hoursInput.value = parseHoursFromInputs();
});
if (hoursEnd) hoursEnd.addEventListener("input", () => {
  if (hours24) hours24.checked = false;
  if (hoursInput) hoursInput.value = parseHoursFromInputs();
});
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

initTheme();
initIntlPhoneInputs();
clearPlaceForm();
init();
