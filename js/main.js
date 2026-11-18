window.TravelMap = (() => {
  const categoryMeta = {
    history: ["🏛", "Исторические места"], nature: ["🏞", "Природа"], architecture: ["🏰", "Архитектура"],
    food: ["🍽", "Рестораны и кафе"], hotel: ["🏨", "Отели"], entertainment: ["🎭", "Развлечения"],
    photo: ["📸", "Фото-локации"]
  };
  const places = [
    {id:"panfilov",name:"Парк 28 панфиловцев",city:"Алматы",country:"Казахстан",category:"history",rating:4.9,popularity:98,duration:60,address:"ул. Гоголя, Алматы",lat:43.2585,lng:76.9536,description:"Исторический парк в центре города с тенистыми аллеями и памятниками защитникам Отечества.",image:"https://images.unsplash.com/photo-1596402184320-417e7178b2cd?auto=format&fit=crop&w=900&q=80"},
    {id:"zvon",name:"Вознесенский собор",city:"Алматы",country:"Казахстан",category:"architecture",rating:4.9,popularity:96,duration:45,address:"ул. Гоголя 40, Алматы",lat:43.2587,lng:76.9531,description:"Деревянная православная святыня и один из символов Алматы.",image:"https://images.unsplash.com/photo-1559564484-e48c6a1d5af8?auto=format&fit=crop&w=900&q=80"},
    {id:"bazaar",name:"Зеленый базар",city:"Алматы",country:"Казахстан",category:"food",rating:4.7,popularity:92,duration:90,address:"ул. Жибек Жолы 53, Алматы",lat:43.2621,lng:76.9459,description:"Ярчайший рынок города с восточными сладостями, специями и местной едой.",image:"https://images.unsplash.com/photo-1577702312706-e23ff063064f?auto=format&fit=crop&w=900&q=80"},
    {id:"biglake",name:"Большое Алматинское озеро",city:"Алматы",country:"Казахстан",category:"nature",rating:5,popularity:99,duration:240,address:"Алматинское нагорье",lat:43.0508,lng:76.9850,description:"Бирюзовое горное озеро среди заснеженных вершин Заилийского Алатау.",image:"https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80"},
    {id:"shymbulak",name:"Шымбулак",city:"Алматы",country:"Казахстан",category:"nature",rating:4.8,popularity:97,duration:300,address:"Курортное шоссе, Медеу",lat:43.1294,lng:77.0794,description:"Популярный горный курорт с канатными дорогами и панорамными трассами.",image:"https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=900&q=80"},
    {id:"medeu",name:"Медеу",city:"Алматы",country:"Казахстан",category:"entertainment",rating:4.8,popularity:94,duration:150,address:"проспект Горная Станция 465",lat:43.1575,lng:77.0601,description:"Крупнейший высокогорный ледовый комплекс и живописный природный амфитеатр.",image:"https://images.unsplash.com/photo-1486911271449-dd2bdc3bdbe6?auto=format&fit=crop&w=900&q=80"},
    {id:"museum",name:"Центральный музей Казахстана",city:"Алматы",country:"Казахстан",category:"history",rating:4.7,popularity:88,duration:120,address:"ул. Самал 1, Алматы",lat:43.2357,lng:76.9558,description:"Коллекции о природе, истории и культуре Казахстана.",image:"https://images.unsplash.com/photo-1564399579883-451a5d44ec08?auto=format&fit=crop&w=900&q=80"},
    {id:"republic",name:"Площадь Республики",city:"Алматы",country:"Казахстан",category:"history",rating:4.6,popularity:86,duration:45,address:"пр. Назарбаева, Алматы",lat:43.2382,lng:76.9459,description:"Главная площадь города с монументом Независимости.",image:"https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=900&q=80"},
    {id:"koktobe",name:"Кок-Тобе",city:"Алматы",country:"Казахстан",category:"photo",rating:4.8,popularity:95,duration:180,address:"ул. Кок-Тобе 1, Алматы",lat:43.2321,lng:76.9761,description:"Смотровая площадка с панорамой города и ресторанной зоной.",image:"https://images.unsplash.com/photo-1519671282429-b44660ead0a7?auto=format&fit=crop&w=900&q=80"},
    {id:"charyn",name:"Чарынский каньон",city:"Алматы",country:"Казахстан",category:"nature",rating:4.9,popularity:91,duration:480,address:"Чарынский национальный парк",lat:43.3581,lng:79.0794,description:"Мощный каньон с причудливыми скальными образованиями и тропами долины Замков.",image:"https://images.unsplash.com/photo-1464278533981-50106e6176b1?auto=format&fit=crop&w=900&q=80"},
    {id:"astanaBayterek",name:"Монумент Байтерек",city:"Астана",country:"Казахстан",category:"architecture",rating:4.8,popularity:93,duration:75,address:"пр. Кабанбай батыра 15, Астана",lat:51.1283,lng:71.4304,description:"Главный символ столицы с смотровой площадкой над городом.",image:"https://images.unsplash.com/photo-1599423300746-b62533397364?auto=format&fit=crop&w=900&q=80"},
    {id:"astanaExpo",name:"EXPO и музей Нур-Алем",city:"Астана",country:"Казахстан",category:"entertainment",rating:4.7,popularity:90,duration:180,address:"пр. Кабанбай батыра 57, Астана",lat:51.0890,lng:71.4133,description:"Современный музей будущего в сферическом здании EXPO.",image:"https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80"}
  ];
  const countries = window.TravelMapData?.countries || [];
  const cities = window.TravelMapData?.cities || [];
  places.push(...(window.TravelMapData?.places || []));
  const getFavorites = () => JSON.parse(localStorage.getItem("travelmap_favorites") || "[]");
  const toggleFavorite = id => { let f=getFavorites(); f=f.includes(id)?f.filter(x=>x!==id):[...f,id]; localStorage.setItem("travelmap_favorites",JSON.stringify(f)); updateFavoriteCounts(); return f.includes(id); };
  const updateFavoriteCounts = () => document.querySelectorAll(".favorite-count").forEach(el=>el.textContent=getFavorites().length);
  const escapeHtml = value => String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  function initNav() {
    updateFavoriteCounts();
    document.querySelectorAll(".nav-toggle").forEach(btn=>btn.addEventListener("click",()=>document.querySelector(".main-nav")?.classList.toggle("open")));
  }
  function initHome() {
    const grid=document.getElementById("popularDestinations"); if(!grid)return;
    const cards=[{title:"Алматы",image:places.find(p=>p.id==="biglake").image,days:"5–7 дней",text:"Горы, озера и современная культура"},{title:"Астана",image:places.find(p=>p.id==="astanaBayterek").image,days:"3–5 дней",text:"Архитектура будущего и новые впечатления"}];
    grid.innerHTML=cards.map((x,i)=>`<article class="destination-card"><img src="${x.image}" alt="${x.title}"><div class="destination-card-body"><p>${x.days}</p><h3>${x.title}</h3><span>${x.text}</span><a href="${i?'destinations.html?city='+encodeURIComponent(x.title):'planner.html'}" aria-label="Подробнее о ${x.title}">→</a></div></article>`).join("");
    document.getElementById("heroSearch")?.addEventListener("submit",e=>{e.preventDefault();const q=document.getElementById("searchInput").value.trim();location.href="destinations.html"+(q?"?q="+encodeURIComponent(q):"");});
  }
  document.addEventListener("DOMContentLoaded",()=>{initNav();initHome();});
  return {places,countries,cities,categoryMeta,getFavorites,toggleFavorite,updateFavoriteCounts,escapeHtml};
})();
