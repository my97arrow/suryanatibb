const STORAGE_KEY = "places";
const todayISO = new Date().toISOString().split("T")[0];

const detailRoot = document.getElementById("detail");
const detailEmpty = document.getElementById("detailEmpty");

function loadPlaces() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function isOnDuty(place) {
  return Array.isArray(place.schedule) && place.schedule.includes(todayISO);
}

function typeIcon(type) {
  if (type === "hospital") return "fa-hospital";
  if (type === "dispensary") return "fa-house-medical";
  if (type === "clinic") return "fa-stethoscope";
  if (type === "lab") return "fa-flask";
  return "fa-prescription-bottle-medical";
}

function renderDetail(place) {
  const duty = isOnDuty(place);
  const schedule = Array.isArray(place.schedule) ? place.schedule : [];
  const showDuty = place.type === "pharmacy";
  const media = place.image
    ? `<img class="detail-photo" src="${place.image}" alt="${place.name}">`
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
          ${place.specialty ? `<span class="chip">${place.specialty}</span>` : ""}
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
        </div>
      </div>
      <div class="detail-schedule">
        <h3>جدول المناوبة</h3>
        ${schedule.length ? `
          <div class="chip-grid">
            ${schedule.map(d => {
              const status = d < todayISO ? "past" : (d === todayISO ? "on" : "upcoming");
              return `<span class="chip ${status}">${d}</span>`;
            }).join("")}
          </div>
        ` : "<p class=\"muted\">لم يتم تحديد تواريخ المناوبة بعد.</p>"}
      </div>
    </div>

    <div class="detail-grid">
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
}

(function init() {
  const params = new URLSearchParams(window.location.search);
  const id = Number(params.get("id"));
  const places = loadPlaces();

  if (!places.length || Number.isNaN(id) || !places[id]) {
    detailEmpty.hidden = false;
    return;
  }

  const place = { ...places[id], _index: id };
  renderDetail(place);
})();
