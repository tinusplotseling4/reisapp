const ROLES = {
  leader: "Reisleider",
  traveler: "Reiziger",
  follower: "Volger",
};

let currentRole = localStorage.getItem("reisapp_role") || "leader";
let userName = localStorage.getItem("reisapp_user_name") || "Jeroen";
let activeStage = Number(localStorage.getItem("reisapp_active_stage") || 0);
let driving = localStorage.getItem("reisapp_driving") === "true";

function showTab(id) {
  document.querySelectorAll(".tab").forEach((tab) => tab.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

function canControlRoute() {
  return currentRole === "leader";
}

function stars(n) {
  return "*".repeat(n) + "-".repeat(5 - n);
}

function poiKey(stageIndex, poiIndex) {
  return `stage_${stageIndex}_poi_${poiIndex}`;
}

function toggleDriving() {
  driving = !driving;
  localStorage.setItem("reisapp_driving", String(driving));
  render();
}

function selectStage(index) {
  activeStage = index;
  localStorage.setItem("reisapp_active_stage", String(index));
  render();
}

function openStage(index) {
  activeStage = index;
  localStorage.setItem("reisapp_active_stage", String(index));
  showTab("days");
  render();
}

function toggleVisited(key) {
  const current = localStorage.getItem(key) === "true";
  localStorage.setItem(key, String(!current));
  render();
}

function getVisitedCount() {
  let count = 0;
  STAGES.forEach((stage, stageIndex) => {
    stage.pois.forEach((_, poiIndex) => {
      if (localStorage.getItem(poiKey(stageIndex, poiIndex)) === "true") count++;
    });
  });
  return count;
}

function getMustSeeCount() {
  return STAGES.reduce((total, stage) => total + stage.pois.filter((poi) => poi[1] >= 5).length, 0);
}

function getMustSeenCount() {
  let count = 0;
  STAGES.forEach((stage, stageIndex) => {
    stage.pois.forEach((poi, poiIndex) => {
      if (poi[1] >= 5 && localStorage.getItem(poiKey(stageIndex, poiIndex)) === "true") count++;
    });
  });
  return count;
}

function getPhotoCount() {
  const data = JSON.parse(localStorage.getItem("lotte_items") || "{}");
  return Object.values(data).filter((item) => item.photo).length;
}

function getStageStatus(index) {
  if (index < activeStage) return "done";
  if (index === activeStage) return "today";
  return "planned";
}

function getTotalMapUrl() {
  const totalPoints = [
    "Grevelingstraat 77, Lisse, Netherlands",
    "Bovensmilde, Netherlands",
    "Malmo, Sweden",
    "Geilo, Norway",
    "Eidfjord, Norway",
    "Flam, Norway",
    "Borgund Stave Church, Norway",
    "Loen, Norway",
    "Geiranger, Norway",
    "Trollstigen, Norway",
    "Atlantic Ocean Road, Norway",
    "Lom, Norway",
    "Karlstad, Sweden",
    "Amsterdam, Netherlands",
  ];

  return "https://www.google.com/maps/dir/" + totalPoints.map(encodeURIComponent).join("/");
}

function renderStageDots() {
  return STAGES.map(
    (_, index) => `
      <button class="hero-dot ${getStageStatus(index)}" onclick="selectStage(${index})" aria-label="Dag ${index + 1}">
        ${index + 1}
      </button>
    `
  ).join("");
}

function renderDashboard() {
  const stage = STAGES[activeStage];
  const totalMapUrl = getTotalMapUrl();

  return `
    <section class="trip-hero">
      <div class="hero-map" aria-hidden="true">
        <svg class="route-overlay" viewBox="0 0 1000 360" preserveAspectRatio="none">
          <polyline class="route-line route-done" points="95,295 145,250 185,206 230,160 285,120 350,88" />
          <polyline class="route-line route-today" points="350,88 418,62 492,54 565,68 630,100" />
          <polyline class="route-line route-planned" points="630,100 688,142 730,190 758,244 790,300 845,318" />
        </svg>
        <span class="map-pin pin-start"></span>
        <span class="map-pin pin-today"></span>
        <span class="map-pin pin-end"></span>
      </div>

      <div class="hero-content">
        <p class="eyebrow">Dag ${activeStage + 1} van ${STAGES.length}</p>
        <h1>Expeditie <span>Blomsma</span> 2026</h1>
        <p>Camperreis door Noorwegen</p>
        <div class="hero-actions">
          <a class="linkbtn primary" target="_blank" href="${totalMapUrl}">Totaalroute</a>
          <a class="linkbtn" target="_blank" href="${stage.maps}">Route vandaag</a>
          <button class="linkbtn" onclick="openStage(${activeStage})">Dagdetails</button>
        </div>
      </div>

      <aside class="hero-today-card">
        <span class="day-badge large">Dag<br>${activeStage + 1}</span>
        <div>
          <b>${stage.title}</b>
          <small>${stage.from} -> ${stage.to}</small>
          <small>${stage.goal}</small>
        </div>
      </aside>

      <div class="hero-route">${renderStageDots()}</div>

      <div class="hero-legend">
        <span><b class="legend-line done"></b> Geweest</span>
        <span><b class="legend-line today"></b> Vandaag</span>
        <span><b class="legend-line planned"></b> Komt nog</span>
      </div>
    </section>

    <section class="dashboard">
      <div class="dashcard">
        <span class="dashicon">Route</span>
        <span class="dashnum">${STAGES.length}</span>
        <span class="dashlabel">Etappes</span>
      </div>

      <div class="dashcard">
        <span class="dashicon">Stops</span>
        <span class="dashnum">${getVisitedCount()}</span>
        <span class="dashlabel">Stops gedaan</span>
      </div>

      <div class="dashcard">
        <span class="dashicon">Must</span>
        <span class="dashnum">${getMustSeenCount()}/${getMustSeeCount()}</span>
        <span class="dashlabel">Have Seen</span>
      </div>

      <div class="dashcard">
        <span class="dashicon">Foto</span>
        <span class="dashnum">${getPhotoCount()}</span>
        <span class="dashlabel">Foto's</span>
      </div>
    </section>

    <section class="dashboard-grid">
      <div class="card route-panel">
        <p class="eyebrow">Routeplanning</p>
        <h2>Etappes</h2>
        <div class="stage-list-dashboard">
          ${STAGES.map(
            (item, index) => `
              <button class="stage-row ${getStageStatus(index)} ${index === activeStage ? "selected" : ""}" onclick="selectStage(${index})">
                <span class="day-badge">Dag<br>${index + 1}</span>
                <span class="stage-row-main">
                  <b>${item.title}</b>
                  <small>${item.goal}</small>
                </span>
                <span class="stage-row-meta">${item.km}<br>${item.time}</span>
              </button>
            `
          ).join("")}
        </div>
      </div>

      <div class="card selected-stage-panel">
        <p class="eyebrow">Vandaag geselecteerd</p>
        <div class="selected-stage-head">
          <span class="day-badge large">Dag<br>${activeStage + 1}</span>
          <div>
            <h2>${stage.title}</h2>
            <p class="muted">${stage.goal}</p>
          </div>
        </div>

        <div class="meta">
          <span class="pill">${stage.km}</span>
          <span class="pill">${stage.time}</span>
          <span class="pill">${stage.to}</span>
        </div>

        <h3>Route vandaag</h3>
        <p>${stage.from} -> ${stage.to}</p>

        <div class="actionbar">
          <a class="linkbtn primary" target="_blank" href="${stage.maps}">Open in Google Maps</a>
          <button class="linkbtn" onclick="openStage(${activeStage})">Open dagdetails</button>
        </div>

        <h3>Hoogtepunten onderweg</h3>
        ${stage.pois
          .map(
            (poi) => `
              <div class="compact-poi">
                <span class="stars">${stars(poi[1])}</span>
                <span>
                  <b>${poi[0]}</b><br>
                  <small class="muted">${poi[2]}</small>
                </span>
                <a class="textlink" target="_blank" href="${poi[3]}">Pin</a>
              </div>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderStages() {
  const stage = STAGES[activeStage];

  document.getElementById("stageList").innerHTML = `
    <div class="card stage-detail">
      <button class="linkbtn" onclick="showTab('map')">Terug naar dashboard</button>

      <p class="eyebrow">${stage.day}</p>
      <h1>${stage.title}</h1>

      <div class="meta">
        <span class="pill">${stage.km}</span>
        <span class="pill">${stage.time}</span>
        <span class="pill">${stage.goal}</span>
      </div>

      <div class="actionbar">
        ${
          canControlRoute()
            ? `<button class="linkbtn ${driving ? "stopbtn" : "startbtn"}" onclick="toggleDriving()">
                ${driving ? "Stop etappe" : "Start etappe"}
              </button>`
            : ""
        }
        <a class="linkbtn primary" target="_blank" href="${stage.maps}">Open route</a>
      </div>

      <h3>Bezienswaardigheden onderweg</h3>
      ${stage.pois
        .map((poi, poiIndex) => {
          const key = poiKey(activeStage, poiIndex);
          const visited = localStorage.getItem(key) === "true";

          return `
            <div class="poi ${visited ? "visited" : ""}">
              <div class="stars">${stars(poi[1])}</div>
              <div>
                <b>${poi[0]}</b><br>
                <span class="muted">${poi[2]}</span>
              </div>
              <div>
                <a target="_blank" class="linkbtn" href="${poi[3]}">Pin</a>
                <button class="linkbtn visitbtn ${visited ? "done" : ""}" onclick="toggleVisited('${key}')">
                  ${visited ? "Bezocht" : "Markeer bezocht"}
                </button>
              </div>
            </div>
          `;
        })
        .join("")}

      <div class="detail-grid">
        <div class="card inner">
          <h3>Tankadvies</h3>
          <p>Tank voor vertrek of zodra de tank onder halfvol komt. In Noorwegen liever niet wachten tot het lampje brandt.</p>
        </div>

        <div class="card inner">
          <h3>Campingopties</h3>
          <p><b>Optie 1:</b> camping dicht bij het eindpunt van de etappe.</p>
          <p><b>Optie 2:</b> camping 30-60 minuten voor het eindpunt, handig als de dag tegenvalt.</p>
        </div>

        <div class="card inner">
          <h3>Dagboek</h3>
          <p class="muted">Hier komen straks foto's, notities, voiceberichten en stops van deze dag.</p>
        </div>
      </div>
    </div>
  `;
}

function toggleLotteOpen(index) {
  const open = JSON.parse(localStorage.getItem("lotte_open") || "{}");
  open[index] = !open[index];
  localStorage.setItem("lotte_open", JSON.stringify(open));
  renderLotte();
}

function saveLotteItem(index, field, value) {
  const data = JSON.parse(localStorage.getItem("lotte_items") || "{}");
  data[index] = data[index] || {};
  data[index][field] = value;
  localStorage.setItem("lotte_items", JSON.stringify(data));
  renderLotte();
}

function saveLottePhoto(index, input) {
  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => saveLotteItem(index, "photo", reader.result);
  reader.readAsDataURL(file);
}

function renderLotte() {
  const items = [
    "Rendier gezien",
    "Schaap gezien",
    "Waterval gezien",
    "Grote brug gezien",
    "Veerboot geweest",
    "Staafkerk bezocht",
    "Noors ijsje gegeten",
    "Lange tunnel gereden",
    "Fjord gezien",
    "Gletsjer gezien",
    "Regenboog gezien",
    "Steenmannetje gebouwd",
    "Voeten in een fjord",
    "Mooiste camperfoto gemaakt",
  ];

  const saved = JSON.parse(localStorage.getItem("lotte_items") || "{}");
  const open = JSON.parse(localStorage.getItem("lotte_open") || "{}");

  document.getElementById("lotteList").innerHTML = `
    <div class="lotte-list">
      ${items
        .map((item, index) => {
          const data = saved[index] || {};
          const isOpen = open[index];

          return `
            <div class="lotte-item ${data.checked ? "checked" : ""}">
              <div class="lotte-main" onclick="toggleLotteOpen(${index})">
                <label onclick="event.stopPropagation()">
                  <input type="checkbox" ${data.checked ? "checked" : ""} onchange="saveLotteItem(${index}, 'checked', this.checked)">
                  <b>${item}</b>
                </label>
                <span>${isOpen ? "Dicht" : "Open"}</span>
              </div>

              ${
                data.checked
                  ? `<div class="lotte-summary">
                      ${data.photo ? "Foto " : ""}
                      ${data.note ? "Verhaal " : ""}
                      ${data.score ? "*".repeat(Number(data.score)) : ""}
                    </div>`
                  : ""
              }

              ${
                isOpen
                  ? `
                    <div class="lotte-extra">
                      <label>Foto toevoegen:
                        <input type="file" accept="image/*" onchange="saveLottePhoto(${index}, this)">
                      </label>

                      ${data.photo ? `<img class="lotte-photo" src="${data.photo}" alt="Foto">` : ""}

                      <label>Vertel iets over wat je hebt gezien:
                        <textarea onchange="saveLotteItem(${index}, 'note', this.value)" placeholder="Vertel iets over wat je hebt gezien...">${data.note || ""}</textarea>
                      </label>

                      <label>Score:
                        <select onchange="saveLotteItem(${index}, 'score', this.value)">
                          <option value="">Kies score</option>
                          ${[1, 2, 3, 4, 5]
                            .map((n) => `<option value="${n}" ${String(data.score) === String(n) ? "selected" : ""}>${n} sterren</option>`)
                            .join("")}
                        </select>
                      </label>
                    </div>
                  `
                  : ""
              }
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function render() {
  document.getElementById("summary").innerHTML = renderDashboard();
  renderStages();
  renderLotte();
}

render();
