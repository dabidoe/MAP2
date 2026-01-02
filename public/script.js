const socket = io();
const locationStorage = new Map();
const characterData = new Map();
let currentTokens = [];
let activeLocationId = null;

const GMSession = {
    mode: 'PLAYER', // Toggle: 'PLAYER' or 'DM'
    fogOfWar: true,
    partyGPS: { lat: 40.2985, lng: -74.8718 }, // McConkey's Ferry
    discoveredLocations: ['frozen_vigil'],
    activeEncounter: null,
};

const campaignState = {
    date: "December 23, 1776",
    time: "23:45",
    weather: "Violent Sleet & Snow",
    morale: "Low",
    isTraveling: false
};

// Initialize map
const map = L.map('map', { 
    zoomControl: false,
    maxZoom: 19,
    fadeAnimation: true
}).setView([40.2985, -74.8718], 13);

L.DomUtil.addClass(map.getContainer(), 'parchment-container');

// HIGH RES ESRI IMAGERY
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Esri',
    maxZoom: 19
}).addTo(map);

// UI Elements
const sidebar = document.getElementById('sidebar');

// Tactical View Overlay System
const tacticalContainer = document.createElement('div');
tacticalContainer.className = 'tactical-map-container';
const viewport = document.getElementById('map-viewport');
if (viewport) {
    viewport.appendChild(tacticalContainer);
} else {
    document.body.appendChild(tacticalContainer);
}

const tacticalImg = document.createElement('img');
tacticalImg.className = 'tactical-map-img';
tacticalContainer.appendChild(tacticalImg);

const tokenPlane = document.createElement('div');
tokenPlane.style.position = 'absolute';
tokenPlane.style.top = '0';
tokenPlane.style.left = '0';
tokenPlane.style.width = '100%';
tokenPlane.style.height = '100%';
tacticalContainer.appendChild(tokenPlane);

// World Map Layer Group
const worldMarkers = L.layerGroup().addTo(map);

// Back Button
const backButton = document.createElement('button');
backButton.innerHTML = '← Return to Campaign Map';
backButton.className = 'cycle-button';
backButton.style.position = 'absolute';
backButton.style.bottom = '20px';
backButton.style.left = '240px'; // Adjusted for smaller sidebar
backButton.style.display = 'none';
backButton.style.zIndex = '6000';
backButton.onclick = exitTacticalView;
document.body.appendChild(backButton);

// DM Mode Toggle
const dmToggle = document.createElement('button');
dmToggle.innerHTML = 'Toggle DM Mode';
dmToggle.className = 'cycle-button';
dmToggle.style.position = 'absolute';
dmToggle.style.top = '20px';
dmToggle.style.right = '20px';
dmToggle.style.zIndex = '6000';
dmToggle.onclick = () => {
    GMSession.mode = GMSession.mode === 'DM' ? 'PLAYER' : 'DM';
    alert(`Switched to ${GMSession.mode} Mode`);
    renderWorldMarkers();
    renderWorldSidebar();
};
document.body.appendChild(dmToggle);

function exitTacticalView() {
    document.body.classList.remove('tactical-active');
    activeLocationId = null;
    backButton.style.display = 'none';
    map.dragging.enable();
    map.scrollWheelZoom.enable();
    renderWorldMarkers();
    renderWorldSidebar();
}

function renderWorldSidebar() {
    if (!sidebar) return;

    let html = `
        <div class="campaign-header">
            <h2 class="cinzel">${campaignState.date}</h2>
            <div class="env-info">
                <span>🕒 ${campaignState.time}</span> | <span>❄️ ${campaignState.weather}</span>
            </div>
            <div class="morale-box">
                <label>ARMY MORALE</label>
                <div class="morale-bar"><div class="fill" style="width: 30%;"></div></div>
            </div>
        </div>
        <div class="location-section">
            <h3 class="sidebar-subhead">STRATEGIC OBJECTIVES</h3>
            <p style="padding: 0 15px; font-size: 0.8rem; color: #a09580;">Click objective markers on the map to command travel.</p>
        </div>
    `;
    sidebar.innerHTML = html;
}

function startTravel(targetId) {
    if (campaignState.isTraveling && GMSession.mode === 'PLAYER') return;

    const destination = locationStorage.get(targetId).data;
    
    if (GMSession.mode === 'DM') {
        const party = currentTokens.filter(t => t.side === 'Continental');
        party.forEach(token => {
            token.gps.lat = destination.lat;
            token.gps.lng = destination.lng;
        });
        map.setView([destination.lat, destination.lng], 14);
        enterTacticalView(locationStorage.get(targetId));
        return;
    }

    campaignState.isTraveling = true;
    document.body.classList.add('traveling');
    
    const party = currentTokens.filter(t => t.side === 'Continental');
    let step = 0;
    const totalSteps = 40;
    
    const moveInterval = setInterval(() => {
        step++;
        party.forEach(token => {
            token.gps.lat += (destination.lat - token.gps.lat) * (1 / (totalSteps - step + 1));
            token.gps.lng += (destination.lng - token.gps.lng) * (1 / (totalSteps - step + 1));
            
            // Discovery Logic
            locationStorage.forEach((entry, id) => {
                if (!GMSession.discoveredLocations.includes(id)) {
                    const dist = L.latLng(token.gps.lat, token.gps.lng).distanceTo(L.latLng(entry.data.lat, entry.data.lng));
                    if (dist < 800) { 
                        GMSession.discoveredLocations.push(id);
                        renderWorldMarkers(); // Update markers on map
                    }
                }
            });

            if (targetId === 'picket_post' && step === 20) {
                clearInterval(moveInterval);
                triggerEncounterPopup(targetId);
            }
        });
        
        renderWorldMarkers();
        map.panTo([party[0].gps.lat, party[0].gps.lng]);
        
        if (step >= totalSteps) {
            clearInterval(moveInterval);
            campaignState.isTraveling = false;
            document.body.classList.remove('traveling');
            enterTacticalView(locationStorage.get(targetId));
        }
    }, 80);
}

function triggerEncounterPopup(locationId) {
    const overlay = document.createElement('div');
    overlay.className = 'encounter-modal';
    overlay.innerHTML = `
        <div class="encounter-content">
            <h1 style="color:#f44336; margin-top:0;">⚠️ AMBUSH!</h1>
            <p>A Hessian picket line has spotted your movement through the woods.</p>
            <button class="travel-btn" style="background:#f44336; color:white; width:100%;" onclick="resolveEncounter(true, '${locationId}')">To Arms!</button>
            <button class="travel-btn" style="width:100%; margin-top:10px; background: #555; color: white;" onclick="resolveEncounter(false, '${locationId}')">Withdraw</button>
        </div>
    `;
    document.body.appendChild(overlay);
}

window.resolveEncounter = (fight, locId) => {
    document.querySelector('.encounter-modal').remove();
    campaignState.isTraveling = false;
    document.body.classList.remove('traveling');
    if (fight) enterTacticalView(locationStorage.get(locId));
};

function renderWorldMarkers() {
    worldMarkers.clearLayers();

    // RENDER LOCATIONS AS TOKENS
    locationStorage.forEach((entry, id) => {
        if (GMSession.mode === 'PLAYER' && !GMSession.discoveredLocations.includes(id)) return;

        const loc = entry.data;
        const locationIcon = L.divIcon({
            className: 'location-token',
            html: `<div style="background:#c5a959; border:2px solid #000; width:16px; height:16px; border-radius:50%; box-shadow: 0 0 10px rgba(0,0,0,0.5);"></div>`,
            iconSize: [16, 16]
        });

        L.marker([loc.lat, loc.lng], {icon: locationIcon})
            .bindTooltip(`<b>${loc.title}</b><br>${loc.description}`, {sticky: true})
            .addTo(worldMarkers)
            .on('click', () => startTravel(id));
    });

    // RENDER CHARACTER TOKENS
    currentTokens.forEach(token => {
        if (GMSession.mode === 'PLAYER' && token.side !== 'Continental') return;
        
        if (!token.gps) return;
        L.marker([token.gps.lat, token.gps.lng], {
            icon: L.icon({
                iconUrl: token.icon,
                iconSize: [40, 40],
                className: 'character-chip'
            }),
            draggable: GMSession.mode === 'DM'
        }).addTo(worldMarkers).on('dragend', (e) => {
            if (GMSession.mode === 'DM') {
                const newPos = e.target.getLatLng();
                token.gps.lat = newPos.lat;
                token.gps.lng = newPos.lng;
            }
        });
    });
}

function enterTacticalView(loc) {
    document.body.classList.add('tactical-active');
    activeLocationId = loc.id || loc.data.id;
    tacticalImg.src = loc.data.tacticalMapUrl;
    backButton.style.display = 'block';
    map.dragging.disable();
    map.scrollWheelZoom.disable();
    worldMarkers.clearLayers();
    renderTacticalTokens();
}

function renderTacticalTokens() {
    tokenPlane.innerHTML = '';
    currentTokens.forEach(token => {
        if (token.locationId === activeLocationId && token.grid) {
            const tokenEl = document.createElement('div');
            tokenEl.className = 'tactical-token';
            tokenEl.style.left = `${token.grid.posX}%`;
            tokenEl.style.top = `${token.grid.posY}%`;
            tokenEl.innerHTML = `
                <img src="${token.icon}" style="width:100%; height:100%; border-radius:50%; border: 3px solid ${token.side === 'Continental' ? '#4CAF50' : '#f44336'};">
            `;
            tokenPlane.appendChild(tokenEl);
        }
    });
}

async function initCampaign() {
    try {
        console.log("Initializing War Room...");
        
        let locations = [];
        try {
            const locRes = await fetch('/data/locations.json');
            locations = await locRes.json();
        } catch (e) {
            console.error("Location fetch failed, using defaults.");
            locations = [
                { id: 'frozen_vigil', title: "McConkey's Ferry", lat: 40.2985, lng: -74.8718, description: 'The embarkation point on the Delaware.', tacticalMapUrl: '/assets/maps/washingtons-camp/the-frozen-vigil-of-fortitude.png' },
                { id: 'trenton_barracks', title: 'Trenton Barracks', lat: 40.2178, lng: -74.7681, description: 'The stone barracks housing the Rall Regiment.', tacticalMapUrl: '/assets/maps/trenton-barracks/the-barracks-of-trenton.png' }
            ];
        }

        try {
            const [charRes, tokenRes] = await Promise.all([
                fetch('/data/characters.json'),
                fetch('/data/tokens.json')
            ]);
            
            const charData = await charRes.json();
            const tokenData = await tokenRes.json();

            currentTokens = tokenData.map(token => {
                const char = charData.find(c => (c._id?.$oid || c.characterId) === token.characterRef);
                return {
                    ...token,
                    side: (token.name.includes('Washington') || token.name.includes('Greene') || token.side === 'Continental') ? 'Continental' : 'Hessian',
                    icon: char ? char.icon : 'https://statsheet-cdn.b-cdn.net/images/placeholder.png',
                    gps: { lat: token.lat, lng: token.lng },
                    grid: { posX: token.posX, posY: token.posY }
                };
            });
        } catch (e) {
            console.error("Data fetch failed.");
        }

        locations.forEach(loc => locationStorage.set(loc.id, { data: loc }));

        renderWorldSidebar(); 
        renderWorldMarkers();
        console.log("Systems Online.");
    } catch (criticalError) {
        console.error("CRITICAL BOOT ERROR:", criticalError);
        document.body.innerHTML = `<div style="color:white; padding:20px;">Boot Error: ${criticalError.message}</div>`;
    }
}

initCampaign();