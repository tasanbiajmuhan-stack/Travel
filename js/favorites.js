document.addEventListener("DOMContentLoaded",()=>{
  const tm=window.TravelMap,catalog=document.getElementById("favoritesCatalog");if(!catalog)return;
  function render(){
    const list=tm.places.filter(p=>tm.getFavorites().includes(p.id));
    catalog.innerHTML=list.length?list.map(p=>{const m=tm.categoryMeta[p.category];const duration=p.duration>=60?(Math.floor(p.duration/60)+" ч"+(p.duration%60?" "+(p.duration%60)+" мин":"")):(p.duration+" мин");return `<article class="place-card"><div class="place-image"><img src="${p.image}" alt="${tm.escapeHtml(p.name)}"><button class="heart liked" type="button" data-favorite="${p.id}" aria-label="Убрать из избранного">♥</button></div><div class="place-body"><div class="place-meta"><span>${m[0]} ${m[1]}</span><span>≈ ${duration}</span></div><h3>${tm.escapeHtml(p.name)}</h3><p class="place-location">${p.country} · ${p.city}</p><p>${tm.escapeHtml(p.description)}</p><div class="place-footer"><span>◷ ${duration}</span><a class="text-link" href="map.html?place=${p.id}">Посмотреть на карте →</a></div></div></article>`}).join(""):`<div class="empty-state"><h3>В избранном пока пусто</h3><p>Добавляйте понравившиеся места из каталога.</p><a class="btn btn-primary" href="destinations.html">Выбрать места</a></div>`;
  }
  catalog.addEventListener("click",e=>{const b=e.target.closest("[data-favorite]");if(!b)return;tm.toggleFavorite(b.dataset.favorite);render();});
  render();
});
