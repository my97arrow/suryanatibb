const STORAGE_KEY = "places";
function localISODate(d = new Date()) {
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().split("T")[0];
}
const todayISO = localISODate();

const elements = {
  search: document.getElementById("search"),
  filter: document.getElementById("filter"),
  governorate: document.getElementById("governorate"),
  city: document.getElementById("city"),
  specialtyFilter: document.getElementById("specialtyFilter"),
  sortBy: document.getElementById("sortBy"),
  locateMe: document.getElementById("locateMe"),
  toggleCompact: document.getElementById("toggleCompact"),
  shareResults: document.getElementById("shareResults"),
  cards: document.getElementById("cards"),
  empty: document.getElementById("emptyState"),
  loadMoreWrap: document.getElementById("loadMoreWrap"),
  loadMore: document.getElementById("loadMore"),
  map: document.getElementById("map"),
  clearFilters: document.getElementById("clearFilters"),
  emergencyMode: document.getElementById("emergencyMode"),
  emergencyModal: document.getElementById("emergencyModal"),
  emergencyBody: document.getElementById("emergencyBody"),
  emergencyApply: document.getElementById("emergencyApply"),
  emergencyClose: document.getElementById("emergencyClose"),
  toast: document.getElementById("toast"),
  statusBar: document.getElementById("statusBar"),
  themeToggle: document.getElementById("themeToggle")
};

let map = null;
let markersLayer = null;
let allPlaces = [];
let markersById = {};
let userLocation = null;
let compactMode = false;
let currentPage = 1;
const pageSize = 20;
let filteredPlaces = [];
const THEME_KEY = "healthDutyTheme";

const FILTERS_KEY = "healthDutyFilters";

const SEED_PLACES = [];

function isGeneratedSample(place) {
  const name = (place?.name || "").trim();
  return !!place?.seedSample || /^(صيدلية|عيادة|مشفى|مستوصف|مخبر) النبض \d+$/.test(name);
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
    return data || [];
  } catch {
    return null;
  }
}

function subscribePlacesFromDb() {
  if (!window.supabaseClient) return null;
  return window.supabaseClient
    .channel("places-changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "places" },
      async () => {
        const list = await loadPlacesFromDb();
        if (!list) return;
        const deduped = dedupePlaces(list);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(deduped));
        allPlaces = enrichPlaces(deduped);
        updateCityOptions();
        applyFilters();
      }
    )
    .subscribe();
}

function showToast(message) {
  if (!elements.toast) return;
  elements.toast.textContent = message;
  elements.toast.hidden = false;
  elements.toast.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => {
    elements.toast.hidden = true;
    elements.toast.classList.remove("show");
  }, 2400);
}

function updateStatusBar(message) {
  if (!elements.statusBar) return;
  elements.statusBar.textContent = message;
  elements.statusBar.hidden = false;
  clearTimeout(updateStatusBar._t);
  updateStatusBar._t = setTimeout(() => {
    elements.statusBar.hidden = true;
  }, 3000);
}

function applyTheme(theme) {
  document.body.classList.toggle("dark", theme === "dark");
  localStorage.setItem(THEME_KEY, theme);
  if (elements.themeToggle) {
    elements.themeToggle.innerHTML = theme === "dark"
      ? '<i class="fa-solid fa-sun"></i> فاتح'
      : '<i class="fa-solid fa-moon"></i> داكن';
  }
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const systemPrefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = saved || (systemPrefersDark ? "dark" : "light");
  applyTheme(theme);
}

function shouldShowDutyBadge(type) {
  return type === "pharmacy";
}

function typeIcon(type) {
  if (type === "hospital") return "fa-hospital";
  if (type === "dispensary") return "fa-house-medical";
  if (type === "clinic") return "fa-stethoscope";
  if (type === "lab") return "fa-flask";
  return "fa-prescription-bottle-medical";
}

function normalize(value) {
  return (value ?? "").toString().trim().toLowerCase();
}

function tokenizeQuery(query) {
  return normalize(query)
    .replace(/[^\u0600-\u06FFa-z0-9\s]/gi, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function detectTypeFromQuery(query) {
  const q = normalize(query);
  const typeKeywords = {
    pharmacy: ["صيدلية", "صيدليه", "دواء", "ادوية", "أدوية"],
    hospital: ["مشفى", "مشفى", "مستشفى", "اسعاف", "إسعاف"],
    dispensary: ["مستوصف", "مركز صحي", "مركز"],
    clinic: ["عيادة", "عياده", "دكتور", "طبيب"],
    lab: ["مخبر", "مختبر", "تحاليل", "تحليل"]
  };
  for (const [type, words] of Object.entries(typeKeywords)) {
    if (words.some(word => q.includes(normalize(word)))) return type;
  }
  return null;
}

function parseSmartQuery(query) {
  const q = normalize(query);
  const tokens = tokenizeQuery(q);
  const onDuty = ["مناوب", "مناوبة", "مناوبه", "اليوم", "الآن", "حاليا", "حالياً"]
    .some(word => q.includes(normalize(word)));

  const governorates = unique(allPlaces.map(p => p.governorate));
  const cities = unique(allPlaces.map(p => p.city));
  const matchByContains = list =>
    [...list]
      .sort((a, b) => b.length - a.length)
      .find(item => q.includes(normalize(item))) || null;

  const governorate = matchByContains(governorates);
  const city = matchByContains(cities);
  const type = detectTypeFromQuery(q);

  const ignoredWords = new Set([
    "ابحث", "عن", "في", "قرب", "قريب", "من", "الى", "إلى", "على", "ضمن",
    "اريد", "أريد", "لو", "سمحت", "او", "أو", "مكان", "طبي", "اماكن", "أماكن"
  ].map(normalize));
  const typeWords = ["صيدلية", "صيدليه", "مشفى", "مشفي", "مستشفى", "مستوصف", "عيادة", "عياده", "مخبر", "مختبر", "تحاليل", "تحليل", "دكتور", "طبيب"];
  const onDutyWords = ["مناوب", "مناوبة", "مناوبه", "اليوم", "الآن", "حاليا", "حالياً"];
  [...typeWords, ...onDutyWords].forEach(word => ignoredWords.add(normalize(word)));
  if (governorate) tokenizeQuery(governorate).forEach(w => ignoredWords.add(normalize(w)));
  if (city) tokenizeQuery(city).forEach(w => ignoredWords.add(normalize(w)));

  const terms = tokens.filter(token => !ignoredWords.has(normalize(token)));
  return { type, onDuty, governorate, city, terms, hasIntent: !!(type || onDuty || governorate || city) };
}

function placeKey(place) {
  return [
    normalize(place.name),
    normalize(place.type),
    normalize(place.governorate),
    normalize(place.city)
  ].join("|");
}

function dedupePlaces(list) {
  const seen = new Map();
  list.forEach(item => {
    const key = placeKey(item);
    if (!seen.has(key)) {
      seen.set(key, item);
    }
  });
  return [...seen.values()];
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

function enrichPlaces(list) {
  return list.map((place, index) => ({
    ...place,
    _index: index,
    onDuty: isOnDuty(place),
    image: place.image || ""
  }));
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "ar")
  );
}

function splitSpecialties(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(v => `${v}`.trim()).filter(Boolean);
  return `${value}`
    .split(/[|،,]/)
    .map(v => v.trim())
    .filter(Boolean);
}

function populateSelect(select, values, allLabel) {
  if (!select) return;
  select.innerHTML = `<option value="all">${allLabel}</option>`;
  values.forEach(value => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
}

function updateCityOptions() {
  if (!elements.city) return;
  const current = elements.city.value;
  const gov = elements.governorate?.value || "all";
  const cities = gov === "all"
    ? unique(allPlaces.map(p => p.city))
    : unique(allPlaces.filter(p => p.governorate === gov).map(p => p.city));
  populateSelect(elements.city, cities, "كل المدن");
  if (current && cities.includes(current)) {
    elements.city.value = current;
  } else {
    elements.city.value = "all";
  }
}

function updateSpecialtyOptions() {
  if (!elements.specialtyFilter) return;
  const current = elements.specialtyFilter.value;
  const gov = elements.governorate?.value || "all";
  const city = elements.city?.value || "all";
  const type = elements.filter?.value || "all";

  const specialties = unique(
    allPlaces
      .filter(place => (gov === "all" || place.governorate === gov))
      .filter(place => (city === "all" || place.city === city))
      .filter(place => (type === "all" || type === "onDuty" || place.type === type))
      .flatMap(place => splitSpecialties(place.specialty))
  );

  populateSelect(elements.specialtyFilter, specialties, "كل الاختصاصات");
  if (current && specialties.includes(current)) {
    elements.specialtyFilter.value = current;
  } else {
    elements.specialtyFilter.value = "all";
  }
}

function typeLabel(type) {
  if (type === "hospital") return "مشفى";
  if (type === "dispensary") return "مستوصف";
  if (type === "clinic") return "عيادة";
  if (type === "lab") return "مخبر";
  return "صيدلية";
}

function getFilterState() {
  return {
    search: elements.search?.value || "",
    type: elements.filter?.value || "all",
    governorate: elements.governorate?.value || "all",
    city: elements.city?.value || "all",
    specialty: elements.specialtyFilter?.value || "all",
    sortBy: elements.sortBy?.value || "default",
    compact: compactMode
  };
}

function applyFilterState(state) {
  if (!state) return;
  if (elements.search) elements.search.value = state.search || "";
  if (elements.filter) elements.filter.value = state.type || "all";
  if (elements.governorate) elements.governorate.value = state.governorate || "all";
  updateCityOptions();
  if (elements.city) elements.city.value = state.city || "all";
  updateSpecialtyOptions();
  if (elements.specialtyFilter) elements.specialtyFilter.value = state.specialty || "all";
  if (elements.sortBy) elements.sortBy.value = state.sortBy || "default";
  compactMode = !!state.compact;
}

function saveFilters() {
  localStorage.setItem(FILTERS_KEY, JSON.stringify(getFilterState()));
}

function loadFilters() {
  try {
    const raw = localStorage.getItem(FILTERS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function parseUrlFilters() {
  const params = new URLSearchParams(window.location.search);
  if (!params.toString()) return null;
  return {
    search: params.get("q") || "",
    type: params.get("type") || "all",
    governorate: params.get("gov") || "all",
    city: params.get("city") || "all",
    specialty: params.get("specialty") || "all",
    sortBy: params.get("sort") || "default"
  };
}

function buildShareUrl() {
  const state = getFilterState();
  const params = new URLSearchParams();
  if (state.search) params.set("q", state.search);
  if (state.type && state.type !== "all") params.set("type", state.type);
  if (state.governorate && state.governorate !== "all") params.set("gov", state.governorate);
  if (state.city && state.city !== "all") params.set("city", state.city);
  if (state.specialty && state.specialty !== "all") params.set("specialty", state.specialty);
  if (state.sortBy && state.sortBy !== "default") params.set("sort", state.sortBy);
  const base = window.location.origin + window.location.pathname;
  return params.toString() ? `${base}?${params.toString()}` : base;
}

function distanceKm(a, b) {
  const toRad = deg => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const r = 6371;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}

function findNearestBy(list, predicate) {
  if (!userLocation) return null;
  const candidates = list.filter(p => p.lat && p.lng && predicate(p));
  if (!candidates.length) return null;
  return [...candidates]
    .sort((a, b) => distanceKm(userLocation, a) - distanceKm(userLocation, b))[0];
}

function openEmergencyModal(contentHtml = "") {
  if (!elements.emergencyModal || !elements.emergencyBody) return;
  elements.emergencyBody.innerHTML = contentHtml;
  elements.emergencyModal.classList.add("active");
  elements.emergencyModal.setAttribute("aria-hidden", "false");
}

function closeEmergencyModal() {
  if (!elements.emergencyModal) return;
  elements.emergencyModal.classList.remove("active");
  elements.emergencyModal.setAttribute("aria-hidden", "true");
}

async function runEmergencyMode() {
  if (!userLocation) await locateUser(false);
  if (!userLocation) {
    showToast("يرجى تفعيل الموقع لاستخدام وضع الطوارئ");
    return;
  }

  const nearestOnDutyPharmacy = findNearestBy(allPlaces, p => p.type === "pharmacy" && p.onDuty);
  const nearestHospital = findNearestBy(allPlaces, p => p.type === "hospital");
  const nearestDispensary = findNearestBy(allPlaces, p => p.type === "dispensary");

  const row = place => {
    if (!place) return `<div class="emergency-item muted">غير متوفر</div>`;
    const km = distanceKm(userLocation, place).toFixed(1);
    return `
      <div class="emergency-item">
        <strong>${place.name}</strong>
        <span>${place.city || ""} • ${km} كم</span>
      </div>
    `;
  };

  openEmergencyModal(`
    <div class="emergency-grid">
      <div>
        <h4>أقرب صيدلية مناوبة</h4>
        ${row(nearestOnDutyPharmacy)}
      </div>
      <div>
        <h4>أقرب مشفى</h4>
        ${row(nearestHospital)}
      </div>
      <div>
        <h4>أقرب مستوصف</h4>
        ${row(nearestDispensary)}
      </div>
    </div>
  `);
}

function renderCards(list) {
  if (!elements.cards) return;
  elements.cards.innerHTML = "";

  if (!list.length) {
    if (elements.empty) elements.empty.hidden = false;
    return;
  }
  if (elements.empty) elements.empty.hidden = true;

  const limit = currentPage * pageSize;
  const slice = list.slice(0, limit);

  slice.forEach(place => {
    const card = document.createElement("article");
    card.className = `card ${place.onDuty && place.type === "pharmacy" ? "on-duty" : ""}`;
    card.tabIndex = 0;
    const hasPhone = !!normalize(place.phone);
    const hasWhatsapp = !!normalize(place.whatsapp);

    card.innerHTML = `
      <div class="card-head">
        ${
          place.image
            ? `<div class="place-icon small image">
                <img src="${place.image}" alt="${place.name}">
              </div>`
            : `<div class="place-icon small ${place.type}">
                <i class="fa-solid ${typeIcon(place.type)}"></i>
              </div>`
        }
        <div class="card-title">
          <h3>${place.name}</h3>
          <p class="muted">
            ${typeLabel(place.type)}
            ${shouldShowDutyBadge(place.type) && place.onDuty ? `<span class="badge on inline-badge">مناوب</span>` : ""}
          </p>
        </div>
      </div>
      <div class="card-meta">
        <span><i class="fa-solid fa-location-dot"></i> ${place.governorate || ""} ${place.city ? "- " + place.city : ""}</span>
        ${place.specialty ? `<span class="specialty-line"><i class="fa-solid fa-stethoscope"></i> ${place.specialty}</span>` : ""}
        ${place.address ? `<span class="muted">${place.address}</span>` : ""}
      </div>
      <div class="card-foot">
        <div class="card-actions">
          <a class="icon-btn ${hasPhone ? "" : "disabled"}" href="${hasPhone ? `tel:${place.phone}` : "#"}">
            <i class="fa-solid fa-phone"></i>
          </a>
          <a class="icon-btn ${hasWhatsapp ? "" : "disabled"}" href="${hasWhatsapp ? `https://wa.me/${place.whatsapp}` : "#"}" target="_blank" rel="noreferrer">
            <i class="fa-brands fa-whatsapp"></i>
          </a>
          <a class="icon-btn" href="details.html?id=${place.id || place._index}">
            <i class="fa-solid fa-up-right-from-square"></i>
          </a>
          <button class="icon-btn share-btn" type="button" aria-label="مشاركة">
            <i class="fa-solid fa-share-nodes"></i>
          </button>
        </div>
      </div>
    `;

    elements.cards.appendChild(card);

    const shareBtn = card.querySelector(".share-btn");
    if (shareBtn) {
      shareBtn.addEventListener("click", async (event) => {
        event.stopPropagation();
        const url = new URL("details.html", window.location.origin + window.location.pathname);
        url.searchParams.set("id", place.id || place._index);
        if (navigator.share) {
          try {
            await navigator.share({ title: place.name, url: url.toString() });
            return;
          } catch {
            // fallback to clipboard
          }
        }
        try {
          await navigator.clipboard.writeText(url.toString());
          showToast("تم نسخ رابط المشاركة");
        } catch {
          showToast("تعذر نسخ الرابط");
        }
      });
    }

    card.addEventListener("click", event => {
      if (event.target.closest(".icon-btn")) return;
      window.location.href = `details.html?id=${place.id || place._index}`;
    });

    card.addEventListener("keydown", event => {
      if (event.key !== "Enter") return;
      window.location.href = `details.html?id=${place.id || place._index}`;
    });
  });

  if (elements.loadMoreWrap && elements.loadMore) {
    const hasMore = list.length > limit;
    elements.loadMoreWrap.hidden = !hasMore;
  }
}

function initMap() {
  if (!elements.map || map) return;

  map = L.map("map").setView([36.5, 38], 9);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
  if (L.markerClusterGroup) {
    markersLayer = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 50
    });
  } else {
    markersLayer = L.layerGroup();
  }
  markersLayer.addTo(map);
}

function renderMarkers(list) {
  if (!map || !markersLayer) return;
  markersLayer.clearLayers();
  markersById = {};

  const bounds = [];
  list.forEach(place => {
    if (!place.lat || !place.lng) return;
    const marker = L.marker([place.lat, place.lng]);
    marker.bindPopup(`
      <strong>${place.name}</strong><br>
      ${place.city || ""} ${shouldShowDutyBadge(place.type) && place.onDuty ? "- مناوبة اليوم" : ""}
    `);
    marker.addTo(markersLayer);
    markersById[place._index] = marker;
    bounds.push([place.lat, place.lng]);
  });

  if (bounds.length) {
    map.fitBounds(bounds, { padding: [40, 40] });
  }
}

function applyFilters() {
  const query = normalize(elements.search?.value);
  const smart = parseSmartQuery(query);
  const uiTypeFilter = elements.filter?.value || "all";
  const uiGovFilter = elements.governorate?.value || "all";
  const uiCityFilter = elements.city?.value || "all";
  const specialtyFilter = elements.specialtyFilter?.value || "all";
  const typeFilter = uiTypeFilter !== "all" ? uiTypeFilter : (smart.type || (smart.onDuty ? "onDuty" : "all"));
  const govFilter = uiGovFilter !== "all" ? uiGovFilter : (smart.governorate || "all");
  const cityFilter = uiCityFilter !== "all" ? uiCityFilter : (smart.city || "all");
  const sortBy = elements.sortBy?.value || "default";

  let filtered = allPlaces.filter(place => {
    const haystack = normalize([
      place.name,
      place.specialty,
      place.address,
      place.governorate,
      place.city,
      place.phone,
      place.whatsapp,
      place.email,
      place.services,
      place.notes,
      typeLabel(place.type),
      place.onDuty ? "مناوب مناوبة" : ""
    ].join(" "));

    const matchesQuery = !query || (
      smart.terms.length
        ? smart.terms.every(term => haystack.includes(normalize(term)))
        : haystack.includes(query)
    );

    const matchesType =
      typeFilter === "all" ||
      (typeFilter === "onDuty" && place.onDuty) ||
      place.type === typeFilter;

    const matchesGov = govFilter === "all" || place.governorate === govFilter;
    const matchesCity = cityFilter === "all" || place.city === cityFilter;
    const matchesSpecialty =
      specialtyFilter === "all" ||
      splitSpecialties(place.specialty).some(s => normalize(s) === normalize(specialtyFilter));

    return matchesQuery && matchesType && matchesGov && matchesCity && matchesSpecialty;
  });

  if (sortBy === "name") {
    filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name, "ar"));
  } else if (sortBy === "city") {
    filtered = [...filtered].sort((a, b) => (a.city || "").localeCompare(b.city || "", "ar"));
  } else if (sortBy === "onDuty") {
    filtered = [...filtered].sort((a, b) => Number(b.onDuty) - Number(a.onDuty));
  } else if (sortBy === "distance" && userLocation) {
    filtered = [...filtered].sort((a, b) => {
      if (!a.lat || !a.lng) return 1;
      if (!b.lat || !b.lng) return -1;
      return distanceKm(userLocation, a) - distanceKm(userLocation, b);
    });
  }

  currentPage = 1;
  filteredPlaces = filtered;
  renderCards(filteredPlaces);
  renderMarkers(filteredPlaces);
  saveFilters();
}

function clearFilters() {
  if (elements.search) elements.search.value = "";
  if (elements.filter) elements.filter.value = "all";
  if (elements.governorate) elements.governorate.value = "all";
  if (elements.city) elements.city.value = "all";
  if (elements.specialtyFilter) elements.specialtyFilter.value = "all";
  if (elements.sortBy) elements.sortBy.value = "default";
  currentPage = 1;
  applyFilters();
}

function updateCompactToggle() {
  if (!elements.toggleCompact) return;
  elements.toggleCompact.classList.toggle("primary", compactMode);
  elements.toggleCompact.classList.toggle("ghost", !compactMode);
  document.body.classList.toggle("compact", compactMode);
}

function debounce(fn, wait = 250) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

function applyLocatedPosition(lat, lng, showToastMessage = true) {
  userLocation = { lat, lng };
  if (map) map.setView([userLocation.lat, userLocation.lng], 13);
  if (elements.sortBy && ![...elements.sortBy.options].some(o => o.value === "distance")) {
    const option = document.createElement("option");
    option.value = "distance";
    option.textContent = "الأقرب لموقعي";
    elements.sortBy.appendChild(option);
  }
  if (elements.sortBy) elements.sortBy.value = "distance";
  if (showToastMessage) showToast("تم تحديد موقعك");
  applyFilters();
}

async function locateUser(showToastMessage = true) {
  const cap = window.Capacitor;
  const isNative = !!(cap && typeof cap.isNativePlatform === "function" && cap.isNativePlatform());
  const geoPlugin = cap?.Plugins?.Geolocation;

  if (isNative && geoPlugin) {
    try {
      const perms = await geoPlugin.checkPermissions();
      if (perms.location !== "granted") {
        await geoPlugin.requestPermissions();
      }
      const pos = await geoPlugin.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 15000
      });
      applyLocatedPosition(pos.coords.latitude, pos.coords.longitude, showToastMessage);
      return;
    } catch {
      // fall back to browser geolocation below
    }
  }

  if (!navigator.geolocation) {
    if (showToastMessage) showToast("ميزة تحديد الموقع غير مدعومة");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    pos => {
      applyLocatedPosition(pos.coords.latitude, pos.coords.longitude, showToastMessage);
    },
    () => {
      if (showToastMessage) showToast("لم نتمكن من تحديد الموقع");
    }
  );
}

async function init() {
  // 1) Show cached data immediately for fast first paint
  let rawPlaces = loadPlaces().filter(place => !isGeneratedSample(place));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rawPlaces));
  allPlaces = enrichPlaces(dedupePlaces(rawPlaces));

  populateSelect(elements.governorate, unique(allPlaces.map(p => p.governorate)), "كل المحافظات");
  updateCityOptions();
  updateSpecialtyOptions();

  const urlFilters = parseUrlFilters();
  const savedFilters = loadFilters();
  applyFilterState(urlFilters || savedFilters);
  updateCompactToggle();

  const debouncedApply = debounce(applyFilters, 250);
  [elements.search].filter(Boolean).forEach(el => el.addEventListener("input", () => {
    const secret = normalize(el.value);
    if (secret === "لوحة التحكم") {
      window.location.href = "admin.html";
      return;
    }
    debouncedApply();
  }));
  [elements.specialtyFilter, elements.sortBy]
    .filter(Boolean)
    .forEach(el => el.addEventListener("input", applyFilters));

  if (elements.governorate) {
    elements.governorate.addEventListener("change", () => {
      updateCityOptions();
      updateSpecialtyOptions();
      applyFilters();
    });
  }

  if (elements.city) {
    elements.city.addEventListener("change", () => {
      updateSpecialtyOptions();
      applyFilters();
    });
  }

  if (elements.filter) {
    elements.filter.addEventListener("change", () => {
      updateSpecialtyOptions();
      applyFilters();
    });
  }

  if (elements.clearFilters) {
    elements.clearFilters.addEventListener("click", clearFilters);
  }
  if (elements.emergencyMode) {
    elements.emergencyMode.addEventListener("click", runEmergencyMode);
  }
  if (elements.emergencyClose) {
    elements.emergencyClose.addEventListener("click", closeEmergencyModal);
  }
  if (elements.emergencyApply) {
    elements.emergencyApply.addEventListener("click", () => {
      if (elements.filter) elements.filter.value = "onDuty";
      if (elements.sortBy) elements.sortBy.value = userLocation ? "distance" : "onDuty";
      applyFilters();
      closeEmergencyModal();
    });
  }
  if (elements.emergencyModal) {
    elements.emergencyModal.addEventListener("click", event => {
      if (event.target === elements.emergencyModal) closeEmergencyModal();
    });
  }

  if (elements.themeToggle) {
    elements.themeToggle.addEventListener("click", () => {
      const isDark = document.body.classList.contains("dark");
      applyTheme(isDark ? "light" : "dark");
    });
  }

  if (elements.toggleCompact) {
    elements.toggleCompact.addEventListener("click", () => {
      compactMode = !compactMode;
      updateCompactToggle();
    });
  }

  if (elements.loadMore) {
    elements.loadMore.addEventListener("click", () => {
      currentPage += 1;
      renderCards(filteredPlaces);
    });
  }

  window.addEventListener("online", () => updateStatusBar("أنت متصل بالإنترنت"));
  window.addEventListener("offline", () => updateStatusBar("أنت غير متصل بالإنترنت"));

  if (elements.locateMe) {
    elements.locateMe.addEventListener("click", () => locateUser(true));
  }

  if (elements.shareResults) {
    elements.shareResults.addEventListener("click", async () => {
      const url = buildShareUrl();
      if (navigator.share) {
        try {
          await navigator.share({ title: document.title, url });
          return;
        } catch {
          // fallback to clipboard
        }
      }
      try {
        await navigator.clipboard.writeText(url);
        showToast("تم نسخ رابط النتائج");
      } catch {
        showToast("تعذر نسخ الرابط");
      }
    });
  }

  initTheme();
  initMap();
  locateUser(false);
  applyFilters();

  // 2) Fetch from Firestore then keep in sync live
  try {
    rawPlaces = await loadPlacesFromDb();
    if (!rawPlaces || !rawPlaces.length) {
      rawPlaces = loadPlaces();
    }
    rawPlaces = dedupePlaces((rawPlaces || []).filter(place => !isGeneratedSample(place)));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rawPlaces));
    allPlaces = enrichPlaces(rawPlaces);
    updateCityOptions();
    updateSpecialtyOptions();
    applyFilters();
    subscribePlacesFromDb();
  } catch {
    // keep local data
  }
}

document.addEventListener("DOMContentLoaded", () => {
  init();
});
