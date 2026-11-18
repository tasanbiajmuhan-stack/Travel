document.addEventListener("DOMContentLoaded", () => {
  const tm = window.TravelMap;
  const data = window.TravelMapData;
  const status = document.getElementById("mapStatus");
  const explorer = document.getElementById("mapExplorer");
  const params = new URLSearchParams(location.search);
  const savedRoute = JSON.parse(localStorage.getItem("travelmap_route") || "null");
  const routePlaces = savedRoute?.items?.flatMap((day, index) => day.places.map(place => ({ ...place, routeDay: index }))) || [];
  const categoryNames = {
    history: "Достопримечательности", food: "Кафе и рестораны", hotel: "Отели",
    nature: "Парки и природа", architecture: "Архитектура", photo: "Фото-локации",
    entertainment: "Развлечения"
  };
  const categories = ["history", "food", "hotel", "nature", "architecture", "photo", "entertainment"];
  let selectedCountry = null;
  let selectedCity = null;
  let selectedDistrict = null;
  let selectedPlaceId = null;
  let selectedCategory = "all";
  let activeDay = "all";
  let previousViewpoint = null;
  let mapView = null;
  let map = null;
  let pointsLayer = null;
  let routesLayer = null;
  let countryPinsLayer = null;
  let cityPinsLayer = null;
  let boundaryLayerView = null;
  let highlightedObjectId = null;
  let graphicsById = new Map();
  let visiblePlaces = [];
  let refreshMapLayers = () => {};

  const safe = tm.escapeHtml;
  const normalized = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const countryAliases = {
    "south-korea": ["south korea", "korea, republic of", "republic of korea", "korea"],
    sudan: ["sudan"], germany: ["germany"], japan: ["japan"], china: ["china"],
    kazakhstan: ["kazakhstan"]
  };

  function setStatus(message) {
    status.textContent = message;
  }

  function matchCountry(value) {
    const text = normalized(value);
    return data.countries.find(country => countryAliases[country.id].some(alias => text === normalized(alias) || text.includes(normalized(alias))));
  }

  function configureFilters() {
    const filters = document.getElementById("mapFilters");
    filters.innerHTML = `<button class="filter-chip active" type="button" data-category="all">Все категории</button>` +
      categories.map(key => `<button class="filter-chip" type="button" data-category="${key}">${tm.categoryMeta[key][0]} ${categoryNames[key]}</button>`).join("");
    filters.addEventListener("click", event => {
      const button = event.target.closest("[data-category]");
      if (!button) return;
      selectedCategory = button.dataset.category;
      filters.querySelectorAll(".filter-chip").forEach(chip => chip.classList.toggle("active", chip === button));
      renderExplorer();
      refreshMapLayers();
    });
  }

  function renderCountries() {
    explorer.innerHTML = `<div class="explorer-toolbar"><div><p class="eyebrow dark">Выберите направление</p><h2>Страны</h2></div></div>
      <div class="country-list">${data.countries.map(country => `<button class="country-option" type="button" data-country="${country.id}">
        <span class="country-flag">${country.flag}</span><span><strong>${safe(country.name)}</strong><small>Столица: ${safe(country.capital)}</small></span><span class="country-arrow">→</span>
      </button>`).join("")}</div>
      <p class="data-note">Демонстрационная подборка. Фото иллюстративные; координаты ориентировочные, проверяйте часы работы и доступность перед поездкой.</p>`;
  }

  function getCountryPlaces(country, city) {
    return tm.places.filter(place => {
      const match = city ? place.city === city : (place.countryId === country.id || place.country === country.name);
      return match && (!selectedDistrict || place.district === selectedDistrict) && (selectedCategory === "all" || place.category === selectedCategory);
    });
  }

  function renderCountry(country) {
    const cities = data.cities.filter(city => city.country === country.id);
    const cityPills = cities.map(city => `<button class="city-pill" type="button" data-city="${city.id}">${safe(city.name)}</button>`).join("");
    explorer.innerHTML = `<div class="panel-topline"><button class="back-button" type="button" data-action="countries">← Все страны</button><button class="close-panel" type="button" data-action="close" aria-label="Закрыть панель">×</button></div>
      <article class="feature-country">
        <img class="feature-country-image" src="${country.image}" alt="Иллюстративное фото: ${safe(country.name)}" data-lightbox="${country.image}">
        <div class="feature-country-shade"></div>
        <div class="feature-country-content"><div class="feature-country-title"><span>${country.flag}</span><div><h2>${safe(country.name)}</h2><p>Столица: ${safe(country.capital)}</p></div></div>
          <p>${safe(country.description)}</p><p class="country-best"><strong>Лучшее время:</strong> ${safe(country.bestTime)}</p>
          ${country.warning ? `<p class="travel-warning">${safe(country.warning)}</p>` : ""}
          <div class="country-buttons">${country.warning ? "" : `<button class="btn btn-accent" type="button" data-action="plan-country">Составить путешествие</button>`}<button class="btn btn-light" type="button" data-action="show-cities">Показать города</button></div>
        </div>
      </article>
      <div class="city-picker" id="cityPicker"><div class="section-mini-heading"><h3>Города и населённые пункты</h3><span>${cities.length}</span></div><div class="city-pills">${cityPills || "<p>Подборка городов скоро появится.</p>"}</div></div>
      <div class="suggestion-header"><div><p class="eyebrow dark">Подборка мест</p><h3>Популярное в стране</h3></div><span class="suggestion-count">${getCountryPlaces(country, null).length} мест</span></div>
      <div class="suggestion-sections">${renderSuggestionSections(getCountryPlaces(country, null))}</div>
      <p class="data-note">Демонстрационные подборки, а не рейтинг. Фото иллюстративные. Координаты ориентировочные — проверяйте актуальные условия посещения.</p>`;
  }

  function renderCity(country, city) {
    const places = getCountryPlaces(country, city.name);
    const siblings = data.cities.filter(item => item.country === country.id);
    const sections = renderSuggestionSections(places);
    explorer.innerHTML = `<div class="panel-topline"><button class="back-button" type="button" data-action="back-country">← ${safe(country.name)}</button><button class="close-panel" type="button" data-action="close" aria-label="Закрыть панель">×</button></div>
      <article class="feature-city">
        <img class="feature-city-image" src="${city.image}" alt="Иллюстративное фото: ${safe(city.name)}" data-lightbox="${city.image}">
        <div class="feature-city-copy"><span class="city-country-label">${country.flag} ${safe(country.name)}</span><h2>${safe(city.name)}</h2><p>${safe(city.description)}</p>
          <div class="city-switcher">${siblings.map(item => `<button class="city-pill ${item.id === city.id ? "active" : ""}" type="button" data-city="${item.id}">${safe(item.name)}</button>`).join("")}</div>
          ${city.districts?.length ? `<div class="district-list"><strong>Районы:</strong><button type="button" class="district-pill ${selectedDistrict ? "" : "active"}" data-district="">Все</button>${city.districts.map(district => `<button type="button" class="district-pill ${selectedDistrict === district ? "active" : ""}" data-district="${safe(district)}">${safe(district)}</button>`).join("")}</div>` : ""}
          ${country.warning ? "" : `<button class="btn btn-accent" type="button" data-action="plan-city">Составить путешествие</button>`}
        </div>
      </article>
      <div class="suggestion-header"><div><p class="eyebrow dark">Исследуйте город</p><h3>Места и впечатления</h3></div><span class="suggestion-count">${places.length} мест</span></div>
      <div class="suggestion-sections">${sections}</div>
      <p class="data-note">Демонстрационная подборка. Фото иллюстративные, отзывы и рейтинги не отображаются без проверенных источников.</p>`;
  }

  function renderSuggestionSections(places) {
    const grouped = categories.map(key => [key, places.filter(place => place.category === key)]).filter(([, items]) => items.length);
    if (!grouped.length) return `<div class="empty-map-state">В этой категории пока нет мест. Выберите другой фильтр.</div>`;
    return grouped.map(([key, items]) => `<section class="suggestion-section" data-category-section="${key}">
      <div class="rail-heading"><h4>${tm.categoryMeta[key][0]} ${categoryNames[key]}</h4><div class="rail-controls"><button type="button" data-rail="prev" aria-label="Прокрутить влево">←</button><button type="button" data-rail="next" aria-label="Прокрутить вправо">→</button></div></div>
      <div class="suggestion-rail">${items.map(place => `<article class="suggestion-card ${selectedPlaceId === place.id ? "selected" : ""}" data-suggestion="${place.id}">
        <button class="suggestion-photo" type="button" data-lightbox="${place.image}" aria-label="Увеличить фото ${safe(place.name)}"><img src="${place.image}" alt="Иллюстративное фото: ${safe(place.name)}"><span>${tm.categoryMeta[key][0]} ${categoryNames[key]}</span></button>
        <div class="suggestion-card-copy"><h5>${safe(place.name)}</h5><p>${safe(place.description)}</p><small>${safe(place.city)} · ${safe(place.address)} · около ${durationLabel(place.duration)}</small>
          <div class="suggestion-actions"><button type="button" class="small-action" data-action="locate" data-place-id="${place.id}">На карте</button>${data.countries.find(country => country.id === place.countryId)?.warning ? `<span class="route-unavailable">Планирование недоступно</span>` : `<button type="button" class="small-action primary" data-action="add-place" data-place-id="${place.id}">＋ В маршрут</button>`}</div>
        </div></article>`).join("")}</div></section>`).join("");
  }

  function durationLabel(minutes) {
    return minutes >= 60 ? `${Math.floor(minutes / 60)} ч${minutes % 60 ? ` ${minutes % 60} мин` : ""}` : `${minutes} мин`;
  }

  function renderExplorer() {
    explorer.classList.remove("panel-changing");
    void explorer.offsetWidth;
    explorer.classList.add("panel-changing");
    if (!selectedCountry) renderCountries();
    else if (selectedCity) renderCity(selectedCountry, selectedCity);
    else renderCountry(selectedCountry);
    explorer.scrollTop = 0;
  }

  function goToCountry(country) {
    selectedCountry = country;
    selectedCity = null;
    selectedDistrict = null;
    selectedPlaceId = null;
    if (mapView) {
      if (mapView.viewpoint) {
        previousViewpoint = previousViewpoint || mapView.viewpoint.clone();
        mapView.goTo({ center: country.center, zoom: country.zoom }, { animate: true, duration: 1100 }).catch(() => {});
      } else {
        mapView.when(() => {
          previousViewpoint = previousViewpoint || mapView.viewpoint.clone();
          mapView.goTo({ center: country.center, zoom: country.zoom }, { animate: true, duration: 1100 }).catch(() => {});
        });
      }
    }
    renderExplorer();
    refreshMapLayers();
    setStatus(`Страна: ${country.name}`);
  }

  function goToCity(city) {
    selectedCity = city;
    selectedDistrict = null;
    selectedPlaceId = null;
    if (mapView) {
      const navigate = () => mapView.goTo({ center: city.center, zoom: city.zoom }, { animate: true, duration: 850 }).catch(() => {});
      if (mapView.viewpoint) navigate();
      else mapView.when(navigate);
    }
    renderExplorer();
    refreshMapLayers();
    setStatus(`Населённый пункт: ${city.name}`);
  }

  function closePanel() {
    selectedCountry = null;
    selectedCity = null;
    selectedPlaceId = null;
    renderExplorer();
    refreshMapLayers();
    setStatus("Выберите страну на карте или в списке");
    if (mapView && previousViewpoint) mapView.goTo(previousViewpoint, { animate: true, duration: 850 }).catch(() => {});
    previousViewpoint = null;
  }

  function addToRoute(place) {
    if (data.countries.find(country => country.id === place.countryId)?.warning) {
      setStatus("Для этой страны маршрут не предлагается. Проверьте актуальные рекомендации по безопасности.");
      return;
    }
    let route = JSON.parse(localStorage.getItem("travelmap_route") || "null");
    if (!route || !Array.isArray(route.items) || route.city !== place.city) {
      route = {
        country: place.country,
        city: place.city,
        days: 7,
        start: "",
        items: Array.from({ length: 7 }, (_, index) => ({
          title: ["Знакомство с городом", "Природа", "Культура", "Архитектура", "Развлечения", "Окрестности", "Свободный день"][index],
          places: []
        }))
      };
    }
    if (!route.country) route.country = place.country;
    if (!route.items[0].places.some(item => item.id === place.id)) route.items[0].places.push(place);
    localStorage.setItem("travelmap_route", JSON.stringify(route));
    const button = explorer.querySelector(`[data-action="add-place"][data-place-id="${place.id}"]`);
    if (button) {
      button.classList.add("added");
      button.textContent = "✓ Добавлено";
      button.animate([{ transform: "scale(.92)" }, { transform: "scale(1.05)" }, { transform: "scale(1)" }], { duration: 360 });
    }
    setStatus(`${place.name} добавлено в маршрут`);
  }

  function locatePlace(place) {
    selectedPlaceId = place.id;
    if (mapView) {
      mapView.goTo({ target: [place.lng, place.lat], zoom: 15 }, { animate: true, duration: 750 }).catch(() => {});
      const graphic = graphicsById.get(place.id);
      if (graphic) mapView.openPopup({ features: [graphic], location: graphic.geometry });
    }
    renderExplorer();
    refreshMapLayers();
    setStatus(`Место на карте: ${place.name}`);
    requestAnimationFrame(() => explorer.querySelector(`[data-suggestion="${place.id}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" }));
  }

  function openLightbox(url) {
    const dialog = document.createElement("dialog");
    dialog.className = "photo-lightbox";
    dialog.innerHTML = `<button type="button" aria-label="Закрыть">×</button><img src="${url}" alt="Увеличенное иллюстративное фото">`;
    dialog.querySelector("button").addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close(); });
    dialog.addEventListener("close", () => dialog.remove());
    document.body.append(dialog);
    dialog.showModal();
  }

  function configurePanelEvents() {
    explorer.addEventListener("click", event => {
      const countryButton = event.target.closest("[data-country]");
      if (countryButton) {
        const country = data.countries.find(item => item.id === countryButton.dataset.country);
        if (country) goToCountry(country);
        return;
      }
      const cityButton = event.target.closest("[data-city]");
      if (cityButton) {
        const city = data.cities.find(item => item.id === cityButton.dataset.city);
        const country = city && data.countries.find(item => item.id === city.country);
        if (city && country) {
          if (!selectedCountry) selectedCountry = country;
          goToCity(city);
        }
        return;
      }
      const image = event.target.closest("[data-lightbox]");
      if (image) { openLightbox(image.dataset.lightbox); return; }
      const railButton = event.target.closest("[data-rail]");
      if (railButton) {
        const rail = railButton.closest(".suggestion-section").querySelector(".suggestion-rail");
        rail.scrollBy({ left: railButton.dataset.rail === "next" ? 280 : -280, behavior: "smooth" });
        return;
      }
      const district = event.target.closest("[data-district]");
      if (district) {
        selectedDistrict = district.dataset.district || null;
        renderExplorer();
        refreshMapLayers();
        return;
      }
      const action = event.target.closest("[data-action]");
      if (!action) return;
      if (action.dataset.action === "countries") closePanel();
      if (action.dataset.action === "close") closePanel();
      if (action.dataset.action === "back-country") {
        selectedCity = null;
        selectedDistrict = null;
        selectedPlaceId = null;
        if (mapView) mapView.goTo({ center: selectedCountry.center, zoom: selectedCountry.zoom }, { animate: true, duration: 750 }).catch(() => {});
        renderExplorer();
        refreshMapLayers();
      }
      if (action.dataset.action === "show-cities") document.getElementById("cityPicker")?.scrollIntoView({ behavior: "smooth", block: "center" });
      if (action.dataset.action === "plan-country") {
        const city = selectedCountry.capital;
        location.href = `planner.html?country=${encodeURIComponent(selectedCountry.name)}&city=${encodeURIComponent(city)}`;
      }
      if (action.dataset.action === "plan-city") location.href = `planner.html?country=${encodeURIComponent(selectedCountry.name)}&city=${encodeURIComponent(selectedCity.name)}`;
      if (action.dataset.action === "locate" || action.dataset.action === "add-place") {
        const place = tm.places.find(item => item.id === action.dataset.placeId);
        if (place && action.dataset.action === "locate") locatePlace(place);
        if (place && action.dataset.action === "add-place") addToRoute(place);
      }
    });
  }

  configureFilters();
  configurePanelEvents();
  renderCountries();

  const mapSearchForm = document.getElementById("mapSearch");
  mapSearchForm.addEventListener("submit", event => {
    event.preventDefault();
    const query = normalized(document.getElementById("mapSearchInput").value.trim());
    if (!query) return;
    const country = data.countries.find(item => normalized(item.name).includes(query) || normalized(item.capital).includes(query));
    if (country) { goToCountry(country); return; }
    const city = data.cities.find(item => normalized(item.name).includes(query));
    if (city) {
      const countryForCity = data.countries.find(item => item.id === city.country);
      if (countryForCity) { selectedCountry = countryForCity; goToCity(city); }
      return;
    }
    const place = tm.places.find(item => normalized(`${item.name} ${item.city} ${item.country}`).includes(query));
    if (place) {
      const countryForPlace = data.countries.find(item => item.id === place.countryId || item.name === place.country);
      if (countryForPlace) selectedCountry = countryForPlace;
      selectedCity = null;
      renderExplorer();
      locatePlace(place);
    }
  });

  if (savedRoute?.items?.length) {
    const dayFilter = document.getElementById("dayFilter");
    const select = document.getElementById("routeDaySelect");
    dayFilter.hidden = false;
    select.innerHTML = `<option value="all">Все дни</option>${savedRoute.items.map((day, index) => `<option value="${index}">День ${index + 1}</option>`).join("")}`;
    select.addEventListener("change", () => {
      activeDay = select.value === "all" ? "all" : Number(select.value);
      const selectedDay = document.getElementById("selectedDay");
      selectedDay.hidden = activeDay === "all";
      selectedDay.textContent = activeDay === "all" ? "" : `День ${activeDay + 1}`;
      refreshMapLayers();
    });
  }

  document.getElementById("basemapToggle").addEventListener("click", event => {
    if (!map) return;
    const satellite = map.basemap.id === "satellite";
    map.basemap = satellite ? "streets-navigation-vector" : "satellite";
    event.currentTarget.textContent = satellite ? "Спутниковый вид" : "Стандартный вид";
  });

  if (!window.require) {
    setStatus("ArcGIS SDK не загрузился. Проверьте подключение к интернету.");
    return;
  }
  // При необходимости вставьте здесь API-ключ ArcGIS для защищённых базовых слоёв.
  const ARCGIS_API_KEY = "";
  require([
    "esri/config", "esri/Map", "esri/views/MapView", "esri/Graphic",
    "esri/layers/GraphicsLayer", "esri/layers/FeatureLayer", "esri/widgets/Zoom",
    "esri/widgets/Home", "esri/widgets/Search"
  ], (esriConfig, Map, MapView, Graphic, GraphicsLayer, FeatureLayer, Zoom, Home, Search) => {
    if (ARCGIS_API_KEY) esriConfig.apiKey = ARCGIS_API_KEY;
    map = new Map({ basemap: "streets-navigation-vector" });
    mapView = new MapView({
      container: "viewDiv",
      map,
      center: [20, 25],
      zoom: 2,
      popup: { dockEnabled: false, actionsIncluded: false }
    });
    mapView.ui.remove("zoom");
    mapView.ui.add(new Zoom({ view: mapView }), "top-left");
    mapView.ui.add(new Home({ view: mapView }), "top-left");
    mapView.ui.add(new Search({ view: mapView, includeDefaultSources: true }), "top-right");

    countryPinsLayer = new GraphicsLayer({ title: "Страны TravelMap" });
    cityPinsLayer = new GraphicsLayer({ title: "Города" });
    pointsLayer = new GraphicsLayer({ title: "Достопримечательности" });
    routesLayer = new GraphicsLayer({ title: "Маршруты" });
    map.addMany([routesLayer, pointsLayer, cityPinsLayer, countryPinsLayer]);

    const boundaryLayer = new FeatureLayer({
      url: "https://services.arcgis.com/P3ePLMYs2RVChkJx/ArcGIS/rest/services/World_Countries/FeatureServer/0",
      title: "Границы стран",
      outFields: ["*"],
      opacity: 0.58,
      renderer: {
        type: "simple",
        symbol: { type: "simple-fill", color: [231, 240, 234, 0.15], outline: { color: [61, 110, 89, 0.72], width: 0.7 } }
      }
    });
    map.add(boundaryLayer);
    boundaryLayer.load().then(() => mapView.whenLayerView(boundaryLayer)).then(layerView => {
      boundaryLayerView = layerView;
    }).catch(() => {
      setStatus("Границы стран недоступны; выберите страну по отметке или из списка.");
    });

    const dayColors = ["#ef9a32", "#2f8066", "#3c82b5", "#9b67a8", "#d75d54", "#718c3d", "#7b6950"];
    const categoryColors = { history: "#8a6337", nature: "#31846c", architecture: "#6d5aa8", food: "#d1763f", hotel: "#4569a8", entertainment: "#bb5a76", photo: "#d49a24" };

    function countryGraphic(country) {
      const isSelected = selectedCountry?.id === country.id;
      return new Graphic({
        geometry: { type: "point", longitude: country.center[0], latitude: country.center[1] },
        symbol: { type: "simple-marker", style: "circle", color: isSelected ? "#ef9a32" : "#245a48", size: isSelected ? 19 : 14, outline: { color: "#fff", width: 2 } },
        attributes: { type: "country", id: country.id, title: country.name },
        popupTemplate: { title: country.name, content: "Выберите отметку, чтобы открыть карточку страны." }
      });
    }

    data.countries.forEach(country => countryPinsLayer.add(countryGraphic(country)));
    if (params.get("country")) {
      const wanted = data.countries.find(item => normalized(item.name) === normalized(params.get("country")));
      if (wanted) goToCountry(wanted);
    }
    const queryCity = params.get("city");
    if (queryCity) {
      const wantedCity = data.cities.find(item => normalized(item.name) === normalized(queryCity));
      if (wantedCity) {
        selectedCountry = data.countries.find(item => item.id === wantedCity.country);
        if (selectedCountry) goToCity(wantedCity);
      }
    }

    function renderCityPins() {
      cityPinsLayer.removeAll();
      if (!selectedCountry) return;
      data.cities.filter(city => city.country === selectedCountry.id).forEach(city => {
        cityPinsLayer.add(new Graphic({
          geometry: { type: "point", longitude: city.center[0], latitude: city.center[1] },
          symbol: { type: "simple-marker", style: "circle", color: "#fff", size: 14, outline: { color: "#245a48", width: 2 } },
          attributes: { type: "city", id: city.id, title: city.name },
          popupTemplate: { title: city.name, content: city.description }
        }));
      });
    }

    function placePopup(place) {
      const noRoute = data.countries.find(country => country.id === place.countryId)?.warning;
      return `<div class="popup-card"><img src="${place.image}" alt="Иллюстративное фото: ${safe(place.name)}"><h3>${safe(place.name)}</h3><p>${tm.categoryMeta[place.category][0]} ${categoryNames[place.category] || tm.categoryMeta[place.category][1]}</p><p>${safe(place.description)}</p><p><strong>Адрес:</strong> ${safe(place.address)}<br><strong>Город:</strong> ${safe(place.city)}<br><strong>Время:</strong> около ${durationLabel(place.duration)}</p>${noRoute ? `<p class="travel-warning">${safe(noRoute)}</p>` : `<div class="popup-actions"><button type="button" data-popup-add="${place.id}">＋ В маршрут</button>`}<button type="button" data-popup-details="${place.id}">Подробнее</button>${noRoute ? "" : "</div>"}</div>`;
    }

    function currentPlaces() {
      let filtered = tm.places.filter(place => (selectedCategory === "all" || place.category === selectedCategory));
      if (activeDay !== "all") {
        const ids = new Set((savedRoute?.items?.[activeDay]?.places || []).map(place => place.id));
        filtered = filtered.filter(place => ids.has(place.id));
      }
      if (selectedCity) return filtered.filter(place => place.city === selectedCity.name && (!selectedDistrict || place.district === selectedDistrict));
      if (selectedCountry) return filtered.filter(place => place.countryId === selectedCountry.id || place.country === selectedCountry.name);
      return filtered;
    }

    refreshMapLayers = () => {
      if (!mapView || !pointsLayer) return;
      pointsLayer.removeAll();
      routesLayer.removeAll();
      countryPinsLayer.removeAll();
      data.countries.forEach(country => countryPinsLayer.add(countryGraphic(country)));
      graphicsById = new Map();
      visiblePlaces = currentPlaces();
      visiblePlaces.forEach(place => {
        const routeItem = routePlaces.find(item => item.id === place.id);
        const dayColor = routeItem ? dayColors[routeItem.routeDay % dayColors.length] : "#245a48";
        const graphic = new Graphic({
          geometry: { type: "point", longitude: place.lng, latitude: place.lat },
          symbol: { type: "simple-marker", style: "circle", color: selectedPlaceId === place.id ? "#ef9a32" : routeItem ? dayColor : categoryColors[place.category] || "#245a48", size: selectedPlaceId === place.id ? 17 : 11, outline: { color: "#fff", width: selectedPlaceId === place.id ? 2 : 1.5 } },
          attributes: { ...place, type: "place" },
          popupTemplate: { title: place.name, content: () => placePopup(place) }
        });
        pointsLayer.add(graphic);
        graphicsById.set(place.id, graphic);
      });
      if (activeDay === "all" && routePlaces.length) {
        savedRoute.items.forEach((day, dayIndex) => {
          const routePoints = day.places.filter(place => selectedCategory === "all" || place.category === selectedCategory);
          if (routePoints.length > 1) routesLayer.add(new Graphic({
            geometry: { type: "polyline", paths: routePoints.map(place => [place.lng, place.lat]) },
            symbol: { type: "simple-line", color: dayColors[dayIndex % dayColors.length], width: 3 }
          }));
        });
      } else if (activeDay !== "all") {
        const points = savedRoute.items[activeDay]?.places.filter(place => selectedCategory === "all" || place.category === selectedCategory) || [];
        if (points.length > 1) routesLayer.add(new Graphic({
          geometry: { type: "polyline", paths: points.map(place => [place.lng, place.lat]) },
          symbol: { type: "simple-line", color: dayColors[activeDay % dayColors.length], width: 4 }
        }));
      }
      renderCityPins();
    };

    function openPlace(place) {
      selectedPlaceId = place.id;
      if (!selectedCountry) selectedCountry = data.countries.find(country => country.id === place.countryId || country.name === place.country);
      if (selectedCountry) {
        const city = data.cities.find(item => item.name === place.city && item.country === selectedCountry.id);
        selectedCity = city || null;
      }
      renderExplorer();
      refreshMapLayers();
      mapView.goTo({ target: [place.lng, place.lat], zoom: 15 }, { animate: true, duration: 750 }).catch(() => {});
      const graphic = graphicsById.get(place.id);
      if (graphic) mapView.openPopup({ features: [graphic], location: graphic.geometry });
      requestAnimationFrame(() => explorer.querySelector(`[data-suggestion="${place.id}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
    }

    mapView.on("click", async event => {
      const hit = await mapView.hitTest(event);
      const graphic = hit.results.find(result => result.graphic?.attributes?.type)?.graphic;
      if (graphic) {
        const attrs = graphic.attributes;
        if (attrs.type === "country") {
          const country = data.countries.find(item => item.id === attrs.id);
          if (country) goToCountry(country);
        } else if (attrs.type === "city") {
          const city = data.cities.find(item => item.id === attrs.id);
          const country = city && data.countries.find(item => item.id === city.country);
          if (city && country) { selectedCountry = country; goToCity(city); }
        } else if (attrs.type === "place") {
          const place = tm.places.find(item => item.id === attrs.id);
          if (place) openPlace(place);
        }
        return;
      }
      const boundary = hit.results.find(result => result.graphic?.layer === boundaryLayer)?.graphic;
      if (boundary) {
        const attributes = boundary.attributes;
        const candidate = boundaryLayer.fields.map(field => attributes[field.name]).find(value => typeof value === "string" && matchCountry(value));
        const country = matchCountry(candidate);
        if (country) goToCountry(country);
      }
    });

    let pointerMovePending = false;
    mapView.on("pointer-move", event => {
      if (pointerMovePending) return;
      pointerMovePending = true;
      requestAnimationFrame(async () => {
      pointerMovePending = false;
      if (!boundaryLayerView) return;
      const hit = await mapView.hitTest(event, { include: boundaryLayer });
      const graphic = hit.results.find(result => result.graphic?.layer === boundaryLayer)?.graphic;
      if (graphic) {
        const possibleName = boundaryLayer.fields.map(field => graphic.attributes[field.name]).find(value => typeof value === "string" && matchCountry(value));
        if (matchCountry(possibleName)) {
          const objectId = graphic.attributes[boundaryLayer.objectIdField];
          if (objectId !== highlightedObjectId && objectId !== undefined) {
            boundaryLayerView.featureEffect = {
              filter: { objectIds: [objectId] },
              includedEffect: "brightness(1.2) saturate(1.2)",
              excludedEffect: "opacity(35%)"
            };
            highlightedObjectId = objectId;
          }
          mapView.container.style.cursor = "pointer";
          return;
        }
      }
      if (highlightedObjectId !== null) {
        boundaryLayerView.featureEffect = null;
        highlightedObjectId = null;
      }
      mapView.container.style.cursor = "";
      });
    });

    document.addEventListener("click", event => {
      const addButton = event.target.closest("[data-popup-add]");
      if (addButton) {
        const place = tm.places.find(item => item.id === addButton.dataset.popupAdd);
        if (place) {
          addToRoute(place);
          addButton.textContent = "✓ Добавлено";
        }
      }
      const detailsButton = event.target.closest("[data-popup-details]");
      if (detailsButton) {
        const place = tm.places.find(item => item.id === detailsButton.dataset.popupDetails);
        if (place) openPlace(place);
      }
    });

    document.getElementById("mapPlaces")?.addEventListener("click", event => {
      const card = event.target.closest("[data-place]");
      const place = card && tm.places.find(item => item.id === card.dataset.place);
      if (place) openPlace(place);
    });

    mapView.when(() => {
      previousViewpoint = previousViewpoint || mapView.viewpoint.clone();
      setStatus(selectedCity?.name ? `Населённый пункт: ${selectedCity.name}` : selectedCountry?.name ? `Страна: ${selectedCountry.name}` : "Выберите страну на карте или в списке");
      refreshMapLayers();
      const placeParam = params.get("place");
      if (placeParam) {
        const place = tm.places.find(item => item.id === placeParam);
        if (place) openPlace(place);
      }
    });
  });
});
