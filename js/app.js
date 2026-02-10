const STORAGE_KEY = "places";
const todayISO = new Date().toISOString().split("T")[0];

const elements = {
  search: document.getElementById("search"),
  filter: document.getElementById("filter"),
  governorate: document.getElementById("governorate"),
  city: document.getElementById("city"),
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
const pageSize = 12;
const THEME_KEY = "healthDutyTheme";

const FILTERS_KEY = "healthDutyFilters";

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

async function saveSeedIfNeeded() {
  const list = await loadPlacesFromDb();
  if (list && list.length) return list;
  if (!window.supabaseClient) return null;
  try {
    const { data, error } = await window.supabaseClient
      .from("places")
      .insert(SEED_PLACES)
      .select("*");
    if (error) throw error;
    return data || SEED_PLACES;
  } catch {
    return SEED_PLACES;
  }
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
  return Array.isArray(place.schedule) && place.schedule.includes(todayISO);
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

    card.innerHTML = `
      <div class="card-head">
        <div class="place-icon small ${place.type}">
          <i class="fa-solid ${typeIcon(place.type)}"></i>
        </div>
        <div class="card-title">
          <h3>${place.name}</h3>
          <p class="muted">
            ${typeLabel(place.type)}${place.specialty ? ` - ${place.specialty}` : ""}
            ${shouldShowDutyBadge(place.type) && place.onDuty ? `<span class="badge on inline-badge">مناوب</span>` : ""}
          </p>
        </div>
      </div>
      <div class="card-meta">
        <span><i class="fa-solid fa-location-dot"></i> ${place.governorate || ""} ${place.city ? "- " + place.city : ""}</span>
        <span class="muted">${place.address || "عنوان غير محدد"}</span>
      </div>
      <div class="card-foot">
        <div class="card-actions">
          <a class="icon-btn ${place.phone ? "" : "disabled"}" href="${place.phone ? `tel:${place.phone}` : "#"}">
            <i class="fa-solid fa-phone"></i>
          </a>
          <a class="icon-btn ${place.whatsapp || place.phone ? "" : "disabled"}" href="${place.whatsapp || place.phone ? `https://wa.me/${place.whatsapp || place.phone}` : "#"}" target="_blank" rel="noreferrer">
            <i class="fa-brands fa-whatsapp"></i>
          </a>
          <a class="icon-btn" href="details.html?id=${place.id || place._index}">
            <i class="fa-solid fa-up-right-from-square"></i>
          </a>
        </div>
      </div>
    `;

    elements.cards.appendChild(card);

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
  const typeFilter = elements.filter?.value || "all";
  const govFilter = elements.governorate?.value || "all";
  const cityFilter = elements.city?.value || "all";
  const sortBy = elements.sortBy?.value || "default";

  let filtered = allPlaces.filter(place => {
    const matchesQuery = !query ||
      normalize(place.name).includes(query) ||
      normalize(place.specialty).includes(query) ||
      normalize(place.address).includes(query) ||
      normalize(place.governorate).includes(query) ||
      normalize(place.city).includes(query) ||
      normalize(place.phone).includes(query) ||
      normalize(place.whatsapp).includes(query) ||
      normalize(place.email).includes(query);

    const matchesType =
      typeFilter === "all" ||
      (typeFilter === "onDuty" && place.onDuty) ||
      place.type === typeFilter;

    const matchesGov = govFilter === "all" || place.governorate === govFilter;
    const matchesCity = cityFilter === "all" || place.city === cityFilter;

    return matchesQuery && matchesType && matchesGov && matchesCity;
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
  renderCards(filtered);
  renderMarkers(filtered);
  saveFilters();
}

function clearFilters() {
  if (elements.search) elements.search.value = "";
  if (elements.filter) elements.filter.value = "all";
  if (elements.governorate) elements.governorate.value = "all";
  if (elements.city) elements.city.value = "all";
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

function locateUser(showToastMessage = true) {
  if (!navigator.geolocation) {
    if (showToastMessage) showToast("ميزة تحديد الموقع غير مدعومة");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    pos => {
      userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
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
    },
    () => {
      if (showToastMessage) showToast("لم نتمكن من تحديد الموقع");
    }
  );
}

async function init() {
  // 1) Show cached data immediately for fast first paint
  let rawPlaces = loadPlaces();
  if (!rawPlaces.length) {
    rawPlaces = SEED_PLACES;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rawPlaces));
  }
  allPlaces = enrichPlaces(dedupePlaces(rawPlaces));

  populateSelect(elements.governorate, unique(allPlaces.map(p => p.governorate)), "كل المحافظات");
  updateCityOptions();

  const urlFilters = parseUrlFilters();
  const savedFilters = loadFilters();
  applyFilterState(urlFilters || savedFilters);
  updateCompactToggle();

  const debouncedApply = debounce(applyFilters, 250);
  [elements.search].filter(Boolean).forEach(el => el.addEventListener("input", debouncedApply));
  [elements.filter, elements.governorate, elements.city, elements.sortBy]
    .filter(Boolean)
    .forEach(el => el.addEventListener("input", applyFilters));

  if (elements.governorate) {
    elements.governorate.addEventListener("change", () => {
      updateCityOptions();
      applyFilters();
    });
  }

  if (elements.clearFilters) {
    elements.clearFilters.addEventListener("click", clearFilters);
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
      applyFilters();
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
      rawPlaces = await saveSeedIfNeeded();
    }
    if (!rawPlaces || !rawPlaces.length) {
      rawPlaces = loadPlaces();
    }
    rawPlaces = dedupePlaces(rawPlaces || []);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rawPlaces));
    allPlaces = enrichPlaces(rawPlaces);
    updateCityOptions();
    applyFilters();
    subscribePlacesFromDb();
  } catch {
    // keep local data
  }
}

document.addEventListener("DOMContentLoaded", () => {
  init();
});
