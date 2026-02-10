import { places } from "./data.js";

export function render(list){
  const root = document.getElementById("cards");
  root.innerHTML = "";

  list.forEach(p=>{
    root.innerHTML += `
      <div class="card">
        <img src="${p.image}">
        <div class="card-body">
          <span class="badge ${p.onDuty?'on':'off'}">
            ${p.onDuty?'مناوبة الآن':'غير مناوبة'}
          </span>
          <h3>${p.name}</h3>
          <p>📍 ${p.address}</p>
          <p>📞 ${p.phone}</p>
        </div>
      </div>
    `;
  });
}
