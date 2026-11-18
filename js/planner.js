document.addEventListener("DOMContentLoaded", () => {
  const tm = window.TravelMap;
  const form = document.getElementById("plannerForm");
  if (!form) return;
  const query = new URLSearchParams(location.search);
  const dayTitles = ["Знакомство с городом", "Природа", "Культура", "Архитектура", "Развлечения", "Окрестности", "Свободный день"];
  const countrySelect = document.getElementById("countrySelect");
  const citySelect = document.getElementById("citySelect");
  const categoryChecks = document.getElementById("categoryChecks");
  const routeContainer = document.getElementById("routeDays");
  document.getElementById("startDate").valueAsDate = new Date();

  tm.countries.filter(country => country.id !== "sudan").forEach(country => countrySelect.add(new Option(`${country.flag} ${country.name}`, country.name)));
  const restrictedCountry = new Option("🇸🇩 Судан — активные маршруты не предлагаются", "Судан");
  restrictedCountry.disabled = true;
  countrySelect.add(restrictedCountry);
  if (!tm.countries.some(country => country.name === "Казахстан")) countrySelect.add(new Option("🇰🇿 Казахстан", "Казахстан"));
  Object.entries(tm.categoryMeta).forEach(([value, meta]) => {
    categoryChecks.insertAdjacentHTML("beforeend", `<label class="category-check"><input type="checkbox" value="${value}" checked> ${meta[0]} ${meta[1].replace("Рестораны и кафе", "Кафе")}</label>`);
  });

  const paramsCountry = query.get("country");
  const paramsCity = query.get("city");
  let storedRoute = JSON.parse(localStorage.getItem("travelmap_route") || "null");
  const storedCountry = storedRoute?.country || tm.places.find(place => place.city === storedRoute?.city)?.country;
  if (storedCountry === "Судан" || tm.countries.find(country => country.name === storedCountry)?.id === "sudan") storedRoute = null;
  const initialCountry = paramsCountry || storedRoute?.country || tm.places.find(place => place.city === storedRoute?.city)?.country || "Казахстан";
  countrySelect.value = [...countrySelect.options].some(option => option.value === initialCountry) ? initialCountry : "Казахстан";

  function getCities(countryName) {
    const country = tm.countries.find(item => item.name === countryName);
    const cityNames = [
      ...tm.cities.filter(city => city.country === country?.id).map(city => city.name),
      ...tm.places.filter(place => place.country === countryName).map(place => place.city)
    ];
    return [...new Set(cityNames)].sort((a, b) => a.localeCompare(b, "ru"));
  }

  function updateCities(preferred) {
    const cities = getCities(countrySelect.value);
    if (preferred && !cities.includes(preferred)) cities.push(preferred);
    citySelect.replaceChildren(...cities.map(city => new Option(city, city)));
    if (preferred && cities.includes(preferred)) citySelect.value = preferred;
  }
  updateCities(paramsCity || storedRoute?.city);
  countrySelect.addEventListener("change", () => updateCities());

  function suggestedItems(city, days, selectedCategories) {
    const cityPlaces = tm.places.filter(place => place.city === city);
    const pool = selectedCategories.length ? cityPlaces.filter(place => selectedCategories.includes(place.category)) : cityPlaces;
    const perDay = Math.ceil(pool.length / Math.max(1, days - 1));
    const items = [];
    for (let day = 0; day < days; day++) {
      const start = day * perDay;
      const places = day === days - 1 ? [] : pool.slice(start, start + perDay);
      items.push({ title: dayTitles[day] || "Свободное исследование", places });
    }
    return items;
  }

  function initialRoute() {
    const days = Number(query.get("days")) || storedRoute?.items?.length || 7;
    const city = paramsCity || storedRoute?.city || citySelect.value || "Алматы";
    if (paramsCity) return {
      country: countrySelect.value, city, days, start: "", budget: "medium",
      items: suggestedItems(city, days, Object.keys(tm.categoryMeta))
    };
    if (storedRoute?.items?.length) return storedRoute;
    return { country: "Казахстан", city: "Алматы", days: 7, start: "", budget: "medium", items: suggestedItems("Алматы", 7, Object.keys(tm.categoryMeta)) };
  }
  let route = initialRoute();
  countrySelect.value = route.country || countrySelect.value;
  updateCities(route.city);
  document.getElementById("daysSelect").value = String(route.items.length);
  if (route.start) document.getElementById("startDate").value = route.start;

  function distance(a, b) {
    const rad = value => value * Math.PI / 180;
    const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }
  function durationLabel(minutes) {
    return minutes >= 60 ? `${Math.floor(minutes / 60)} ч${minutes % 60 ? ` ${minutes % 60} мин` : ""}` : `${minutes} мин`;
  }

  function render() {
    document.getElementById("routeTitle").textContent = `${route.city} · ${route.items.length} дней`;
    const visits = route.items.flatMap(day => day.places);
    const minutes = visits.reduce((total, place) => total + place.duration, 0);
    const budgetLabel = { economy: "Экономный", medium: "Средний", premium: "Премиум" }[route.budget] || "Не выбран";
    let kilometers = 0;
    for (let index = 1; index < visits.length; index++) kilometers += distance(visits[index - 1], visits[index]);
    document.getElementById("routeSummary").innerHTML = `<div class="summary-card"><span>Длительность</span><strong>${route.items.length} дн.</strong></div><div class="summary-card"><span>Время на локации</span><strong>${durationLabel(minutes)}</strong></div><div class="summary-card"><span>Расстояние по прямой между точками</span><strong>~${Math.round(kilometers)} км</strong></div><div class="summary-card"><span>Бюджетное предпочтение</span><strong>${budgetLabel}</strong></div>`;
    routeContainer.innerHTML = route.items.map((day, dayIndex) => `<article class="route-day" data-day="${dayIndex}">
      <div class="route-day-head"><h3>День ${dayIndex + 1} — ${tm.escapeHtml(day.title)}</h3><span>${day.places.length} мест · ${durationLabel(day.places.reduce((total, place) => total + place.duration, 0))}</span></div>
      <div class="route-places">${day.places.map((place, placeIndex) => `<div class="route-place" draggable="true" data-day="${dayIndex}" data-place="${place.id}" data-index="${placeIndex}">
        <img src="${place.image}" alt="Иллюстративное фото: ${tm.escapeHtml(place.name)}"><div><h4>${tm.escapeHtml(place.name)}</h4><p>${tm.categoryMeta[place.category][0]} ${tm.categoryMeta[place.category][1]} · ◷ ${durationLabel(place.duration)} · ${tm.escapeHtml(place.address)}</p></div>
        <div class="route-place-actions"><button class="icon-btn" type="button" data-action="up" title="Выше">↑</button><button class="icon-btn" type="button" data-action="down" title="Ниже">↓</button><button class="icon-btn" type="button" data-action="remove" title="Удалить">×</button></div>
      </div>`).join("")}</div>
      <div class="add-place"><select data-add-day="${dayIndex}"><option value="">Добавить место...</option>${tm.places.filter(place => place.city === route.city).map(place => `<option value="${place.id}">${tm.escapeHtml(place.name)}</option>`).join("")}</select></div>
    </article>`).join("");
  }

  routeContainer.addEventListener("click", event => {
    const button = event.target.closest("[data-action]");
    const row = event.target.closest(".route-place");
    if (!row || !button) return;
    const dayIndex = Number(row.dataset.day), placeIndex = Number(row.dataset.index);
    const action = button.dataset.action;
    if (action === "remove") route.items[dayIndex].places.splice(placeIndex, 1);
    if (action === "up" && placeIndex > 0) [route.items[dayIndex].places[placeIndex - 1], route.items[dayIndex].places[placeIndex]] = [route.items[dayIndex].places[placeIndex], route.items[dayIndex].places[placeIndex - 1]];
    if (action === "down" && placeIndex < route.items[dayIndex].places.length - 1) [route.items[dayIndex].places[placeIndex + 1], route.items[dayIndex].places[placeIndex]] = [route.items[dayIndex].places[placeIndex], route.items[dayIndex].places[placeIndex + 1]];
    render();
  });
  routeContainer.addEventListener("change", event => {
    const select = event.target.closest("[data-add-day]");
    if (!select || !select.value) return;
    const place = tm.places.find(item => item.id === select.value);
    if (place) route.items[Number(select.dataset.addDay)].places.push(place);
    render();
  });

  let dragged = null;
  routeContainer.addEventListener("dragstart", event => {
    dragged = event.target.closest(".route-place");
    dragged?.classList.add("dragging");
  });
  routeContainer.addEventListener("dragend", () => { dragged?.classList.remove("dragging"); dragged = null; });
  routeContainer.addEventListener("dragover", event => event.preventDefault());
  routeContainer.addEventListener("drop", event => {
    event.preventDefault();
    const target = event.target.closest(".route-place");
    if (!target || !dragged) return;
    const fromDay = Number(dragged.dataset.day), fromIndex = Number(dragged.dataset.index);
    const toDay = Number(target.dataset.day), toIndex = Number(target.dataset.index);
    const [place] = route.items[fromDay].places.splice(fromIndex, 1);
    route.items[toDay].places.splice(toIndex, 0, place);
    render();
  });

  form.addEventListener("submit", event => {
    event.preventDefault();
    const city = citySelect.value;
    const selected = [...categoryChecks.querySelectorAll("input:checked")].map(input => input.value);
    const items = suggestedItems(city, Number(document.getElementById("daysSelect").value), selected);
    route = {
      country: countrySelect.value,
      city,
      days: items.length,
      start: document.getElementById("startDate").value,
      budget: document.getElementById("budgetSelect").value,
      items
    };
    render();
  });
  document.getElementById("saveRoute").addEventListener("click", () => {
    localStorage.setItem("travelmap_route", JSON.stringify(route));
    const button = document.getElementById("saveRoute");
    button.textContent = "Сохранено";
    setTimeout(() => { button.textContent = "Сохранить"; }, 1200);
  });
  document.getElementById("printRoute").addEventListener("click", () => window.print());
  document.getElementById("viewRouteMap").addEventListener("click", () => localStorage.setItem("travelmap_route", JSON.stringify(route)));
  render();
});
