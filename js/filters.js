import { places } from "./data.js";
import { render } from "./ui.js";

export function initFilters(){
  const search = document.getElementById("search");
  const filter = document.getElementById("filter");

  function apply(){
    let result = places.filter(p=>{
      return p.name.includes(search.value) &&
        (filter.value==="all" ||
         (filter.value==="onDuty" && p.onDuty) ||
         p.type===filter.value);
    });
    render(result);
  }

  search.oninput = apply;
  filter.onchange = apply;

  render(places);
}
