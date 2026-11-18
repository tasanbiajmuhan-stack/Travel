document.addEventListener("DOMContentLoaded",()=>{
  const tm=window.TravelMap, catalog=document.getElementById("destinationCatalog");
  if(!catalog)return;
  const category=document.getElementById("destinationCategory"), search=document.getElementById("destinationSearch"), sort=document.getElementById("destinationSort");
  Object.entries(tm.categoryMeta).forEach(([v,m])=>category.insertAdjacentHTML("beforeend",`<option value="${v}">${m[1]}</option>`));
  const params=new URLSearchParams(location.search); search.value=params.get("q")||""; if(params.get("city")) search.value=params.get("city");
  function render(){
    let list=[...tm.places].filter(p=>(category.value==="all"||p.category===category.value)&&(`${p.name} ${p.city} ${p.country}`.toLowerCase().includes(search.value.toLowerCase())));
    list.sort((a,b)=>sort.value==="duration"?a.duration-b.duration:sort.value==="category"?a.category.localeCompare(b.category,"ru"):a.name.localeCompare(b.name,"ru"));
    const favorites=tm.getFavorites();
    catalog.innerHTML=list.length?list.map(p=>{const m=tm.categoryMeta[p.category];return `<article class="place-card" data-id="${p.id}">
      <div class="place-image"><img src="${p.image}" alt="${tm.escapeHtml(p.name)}"><button class="heart ${favorites.includes(p.id)?"liked":""}" type="button" data-favorite="${p.id}" aria-label="Избранное">${favorites.includes(p.id)? "♥":"♡"}</button></div>
      <div class="place-body"><div class="place-meta"><span>${m[0]} ${m[1]}</span><span>≈ ${p.duration>=60?Math.floor(p.duration/60)+" ч":p.duration+" мин"}</span></div><h3>${tm.escapeHtml(p.name)}</h3><p class="place-location">${p.country} · ${p.city}</p><p>${tm.escapeHtml(p.description)}</p><div class="place-footer"><span>◷ ${p.duration>=60?Math.floor(p.duration/60)+" ч "+(p.duration%60?p.duration%60+" мин":""):p.duration+" мин"}</span><a class="text-link" href="map.html?place=${p.id}">Посмотреть на карте →</a></div></div>
    </article>`}).join(""):`<div class="empty-state"><h3>Ничего не найдено</h3><p>Попробуйте изменить запрос или категорию.</p></div>`;
  }
  [search,category,sort].forEach(el=>el.addEventListener(el===search?"input":"change",render));
  catalog.addEventListener("click",e=>{const b=e.target.closest("[data-favorite]");if(!b)return;const liked=tm.toggleFavorite(b.dataset.favorite);b.classList.toggle("liked",liked);b.textContent=liked?"♥":"♡";});
  render();
});
