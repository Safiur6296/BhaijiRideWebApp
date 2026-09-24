import './style.css';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { 
  createRide, 
  joinRide, 
  updateRiderLocation, 
  updateRiderStatus, 
  subscribeToRiders, 
  subscribeToTripInfo, 
  leaveRide, 
  subscribeConnectionState 
} from './firebase.js';
import { 
  searchPlaces, 
  reverseGeocode, 
  getRoute, 
  decodePolyline, 
  calculateDistanceKm, 
  formatDistance, 
  formatDuration,
  calculateBearing,
  isRiderAhead,
  formatCleanDistance,
  getRelativePositionDescription
} from './geo.js';
import { 
  requestScreenWakeLock, 
  releaseScreenWakeLock, 
  startAudioKeepAlive, 
  stopAudioKeepAlive 
} from './wakelock.js';

// SVG Icons matching Android Material 3 Icons exactly
const ICONS = {
  motorcycle: `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M19 7c-1.66 0-3 1.34-3 3 0 .42.09.81.24 1.17L14.47 13H11v-2h2.5c.83 0 1.5-.67 1.5-1.5S14.33 8 13.5 8H8.83l-1.42-2.58A2.998 2.998 0 0 0 4.8 4H2v2h2.8c.45 0 .86.25 1.07.64L7.58 10H5c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5c0-.42-.09-.81-.24-1.17L11.53 12H14v2h-1.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5H16c2.76 0 5-2.24 5-5s-2.24-5-5-5zm-14 11c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm14 0c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"/></svg>`,
  person: `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`,
  add: `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>`,
  altRoute: `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M9 3L5 6.99h3V14c0 1.66 1.34 3 3 3h4v3.01L19 16.02 15 12.03V15h-4c-.55 0-1-.45-1-1V6.99h3L9 3z"/></svg>`,
  arrowForward: `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/></svg>`,
  contentPaste: `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 2h-4.18C14.4 0.84 13.3 0 12 0c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm7 18H5V4h2v3h10V4h2v16z"/></svg>`,
  contentCopy: `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>`,
  refresh: `<svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>`,
  delete: `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM8 9h8v10H8V9zm7.5-5l-1-1h-5l-1 1H5v2h14V4h-3.5z"/></svg>`,
  exit: `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M10.09 15.59L11.5 17l5-5-5-5-1.41 1.41L12.67 11H3v2h9.67l-2.58 2.59zM19 3H5c-1.11 0-2 .9-2 2v4h2V5h14v14H5v-4H3v4c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/></svg>`,
  myLocation: `<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0 0 13 3.06V1h-2v2.06A8.994 8.994 0 0 0 3.06 11H1v2h2.06A8.994 8.994 0 0 0 11 20.94V23h2v-2.06A8.994 8.994 0 0 0 20.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/></svg>`,
  group: `<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>`,
  radar: `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2C6.49 2 2 6.49 2 12s4.49 10 10 10a9.98 9.98 0 0 0 8.66-5h-2.19A7.994 7.994 0 0 1 12 20c-4.41 0-8-3.59-8-8s3.59-8 8-8c3.92 0 7.18 2.83 7.84 6.55l2.02-.4A9.99 9.99 0 0 0 12 2zm0 4c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.97 0 5.43-2.16 5.9-5h-2.05A3.999 3.999 0 0 1 12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4c1.86 0 3.41 1.28 3.86 3h2.05A5.999 5.999 0 0 0 12 6zm0 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/></svg>`,
  keyboardArrowDown: `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>`,
  keyboardArrowUp: `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/></svg>`,
  arrowUpward: `<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z"/></svg>`,
  arrowDownward: `<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M20 12l-1.41-1.41L13 16.17V4h-2v12.17l-5.58-5.59L4 12l8 8 8-8z"/></svg>`
};

// Exact RiderStatus enum matching Android RiderStatus.kt
const STATUS_CONFIG = {
  RIDING: { name: 'Riding', emoji: '🏍️', color: '#00E676', css: 'active-riding' },
  REFUELING: { name: 'Refueling', emoji: '⛽', color: '#FFA000', css: 'active-refueling' },
  PUNCTURE: { name: 'Tire Puncture', emoji: '🔧', color: '#FF7043', css: 'active-puncture' },
  REST: { name: 'Rest Stop', emoji: '☕', color: '#40C4FF', css: 'active-rest' },
  EMERGENCY: { name: 'Emergency', emoji: '🚨', color: '#EF4444', css: 'active-emergency' },
  OTHER: { name: 'Other Stop', emoji: '⚠️', color: '#B0BEC5', css: 'active-other' }
};

const defaultSessions = [
  {
    code: 'CREW53',
    riderName: 'Safiur',
    timestamp: Date.now() - 15 * 60 * 1000,
    isActive: false,
    isHost: true
  }
];

const savedSessions = JSON.parse(localStorage.getItem('bhaiji_recent_convoys') || 'null');

const state = {
  riderName: localStorage.getItem('bhaiji_rider_name') || 'Safiur',
  activeRideCode: localStorage.getItem('bhaiji_active_ride_code') || '',
  myRiderId: localStorage.getItem('bhaiji_rider_id') || '',
  joinCodeInput: '',
  myStatus: 'RIDING',
  myLocation: null,
  riders: [],
  tripInfo: null,
  activeView: 'HOME', // 'HOME' or 'MAP'
  isTripPlannerOpen: false,
  isStatusPickerOpen: false,
  isPackListOpen: false,
  isRouteVisible: true,
  isRadarExpanded: true,
  wakeLockActive: false,
  isOnline: true,
  startPlace: null,
  destPlace: null,
  routeResult: null,
  sessions: savedSessions || defaultSessions
};

// Leaflet map refs
let mapInstance = null;
let userMarker = null;
let riderMarkers = {};
let routePolyline = null;
let startMarker = null;
let destMarker = null;
let locationWatchId = null;
let unsubscribeRiders = null;
let unsubscribeTrip = null;

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  subscribeConnectionState((connected) => {
    state.isOnline = connected;
  });

  const urlParams = new URLSearchParams(window.location.search);
  const joinParam = urlParams.get('ride');
  if (joinParam) {
    state.joinCodeInput = joinParam.trim().toUpperCase();
  }

  // Pre-acquire GPS in background with high accuracy
  acquireUserGpsLocation();

  if (state.activeRideCode && state.myRiderId) {
    state.activeView = 'MAP';
    renderApp();
    startRideTracking(state.activeRideCode, state.myRiderId);
  } else {
    state.activeView = 'HOME';
    renderApp();
  }
}

function acquireUserGpsLocation(onSuccess = null, onError = null) {
  if (!('geolocation' in navigator)) {
    if (onError) onError(new Error('Geolocation is not supported by your browser.'));
    return;
  }

  const applyPosition = (pos) => {
    state.myLocation = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      speed: pos.coords.speed || 0,
      heading: (pos.coords.heading !== null && !isNaN(pos.coords.heading)) ? pos.coords.heading : null,
      accuracy: pos.coords.accuracy || 0
    };

    if (mapInstance) {
      updateAllMarkers();
    }
    updateRiderRadarUI();

    if (state.activeRideCode && state.myRiderId) {
      updateRiderLocation(state.activeRideCode, state.myRiderId, {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        speed: pos.coords.speed || 0
      });
    }

    if (onSuccess) onSuccess(state.myLocation);
  };

  // Try high-accuracy first (5-second timeout, 30-second cache)
  navigator.geolocation.getCurrentPosition(
    applyPosition,
    (highAccErr) => {
      console.warn('High-accuracy GPS fix failed or timed out:', highAccErr.message, '- falling back to standard accuracy.');
      // Fallback: standard accuracy (fast, works indoors / on Wi-Fi / laptops / desktops)
      navigator.geolocation.getCurrentPosition(
        applyPosition,
        (fallbackErr) => {
          console.warn('Standard GPS fix also failed:', fallbackErr.message);
          if (onError) onError(fallbackErr);
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
      );
    },
    { enableHighAccuracy: true, timeout: 5000, maximumAge: 30000 }
  );
}

function showToast(message) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = 'cockpit-toast';
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

// -------------------------------------------------------------
// Core UI Rendering
// -------------------------------------------------------------
function renderApp() {
  const app = document.getElementById('app');
  if (!app) return;

  if (state.activeView === 'MAP') {
    app.innerHTML = renderMapScreen();
    attachMapEvents();
    initLeafletMap();
  } else {
    app.innerHTML = renderHomeScreen();
    attachHomeEvents();
  }
}

// -------------------------------------------------------------
// HomeScreen Template: Exact Match (No Version / Update Row)
// -------------------------------------------------------------
function renderHomeScreen() {
  const isReady = state.riderName.trim().length > 0;
  const isJoinActive = state.joinCodeInput.trim().length > 0;

  return `
    <div class="mobile-app-wrapper">
      <!-- 1. ANDROID HERO LOGO & TITLE HEADER -->
      <header class="android-hero-header">
        <div class="logo-glow-wrapper">
          <div class="logo-radial-glow"></div>
          <div class="logo-circle-frame">
            <img src="/app_logo.png" alt="BhaijiRide App Logo" class="logo-image" />
          </div>
        </div>

        <h1 class="android-title-text">BHAIJI RIDE</h1>

        <div class="android-tagline-badge">
          <span class="tagline-dot"></span>
          <span>GPS CONVOY & EMERGENCY SAFETY</span>
        </div>
      </header>

      <div class="homescreen-content">
        <!-- 2. RIDER CALLSIGN CARD -->
        <div class="convoy-card">
          <div class="card-top-row">
            <div class="card-header-left">
              <span style="color: var(--electric-amber); display: flex;">${ICONS.motorcycle}</span>
              <span class="card-callsign-label">RIDER CALLSIGN</span>
            </div>

            ${isReady ? `
              <div class="ready-badge">
                <span class="ready-dot"></span>
                <span>READY</span>
              </div>
            ` : ''}
          </div>

          <div class="material-outlined-field">
            <span class="field-leading-icon">${ICONS.person}</span>
            <input 
              type="text" 
              id="input-rider-callsign" 
              class="material-outlined-input" 
              placeholder="Display Name (e.g. Alex)" 
              value="${state.riderName}"
              maxlength="25"
            />
            <span class="field-floating-label">Display Name (e.g. Alex)</span>
          </div>
        </div>

        <!-- 3. START A NEW CONVOY CARD -->
        <div class="convoy-card">
          <div class="card-top-row" style="justify-content: flex-start; gap: 12px;">
            <div class="circle-icon-badge">
              ${ICONS.add}
            </div>
            <div class="card-title-stack">
              <span class="card-subheading">START A NEW CONVOY</span>
              <span class="card-main-heading">Host a new group ride session</span>
            </div>
          </div>

          <p class="card-description-text">
            Generates a unique 6-letter code to share with your pack for real-time GPS tracking and emergency safety.
          </p>

          <!-- Plan Route & Create Ride Button (Amber Gradient) -->
          <button id="btn-plan-route-create" class="btn-amber-gradient">
            <span style="display: flex;">${ICONS.altRoute}</span>
            <span>Plan Route & Create Ride</span>
          </button>

          <!-- Quick Start (No Route) Button (Outlined) -->
          <button id="btn-quick-start-no-route" class="btn-convoy-outlined">
            <span style="color: var(--electric-amber); display: flex;">${ICONS.add}</span>
            <span>Quick Start (No Route)</span>
          </button>
        </div>

        <!-- 4. JOIN EXISTING CONVOY CARD -->
        <div class="convoy-card">
          <div class="card-top-row" style="justify-content: flex-start; gap: 12px;">
            <div class="circle-icon-badge-elevated">
              ${ICONS.arrowForward}
            </div>
            <div class="card-title-stack">
              <span class="card-subheading">JOIN EXISTING CONVOY</span>
              <span class="card-main-heading">Connect with your pack</span>
            </div>
          </div>

          <div class="material-outlined-field">
            <input 
              type="text" 
              id="input-convoy-code" 
              class="material-outlined-input code-field-input" 
              placeholder="Convoy Code (e.g. MOTO84)" 
              value="${state.joinCodeInput}"
              maxlength="8"
            />
            <span class="field-floating-label">Convoy Code (e.g. MOTO84)</span>
            <button id="btn-paste-code" class="field-trailing-btn" title="Paste from Clipboard">
              ${ICONS.contentPaste}
            </button>
          </div>

          <button id="btn-join-convoy-submit" class="btn-join-convoy ${isJoinActive ? 'active' : ''}">
            <span style="display: flex;">${ICONS.arrowForward}</span>
            <span>Join Convoy</span>
          </button>
        </div>

        <!-- 5. RECENT CONVOYS SECTION -->
        <div class="recent-section-header">
          <div class="recent-header-left">
            <span class="recent-header-title">RECENT CONVOYS</span>
            <span class="recent-count-chip">${state.sessions.length}</span>
          </div>

          <button id="btn-refresh-history" class="btn-refresh-sessions" title="Refresh session statuses">
            ${ICONS.refresh}
          </button>
        </div>

        <div id="recent-sessions-list" style="display: flex; flex-direction: column; gap: 16px;">
          ${state.sessions.map((s, idx) => `
            <div class="session-card" data-code="${s.code}">
              <div class="session-card-header">
                <div class="session-code-group">
                  <span class="session-code-text">${s.code}</span>
                  <button class="btn-copy-code" data-copy="${s.code}" title="Copy Code">
                    ${ICONS.contentCopy}
                  </button>
                </div>

                <div class="session-status-badge ${s.isActive ? 'active' : 'ended'}">
                  <span class="status-badge-dot ${s.isActive ? 'active' : 'ended'}"></span>
                  <span>${s.isActive ? 'ACTIVE' : 'ENDED'}</span>
                </div>
              </div>

              <div class="session-timestamp-text">
                Created ${formatRelativeTime(s.timestamp)} ${s.riderName ? `• as ${s.riderName}` : ''}
              </div>

              <div class="session-actions-row">
                <button class="btn-rejoin-session" data-rejoin="${s.code}">
                  <span style="display: flex;">${ICONS.refresh}</span>
                  <span>Rejoin</span>
                </button>

                <button class="btn-delete-session" data-delete-idx="${idx}" title="Delete Saved Convoy">
                  <span style="display: flex;">${ICONS.delete}</span>
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- TripPlannerModal Fullscreen Sheet -->
      ${state.isTripPlannerOpen ? renderTripPlannerModal() : ''}
    </div>
  `;
}

function formatRelativeTime(timestamp) {
  if (!timestamp) return 'recently';
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// -------------------------------------------------------------
// TripPlannerModal Template with Start & Dest Autocomplete
// -------------------------------------------------------------
function renderTripPlannerModal() {
  return `
    <div class="trip-planner-modal-overlay">
      <div class="trip-planner-modal-content">
        <div class="modal-header-bar">
          <div class="modal-title-stack">
            <h2 class="modal-title">Plan Convoy Route</h2>
            <span class="modal-subtitle">OpenStreetMap · Photon & OSRM — Free</span>
          </div>
          <button id="btn-close-trip-modal" class="btn-close-modal">✕</button>
        </div>

        <!-- Start Location Field -->
        <div class="material-outlined-field" style="margin-top: 8px;">
          <input 
            type="text" 
            id="input-plan-start" 
            class="material-outlined-input" 
            placeholder="Search start point or choose GPS" 
            value="${state.startPlace ? state.startPlace.name : ''}"
            autocomplete="off"
          />
          <span class="field-floating-label">Start Location (🟢)</span>
          <button id="btn-modal-use-gps" class="field-trailing-btn" title="Use Current GPS">
            📍
          </button>
          <div id="modal-start-suggestions" class="photon-suggestions-dropdown" style="display: none;"></div>
        </div>

        <!-- Destination Location Field -->
        <div class="material-outlined-field">
          <input 
            type="text" 
            id="input-plan-dest" 
            class="material-outlined-input" 
            placeholder="Search destination (e.g. Cafe, Bridge, Park)" 
            value="${state.destPlace ? state.destPlace.name : ''}"
            autocomplete="off"
          />
          <span class="field-floating-label">Destination Location (🏁)</span>
          <div id="modal-dest-suggestions" class="photon-suggestions-dropdown" style="display: none;"></div>
        </div>

        <!-- Calculate Route Button -->
        <button id="btn-modal-calc-route" class="btn-convoy-outlined" style="margin-top: 6px;">
          <span style="display: flex;">${ICONS.altRoute}</span>
          <span>Calculate OSRM Route</span>
        </button>

        <!-- Route Preview Details -->
        ${state.routeResult ? `
          <div class="route-preview-badge">
            <span>🛣️ Distance: <strong>${state.routeResult.distanceKm} km</strong></span>
            <span>⏱️ Time: <strong>${state.routeResult.durationMin} min</strong></span>
          </div>
        ` : ''}

        <!-- Start Ride with Route Button -->
        <button id="btn-modal-start-route-ride" class="btn-amber-gradient" style="margin-top: 10px;">
          <span>Start Convoy with Route 🏁</span>
        </button>

        <!-- Skip & Quick Start -->
        <button id="btn-modal-skip-quick" class="btn-convoy-outlined" style="color: var(--home-text-muted);">
          <span>Skip & Quick Start (No Route)</span>
        </button>
      </div>
    </div>
  `;
}

// -------------------------------------------------------------
// LiveMapScreen: Exact Match to Android LiveMapScreen.kt
// -------------------------------------------------------------
function renderMapScreen() {
  const currentStatusCfg = STATUS_CONFIG[state.myStatus] || STATUS_CONFIG.RIDING;

  return `
    <div class="map-screen">
      <!-- Fullscreen Leaflet Map Container -->
      <div id="leaflet-map"></div>

      <!-- Top Header Container: TopRideBar + TripOverviewBanner -->
      <div class="map-top-container">
        <!-- TopRideBar -->
        <div class="top-ride-bar">
          <!-- Ride Code Pill with Tap-to-Copy -->
          <div class="ride-code-pill" id="btn-copy-ride-code-top" title="Tap to copy and share code">
            <div class="ride-code-label-stack">
              <span class="ride-code-small-label">RIDE CODE</span>
              <span class="ride-code-big-text">${state.activeRideCode}</span>
            </div>
            <span style="color: var(--electric-amber); display: flex;">${ICONS.contentCopy}</span>
          </div>

          <div class="top-bar-right-badges">
            <!-- Pack Count Circular Badge -->
            <div class="rider-count-circle-badge" id="btn-pack-count-badge" title="Pack Members">
              <span style="color: var(--electric-amber); display: flex;">${ICONS.person}</span>
              <span>${state.riders.length || 1}</span>
            </div>

            <!-- Leave Button with Red Outline -->
            <button class="leave-circle-btn" id="btn-leave-ride-circle" title="Leave Ride Session">
              <span style="display: flex;">${ICONS.exit}</span>
            </button>
          </div>
        </div>

        <!-- TripOverviewBanner (if route planned) -->
        ${state.tripInfo && state.tripInfo.destName ? `
          <div class="trip-overview-banner">
            <div class="trip-overview-left">
              <span style="color: #00B0FF; display: flex;">${ICONS.altRoute}</span>
              <div>
                <div class="trip-overview-name">${state.tripInfo.destName.split(',')[0]}</div>
                <div class="trip-overview-meta">${state.tripInfo.distanceKm} km • ${state.tripInfo.durationMin} min</div>
              </div>
            </div>
            <button class="btn-fit-route-action" id="btn-fit-route-banner">FIT ROUTE</button>
          </div>
        ` : ''}
      </div>

      <!-- Floating Controls on Right -->
      <div class="map-floating-controls">
        <button class="map-control-btn" id="btn-map-fit-route" title="Fit all riders / route">🗺️</button>
        <button class="map-control-btn" id="btn-map-wakelock" title="Keep screen awake">
          ${state.wakeLockActive ? '🔒' : '💡'}
        </button>
      </div>

      <!-- Expandable Rider Radar Panel (Exact 1:1 Jetpack Compose RiderRadarPanel) -->
      <div id="rider-radar-container">
        ${renderRiderRadarPanel()}
      </div>

      <!-- BottomControlDock (Exact Android Composables) -->
      <div class="bottom-control-dock">
        <!-- MY STATUS Pill -->
        <div class="my-status-pill" id="btn-open-status-dialog" style="border-color: ${currentStatusCfg.color};">
          <div class="status-emoji-circle" style="background: ${currentStatusCfg.color}26;">
            ${currentStatusCfg.emoji}
          </div>
          <div class="status-label-stack">
            <span class="status-pill-sublabel">MY STATUS</span>
            <span class="status-pill-current" style="color: ${currentStatusCfg.color};">${currentStatusCfg.name}</span>
          </div>
        </div>

        <!-- Pack List Button -->
        <button class="dock-circle-btn" id="btn-open-pack-list" title="Convoy Pack Members">
          ${ICONS.group}
        </button>

        <!-- Route Toggle Button (when planned route is active) -->
        ${state.tripInfo && state.tripInfo.encodedPolyline ? `
          <button class="dock-circle-btn ${state.isRouteVisible ? 'active-route-btn' : ''}" id="btn-dock-toggle-route" title="Toggle Route">
            ${ICONS.altRoute}
          </button>
        ` : ''}

        <!-- Recenter Button (Centered on user with Android MyLocation icon) -->
        <button class="dock-circle-btn dock-recenter-btn" id="btn-dock-recenter" title="Recenter on Me">
          ${ICONS.myLocation}
        </button>
      </div>

      <!-- StopStatusDialog Modal -->
      ${state.isStatusPickerOpen ? renderStatusDialog() : ''}

      <!-- RiderListBottomSheet Modal -->
      ${state.isPackListOpen ? renderPackListModal() : ''}
    </div>
  `;
}

/**
 * Expandable "RIDER RADAR" panel:
 * - Header row with pulsing radar icon, "RIDER RADAR" title, rider-count pill, and chevron
 * - Computes distance in meters/KM and relative bearing (ahead of You / behind you)
 * - Clickable rider items to smoothly focus on fellow riders on the map
 */
function renderRiderRadarPanel() {
  const fellowRiders = (state.riders || []).filter(r => r.id !== state.myRiderId);
  const count = fellowRiders.length;
  const isExpanded = state.isRadarExpanded;

  // Process each fellow rider with distance and ahead/behind calculation
  const ridersWithDist = fellowRiders.map(rider => {
    const hasMyLoc = state.myLocation && state.myLocation.lat && state.myLocation.lng;
    const hasRiderLoc = rider.lat && rider.lng;
    const statusCfg = STATUS_CONFIG[rider.status] || STATUS_CONFIG.RIDING;

    let distanceMeters = 0;
    let isAhead = null;
    let relativePositionText = `${rider.name || 'Rider'} is acquiring GPS...`;

    if (hasMyLoc && hasRiderLoc) {
      distanceMeters = calculateDistanceKm(
        state.myLocation.lat,
        state.myLocation.lng,
        rider.lat,
        rider.lng
      ) * 1000;

      isAhead = isRiderAhead(
        state.myLocation.lat,
        state.myLocation.lng,
        state.myLocation.heading,
        rider.lat,
        rider.lng
      );

      relativePositionText = getRelativePositionDescription(
        rider.name,
        distanceMeters,
        isAhead
      );
    }

    return {
      rider,
      statusCfg,
      distanceMeters,
      isAhead,
      relativePositionText
    };
  });

  // Sort: closest riders first
  ridersWithDist.sort((a, b) => a.distanceMeters - b.distanceMeters);

  return `
    <div class="rider-radar-panel" id="rider-radar-panel">
      <!-- Header Row with Pulse/Radar Icon, Label, Count Pill & Chevron -->
      <div class="radar-header-row" id="btn-toggle-radar">
        <div class="radar-header-left">
          <div class="radar-pulse-box">
            ${ICONS.radar}
          </div>
          <span class="radar-title">RIDER RADAR</span>
          <div class="radar-count-pill">
            ${count} ${count === 1 ? 'RIDER' : 'RIDERS'}
          </div>
        </div>
        <div class="radar-chevron">
          ${isExpanded ? ICONS.keyboardArrowDown : ICONS.keyboardArrowUp}
        </div>
      </div>

      <!-- Expandable Body Content -->
      <div class="radar-content ${isExpanded ? '' : 'collapsed'}" id="radar-content-body">
        ${count === 0 ? `
          <div class="radar-empty-state">
            <span>Waiting for other riders to join...</span>
          </div>
        ` : `
          <div class="radar-riders-list">
            ${ridersWithDist.map(item => `
              <div class="radar-rider-card" data-rider-id="${item.rider.id}" data-lat="${item.rider.lat || ''}" data-lng="${item.rider.lng || ''}">
                <!-- Direction Badge (Green Upward for Ahead, Orange Downward for Behind) -->
                ${item.isAhead === true ? `
                  <div class="radar-dir-badge ahead" title="Ahead of you">
                    ${ICONS.arrowUpward}
                  </div>
                ` : item.isAhead === false ? `
                  <div class="radar-dir-badge behind" title="Behind you">
                    ${ICONS.arrowDownward}
                  </div>
                ` : `
                  <div class="radar-dir-badge unknown">
                    ${item.statusCfg.emoji}
                  </div>
                `}

                <!-- Rider Position & Speed Info -->
                <div class="radar-rider-info">
                  <div class="radar-relative-text" title="${item.relativePositionText}">
                    ${item.relativePositionText}
                  </div>
                  <div class="radar-sub-text" style="color: ${item.statusCfg.color};">
                    ${item.rider.speed > 0 
                      ? `Speed: ${Math.round(item.rider.speed * 3.6)} km/h • ${item.statusCfg.name}`
                      : `${item.statusCfg.name}`}
                  </div>
                </div>

                <!-- Status Emoji on Right -->
                <div class="radar-rider-status-emoji" title="${item.statusCfg.name}">
                  ${item.statusCfg.emoji}
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    </div>
  `;
}

function updateRiderRadarUI() {
  const container = document.getElementById('rider-radar-container');
  if (!container) return;
  container.innerHTML = renderRiderRadarPanel();
  attachRadarEvents();
}

function attachRadarEvents() {
  const toggleBtn = document.getElementById('btn-toggle-radar');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      state.isRadarExpanded = !state.isRadarExpanded;
      updateRiderRadarUI();
    });
  }

  const riderCards = document.querySelectorAll('.radar-rider-card');
  riderCards.forEach(card => {
    card.addEventListener('click', (e) => {
      e.stopPropagation();
      const lat = parseFloat(card.getAttribute('data-lat'));
      const lng = parseFloat(card.getAttribute('data-lng'));
      if (lat && lng && mapInstance) {
        mapInstance.flyTo([lat, lng], 17, { animate: true, duration: 1 });
        const nameText = card.querySelector('.radar-relative-text')?.textContent || 'Rider';
        showToast(`Locating ${nameText.split(' ')[0]} 📍`);
      }
    });
  });
}

function renderStatusDialog() {
  return `
    <div class="status-modal-overlay" id="status-modal-overlay">
      <div class="status-modal-sheet">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h3 style="font-family: var(--font-brand); font-weight: 800; font-size: 18px;">Update Your Status</h3>
          <button id="btn-close-status-modal" style="background: none; border: none; color: var(--home-text-muted); font-size: 18px; cursor: pointer;">✕</button>
        </div>

        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${Object.entries(STATUS_CONFIG).map(([key, cfg]) => `
            <div class="status-option-item ${state.myStatus === key ? 'selected' : ''}" data-status="${key}">
              <span style="font-size: 22px;">${cfg.emoji}</span>
              <span style="flex: 1; color: ${cfg.color};">${cfg.name}</span>
              ${state.myStatus === key ? `<span style="color: var(--electric-amber); font-weight: 800;">✓</span>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function renderPackListModal() {
  return `
    <div class="pack-sheet-overlay" id="pack-sheet-overlay">
      <div class="pack-sheet-container">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h3 style="font-family: var(--font-brand); font-weight: 800; font-size: 18px;">
            Convoy Pack (${state.riders.length || 1})
          </h3>
          <button id="btn-close-pack-modal" style="background: none; border: none; color: var(--home-text-muted); font-size: 18px; cursor: pointer;">✕</button>
        </div>

        <div class="pack-sheet-list">
          ${state.riders.map(r => {
            const isMe = r.id === state.myRiderId;
            const statusCfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.RIDING;
            const isRecent = (Date.now() - (r.lastUpdated || 0)) < 65000;
            const distFromMe = (!isMe && state.myLocation && r.lat && r.lng) 
              ? calculateDistanceKm(state.myLocation.lat, state.myLocation.lng, r.lat, r.lng)
              : null;

            return `
              <div class="pack-rider-row">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <div style="width: 38px; height: 38px; border-radius: 50%; border: 2px solid ${statusCfg.color}; display: flex; align-items: center; justify-content: center; font-size: 18px;">
                    ${statusCfg.emoji}
                  </div>
                  <div>
                    <div style="font-weight: 700; font-size: 15px; display: flex; align-items: center; gap: 6px;">
                      <span>${r.name || 'Rider'}</span>
                      ${isMe ? `<span style="background: rgba(255, 160, 0, 0.2); color: var(--electric-amber); font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 800;">YOU</span>` : ''}
                    </div>
                    <div style="font-size: 12px; color: var(--home-text-secondary);">
                      ${isRecent ? `<span style="color: var(--home-status-green);">● Online</span>` : `<span style="color: var(--home-text-muted);">○ Offline</span>`}
                      • ${Math.round(r.speed || 0)} km/h
                      ${distFromMe !== null ? `• ${distFromMe.toFixed(1)} km away` : ''}
                    </div>
                  </div>
                </div>

                <div style="padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; background: ${statusCfg.color}22; color: ${statusCfg.color}; border: 1px solid ${statusCfg.color}66;">
                  ${statusCfg.name}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}

// -------------------------------------------------------------
// Leaflet Map: OpenStreetMap Mapnik (100% Free, ZERO API Keys)
// -------------------------------------------------------------
function initLeafletMap() {
  const container = document.getElementById('leaflet-map');
  if (!container) return;

  if (mapInstance) {
    mapInstance.remove();
    mapInstance = null;
    userMarker = null;
    riderMarkers = {};
  }

  // Initial center: user's location if known, else default to India center
  const initialCenter = state.myLocation 
    ? [state.myLocation.lat, state.myLocation.lng]
    : [22.5726, 88.3639];

  mapInstance = L.map('leaflet-map', {
    zoomControl: false,
    attributionControl: false
  }).setView(initialCenter, state.myLocation ? 16 : 14);

  // OpenStreetMap standard Mapnik tiles - identical to TileSourceFactory.MAPNIK in Android
  // ZERO API Keys required!
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(mapInstance);

  // Invalidate size immediately so map never renders blank
  requestAnimationFrame(() => {
    if (mapInstance) mapInstance.invalidateSize();
  });
  setTimeout(() => {
    if (mapInstance) mapInstance.invalidateSize();
  }, 150);
  setTimeout(() => {
    if (mapInstance) mapInstance.invalidateSize();
  }, 450);

  // Render planned route polyline if present
  if (state.tripInfo && state.tripInfo.encodedPolyline) {
    drawRoutePolyline(state.tripInfo.encodedPolyline);
  }

  // Draw markers immediately
  updateAllMarkers();

  // If user location is not yet known, trigger high-accuracy GPS fix now
  if (!state.myLocation) {
    acquireUserGpsLocation((loc) => {
      if (mapInstance) {
        mapInstance.setView([loc.lat, loc.lng], 16);
      }
    });
  }
}

/**
 * Renders all markers with a dedicated, guaranteed "YOU" marker
 */
function updateAllMarkers() {
  if (!mapInstance) return;

  // 1. DEDICATED USER LOCATION MARKER ("YOU")
  if (state.myLocation && state.myLocation.lat && state.myLocation.lng) {
    const userLatLng = [state.myLocation.lat, state.myLocation.lng];
    const statusCfg = STATUS_CONFIG[state.myStatus] || STATUS_CONFIG.RIDING;

    const userHtml = `
      <div class="biker-marker">
        <div class="biker-pulse-ring"></div>
        <div class="biker-marker-pin" style="border-color: ${statusCfg.color};">
          ${statusCfg.emoji}
        </div>
        <div class="biker-marker-label">
          YOU
        </div>
      </div>
    `;

    const userIcon = L.divIcon({
      html: userHtml,
      className: '',
      iconSize: [52, 52],
      iconAnchor: [26, 26]
    });

    if (userMarker) {
      userMarker.setLatLng(userLatLng);
      userMarker.setIcon(userIcon);
    } else {
      userMarker = L.marker(userLatLng, { icon: userIcon, zIndexOffset: 2000 }).addTo(mapInstance);
      userMarker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 13px; color: #111;">
          <strong>Your Location (YOU)</strong><br/>
          Status: <strong>${statusCfg.name}</strong> ${statusCfg.emoji}
        </div>
      `);
    }
  }

  // 2. OTHER CONVOY RIDERS MARKERS
  const activeOtherIds = new Set(state.riders.filter(r => r.id !== state.myRiderId).map(r => r.id));
  for (const id in riderMarkers) {
    if (!activeOtherIds.has(id)) {
      riderMarkers[id].remove();
      delete riderMarkers[id];
    }
  }

  state.riders.forEach(rider => {
    // Skip self (handled by dedicated userMarker)
    if (rider.id === state.myRiderId) return;
    if (!rider.lat || !rider.lng) return;

    const statusCfg = STATUS_CONFIG[rider.status] || STATUS_CONFIG.RIDING;
    const latlng = [rider.lat, rider.lng];

    const iconHtml = `
      <div class="biker-marker">
        <div class="biker-marker-pin" style="border-color: ${statusCfg.color};">
          ${statusCfg.emoji}
        </div>
        <div class="biker-marker-label">
          ${rider.name || 'Rider'}
        </div>
      </div>
    `;

    const customIcon = L.divIcon({
      html: iconHtml,
      className: '',
      iconSize: [48, 48],
      iconAnchor: [24, 24]
    });

    if (riderMarkers[rider.id]) {
      riderMarkers[rider.id].setLatLng(latlng);
      riderMarkers[rider.id].setIcon(customIcon);
    } else {
      riderMarkers[rider.id] = L.marker(latlng, { icon: customIcon }).addTo(mapInstance);
      riderMarkers[rider.id].bindPopup(`
        <div style="font-family: sans-serif; font-size: 13px; color: #111;">
          <strong>${rider.name}</strong><br/>
          Status: <strong>${statusCfg.name}</strong> ${statusCfg.emoji}<br/>
          Speed: ${Math.round(rider.speed || 0)} km/h
        </div>
      `);
    }
  });
}

function drawRoutePolyline(encodedPolyline) {
  if (!mapInstance || !encodedPolyline) return;
  if (routePolyline) routePolyline.remove();

  const points = decodePolyline(encodedPolyline);
  if (points.length === 0) return;

  routePolyline = L.polyline(points, {
    color: '#00B0FF',
    weight: 6,
    opacity: 0.9,
    lineJoin: 'round'
  }).addTo(mapInstance);

  if (startMarker) startMarker.remove();
  if (destMarker) destMarker.remove();

  startMarker = L.circleMarker(points[0], { radius: 7, fillColor: '#00E676', color: '#FFF', weight: 2, fillOpacity: 1 }).addTo(mapInstance);
  destMarker = L.circleMarker(points[points.length - 1], { radius: 8, fillColor: '#FF1744', color: '#FFF', weight: 2, fillOpacity: 1 }).addTo(mapInstance);

  mapInstance.fitBounds(routePolyline.getBounds(), { padding: [50, 50] });
}

// -------------------------------------------------------------
// Live GPS Tracking & Firebase Sync
// -------------------------------------------------------------
function startRideTracking(rideCode, riderId) {
  requestScreenWakeLock((active) => {
    state.wakeLockActive = active;
  });
  startAudioKeepAlive();

  // 1. Immediately request high-accuracy location right now
  acquireUserGpsLocation((loc) => {
    updateRiderLocation(rideCode, riderId, { lat: loc.lat, lng: loc.lng, speed: loc.speed || 0 });
    if (mapInstance) {
      mapInstance.setView([loc.lat, loc.lng], 16);
      updateAllMarkers();
    }
  });

  // 2. Continuous watch with high accuracy
  if ('geolocation' in navigator) {
    locationWatchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, speed, heading } = pos.coords;
        state.myLocation = { 
          lat: latitude, 
          lng: longitude, 
          speed: speed || 0,
          heading: (heading !== null && !isNaN(heading)) ? heading : null
        };
        updateRiderLocation(rideCode, riderId, { lat: latitude, lng: longitude, speed: speed || 0 });

        if (mapInstance) {
          updateAllMarkers();
        }
        updateRiderRadarUI();
      },
      (err) => {
        console.warn('GPS continuous watch notice:', err);
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
    );
  } else {
    showToast('Geolocation is not supported by your browser.');
  }

  // 3. Subscribe to all riders in this convoy
  if (unsubscribeRiders) unsubscribeRiders();
  unsubscribeRiders = subscribeToRiders(rideCode, (ridersList) => {
    state.riders = ridersList;
    updateAllMarkers();
    updateRiderRadarUI();
    const badge = document.querySelector('#btn-pack-count-badge span:last-child');
    if (badge) badge.textContent = ridersList.length || 1;
  });

  // 4. Subscribe to trip info
  if (unsubscribeTrip) unsubscribeTrip();
  unsubscribeTrip = subscribeToTripInfo(rideCode, (trip) => {
    if (trip && trip.encodedPolyline) {
      state.tripInfo = trip;
      drawRoutePolyline(trip.encodedPolyline);
    }
  });
}

function stopRideTracking() {
  if (locationWatchId !== null) {
    navigator.geolocation.clearWatch(locationWatchId);
    locationWatchId = null;
  }
  if (unsubscribeRiders) {
    unsubscribeRiders();
    unsubscribeRiders = null;
  }
  if (unsubscribeTrip) {
    unsubscribeTrip();
    unsubscribeTrip = null;
  }
  releaseScreenWakeLock();
  stopAudioKeepAlive();
}

// -------------------------------------------------------------
// HomeScreen Events
// -------------------------------------------------------------
function attachHomeEvents() {
  const nameInput = document.getElementById('input-rider-callsign');
  if (nameInput) {
    nameInput.addEventListener('input', (e) => {
      state.riderName = e.target.value.trim();
      localStorage.setItem('bhaiji_rider_name', state.riderName);
      const readyBadge = document.querySelector('.ready-badge');
      const topRow = document.querySelector('.card-top-row');
      if (state.riderName.length > 0) {
        if (!readyBadge && topRow) {
          const badge = document.createElement('div');
          badge.className = 'ready-badge';
          badge.innerHTML = `<span class="ready-dot"></span><span>READY</span>`;
          topRow.appendChild(badge);
        }
      } else if (readyBadge) {
        readyBadge.remove();
      }
    });
  }

  const planBtn = document.getElementById('btn-plan-route-create');
  if (planBtn) {
    planBtn.addEventListener('click', () => {
      if (!state.riderName) {
        showToast('Please enter your rider callsign first.');
        if (nameInput) nameInput.focus();
        return;
      }
      state.isTripPlannerOpen = true;
      renderApp();
    });
  }

  const quickStartBtn = document.getElementById('btn-quick-start-no-route');
  if (quickStartBtn) {
    quickStartBtn.addEventListener('click', async () => {
      await handleCreateConvoy(null);
    });
  }

  const codeInput = document.getElementById('input-convoy-code');
  const joinBtn = document.getElementById('btn-join-convoy-submit');
  if (codeInput) {
    codeInput.addEventListener('input', (e) => {
      state.joinCodeInput = e.target.value.toUpperCase();
      if (joinBtn) {
        if (state.joinCodeInput.trim().length > 0) joinBtn.classList.add('active');
        else joinBtn.classList.remove('active');
      }
    });
  }

  const pasteBtn = document.getElementById('btn-paste-code');
  if (pasteBtn && codeInput) {
    pasteBtn.addEventListener('click', async () => {
      try {
        if (navigator.clipboard) {
          const text = await navigator.clipboard.readText();
          const clean = text.trim().toUpperCase();
          if (clean) {
            state.joinCodeInput = clean;
            codeInput.value = clean;
            if (joinBtn) joinBtn.classList.add('active');
            showToast(`Pasted: ${clean}`);
          }
        }
      } catch (err) {
        showToast('Clipboard access denied.');
      }
    });
  }

  if (joinBtn) {
    joinBtn.addEventListener('click', async () => {
      const code = (codeInput ? codeInput.value : state.joinCodeInput).trim().toUpperCase();
      if (!code) {
        showToast('Please enter a convoy code.');
        if (codeInput) codeInput.focus();
        return;
      }
      await handleJoinConvoy(code);
    });
  }

  const refreshBtn = document.getElementById('btn-refresh-history');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      showToast('Refreshing convoy statuses...');
      renderApp();
    });
  }

  document.querySelectorAll('.btn-copy-code').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const code = btn.getAttribute('data-copy');
      if (code && navigator.clipboard) {
        navigator.clipboard.writeText(code);
        showToast(`Copied ${code} to clipboard!`);
      }
    });
  });

  document.querySelectorAll('.btn-rejoin-session').forEach(btn => {
    btn.addEventListener('click', async () => {
      const code = btn.getAttribute('data-rejoin');
      if (code) await handleJoinConvoy(code);
    });
  });

  document.querySelectorAll('.btn-delete-session').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.getAttribute('data-delete-idx'));
      if (!isNaN(idx)) {
        state.sessions.splice(idx, 1);
        localStorage.setItem('bhaiji_recent_convoys', JSON.stringify(state.sessions));
        renderApp();
        showToast('Convoy removed from history.');
      }
    });
  });

  if (state.isTripPlannerOpen) {
    attachTripModalEvents();
  }
}

// -------------------------------------------------------------
// TripPlannerModal Events: Start & Destination Autocomplete
// -------------------------------------------------------------
function attachTripModalEvents() {
  const closeBtn = document.getElementById('btn-close-trip-modal');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      state.isTripPlannerOpen = false;
      renderApp();
    });
  }

  // Start Location Input & Suggestions
  const startInput = document.getElementById('input-plan-start');
  const startDrop = document.getElementById('modal-start-suggestions');
  if (startInput && startDrop) {
    let startTimer;

    const showStartOptions = (places = []) => {
      let html = `
        <div class="photon-suggestion-item quick-gps-pick-item" id="btn-quick-pick-gps">
          <div>📍 Use My Current Location (GPS)</div>
        </div>
      `;
      html += places.map((p, idx) => `
        <div class="photon-suggestion-item" data-start-idx="${idx}">
          <div style="font-weight: 700; font-size: 14px; color: var(--home-text-primary);">${p.name}</div>
          <div style="font-size: 12px; color: var(--home-text-secondary);">${p.locality}</div>
        </div>
      `).join('');

      startDrop.innerHTML = html;
      startDrop.style.display = 'block';

      const pickGpsBtn = document.getElementById('btn-quick-pick-gps');
      if (pickGpsBtn) {
        pickGpsBtn.addEventListener('click', () => {
          handleAcquireGpsStart();
          startDrop.style.display = 'none';
        });
      }

      startDrop.querySelectorAll('[data-start-idx]').forEach(el => {
        el.addEventListener('click', () => {
          const idx = parseInt(el.getAttribute('data-start-idx'));
          const selected = places[idx];
          state.startPlace = selected;
          startInput.value = selected.name;
          startDrop.style.display = 'none';
        });
      });
    };

    startInput.addEventListener('focus', () => {
      if (startInput.value.length < 2) {
        showStartOptions([]);
      }
    });

    startInput.addEventListener('input', (e) => {
      clearTimeout(startTimer);
      const q = e.target.value;
      if (q.length < 2) {
        showStartOptions([]);
        return;
      }
      startTimer = setTimeout(async () => {
        const biasLat = state.myLocation ? state.myLocation.lat : null;
        const biasLng = state.myLocation ? state.myLocation.lng : null;
        const places = await searchPlaces(q, biasLat, biasLng);
        showStartOptions(places);
      }, 250);
    });

    document.addEventListener('click', (e) => {
      if (!startInput.contains(e.target) && !startDrop.contains(e.target)) {
        startDrop.style.display = 'none';
      }
    });
  }

  // Use GPS button on trailing edge
  const gpsBtn = document.getElementById('btn-modal-use-gps');
  if (gpsBtn) {
    gpsBtn.addEventListener('click', handleAcquireGpsStart);
  }

  function handleAcquireGpsStart() {
    showToast('Acquiring current GPS location...');
    acquireUserGpsLocation(async (loc) => {
      const place = await reverseGeocode(loc.lat, loc.lng);
      state.startPlace = place || { name: 'My Current Location', lat: loc.lat, lng: loc.lng };
      const input = document.getElementById('input-plan-start');
      if (input) input.value = state.startPlace.name;
      showToast('Start location set to current GPS.');
    });
  }

  // Destination Location Input & Suggestions
  const destInput = document.getElementById('input-plan-dest');
  const destDrop = document.getElementById('modal-dest-suggestions');
  if (destInput && destDrop) {
    let destTimer;
    destInput.addEventListener('input', (e) => {
      clearTimeout(destTimer);
      const q = e.target.value;
      if (q.length < 2) {
        destDrop.style.display = 'none';
        return;
      }
      destTimer = setTimeout(async () => {
        const biasLat = state.myLocation ? state.myLocation.lat : null;
        const biasLng = state.myLocation ? state.myLocation.lng : null;
        const places = await searchPlaces(q, biasLat, biasLng);
        if (places.length > 0) {
          destDrop.innerHTML = places.map((p, idx) => `
            <div class="photon-suggestion-item" data-dest-idx="${idx}">
              <div style="font-weight: 700; font-size: 14px; color: var(--home-text-primary);">${p.name}</div>
              <div style="font-size: 12px; color: var(--home-text-secondary);">${p.locality}</div>
            </div>
          `).join('');
          destDrop.style.display = 'block';

          destDrop.querySelectorAll('[data-dest-idx]').forEach(el => {
            el.addEventListener('click', () => {
              const selected = places[parseInt(el.getAttribute('data-dest-idx'))];
              state.destPlace = selected;
              destInput.value = selected.name;
              destDrop.style.display = 'none';
            });
          });
        } else {
          destDrop.style.display = 'none';
        }
      }, 250);
    });

    document.addEventListener('click', (e) => {
      if (!destInput.contains(e.target) && !destDrop.contains(e.target)) {
        destDrop.style.display = 'none';
      }
    });
  }

  // Calculate Route
  const calcBtn = document.getElementById('btn-modal-calc-route');
  if (calcBtn) {
    calcBtn.addEventListener('click', async () => {
      if (!state.startPlace || !state.destPlace) {
        showToast('Please select both start and destination points.');
        return;
      }
      try {
        calcBtn.textContent = 'Calculating route... ⏳';
        const res = await getRoute(
          state.startPlace.lat, state.startPlace.lng,
          state.destPlace.lat, state.destPlace.lng
        );
        state.routeResult = res;
        renderApp();
        showToast(`Route: ${res.distanceKm} km (${res.durationMin} min)`);
      } catch (err) {
        showToast(err.message || 'Route calculation failed.');
        calcBtn.textContent = 'Calculate OSRM Route';
      }
    });
  }

  // Start with Route
  const startRouteBtn = document.getElementById('btn-modal-start-route-ride');
  if (startRouteBtn) {
    startRouteBtn.addEventListener('click', async () => {
      if (!state.routeResult) {
        showToast('Please calculate an OSRM route first.');
        return;
      }
      const tripInfo = {
        startName: state.startPlace.name,
        destName: state.destPlace.name,
        startLat: state.startPlace.lat,
        startLng: state.startPlace.lng,
        destLat: state.destPlace.lat,
        destLng: state.destPlace.lng,
        encodedPolyline: state.routeResult.encodedPolyline,
        distanceKm: parseFloat(state.routeResult.distanceKm),
        durationMin: state.routeResult.durationMin,
        isTripPlanned: true
      };
      state.isTripPlannerOpen = false;
      await handleCreateConvoy(tripInfo);
    });
  }

  // Skip & Quick Start
  const skipBtn = document.getElementById('btn-modal-skip-quick');
  if (skipBtn) {
    skipBtn.addEventListener('click', async () => {
      state.isTripPlannerOpen = false;
      await handleCreateConvoy(null);
    });
  }
}

// -------------------------------------------------------------
// LiveMapScreen Events
// -------------------------------------------------------------
function attachMapEvents() {
  const copyBtn = document.getElementById('btn-copy-ride-code-top');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const code = state.activeRideCode;
      const shareUrl = `${window.location.origin}?ride=${code}`;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(shareUrl);
        showToast(`Copied invite link: ${shareUrl}`);
      } else {
        showToast(`Ride Code: ${code}`);
      }
    });
  }

  const leaveBtn = document.getElementById('btn-leave-ride-circle');
  if (leaveBtn) {
    leaveBtn.addEventListener('click', () => {
      if (window.confirm('Leave this convoy session?')) {
        handleLeaveConvoy();
      }
    });
  }

  const fitRouteBannerBtn = document.getElementById('btn-fit-route-banner');
  if (fitRouteBannerBtn) {
    fitRouteBannerBtn.addEventListener('click', () => {
      if (routePolyline && mapInstance) {
        mapInstance.fitBounds(routePolyline.getBounds(), { padding: [50, 50] });
      }
    });
  }

  // Recenter GPS Handler (Guaranteed live centering & marker update)
  const handleRecenter = () => {
    if (!mapInstance) return;

    // 1. If location is already known, pan/fly immediately with zero delay
    if (state.myLocation && state.myLocation.lat && state.myLocation.lng) {
      mapInstance.invalidateSize();
      mapInstance.flyTo([state.myLocation.lat, state.myLocation.lng], 17, {
        animate: true,
        duration: 0.8
      });
      updateAllMarkers();
      showToast('Centered on your location 📍');

      // Refresh fix in background without blocking map navigation
      acquireUserGpsLocation((freshLoc) => {
        if (mapInstance) {
          updateAllMarkers();
        }
      });
      return;
    }

    // 2. If location is not yet known, show progress toast and acquire fix
    showToast('Acquiring your GPS position... 📡');
    acquireUserGpsLocation(
      (loc) => {
        if (mapInstance) {
          mapInstance.invalidateSize();
          mapInstance.flyTo([loc.lat, loc.lng], 17, {
            animate: true,
            duration: 0.8
          });
          updateAllMarkers();
          showToast('Centered on your location 📍');
        }
      },
      (err) => {
        if (err.code === 1) {
          showToast('⚠️ Location access denied. Please allow GPS permission in your browser.');
        } else if (err.code === 3) {
          showToast('⚠️ GPS fix timed out. Make sure Location Services are turned on.');
        } else {
          showToast(`⚠️ Location error: ${err.message || 'Could not acquire GPS position'}`);
        }
      }
    );
  };

  const dockRecenterBtn = document.getElementById('btn-dock-recenter');
  if (dockRecenterBtn) dockRecenterBtn.addEventListener('click', handleRecenter);

  const dockRouteToggleBtn = document.getElementById('btn-dock-toggle-route');
  if (dockRouteToggleBtn) {
    dockRouteToggleBtn.addEventListener('click', () => {
      state.isRouteVisible = !state.isRouteVisible;
      if (routePolyline && mapInstance) {
        if (state.isRouteVisible) {
          mapInstance.addLayer(routePolyline);
          showToast('Route displayed');
        } else {
          mapInstance.removeLayer(routePolyline);
          showToast('Route hidden');
        }
      }
      renderApp();
    });
  }

  // Fit all riders / route
  const fitAllBtn = document.getElementById('btn-map-fit-route');
  if (fitAllBtn) {
    fitAllBtn.addEventListener('click', () => {
      if (!mapInstance) return;
      const bounds = L.latLngBounds([]);
      if (state.myLocation) bounds.extend([state.myLocation.lat, state.myLocation.lng]);
      state.riders.forEach(r => {
        if (r.lat && r.lng) bounds.extend([r.lat, r.lng]);
      });
      if (routePolyline) bounds.extend(routePolyline.getBounds());
      if (bounds.isValid()) {
        mapInstance.fitBounds(bounds, { padding: [50, 50] });
        showToast('Fitted all pack members.');
      } else {
        handleRecenter();
      }
    });
  }

  // WakeLock toggle
  const wakeBtn = document.getElementById('btn-map-wakelock');
  if (wakeBtn) {
    wakeBtn.addEventListener('click', async () => {
      if (state.wakeLockActive) {
        await releaseScreenWakeLock();
        state.wakeLockActive = false;
        wakeBtn.innerHTML = '💡';
        showToast('Screen wake lock turned off.');
      } else {
        const ok = await requestScreenWakeLock();
        state.wakeLockActive = ok;
        if (ok) {
          wakeBtn.innerHTML = '🔒';
          showToast('Screen wake lock active: display will stay on.');
        } else {
          showToast('Wake lock not supported on this browser.');
        }
      }
    });
  }

  // Status dialog toggle
  const statusPill = document.getElementById('btn-open-status-dialog');
  if (statusPill) {
    statusPill.addEventListener('click', () => {
      state.isStatusPickerOpen = true;
      renderApp();
    });
  }

  // Status dialog selection (includes OTHER status)
  document.querySelectorAll('.status-option-item').forEach(item => {
    item.addEventListener('click', async () => {
      const newStatus = item.getAttribute('data-status');
      if (newStatus) {
        state.myStatus = newStatus;
        state.isStatusPickerOpen = false;
        await updateRiderStatus(state.activeRideCode, state.myRiderId, newStatus);
        const cfg = STATUS_CONFIG[newStatus];
        showToast(`Status updated: ${cfg.name} ${cfg.emoji}`);
        renderApp();
      }
    });
  });

  const closeStatusModalBtn = document.getElementById('btn-close-status-modal');
  if (closeStatusModalBtn) {
    closeStatusModalBtn.addEventListener('click', () => {
      state.isStatusPickerOpen = false;
      renderApp();
    });
  }

  // Pack list modal toggle
  const packListBtn = document.getElementById('btn-open-pack-list');
  const packCountBadge = document.getElementById('btn-pack-count-badge');
  const openPack = () => {
    state.isPackListOpen = true;
    renderApp();
  };
  if (packListBtn) packListBtn.addEventListener('click', openPack);
  if (packCountBadge) packCountBadge.addEventListener('click', openPack);

  const closePackModalBtn = document.getElementById('btn-close-pack-modal');
  if (closePackModalBtn) {
    closePackModalBtn.addEventListener('click', () => {
      state.isPackListOpen = false;
      renderApp();
    });
  }

  // Rider Radar panel interactions
  attachRadarEvents();
}

// -------------------------------------------------------------
// Convoy Ride Logic
// -------------------------------------------------------------
async function handleCreateConvoy(tripInfo = null) {
  if (!state.riderName) {
    showToast('Please enter your callsign first.');
    return;
  }
  try {
    showToast('Starting convoy session... 🚀');
    const { rideCode, riderId } = await createRide(state.riderName, tripInfo);
    state.activeRideCode = rideCode;
    state.myRiderId = riderId;
    state.myStatus = 'RIDING';
    state.activeView = 'MAP';
    state.tripInfo = tripInfo;

    localStorage.setItem('bhaiji_active_ride_code', rideCode);
    addSavedSession(rideCode, state.riderName, true);

    renderApp();
    startRideTracking(rideCode, riderId);
    showToast(`Convoy created! Code: ${rideCode}`);
  } catch (err) {
    showToast(`Failed to create convoy: ${err.message}`);
  }
}

async function handleJoinConvoy(code) {
  if (!state.riderName) {
    showToast('Please enter your callsign first.');
    return;
  }
  try {
    showToast(`Connecting to ${code}... 🏍️`);
    const { riderId } = await joinRide(code, state.riderName);
    state.activeRideCode = code;
    state.myRiderId = riderId;
    state.myStatus = 'RIDING';
    state.activeView = 'MAP';

    localStorage.setItem('bhaiji_active_ride_code', code);
    addSavedSession(code, state.riderName, true);

    renderApp();
    startRideTracking(code, riderId);
    showToast(`Joined convoy ${code}!`);
  } catch (err) {
    showToast(err.message || 'Could not join convoy.');
  }
}

function handleLeaveConvoy() {
  const code = state.activeRideCode;
  const id = state.myRiderId;
  stopRideTracking();
  leaveRide(code, id);

  state.activeRideCode = '';
  state.activeView = 'HOME';
  localStorage.removeItem('bhaiji_active_ride_code');

  const item = state.sessions.find(s => s.code === code);
  if (item) item.isActive = false;
  localStorage.setItem('bhaiji_recent_convoys', JSON.stringify(state.sessions));

  renderApp();
  showToast('You left the convoy.');
}

function addSavedSession(code, riderName, isActive = true) {
  const list = state.sessions.filter(s => s.code !== code);
  list.unshift({
    code,
    riderName,
    timestamp: Date.now(),
    isActive,
    isHost: true
  });
  state.sessions = list.slice(0, 5);
  localStorage.setItem('bhaiji_recent_convoys', JSON.stringify(state.sessions));
}
