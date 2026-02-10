export function initTheme(){
  const btn = document.getElementById("themeToggle");
  btn.onclick = ()=>{
    document.body.classList.toggle("dark");
  }
}
