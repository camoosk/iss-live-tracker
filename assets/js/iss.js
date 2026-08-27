import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const EARTH_RADIUS = 1;
const ISS_API = 'https://api.wheretheiss.at/v1/satellites/25544';

let scene, camera, renderer, controls, earth, issMarker, userMarker, orbitLine;
let issData = null;
let userLocation = null;

const $ = (id) => document.getElementById(id);

function latLonToVector3(lat, lon, radius = EARTH_RADIUS) {
  // Earth texture convention: longitude 0° is at the texture center,
  // latitude +90° is north. Three.js sphere UVs require this mapping.
  const phi = THREE.MathUtils.degToRad(90 - lat);
  const theta = THREE.MathUtils.degToRad(lon + 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function createScene() {
  const container = $('earth-container') || $('globe');
  if (!container) return;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(38, container.clientWidth / container.clientHeight, 0.1, 100);
  camera.position.set(0, 0.25, 3.05);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.innerHTML = '';
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.minDistance = 1.25;
  controls.maxDistance = 5;
  controls.enablePan = false;

  scene.add(new THREE.AmbientLight(0xffffff, 0.18));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(5, 2, 5);
  scene.add(sun);

  const loader = new THREE.TextureLoader();
  const texture = loader.load(
    new URL('../textures/earth.jpg', import.meta.url).href,
    (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      earth.material.map = tex;
      earth.material.needsUpdate = true;
    }
  );
  texture.colorSpace = THREE.SRGBColorSpace;

  earth = new THREE.Mesh(
    new THREE.SphereGeometry(EARTH_RADIUS, 96, 64),
    new THREE.MeshPhongMaterial({ map: texture, shininess: 4 })
  );
  scene.add(earth);

  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(1.025, 64, 48),
    new THREE.MeshBasicMaterial({ color: 0x5aa9ff, transparent: true, opacity: 0.07, side: THREE.BackSide })
  );
  scene.add(atmosphere);

  issMarker = new THREE.Mesh(
    new THREE.SphereGeometry(0.035, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xff405f })
  );
  scene.add(issMarker);

  userMarker = new THREE.Mesh(
    new THREE.SphereGeometry(0.035, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0x48e5d2 })
  );
  userMarker.visible = false;
  scene.add(userMarker);

  window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  });

  animate();
}

function animate() {
  requestAnimationFrame(animate);
  controls?.update();
  renderer?.render(scene, camera);
}

function updateISS(data) {
  issData = data;
  const lat = Number(data.latitude);
  const lon = Number(data.longitude);
  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    issMarker.position.copy(latLonToVector3(lat, lon, 1.035));
  }

  const latEl = $('iss-latitude');
  const lonEl = $('iss-longitude');
  const altEl = $('iss-altitude');
  const speedEl = $('iss-speed');
  const visEl = $('iss-visibility');
  const footEl = $('iss-footprint');
  const updateEl = $('last-update');
  if (latEl) latEl.textContent = `${lat.toFixed(3)}°`;
  if (lonEl) lonEl.textContent = `${lon.toFixed(3)}°`;
  if (altEl) altEl.textContent = `${Number(data.altitude).toFixed(1)} km`;
  if (speedEl) speedEl.textContent = `${Number(data.velocity).toLocaleString(undefined, { maximumFractionDigits: 0 })} km/h`;
  if (visEl) visEl.textContent = data.visibility || '--';
  if (footEl) footEl.textContent = `${Number(data.footprint).toLocaleString(undefined, { maximumFractionDigits: 0 })} km`;
  if (updateEl) updateEl.textContent = new Date().toLocaleTimeString();
  updateDistance();
}

function updateUserMarker(lat, lon) {
  userLocation = { lat, lon };
  userMarker.visible = true;
  userMarker.position.copy(latLonToVector3(lat, lon, 1.035));
  updateDistance();
}

function updateDistance() {
  if (!userLocation || !issData) return;
  const a = latLonToVector3(userLocation.lat, userLocation.lon, 1);
  const b = latLonToVector3(Number(issData.latitude), Number(issData.longitude), 1);
  const angle = a.angleTo(b);
  const surface = angle * 6371;
  const el = $('distance-to-iss');
  if (el) el.textContent = `${surface.toLocaleString(undefined, { maximumFractionDigits: 0 })} km`;
}

async function fetchISS() {
  try {
    const response = await fetch(ISS_API, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    updateISS(await response.json());
  } catch (error) {
    console.error('ISS telemetry error:', error);
  }
}

function setupLocation() {
  const useButton = $('use-location');
  const setButton = $('set-location');
  const latInput = $('latitude');
  const lonInput = $('longitude');

  useButton?.addEventListener('click', () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        latInput.value = lat.toFixed(6);
        lonInput.value = lon.toFixed(6);
        updateUserMarker(lat, lon);
        localStorage.setItem('iss-user-location', JSON.stringify({ lat, lon }));
      },
      (error) => console.warn('Geolocation error:', error),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  });

  setButton?.addEventListener('click', () => {
    const lat = Number(latInput.value);
    const lon = Number(lonInput.value);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180) return;
    updateUserMarker(lat, lon);
    localStorage.setItem('iss-user-location', JSON.stringify({ lat, lon }));
  });

  try {
    const saved = JSON.parse(localStorage.getItem('iss-user-location'));
    if (saved && Number.isFinite(saved.lat) && Number.isFinite(saved.lon)) {
      latInput.value = saved.lat.toFixed(6);
      lonInput.value = saved.lon.toFixed(6);
      updateUserMarker(saved.lat, saved.lon);
    }
  } catch {}
}

createScene();
setupLocation();
fetchISS();
setInterval(fetchISS, 5000);
