import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";

const DEMO_AIRCRAFT = [
  { id:"GA204", type:"aircraft", name:"Garuda Indonesia 204", code:"GIA204", lat:-6.35, lng:106.82, altitude:32000, speed:455, heading:92, status:"Airborne", route:"CGK → DPS" },
  { id:"JT682", type:"aircraft", name:"Lion Air 682", code:"LNI682", lat:-7.18, lng:110.42, altitude:28000, speed:438, heading:115, status:"Airborne", route:"CGK → SUB" },
  { id:"QZ781", type:"aircraft", name:"AirAsia 781", code:"AWQ781", lat:1.22, lng:104.05, altitude:30000, speed:472, heading:178, status:"Airborne", route:"KUL → DPS" },
  { id:"ID650", type:"aircraft", name:"Batik Air 650", code:"BTK650", lat:-1.26, lng:116.87, altitude:34000, speed:491, heading:72, status:"Airborne", route:"BPN → CGK" }
];

const DEMO_SHIPS = [
  { id:"SHIP01", type:"ship", name:"MV Nusantara", code:"MMSI 525018421", lat:-1.21, lng:116.82, speed:14.2, heading:165, status:"Underway", route:"Balikpapan → Surabaya", destination:"Surabaya", eta:"18:40 UTC" },
  { id:"SHIP02", type:"ship", name:"KM Bahari Jaya", code:"MMSI 525771204", lat:-6.11, lng:106.88, speed:11.8, heading:270, status:"Underway", route:"Jakarta → Makassar", destination:"Makassar", eta:"Tomorrow 07:20 UTC" },
  { id:"SHIP03", type:"ship", name:"Pacific Trader", code:"IMO 9873214", lat:1.14, lng:103.91, speed:16.1, heading:42, status:"Underway", route:"Singapore → Manila", destination:"Manila", eta:"Tomorrow 02:10 UTC" },
  { id:"SHIP04", type:"ship", name:"KM Sinar Laut", code:"MMSI 525992810", lat:-8.65, lng:115.21, speed:0, heading:0, status:"Anchored", route:"Bali Anchorage", destination:"Denpasar", eta:"—" }
];

let mode = "aircraft";
let liveData = { aircraft: [], ship: [] };
let selected = null;
let markers = new Map();
let map;

const app = document.querySelector("#app");

app.innerHTML = `
  <header class="topbar">
    <div class="brand">
      <div class="brand-mark">X</div>
      <div>
        <strong>XOD TRACKER</strong>
        <span>LIVE MOVEMENT MONITOR</span>
      </div>
    </div>
    <div class="top-actions">
      <span class="live-dot"></span><span>LIVE DATA READY</span>
      <button id="locateBtn">◎ My location</button>
    </div>
  </header>

  <main class="layout">
    <aside class="sidebar">
      <div class="section-title">TRACK</div>
      <div class="switcher">
        <button class="mode active" data-mode="aircraft">✈ Aircraft</button>
        <button class="mode" data-mode="ship">⚓ Ships</button>
      </div>

      <div class="search">
        <span>⌕</span>
        <input id="search" placeholder="Search callsign or name..." />
      </div>

      <div class="filters">
        <button class="filter active" data-filter="all">All</button>
        <button class="filter" data-filter="moving">Moving</button>
        <button class="filter" data-filter="stopped">Stopped</button>
      </div>

      <div class="list-head">
        <span id="countLabel">Aircraft</span>
        <span id="count">0</span>
      </div>

      <div id="objectList" class="object-list"></div>

      <div class="sidebar-footer">
        <div><span>DATA</span><b>DEMO</b></div>
        <p>Live provider can be connected through the API layer.</p>
      </div>
    </aside>

    <section class="map-wrap">
      <div id="map"></div>
      <div class="map-tools">
        <button id="zoomIn">+</button>
        <button id="zoomOut">−</button>
      </div>

      <div class="stats">
        <div><span>VISIBLE</span><b id="visibleStat">0</b></div>
        <div><span>MOVING</span><b id="movingStat">0</b></div>
        <div><span>STOPPED</span><b id="stoppedStat">0</b></div>
      </div>

      <div id="detail" class="detail hidden"></div>
      <div class="map-note">© OpenStreetMap contributors · XOD Tracker demo</div>
    </section>
  </main>
`;

map = L.map("map", { zoomControl:false, worldCopyJump:true }).setView([-2, 113], 5);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors",
  maxZoom: 18
}).addTo(map);

function icon(type, heading=0) {
  const symbol = type === "aircraft" ? "✈" : "◆";
  return L.divIcon({
    className: "tracker-icon",
    html: `<div class="marker ${type}" style="transform:rotate(${heading}deg)">${symbol}</div>`,
    iconSize:[30,30],
    iconAnchor:[15,15]
  });
}

function data() {
  return mode === "aircraft" ? (liveData.aircraft.length ? liveData.aircraft : DEMO_AIRCRAFT) : (liveData.ship.length ? liveData.ship : DEMO_SHIPS);
}

function isMoving(x) {
  return (x.speed || 0) > 0;
}

function filtered() {
  const q = document.querySelector("#search").value.toLowerCase();
  const f = document.querySelector(".filter.active")?.dataset.filter || "all";
  return data().filter(x => {
    const matches = `${x.name} ${x.code} ${x.id}`.toLowerCase().includes(q);
    const movement = f === "all" || (f === "moving" && isMoving(x)) || (f === "stopped" && !isMoving(x));
    return matches && movement;
  });
}

function renderMarkers() {
  markers.forEach(m => map.removeLayer(m));
  markers.clear();

  filtered().forEach(x => {
    const marker = L.marker([x.lat,x.lng], {icon:icon(x.type,x.heading)}).addTo(map);
    marker.on("click", () => selectObject(x.id));
    markers.set(x.id, marker);
  });
  updateStats();
}

function renderList() {
  const list = document.querySelector("#objectList");
  const items = filtered();

  document.querySelector("#count").textContent = items.length;
  document.querySelector("#countLabel").textContent = mode === "aircraft" ? "Aircraft" : "Ships";

  list.innerHTML = items.map(x => `
    <button class="object-row ${selected?.id === x.id ? "selected":""}" data-id="${x.id}">
      <div class="row-icon ${x.type}">${x.type === "aircraft" ? "✈" : "◆"}</div>
      <div class="row-main">
        <strong>${x.name}</strong>
        <span>${x.code}</span>
      </div>
      <div class="row-right">
        <b>${x.speed ? x.speed + (x.type === "ship" ? " kn" : " kt") : "0"}</b>
        <span>${x.status}</span>
      </div>
    </button>
  `).join("");

  list.querySelectorAll(".object-row").forEach(btn => {
    btn.onclick = () => selectObject(btn.dataset.id);
  });
}

function selectObject(id) {
  const x = [...DEMO_AIRCRAFT,...DEMO_SHIPS,...liveData.aircraft,...liveData.ship].find(o => o.id === id);
  if (!x) return;
  selected = x;

  map.setView([x.lat,x.lng], Math.max(map.getZoom(),7), {animate:true});
  renderList();
  showDetail(x);
}

function showDetail(x) {
  const detail = document.querySelector("#detail");
  detail.classList.remove("hidden");
  detail.innerHTML = `
    <button class="close" id="closeDetail">×</button>
    <div class="detail-title">
      <div class="big-icon ${x.type}">${x.type === "aircraft" ? "✈" : "◆"}</div>
      <div><span>${x.type === "aircraft" ? "AIRCRAFT" : "VESSEL"}</span><h2>${x.name}</h2></div>
    </div>
    <div class="status-line"><i></i>${x.status} <span>• Updated just now</span></div>
    <div class="detail-grid">
      <div><span>IDENTIFIER</span><b>${x.code}</b></div>
      <div><span>POSITION</span><b>${x.lat.toFixed(4)}, ${x.lng.toFixed(4)}</b></div>
      <div><span>SPEED</span><b>${x.speed || 0} ${x.type === "ship" ? "kn" : "kt"}</b></div>
      <div><span>HEADING</span><b>${x.heading || 0}°</b></div>
      ${x.type === "aircraft"
        ? `<div><span>ALTITUDE</span><b>${x.altitude.toLocaleString()} ft</b></div><div><span>ROUTE</span><b>${x.route}</b></div>`
        : `<div><span>DESTINATION</span><b>${x.destination}</b></div><div><span>ETA</span><b>${x.eta}</b></div>`
      }
    </div>
    <button class="track-btn">☆ Add to watchlist</button>
  `;
  document.querySelector("#closeDetail").onclick = () => {
    detail.classList.add("hidden");
    selected = null;
    renderList();
  };
}

function updateStats() {
  const items = filtered();
  document.querySelector("#visibleStat").textContent = items.length;
  document.querySelector("#movingStat").textContent = items.filter(isMoving).length;
  document.querySelector("#stoppedStat").textContent = items.filter(x => !isMoving(x)).length;
}

function refresh() {
  renderMarkers();
  renderList();
  if (selected) {
    const latest = [...DEMO_AIRCRAFT,...DEMO_SHIPS,...liveData.aircraft,...liveData.ship].find(x => x.id === selected.id);
    if (latest) showDetail(latest);
  }
}

document.querySelectorAll(".mode").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".mode").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    mode = btn.dataset.mode;
    selected = null;
    document.querySelector("#detail").classList.add("hidden");
    document.querySelectorAll(".filter").forEach(b => b.classList.toggle("active", b.dataset.filter === "all"));
    refresh();
  };
});

document.querySelectorAll(".filter").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".filter").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    refresh();
  };
});

document.querySelector("#search").oninput = refresh;
document.querySelector("#zoomIn").onclick = () => map.zoomIn();
document.querySelector("#zoomOut").onclick = () => map.zoomOut();

document.querySelector("#locateBtn").onclick = () => {
  if (!navigator.geolocation) return alert("Geolocation is not supported.");
  navigator.geolocation.getCurrentPosition(pos => {
    map.setView([pos.coords.latitude,pos.coords.longitude],10);
    L.circleMarker([pos.coords.latitude,pos.coords.longitude], {
      radius:7
    }).addTo(map).bindPopup("Your approximate location").openPopup();
  }, () => alert("Location permission was not granted."));
};

async function loadLiveAircraft() {
  try {
    const response = await fetch("/api/aircraft?lat=-2&lon=113&dist=250");
    if (!response.ok) throw new Error("aircraft api");
    const data = await response.json();
    liveData.aircraft = (data.aircraft || []).map(a => ({
      id:a.id, type:"aircraft", name:a.callsign, code:a.registration || a.id,
      lat:a.lat, lng:a.lng, altitude:a.altitude || 0, speed:a.speed || 0,
      heading:a.heading || 0, status:"Live", route:""
    }));
    if (mode === "aircraft") refresh();
  } catch {
    if (mode === "aircraft") refresh();
  }
}

async function loadLiveShips() {
  try {
    const response = await fetch("/api/ships?lat=-2&lon=113&span=10");
    if (!response.ok) throw new Error("ship api");
    const data = await response.json();
    const rows = data.vessels || data.data || data;
    if (Array.isArray(rows)) {
      liveData.ship = rows.map(v => ({
        id:String(v.mmsi || v.imo || v.id || Math.random()),
        type:"ship",
        name:v.name || v.vessel_name || "Unknown vessel",
        code:v.mmsi ? `MMSI ${v.mmsi}` : String(v.imo || ""),
        lat:Number(v.latitude ?? v.lat),
        lng:Number(v.longitude ?? v.lon ?? v.lng),
        speed:Number(v.sog ?? v.speed ?? 0),
        heading:Number(v.cog ?? v.heading ?? 0),
        status:v.nav_status || v.status || "Live",
        destination:v.destination || "—",
        eta:v.eta || "—"
      })).filter(v => Number.isFinite(v.lat) && Number.isFinite(v.lng));
      if (mode === "ship") refresh();
    }
  } catch {
    if (mode === "ship") refresh();
  }
}

loadLiveAircraft();
loadLiveShips();
setInterval(loadLiveAircraft, 10000);
setInterval(loadLiveShips, 60000);
