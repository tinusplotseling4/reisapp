const state = {
  vehicle: "car",
  routeMode: "fastest",
  pace: 3,
  totalDistance: 0,
  days: 1,
  firstDayMax: 350,
  lastDayMax: 300,
  tankSize: 60,
  fuelConsumption: 7.5,
  currentFuel: 100,
  mountainPass: false,
  lodging: {
    hotel: { enabled: true, every: 3 },
    camping: { enabled: true, every: 1 },
    self: { enabled: true }
  },
  points: []
};

const routeModes = {
  fastest: {
    label: "Snelst",
    description: "Snelwegen en hoofdroutes krijgen voorrang."
  },
  scenic: {
    label: "Mooist",
    description: "Mooie wegen, uitzichtpunten en fotostops krijgen voorrang."
  },
  relaxed: {
    label: "Relaxed",
    description: "Kortere dagafstanden, minder wissels en ruimere stops."
  }
};

const vehicleLabels = {
  car: "Auto",
  camper: "Camper",
  motorcycle: "Motor"
};

const lodgingLabels = {
  hotel: "Hotel",
  camping: "Camping",
  self: "Zelf regelen",
  wild: "Vrij staan",
  camperPlace: "Camperplaats"
};

const paceLabels = {
  1: "Rustig",
  2: "Ruim",
  3: "Gebalanceerd",
  4: "Veel zien",
  5: "Maximaal highlights"
};

const countryRules = {
  austria: {
    label: "Oostenrijk",
    wildCamping: "local",
    vehicleSleep: "restricted",
    restArea: "rest_only",
    note: "Regels verschillen per deelstaat en gemeente. Plan campings of officiele camperplaatsen als veilige basis."
  },
  belgium: {
    label: "Belgie",
    wildCamping: "restricted",
    vehicleSleep: "restricted",
    restArea: "rest_only",
    note: "Vrij kamperen is meestal niet toegestaan. Gebruik campings, camperplaatsen of expliciet toegestane bivakzones."
  },
  bulgaria: {
    label: "Bulgarije",
    wildCamping: "local",
    vehicleSleep: "local",
    restArea: "rest_only",
    note: "Regels en handhaving verschillen lokaal. Stel campings/camperplaatsen voor tenzij een plek expliciet toegestaan is."
  },
  croatia: {
    label: "Kroatie",
    wildCamping: "restricted",
    vehicleSleep: "restricted",
    restArea: "rest_only",
    note: "Vrij kamperen buiten campings is streng beperkt. Voor campers campings of officiele camperplaatsen voorstellen."
  },
  cyprus: {
    label: "Cyprus",
    wildCamping: "local",
    vehicleSleep: "local",
    restArea: "rest_only",
    note: "Lokale regels bepalen waar overnachten kan. Gebruik campings of toegestane parkeer-/camperplekken."
  },
  czechia: {
    label: "Tsjechie",
    wildCamping: "restricted",
    vehicleSleep: "restricted",
    restArea: "rest_only",
    note: "Vrij kamperen is beperkt. Plan campings of camperplaatsen, zeker buiten privegrond met toestemming."
  },
  denmark: {
    label: "Denemarken",
    wildCamping: "restricted",
    vehicleSleep: "restricted",
    restArea: "rest_only",
    note: "Vrij kamperen is beperkt tot aangewezen plekken. Gebruik campings, shelters of camperplaatsen."
  },
  estonia: {
    label: "Estland",
    wildCamping: "allowed_with_limits",
    vehicleSleep: "local",
    restArea: "rest_only",
    note: "Vrij kamperen kan op veel plekken met beperkingen. Controleer natuurgebieden, privegrond en lokale borden."
  },
  finland: {
    label: "Finland",
    wildCamping: "allowed_with_limits",
    vehicleSleep: "local",
    restArea: "rest_only",
    note: "Vrij kamperen kan vaak met beperkingen. Voor campers blijven lokale parkeerregels en natuurregels leidend."
  },
  germany: {
    label: "Duitsland",
    wildCamping: "restricted",
    vehicleSleep: "rest_only",
    restArea: "rest_only",
    note: "Kamperen is meestal niet toegestaan buiten campings. Rusten om rijgeschiktheid te herstellen kan anders beoordeeld worden dan kamperen."
  },
  greece: {
    label: "Griekenland",
    wildCamping: "restricted",
    vehicleSleep: "restricted",
    restArea: "rest_only",
    note: "Vrij kamperen is sterk beperkt. Gebruik campings of toegestane camperplaatsen."
  },
  hungary: {
    label: "Hongarije",
    wildCamping: "restricted",
    vehicleSleep: "restricted",
    restArea: "rest_only",
    note: "Vrij kamperen is beperkt. Plan campings of camperplaatsen als veilige optie."
  },
  ireland: {
    label: "Ierland",
    wildCamping: "local",
    vehicleSleep: "local",
    restArea: "rest_only",
    note: "Vrij kamperen hangt sterk af van eigendom, lokale regels en toestemming. Voor campers officiele plekken voorstellen."
  },
  italy: {
    label: "Italie",
    wildCamping: "restricted",
    vehicleSleep: "local",
    restArea: "rest_only",
    note: "Vrij kamperen verschilt lokaal en is vaak beperkt. Gebruik campings of camperplaatsen, zeker in toeristische gebieden."
  },
  latvia: {
    label: "Letland",
    wildCamping: "allowed_with_limits",
    vehicleSleep: "local",
    restArea: "rest_only",
    note: "Vrij kamperen kan vaak met beperkingen. Controleer beschermde gebieden, privegrond en lokale borden."
  },
  lithuania: {
    label: "Litouwen",
    wildCamping: "local",
    vehicleSleep: "local",
    restArea: "rest_only",
    note: "Regels verschillen lokaal. Stel campings of toegestane camperplekken voor tenzij vrij staan duidelijk toegestaan is."
  },
  luxembourg: {
    label: "Luxemburg",
    wildCamping: "restricted",
    vehicleSleep: "restricted",
    restArea: "rest_only",
    note: "Vrij kamperen is meestal niet toegestaan. Gebruik campings of camperplaatsen."
  },
  malta: {
    label: "Malta",
    wildCamping: "restricted",
    vehicleSleep: "restricted",
    restArea: "rest_only",
    note: "Vrij kamperen is beperkt en lokaal gereguleerd. Gebruik toegestane accommodaties of campings."
  },
  netherlands: {
    label: "Nederland",
    wildCamping: "restricted",
    vehicleSleep: "restricted",
    restArea: "rest_only",
    note: "Vrij kamperen is niet toegestaan. Slapen in het bed van een camper op een tankstation of parkeerplaats geldt praktisch als kamperen en moet niet als optie worden voorgesteld; hooguit een korte rustpauze waar dat lokaal wordt gedoogd."
  },
  poland: {
    label: "Polen",
    wildCamping: "local",
    vehicleSleep: "local",
    restArea: "rest_only",
    note: "Regels verschillen per terrein en beheerder. Campings of camperplaatsen als basis voorstellen."
  },
  portugal: {
    label: "Portugal",
    wildCamping: "restricted",
    vehicleSleep: "restricted",
    restArea: "rest_only",
    note: "Vrij kamperen en camperovernachting zijn sterk gereguleerd. Gebruik campings, camperplaatsen of expliciet toegestane plekken."
  },
  romania: {
    label: "Roemenie",
    wildCamping: "local",
    vehicleSleep: "local",
    restArea: "rest_only",
    note: "Regels en praktische veiligheid verschillen lokaal. Campings of gecontroleerde camperplekken als basis voorstellen."
  },
  slovakia: {
    label: "Slowakije",
    wildCamping: "restricted",
    vehicleSleep: "restricted",
    restArea: "rest_only",
    note: "Vrij kamperen is beperkt, zeker in beschermde natuur. Gebruik campings of camperplaatsen."
  },
  slovenia: {
    label: "Slovenie",
    wildCamping: "restricted",
    vehicleSleep: "restricted",
    restArea: "rest_only",
    note: "Vrij kamperen is meestal niet toegestaan. Campings en camperplaatsen voorstellen."
  },
  spain: {
    label: "Spanje",
    wildCamping: "local",
    vehicleSleep: "local",
    restArea: "rest_only",
    note: "Regels verschillen per regio en gemeente. Onderscheid parkeren/rusten van kamperen; stel bij twijfel campings of camperplaatsen voor."
  },
  sweden: {
    label: "Zweden",
    wildCamping: "allowed_with_limits",
    vehicleSleep: "local",
    restArea: "rest_only",
    note: "Vrij staan kan vaak met beperkingen en respect voor omgeving. Voor campers blijven lokale parkeerregels leidend."
  },
  france: {
    label: "Frankrijk",
    wildCamping: "restricted",
    vehicleSleep: "local",
    restArea: "rest_only",
    note: "Vrij kamperen is lokaal gereguleerd. Gebruik campings, aires of toegestane plekken."
  }
};

const countryTravelInfo = {
  netherlands: {
    required: ["Gevarendriehoek aanbevolen", "Rijbewijs, kentekenbewijs, verzekering"],
    useful: ["Milieuzones checken", "Parkeerapps", "Regenkleding"],
    photo: ["Dijken", "Historische binnensteden", "Kust en duinen"]
  },
  germany: {
    required: ["Gevarendriehoek", "Veiligheidshesje", "Verbanddoos"],
    useful: ["Milieusticker voor Umweltzones", "Contant geld voor kleine stops", "Winterbanden bij winterse omstandigheden"],
    photo: ["Rijnvallei", "Moezelbochten", "Alpenrand"]
  },
  austria: {
    required: ["Vignet of tolcheck", "Veiligheidshesje", "Winteruitrusting bij winterse omstandigheden"],
    useful: ["Tolpassen vooraf checken", "Remmen/koeling bij bergwegen", "Hoogte- en gewichtsbeperkingen camper"],
    photo: ["Alpenpassen", "Meren", "Uitzichtpunten langs dalroutes"]
  },
  italy: {
    required: ["Veiligheidshesje", "Gevarendriehoek", "ZTL-zones vermijden"],
    useful: ["Tolbudget", "Parkeercheck bij steden", "Camperroutes rond bergpassen controleren"],
    photo: ["Meren", "Dolomieten", "Historische dorpen"]
  },
  croatia: {
    required: ["Veiligheidshesje", "Gevarendriehoek", "Tol/wegenvignet check"],
    useful: ["Campings vooraf checken in hoogseizoen", "Contant geld", "Water bij kusttrajecten"],
    photo: ["Kustwegen", "Eilanden", "Nationaal parken"]
  },
  france: {
    required: ["Veiligheidshesje", "Gevarendriehoek", "Milieusticker waar nodig"],
    useful: ["Tolbadge of kaart", "Aires vooraf checken", "Laad-/tankstops op lange stukken"],
    photo: ["Bergpassen", "Kustwegen", "Dorpen en wijngaarden"]
  },
  belgium: {
    required: ["Veiligheidshesje", "Gevarendriehoek", "Rijbewijs/verzekering"],
    useful: ["Lage-emissiezones checken", "Parkeerapps", "Drukke ringwegen vermijden"],
    photo: ["Ardennen", "Historische steden", "Kust"]
  },
  slovenia: {
    required: ["Vignet/tolcheck", "Veiligheidshesje", "Winteruitrusting bij winterweer"],
    useful: ["Bergwegroutes checken", "Campings rond meren reserveren", "Contant geld"],
    photo: ["Bled", "Julische Alpen", "Rivierdalen"]
  },
  spain: {
    required: ["Veiligheidshesje", "Gevarendriehoek/noodsignaal volgens actuele regels", "Milieuzones checken"],
    useful: ["Hitteplanning", "Water", "Parkeercheck kustplaatsen"],
    photo: ["Bergwegen", "Kust", "Witte dorpen"]
  },
  sweden: {
    required: ["Rijbewijs/verzekering", "Winteruitrusting bij winterse omstandigheden", "Verlichting correct gebruiken"],
    useful: ["Muggenmiddel", "Afstanden ruim plannen", "Vrijstaan lokaal checken"],
    photo: ["Meren", "Bossen", "Kustwegen"]
  }
};

const fuelAdvice = {
  netherlands: {
    strategy: "Start vol als je Nederland uitrijdt; snelwegen zijn makkelijk maar vaak duurder.",
    action: "Tanken kan, maar plan prijsbewust buiten de snelweg."
  },
  germany: {
    strategy: "Goede plek om bij te vullen op lange routes. Veel aanbod langs hoofdwegen.",
    action: "Aanbevolen tankmoment voor doorreis."
  },
  denmark: {
    strategy: "Alleen tanken als het nodig is. Vergelijk dit land met het vorige en volgende land op je route.",
    action: "Bij voorkeur overslaan als je voldoende bereik hebt."
  },
  sweden: {
    strategy: "Plan met ruime marge buiten grote plaatsen; afstanden kunnen snel oplopen.",
    action: "Tanken als het logisch op de route ligt."
  },
  belgium: {
    strategy: "Prima nood- of bijvulstop, vooral buiten drukke snelwegstations.",
    action: "Tanken als het logisch op de route ligt."
  },
  france: {
    strategy: "Plan tanken bij grotere plaatsen of hypermarches, niet pas laat op afgelegen trajecten.",
    action: "Tanken voor lange rustige stukken."
  },
  austria: {
    strategy: "Voor bergtrajecten met ruime marge vertrekken; verbruik kan hoger zijn.",
    action: "Voor bergwegen extra marge houden."
  },
  italy: {
    strategy: "Tank voor bergpassen of drukke toeristische zones; let op bemande/onbemande stations.",
    action: "Niet te krap plannen in bergen."
  },
  croatia: {
    strategy: "Langs hoofdwegen voldoende opties; op eilanden en kustwegen ruimer plannen.",
    action: "Voor kust- of eilandtraject vol genoeg vertrekken."
  }
};

const sleepData = {
  hotel: [
    { name: "Riverside Hotel", score: 4.6, detail: "Parkeren, laat inchecken, ontbijt vroeg." },
    { name: "Old Town Rooms", score: 4.4, detail: "Centraal, korte omweg, beperkte parking." },
    { name: "Roadside Inn", score: 4.2, detail: "Praktisch aan de route, geschikt voor late aankomst." }
  ],
  camping: [
    { name: "Forest Lake Camping", score: 4.8, detail: "Camperplaatsen, stroom, water, supermarkt op 4 km." },
    { name: "Valley Camp", score: 4.5, detail: "Ruime plekken, water vullen, rustige ligging." },
    { name: "Route Camping", score: 4.1, detail: "Direct langs route, basisvoorzieningen." }
  ],
  wild: [
    { name: "Meerzicht parkeerplek", score: 4.9, detail: "Mooi uitzicht, vlakke plek, geen voorzieningen." },
    { name: "Bosrand stopplaats", score: 4.7, detail: "Rustig, weinig licht, alleen geschikt voor zelfvoorzienend." },
    { name: "Uitzichtpunt buiten dorp", score: 4.6, detail: "Populair bij campers, kom vroeg aan." }
  ]
};

const feedbackFields = [
  "feedbackSetup",
  "feedbackDashboard",
  "feedbackSleep",
  "feedbackRules",
  "feedbackOther"
];

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

let routeMap;
let routeLine;
let routeMarkers = [];

const countryCenters = {
  austria: { center: [47.6, 14.2], zoom: 6, terms: ["oostenrijk", "austria", "wenen", "vienna", "innsbruck", "salzburg"] },
  belgium: { center: [50.7, 4.7], zoom: 7, terms: ["belgie", "belgium", "brussel", "brussels", "antwerpen"] },
  croatia: { center: [45.1, 15.2], zoom: 6, terms: ["kroatie", "croatia", "zagreb", "split", "rijeka"] },
  denmark: { center: [56.1, 10.0], zoom: 6, terms: ["denemarken", "denmark", "kopenhagen", "copenhagen"] },
  france: { center: [46.7, 2.4], zoom: 5, terms: ["frankrijk", "france", "parijs", "paris", "lyon"] },
  germany: { center: [51.1, 10.4], zoom: 6, terms: ["duitsland", "germany", "berlijn", "berlin", "hamburg", "munchen", "munich", "koln", "cologne"] },
  italy: { center: [42.9, 12.6], zoom: 5, terms: ["italie", "italy", "rome", "milaan", "milan", "bolzano", "verona"] },
  netherlands: { center: [52.2, 5.4], zoom: 7, terms: ["nederland", "netherlands", "holland", "assen", "amsterdam", "utrecht", "rotterdam", "bovensmilde"] },
  slovenia: { center: [46.1, 14.9], zoom: 7, terms: ["slovenie", "slovenia", "ljubljana", "bled"] },
  spain: { center: [40.4, -3.7], zoom: 5, terms: ["spanje", "spain", "madrid", "barcelona", "valencia"] },
  sweden: { center: [62.4, 16.3], zoom: 5, terms: ["zweden", "sweden", "stockholm", "malmo", "goteborg"] }
};

function coordinateToPoint(lat, lon, name) {
  return {
    lat,
    lon,
    x: Math.round(((lon + 180) / 360) * 100),
    y: Math.round(((90 - lat) / 180) * 100),
    name
  };
}

function pointToCoordinate(point) {
  if (Number.isFinite(point.lat) && Number.isFinite(point.lon)) {
    return { lat: point.lat, lon: point.lon };
  }

  return {
    lat: 90 - point.y * 1.8,
    lon: point.x * 3.6 - 180
  };
}

function isMobileViewport() {
  return window.matchMedia("(max-width: 760px)").matches;
}

function inferStartCountryKey() {
  const start = ($("#startPlace")?.value || "").trim().toLowerCase();

  if (start) {
    const match = Object.entries(countryCenters).find(([, data]) => data.terms.some((term) => start.includes(term)));
    if (match) return match[0];
  }

  return getRouteCountries()[0];
}

function getDefaultMapView() {
  if (isMobileViewport()) {
    const country = countryCenters[inferStartCountryKey()] || countryCenters.netherlands;
    return { center: country.center, zoom: country.zoom };
  }

  return { center: [51.8, 10.2], zoom: 4 };
}

function initMap() {
  if (!window.L || routeMap) return;

  const initial = getDefaultMapView();
  routeMap = L.map("routeMap", {
    zoomControl: true,
    scrollWheelZoom: true
  }).setView(initial.center, initial.zoom);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "&copy; OpenStreetMap"
  }).addTo(routeMap);

  routeMap.on("click", (event) => {
    state.points.push({
      lat: Number(event.latlng.lat.toFixed(5)),
      lon: Number(event.latlng.lng.toFixed(5)),
      name: `Stop ${state.points.length + 1}`
    });
    calculatePlan();
  });

  setTimeout(() => routeMap.invalidateSize(), 0);
}

function clearMapLayers() {
  routeMarkers.forEach((marker) => marker.remove());
  routeMarkers = [];

  if (routeLine) {
    routeLine.remove();
    routeLine = null;
  }
}

function fitMapToRoute() {
  if (!routeMap) return;

  if (state.points.length) {
    const latLngs = state.points.map(pointToCoordinate).map((point) => [point.lat, point.lon]);
    routeMap.fitBounds(latLngs, { padding: [34, 34], maxZoom: 9 });
    return;
  }

  const view = getDefaultMapView();
  routeMap.setView(view.center, view.zoom);
}

function haversine(lat1, lon1, lat2, lon2) {
  const radius = 6371;
  const toRad = (value) => value * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function estimateUploadedDistance() {
  if (state.points.length < 2) return 0;

  return state.points.slice(1).reduce((total, point, index) => {
    const previous = pointToCoordinate(state.points[index]);
    const current = pointToCoordinate(point);
    return total + Math.round(haversine(previous.lat, previous.lon, current.lat, current.lon));
  }, 0);
}

function readInputs() {
  state.pace = Number($("#pace").value);
  state.totalDistance = Math.max(0, Number($("#totalDistance").value));
  state.days = Math.max(1, Number($("#days").value));
  state.firstDayMax = Math.max(1, Number($("#firstDayMax").value));
  state.lastDayMax = Math.max(1, Number($("#lastDayMax").value));
  state.tankSize = Math.max(1, Number($("#tankSize").value));
  state.fuelConsumption = Math.max(0.1, Number($("#fuelConsumption").value));
  state.currentFuel = Math.max(0, Math.min(100, Number($("#currentFuel").value)));
  state.mountainPass = $("#mountainPass").checked;
  state.lodging.hotel.enabled = $("#hotelEnabled").checked;
  state.lodging.hotel.every = Math.max(1, Number($("#hotelEvery").value));
  state.lodging.camping.enabled = $("#campingEnabled").checked;
  state.lodging.camping.every = Math.max(1, Number($("#campingEvery").value));
  state.lodging.self.enabled = $("#selfEnabled").checked;
}

function getSelectedRouteCountries() {
  return Array.from($("#routeCountries").selectedOptions).map((option) => option.value);
}

function getRouteCountries() {
  const selected = getSelectedRouteCountries();
  return selected.length ? selected : ["netherlands"];
}

function getCountryForDay(dayNumber) {
  const countries = getRouteCountries();
  const index = Math.min(countries.length - 1, Math.floor(((dayNumber - 1) / Math.max(1, state.days)) * countries.length));
  return countries[index];
}

function getRuleForDay(dayNumber) {
  return countryRules[getCountryForDay(dayNumber)] || countryRules.netherlands;
}

function buildDayDistances() {
  if (state.totalDistance <= 0) return [];
  if (state.days === 1) return [state.totalDistance];

  const balanced = Math.ceil(state.totalDistance / state.days);
  const first = Math.min(state.totalDistance, state.firstDayMax, balanced);
  let remaining = state.totalDistance - first;

  if (state.days === 2) return [first, remaining];

  const last = Math.min(remaining, state.lastDayMax, balanced);
  remaining -= last;

  const middleDays = state.days - 2;
  const middleBase = Math.floor(remaining / middleDays);
  const extra = remaining % middleDays;
  const middle = Array.from({ length: middleDays }, (_, index) => middleBase + (index < extra ? 1 : 0));

  return [first, ...middle, last];
}

function getLodgingForDay(dayNumber) {
  const hotelDue = state.lodging.hotel.enabled && dayNumber % state.lodging.hotel.every === 0;
  const campingDue = state.lodging.camping.enabled && dayNumber % state.lodging.camping.every === 0;

  if (hotelDue) return "hotel";
  if (campingDue) return "camping";
  if (state.lodging.self.enabled) return "self";
  if (state.lodging.camping.enabled) return "camping";
  if (state.lodging.hotel.enabled) return "hotel";
  return "self";
}

function resolveSleepType(dayNumber) {
  const preferred = getLodgingForDay(dayNumber);
  const rule = getRuleForDay(dayNumber);

  if (preferred === "hotel") return "hotel";
  if (preferred === "camping") return "camping";

  if (state.vehicle === "camper" && ["allowed", "allowed_with_limits"].includes(rule.wildCamping)) return "wild";
  if (state.vehicle === "camper") return "camperPlace";
  return "self";
}

function getOptionsForSleepType(type) {
  if (type === "hotel") return sleepData.hotel;
  if (type === "wild") return sleepData.wild;
  if (type === "camping" || type === "camperPlace") return sleepData.camping;
  return [];
}

function summarizeLodging() {
  const parts = [];
  if (state.lodging.hotel.enabled) parts.push(`hotel/${state.lodging.hotel.every}d`);
  if (state.lodging.camping.enabled) parts.push(`camping/${state.lodging.camping.every}d`);
  if (state.lodging.self.enabled) parts.push("zelf");
  return parts.length ? parts.join(" + ") : "geen";
}

function calculatePlan() {
  readInputs();

  const dayDistances = buildDayDistances();
  const dayDistance = dayDistances.length ? Math.round(state.totalDistance / state.days) : 0;
  const fuelRange = getFullTankRange();
  const currentRange = Math.round(fuelRange * (state.currentFuel / 100));
  const vehicleMultiplier = state.vehicle === "camper" ? 1.18 : state.vehicle === "motorcycle" ? 1.08 : 1;
  const driveHours = state.totalDistance > 0
    ? Math.round((state.totalDistance / 78) * vehicleMultiplier + state.pace * 0.4)
    : 0;
  const firstDayTooLong = dayDistances[0] > state.firstDayMax && state.days > 1;
  const lastDayTooLong = dayDistances.at(-1) > state.lastDayMax && state.days > 1;
  const camperBlocked = state.vehicle === "camper" && state.mountainPass;
  const lodgingMissing = !state.lodging.hotel.enabled && !state.lodging.camping.enabled && !state.lodging.self.enabled;
  const score = camperBlocked
    ? "AF"
    : Math.max(42, Math.min(96, 94 - (firstDayTooLong || lastDayTooLong ? 16 : 0) - (lodgingMissing ? 10 : 0) - (state.pace > 4 ? 4 : 0)));

  $("#routeTitle").textContent = $("#tripName").value || "Naamloze reis";
  $("#routeSubtitle").textContent = `${$("#startPlace").value || "Start"} naar ${$("#endPlace").value || "bestemming"} in ${state.days} dagen.`;
  $("#paceOutput").textContent = paceLabels[state.pace];
  $("#fitScore").textContent = score;
  $("#fitLabel").textContent = camperBlocked ? "valt af" : "routefit";
  $("#tripScoreBox").classList.toggle("blocked-score", camperBlocked);
  $("#driveHours").textContent = `${driveHours} u`;
  $("#dayAverage").textContent = `${dayDistance} km`;
  $("#sleepRule").textContent = "Slaapregels per land op route";
  $("#fuelRange").textContent = `${currentRange} km nu / ${fuelRange} km vol`;

  renderPoints();
  renderSummary(dayDistance, driveHours, dayDistances);
  renderDays(dayDistances);
  renderFuelPlan(dayDistance);
  renderNotices({ dayDistance, dayDistances, firstDayTooLong, lastDayTooLong, camperBlocked, lodgingMissing });
  renderCountryGrid();
}

function refreshEmptyMapView() {
  if (!routeMap || state.points.length) return;
  fitMapToRoute();
}

function showDashboard() {
  calculatePlan();
  $("#appShell").classList.remove("setup-mode");
  $("#appShell").classList.add("dashboard-mode");

  requestAnimationFrame(() => {
    if (routeMap) {
      routeMap.invalidateSize();
      fitMapToRoute();
    }
    $(".workspace").scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function showTripInfo() {
  $("#appShell").classList.add("setup-mode");
  $("#appShell").classList.remove("dashboard-mode");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function getFullTankRange() {
  return Math.round((state.tankSize / state.fuelConsumption) * 100);
}

function renderSummary(dayDistance, driveHours, dayDistances) {
  const items = [
    ["Vervoer", vehicleLabels[state.vehicle]],
    ["Afstand", `${state.totalDistance} km`],
    ["Gemiddeld", `${dayDistance} km/dag`],
    ["Dag 1", `${dayDistances[0] || 0} km`],
    ["Laatste dag", `${dayDistances.at(-1) || 0} km`],
    ["Rijtijd", `${driveHours} uur`],
    ["Route", routeModes[state.routeMode].label],
    ["Actieradius", `${getFullTankRange()} km`],
    ["Overnachting", summarizeLodging()],
    ["Landen", `${getSelectedRouteCountries().length} op route`]
  ];

  $("#summaryCards").innerHTML = items.map(([label, value]) => `
    <article class="summary-card">
      <span>${label}</span>
      <strong>${value}</strong>
    </article>
  `).join("");
}

function renderDays(dayDistances) {
  if (state.totalDistance <= 0) {
    $("#dayGrid").innerHTML = `
      <article class="day-card-full">
        <header>
          <span>Nog geen route</span>
          <strong>0 km</strong>
        </header>
        <div class="day-main">
          <div>
            <small>Start</small>
            <h4>Vul een afstand in, zet punten op de kaart of upload een route.</h4>
            <p>Daarna verdeelt de app de reis over dagen en toont hij slaap-, tank- en boodschappenmomenten.</p>
          </div>
        </div>
      </article>
    `;
    return;
  }

  const visibleDays = Math.min(state.days, 10);
  let startKm = 0;

  $("#dayGrid").innerHTML = Array.from({ length: visibleDays }, (_, index) => {
    const day = index + 1;
    const distance = dayDistances[index] || 0;
    const endKm = Math.min(state.totalDistance, startKm + distance);
    const rule = getRuleForDay(day);
    const sleepType = resolveSleepType(day);
    const options = getOptionsForSleepType(sleepType);
    const primary = options[0];
    const secondary = options[1];
    const tankKm = Math.round(startKm + (endKm - startKm) * 0.55);
    const groceriesKm = Math.max(startKm, endKm - 18);
    const fuelStatus = getFuelStatusAtKm(endKm);
    const dayStartKm = startKm;
    startKm = endKm;

    return `
      <article class="day-card-full">
        <header>
          <span>Dag ${day}</span>
          <strong>${dayStartKm}-${endKm} km</strong>
        </header>
        <div class="day-main">
          <div>
            <small>Slapen in ${rule.label}</small>
            <h4>${lodgingLabels[sleepType]}</h4>
            ${primary ? `<p><strong>${primary.name}</strong> ${primary.score} reizigersscore. ${primary.detail}</p>` : "<p>Geen accommodatie gezocht. Route blijft wel gepland.</p>"}
            <p>${rule.note}</p>
          </div>
          <div class="task-split">
            <div>
              <small>Tanken</small>
              <p><strong>${fuelStatus.label}</strong> ${fuelStatus.text}</p>
            </div>
            <div>
              <small>Boodschappen</small>
              <p>Plan boodschappen rond km ${groceriesKm}, vlak voor aankomst of camping.</p>
            </div>
          </div>
          <ul class="task-list">
            <li>Tankzone rond km ${tankKm}</li>
            ${secondary ? `<li>Slaapalternatief: ${secondary.name}</li>` : "<li>Geen slaapalternatief nodig</li>"}
          </ul>
        </div>
      </article>
    `;
  }).join("");
}

function getFuelStatusAtKm(km) {
  const fullRange = getFullTankRange();
  const currentRange = fullRange * (state.currentFuel / 100);
  const reservePoint = state.vehicle === "camper" ? fullRange * 0.5 : fullRange * 0.25;

  if (km > currentRange - reservePoint) {
    return {
      label: "Tanken plannen.",
      text: `Met je huidige tank kom je rond deze dag in de marge. Houd ${state.vehicle === "camper" ? "minimaal halfvol" : "reserve"} aan.`
    };
  }

  return {
    label: "Nog genoeg marge.",
    text: "Tanken hoeft hier niet, tenzij dit land gunstig op de route ligt."
  };
}

function renderFuelPlan(dayDistance) {
  const countries = getSelectedRouteCountries();
  const fullRange = getFullTankRange();
  const currentRange = Math.round(fullRange * (state.currentFuel / 100));
  const mustRefuel = state.totalDistance > currentRange - (state.vehicle === "camper" ? fullRange * 0.5 : fullRange * 0.25);

  const countryCards = countries.map((countryKey, index) => {
    const rule = countryRules[countryKey] || { label: countryKey };
    const advice = fuelAdvice[countryKey] || {
      strategy: "Gebruik als normale tankoptie, maar controleer actuele prijs en beschikbaarheid.",
      action: "Tanken indien nodig."
    };
    const routeKm = Math.round((state.totalDistance / Math.max(1, countries.length)) * (index + 0.5));
    return `
      <article class="fuel-card">
        <span>${rule.label} rond km ${routeKm}</span>
        <h4>${advice.action}</h4>
        <p>${advice.strategy}</p>
      </article>
    `;
  }).join("");

  const headline = `
    <article class="fuel-card fuel-card-primary">
      <span>Berekening</span>
      <h4>${fullRange} km op volle tank</h4>
      <p>Nu ongeveer ${currentRange} km bereik. ${mustRefuel ? "Deze route vraagt een gepland tankmoment." : "Deze route kan waarschijnlijk zonder verplichte tankstop."}</p>
      <p>Formule: ${state.tankSize} liter / ${state.fuelConsumption} l per 100 km.</p>
    </article>
  `;

  $("#fuelGrid").innerHTML = headline + countryCards;
}

function renderNotices(context) {
  const notices = [];

  if (context.camperBlocked) {
    notices.push(["Route valt af", "Camper gekozen en route bevat smalle bergpas of veel haarspeldbochten. Deze route niet voorstellen.", "blocked"]);
  }

  if (context.firstDayTooLong) {
    notices.push(["Eerste dag te lang", `Dag 1 komt uit op ${context.dayDistances[0]} km, maar je maximum staat op ${state.firstDayMax} km. Voeg een dag toe of verhoog dag 1.`, "warning"]);
  }

  if (context.lastDayTooLong) {
    notices.push(["Laatste dag te lang", `De laatste dag komt uit op ${context.dayDistances.at(-1)} km, maar je maximum staat op ${state.lastDayMax} km. Voeg een dag toe of verhoog de laatste dag.`, "warning"]);
  }

  if (state.vehicle === "camper" && state.lodging.self.enabled) {
    const strictCountries = getRouteCountries()
      .map((countryKey) => countryRules[countryKey])
      .filter((rule) => rule && !["allowed", "allowed_with_limits"].includes(rule.wildCamping));
    const type = strictCountries.length ? "warning" : "";
    const text = strictCountries.length
      ? `Zelf regelen met camper vraagt extra controle in: ${strictCountries.map((rule) => rule.label).join(", ")}.`
      : "Zelf regelen met camper lijkt mogelijk op basis van de landen op route, maar lokale borden blijven leidend.";
    notices.push(["Camper en zelf regelen", text, type]);
  }

  if (state.vehicle === "camper") {
    notices.push(["Campervoorzieningen", "Slaapopties moeten camper accepteren en worden later gefilterd op lengte, hoogte, lozen, water en stroom.", ""]);
    notices.push(["Brandstofmarge camper", "Voor campers houden we liever halfvol aan, zeker in berggebieden en dunbevolkte routes.", "warning"]);
  }

  if (state.lodging.hotel.enabled) {
    notices.push(["Hotels", `Hotel wordt ingepland op elke ${state.lodging.hotel.every}e dag.`, ""]);
  }

  if (state.lodging.camping.enabled) {
    notices.push(["Campings", `Camping wordt ingepland op elke ${state.lodging.camping.every}e dag.`, ""]);
  }

  if (context.lodgingMissing) {
    notices.push(["Geen overnachting gekozen", "Kies hotel, camping of zelf regelen.", "warning"]);
  }

  notices.push(["Routekeuze", `${routeModes[state.routeMode].label}: ${routeModes[state.routeMode].description}`, ""]);

  $("#notices").innerHTML = notices.map(([title, text, type]) => `
    <article class="notice ${type}">
      <strong>${title}</strong>
      <p>${text}</p>
    </article>
  `).join("");
}

function renderCountryGrid() {
  const countries = getRouteCountries();

  $("#countryGrid").innerHTML = countries.map((countryKey) => {
    const rule = countryRules[countryKey] || countryRules.netherlands;
    const info = countryTravelInfo[countryKey] || {
      required: ["Controleer verplichte uitrusting voor vertrek"],
      useful: ["Lokale regels en milieuzones checken"],
      photo: ["Uitzichtpunten langs de route"]
    };

    return `
      <article class="country-card">
        <header>
          <h4>${rule.label}</h4>
          <span>${rule.wildCamping.replaceAll("_", " ")}</span>
        </header>
        <p>${rule.note}</p>
        <div class="country-list">
          <strong>Verplicht/check</strong>
          <ul>${info.required.map((item) => `<li>${item}</li>`).join("")}</ul>
        </div>
        <div class="country-list">
          <strong>Handig</strong>
          <ul>${info.useful.map((item) => `<li>${item}</li>`).join("")}</ul>
        </div>
        <div class="country-list">
          <strong>Foto/stop</strong>
          <ul>${info.photo.map((item) => `<li>${item}</li>`).join("")}</ul>
        </div>
      </article>
    `;
  }).join("");
}

function renderPoints() {
  if (!routeMap) return;

  clearMapLayers();

  const latLngs = state.points.map((point, index) => {
    const coords = pointToCoordinate(point);
    const markerIcon = L.divIcon({
      className: "",
      html: `<div class="route-marker">${index + 1}</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });

    const marker = L.marker([coords.lat, coords.lon], { icon: markerIcon })
      .bindTooltip(point.name || `Stop ${index + 1}`, { direction: "top" })
      .addTo(routeMap);

    routeMarkers.push(marker);
    return [coords.lat, coords.lon];
  });

  if (latLngs.length > 1) {
    routeLine = L.polyline(latLngs, {
      color: "#d86f45",
      weight: 5,
      opacity: 0.86
    }).addTo(routeMap);
  }

  fitMapToRoute();
}

function parseUploadedRoute(fileName, text) {
  const lowerName = fileName.toLowerCase();

  if (lowerName.endsWith(".gpx") || text.includes("<gpx")) {
    const xml = new DOMParser().parseFromString(text, "text/xml");
    return Array.from(xml.querySelectorAll("trkpt, rtept, wpt")).map((node, index) => {
      const lat = Number(node.getAttribute("lat"));
      const lon = Number(node.getAttribute("lon"));
      const name = node.querySelector("name")?.textContent?.trim() || `Punt ${index + 1}`;
      return Number.isFinite(lat) && Number.isFinite(lon) ? coordinateToPoint(lat, lon, name) : null;
    }).filter(Boolean);
  }

  if (lowerName.endsWith(".kml") || text.includes("<kml")) {
    const xml = new DOMParser().parseFromString(text, "text/xml");
    return Array.from(xml.querySelectorAll("coordinates"))
      .flatMap((node) => node.textContent.trim().split(/\s+/))
      .map((pair, index) => {
        const [lon, lat] = pair.split(",").map(Number);
        return Number.isFinite(lat) && Number.isFinite(lon) ? coordinateToPoint(lat, lon, `Punt ${index + 1}`) : null;
      })
      .filter(Boolean);
  }

  if (lowerName.endsWith(".json")) {
    const data = JSON.parse(text);
    const rawPoints = Array.isArray(data) ? data : data.points || data.features || [];
    return rawPoints.map((item, index) => {
      const coords = item.geometry?.coordinates;
      const lat = Number(item.lat ?? item.latitude ?? (coords ? coords[1] : undefined));
      const lon = Number(item.lon ?? item.lng ?? item.longitude ?? (coords ? coords[0] : undefined));
      const name = item.name || item.properties?.name || `Punt ${index + 1}`;
      return Number.isFinite(lat) && Number.isFinite(lon) ? coordinateToPoint(lat, lon, name) : null;
    }).filter(Boolean);
  }

  const rows = text.trim().split(/\r?\n/).map((line) => line.split(/[;,]/).map((cell) => cell.trim()));
  const header = rows[0].map((cell) => cell.toLowerCase());
  const latIndex = header.findIndex((cell) => ["lat", "latitude"].includes(cell));
  const lonIndex = header.findIndex((cell) => ["lon", "lng", "longitude"].includes(cell));
  const nameIndex = header.findIndex((cell) => ["name", "naam", "title"].includes(cell));
  const dataRows = latIndex >= 0 && lonIndex >= 0 ? rows.slice(1) : rows;

  return dataRows.map((row, index) => {
    const lat = Number(row[latIndex >= 0 ? latIndex : 0]);
    const lon = Number(row[lonIndex >= 0 ? lonIndex : 1]);
    const name = nameIndex >= 0 ? row[nameIndex] : `Punt ${index + 1}`;
    return Number.isFinite(lat) && Number.isFinite(lon) ? coordinateToPoint(lat, lon, name || `Punt ${index + 1}`) : null;
  }).filter(Boolean);
}

function thinPoints(points) {
  if (points.length <= 24) return points;
  const step = Math.ceil(points.length / 24);
  return points.filter((_, index) => index % step === 0).slice(0, 24);
}

function saveFeedback() {
  const data = {};
  feedbackFields.forEach((id) => {
    data[id] = $(`#${id}`).value;
  });
  localStorage.setItem("travelCompanionFeedback", JSON.stringify(data));
}

function loadFeedback() {
  const raw = localStorage.getItem("travelCompanionFeedback");
  if (!raw) return;

  try {
    const data = JSON.parse(raw);
    feedbackFields.forEach((id) => {
      $(`#${id}`).value = data[id] || "";
    });
  } catch {
    localStorage.removeItem("travelCompanionFeedback");
  }
}

function exportFeedback() {
  saveFeedback();
  const content = [
    "# Travel Companion feedback",
    "",
    `Reis: ${$("#tripName").value}`,
    `Route: ${$("#startPlace").value} naar ${$("#endPlace").value}`,
    "",
    ...feedbackFields.flatMap((id) => {
      const label = document.querySelector(`label[for="${id}"]`).textContent;
      const value = $(`#${id}`).value || "-";
      return [`## ${label}`, value, ""];
    })
  ].join("\n");

  const blob = new Blob([content], { type: "text/markdown" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "travel-companion-feedback.md";
  link.click();
  URL.revokeObjectURL(link.href);
}

function bindEvents() {
  $$(".segment").forEach((button) => {
    button.addEventListener("click", () => {
      state.vehicle = button.dataset.vehicle;
      $$(".segment").forEach((item) => {
        const active = item === button;
        item.classList.toggle("active", active);
        item.setAttribute("aria-pressed", String(active));
      });
      calculatePlan();
    });
  });

  $$(".route-mode").forEach((button) => {
    button.addEventListener("click", () => {
      state.routeMode = button.dataset.routeMode;
      $$(".route-mode").forEach((item) => {
        const active = item === button;
        item.classList.toggle("active", active);
        item.setAttribute("aria-pressed", String(active));
      });
      calculatePlan();
    });
  });

  [
    "#tripName",
    "#startPlace",
    "#endPlace",
    "#pace",
    "#totalDistance",
    "#days",
    "#firstDayMax",
    "#lastDayMax",
    "#tankSize",
    "#fuelConsumption",
    "#currentFuel",
    "#mountainPass",
    "#hotelEnabled",
    "#hotelEvery",
    "#campingEnabled",
    "#campingEvery",
    "#selfEnabled"
  ].forEach((selector) => {
    $(selector).addEventListener("input", calculatePlan);
    $(selector).addEventListener("change", calculatePlan);
  });

  $("#routeCountries").addEventListener("change", calculatePlan);
  $("#routeCountries").addEventListener("change", refreshEmptyMapView);
  $("#startPlace").addEventListener("input", refreshEmptyMapView);

  $("#routeUpload").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const points = thinPoints(parseUploadedRoute(file.name, text));
      if (!points.length) {
        $("#uploadStatus").textContent = "Geen bruikbare routepunten gevonden.";
        return;
      }

      state.points = points;
      const distance = estimateUploadedDistance();
      if (distance > 0) {
        $("#totalDistance").value = distance;
      }
      $("#tripName").value = file.name.replace(/\.[^.]+$/, "");
      $("#uploadStatus").textContent = `${points.length} routepunten geladen uit ${file.name}.`;
      calculatePlan();
    } catch {
      $("#uploadStatus").textContent = "Upload kon niet worden gelezen.";
    }
  });

  $("#clearPoints").addEventListener("click", () => {
    state.points = [];
    calculatePlan();
  });

  $("#openDashboard").addEventListener("click", showDashboard);
  $("#editTripInfo").addEventListener("click", showTripInfo);
  $("#exportFeedback").addEventListener("click", exportFeedback);
  $("#clearFeedback").addEventListener("click", () => {
    feedbackFields.forEach((id) => {
      $(`#${id}`).value = "";
    });
    saveFeedback();
  });

  feedbackFields.forEach((id) => {
    $(`#${id}`).addEventListener("input", saveFeedback);
  });
}

loadFeedback();
bindEvents();
initMap();
calculatePlan();
