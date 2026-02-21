const STORAGE_KEY = "places";
function localISODate(d = new Date()) {
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().split("T")[0];
}
const todayISO = localISODate();

const detailRoot = document.getElementById("detail");
const detailEmpty = document.getElementById("detailEmpty");
const THEME_KEY = "healthDutyTheme";
const REPORTS_KEY = "healthDutyReports";

function loadReports() {
  try {
    const raw = localStorage.getItem(REPORTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveReports(list) {
  localStorage.setItem(REPORTS_KEY, JSON.stringify(list));
}

async function saveReportToDb(report) {
  if (!window.supabaseClient) return null;
  try {
    const { error } = await window.supabaseClient.from("reports").insert(report);
    if (error) throw error;
    return true;
  } catch {
    return null;
  }
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
function typeIcon(type) {
  if (type === "hospital") return "fa-hospital";
  if (type === "dispensary") return "fa-house-medical";
  if (type === "clinic") return "fa-stethoscope";
  if (type === "lab") return "fa-flask";
  return "fa-prescription-bottle-medical";
}

function formatDateLabel(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  const safeDate = new Date(`${dateStr}T00:00:00`);
  const dayName = safeDate.toLocaleDateString("ar", { weekday: "long" });
  const formatted = [d, m, y].filter(Boolean).join("-");
  return `${dayName} - ${formatted}`;
}

function normalizeWorkdays(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return value
    .toString()
    .split(/[|,]/)
    .map(v => v.trim())
    .filter(Boolean);
}

function renderDetail(place) {
  const duty = isOnDuty(place);
  const schedule = normalizeSchedule(place.schedule);
  const showDuty = place.type === "pharmacy";
  const workdays = normalizeWorkdays(place.workdays);
  const media = place.image
    ? `<button class="place-icon square detail-media ${place.type}" type="button" data-image="${place.image}">
        <img src="${place.image}" alt="${place.name}">
      </button>`
    : `<div class="place-icon ${place.type}">
        <i class="fa-solid ${typeIcon(place.type)}"></i>
      </div>`;

  detailRoot.innerHTML = `
    <div class="detail-header">
      <div class="detail-title">
        ${media}
        <div>
          <h2>${place.name}</h2>
          <p class="muted">${place.governorate || ""} ${place.city ? "- " + place.city : ""}</p>
        </div>
      </div>
      ${
        showDuty
          ? (duty
            ? `<span class="status on">مناوبة اليوم</span>`
            : "")
          : ""
      }
    </div>

    <div class="detail-grid">
      <div class="detail-info">
        <h3>بيانات التواصل</h3>
        <p><i class="fa-solid fa-location-dot"></i> ${place.address || "غير محدد"}</p>
        <p><i class="fa-solid fa-phone"></i> ${place.phone || "غير متوفر"}</p>
        ${place.whatsapp ? `<p><i class="fa-brands fa-whatsapp"></i> ${place.whatsapp}</p>` : ""}
        ${place.email ? `<p><i class="fa-solid fa-envelope"></i> ${place.email}</p>` : ""}
        ${place.hours ? `<p><i class="fa-regular fa-clock"></i> ${place.hours}</p>` : ""}
        ${workdays.length ? `<p><i class="fa-regular fa-calendar"></i> ${workdays.join("، ")}</p>` : ""}
        <div class="card-actions">
          <a class="icon-btn ${place.phone ? "" : "disabled"}" href="${place.phone ? `tel:${place.phone}` : "#"}">
            <i class="fa-solid fa-phone"></i>
          </a>
          <a class="icon-btn ${place.whatsapp ? "" : "disabled"}" href="${place.whatsapp ? `https://wa.me/${place.whatsapp}` : "#"}" target="_blank" rel="noreferrer">
            <i class="fa-brands fa-whatsapp"></i>
          </a>
          <a class="icon-btn" href="https://www.google.com/maps?q=${place.lat},${place.lng}" target="_blank" rel="noreferrer">
            <i class="fa-solid fa-map-location-dot"></i>
          </a>
          <button class="icon-btn share-btn" type="button" aria-label="مشاركة">
            <i class="fa-solid fa-share-nodes"></i>
          </button>
          <button class="icon-btn report-btn" type="button" aria-label="بلاغ">
            <i class="fa-solid fa-triangle-exclamation"></i>
          </button>
        </div>
      </div>
      <div class="detail-schedule">
        <h3>جدول المناوبة</h3>
        ${schedule.length ? `
          <div class="chip-grid">
            ${schedule.map(d => {
              const status = d < todayISO ? "past" : (d === todayISO ? "on" : "upcoming");
              return `<span class="chip ${status}">${formatDateLabel(d)}</span>`;
            }).join("")}
          </div>
        ` : "<p class=\"muted\">لم يتم تحديد تواريخ المناوبة بعد.</p>"}
      </div>
    </div>

    <div class="detail-grid">
      <div class="detail-info">
        <h3>الاختصاص</h3>
        <p>${place.specialty || "لا يوجد اختصاص محدد."}</p>
      </div>
      <div class="detail-info">
        <h3>الخدمات</h3>
        <p>${place.services || "لم يتم إضافة خدمات بعد."}</p>
      </div>
      <div class="detail-info">
        <h3>ملاحظات</h3>
        <p>${place.notes || "لا توجد ملاحظات إضافية."}</p>
      </div>
    </div>

    <h3>الموقع على الخريطة</h3>
    <div id="detailMap"></div>
  `;

  if (place.lat && place.lng) {
    const map = L.map("detailMap").setView([place.lat, place.lng], 15);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
    L.marker([place.lat, place.lng]).addTo(map);
  }

  const shareBtn = detailRoot.querySelector(".share-btn");
  const reportBtn = detailRoot.querySelector(".report-btn");
  if (shareBtn) {
    shareBtn.addEventListener("click", async () => {
      const url = window.location.href;
      if (navigator.share) {
        try {
          await navigator.share({ title: place.name, url });
          return;
        } catch {
          // fallback to clipboard
        }
      }
      try {
        await navigator.clipboard.writeText(url);
        alert("تم نسخ رابط المشاركة");
      } catch {
        alert("تعذر نسخ الرابط");
      }
    });
  }

  const reportModal = document.getElementById("reportModal");
  const reportType = document.getElementById("reportType");
  const reportNote = document.getElementById("reportNote");
  const reportSubmit = document.getElementById("reportSubmit");
  const reportClose = document.getElementById("reportClose");

  const closeReportModal = () => {
    if (!reportModal) return;
    reportModal.classList.remove("active");
    reportModal.setAttribute("aria-hidden", "true");
    if (reportNote) reportNote.value = "";
  };

  if (reportBtn && reportModal) {
    reportBtn.addEventListener("click", () => {
      reportModal.classList.add("active");
      reportModal.setAttribute("aria-hidden", "false");
    });
  }
  if (reportClose) reportClose.addEventListener("click", closeReportModal);
  if (reportModal) {
    reportModal.addEventListener("click", event => {
      if (event.target === reportModal) closeReportModal();
    });
  }
  if (reportSubmit) {
    reportSubmit.addEventListener("click", async () => {
      const report = {
        place_id: place.id || null,
        place_name: place.name || "",
        governorate: place.governorate || "",
        city: place.city || "",
        report_type: reportType?.value || "other",
        note: (reportNote?.value || "").trim(),
        status: "open",
        created_at: new Date().toISOString()
      };
      const list = loadReports();
      list.unshift(report);
      saveReports(list.slice(0, 500));
      await saveReportToDb(report);
      closeReportModal();
      alert("تم إرسال البلاغ");
    });
  }

  const modal = document.getElementById("imageModal");
  const modalImg = document.getElementById("imageModalImg");
  const modalClose = modal?.querySelector(".image-modal-close");
  const modalBackdrop = modal?.querySelector(".image-modal-backdrop");
  const mediaBtn = detailRoot.querySelector(".detail-media");

  if (modal && modalImg && mediaBtn) {
    const openModal = () => {
      modalImg.src = mediaBtn.dataset.image || "";
      modal.hidden = false;
      modal.classList.add("active");
      document.body.style.overflow = "hidden";
    };
    const closeModal = () => {
      modal.hidden = true;
      modal.classList.remove("active");
      modalImg.src = "";
      document.body.style.overflow = "";
    };

    mediaBtn.addEventListener("click", openModal);
    modalClose?.addEventListener("click", closeModal);
    modalBackdrop?.addEventListener("click", closeModal);
    document.addEventListener("keydown", event => {
      if (!modal.classList.contains("active")) return;
      if (event.key === "Escape") closeModal();
    });
  }
}

function applyTheme(theme) {
  document.body.classList.toggle("dark", theme === "dark");
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const systemPrefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = saved || (systemPrefersDark ? "dark" : "light");
  applyTheme(theme);
}

(async function init() {
  initTheme();
  const params = new URLSearchParams(window.location.search);
  const rawId = params.get("id");
  const id = rawId ? String(rawId) : "";
  let places = await loadPlacesFromDb();
  if (!places || !places.length) {
    places = loadPlaces();
  }

  let place = null;
  if (id) {
    place = places.find(p => String(p.id) === id) || null;
  }
  if (!place && !Number.isNaN(Number(id))) {
    place = places[Number(id)] || null;
  }

  if (!places.length || !place) {
    detailEmpty.hidden = false;
    return;
  }

  place = { ...place, _index: Number(id) };
  renderDetail(place);
})();
