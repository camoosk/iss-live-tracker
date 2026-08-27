import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/controls/OrbitControls.js';

const API_URL = 'https://api.wheretheiss.at/v1/satellites/25544';
const ORBIT_URL = 'https://api.wheretheiss.at/v1/satellites/25544/positions';
const RADIUS = 3.2;

const globeEl = document.getElementById('globe');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 1000);
camera.position.set(0, 1.1, 10.4);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x01040b, 1);
globeEl.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 6.2;
controls.maxDistance = 18;
controls.target.set(0, 0, 0);

scene.add(new THREE.AmbientLight(0x7890b8, 1.8));
const sun = new THREE.DirectionalLight(0xffffff, 3.2);
sun.position.set(5, 3, 6);
scene.add(sun);

const earthGroup = new THREE.Group();
scene.add(earthGroup);

const earthTexture = new THREE.TextureLoader().load(
  'https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg',
  undefined,
  undefined,
  () => { earth.material.map = null; earth.material.color.set(0x1d5fa7); earth.material.needsUpdate = true; }
);
const earth = new THREE.Mesh(
  new THREE.SphereGeometry(RADIUS, 64, 64),
  new THREE.MeshPhongMaterial({ map: earthTexture, color: 0x9dc9ff, shininess: 12 })
);
earthGroup.add(earth);

const atmosphere = new THREE.Mesh(
  new THREE.SphereGeometry(RADIUS * 1.035, 48, 48),
  new THREE.MeshBasicMaterial({ color: 0x4da3ff, transparent: true, opacity: 0.09, side: THREE.BackSide })
);
earthGroup.add(atmosphere);

const grid = new THREE.Mesh(
  new THREE.SphereGeometry(RADIUS * 1.004, 24, 16),
  new THREE.MeshBasicMaterial({ color: 0x6ea8ff, wireframe: true, transparent: true, opacity: 0.07 })
);
earthGroup.add(grid);

function makeStars() {
  const geometry = new THREE.BufferGeometry();
  const positions = [];
  for (let i = 0; i < 1800; i += 1) {
    const r = 45 + Math.random() * 35;
    const u = Math.random() * 2 - 1;
    const a = Math.random() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    positions.push(r * s * Math.cos(a), r * u, r * s * Math.sin(a));
  }
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  scene.add(new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0xbfd8ff, size: 0.055, sizeAttenuation: true }))); 
}
makeStars();

const iss = new THREE.Group();
const core = new THREE.Mesh(new THREE.SphereGeometry(0.105, 20, 20), new THREE.MeshBasicMaterial({ color: 0xff4d6d }));
const glow = new THREE.Mesh(new THREE.SphereGeometry(0.22, 20, 20), new THREE.MeshBasicMaterial({ color: 0xff4d6d, transparent: true, opacity: 0.18 }));
iss.add(glow, core);
const panelMat = new THREE.MeshBasicMaterial({ color: 0xb7d7ff });
for (const x of [-0.32, 0.32]) {
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.11), panelMat);
  panel.position.x = x;
  panel.rotation.y = Math.PI / 2;
  iss.add(panel);
}
earthGroup.add(iss);

const userMarker = new THREE.Group();
const userDot = new THREE.Mesh(new THREE.SphereGeometry(0.09, 18, 18), new THREE.MeshBasicMaterial({ color: 0x5eead4 }));
const userRing = new THREE.Mesh(new THREE.RingGeometry(0.13, 0.16, 32), new THREE.MeshBasicMaterial({ color: 0x5eead4, transparent: true, opacity: 0.7, side: THREE.DoubleSide }));
userRing.rotation.x = Math.PI / 2;
userMarker.add(userDot, userRing);
userMarker.visible = false;
earthGroup.add(userMarker);

let orbitLine = null;
let latest = null;

function latLonToVector(latitude, longitude, radius = RADIUS) {
  const lat = THREE.MathUtils.degToRad(latitude);
  const lon = THREE.MathUtils.degToRad(longitude);
  const cosLat = Math.cos(lat);
  return new THREE.Vector3(
    -radius * cosLat * Math.cos(lon),
    radius * Math.sin(lat),
    radius * cosLat * Math.sin(lon)
  );
}

function setMarker(marker, latitude, longitude, radius) {
  marker.position.copy(latLonToVector(latitude, longitude, radius));
}

function renderOrbit(points) {
  if (orbitLine) {
    earthGroup.remove(orbitLine);
    orbitLine.geometry.dispose();
    orbitLine.material.dispose();
  }
  if (!points?.length) return;
  const curvePoints = points.map(p => latLonToVector(p.latitude, p.longitude, RADIUS * 1.075));
  const geometry = new THREE.BufferGeometry().setFromPoints(curvePoints);
  orbitLine = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0xff6685, transparent: true, opacity: 0.68 }));
  earthGroup.add(orbitLine);
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function updateOrbit() {
  const now = Math.floor(Date.now() / 1000);
  const timestamps = Array.from({ length: 10 }, (_, i) => now + (i - 4) * 540).join(',');
  try {
    const data = await fetchJson(`${ORBIT_URL}?timestamps=${timestamps}&units=kilometers`);
    renderOrbit(data);
  } catch (error) {
    console.warn('ISS orbit path unavailable:', error);
  }
}

async function updateISS() {
  const data = await fetchJson(`${API_URL}?units=kilometers`);
  latest = data;
  setMarker(iss, Number(data.latitude), Number(data.longitude), RADIUS * 1.085);
  window.dispatchEvent(new CustomEvent('iss:update', { detail: data }));
}

function resize() {
  const width = Math.max(globeEl.clientWidth, 1);
  const height = Math.max(globeEl.clientHeight, 1);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}

window.ISS_3D = {
  setUserLocation(location) {
    setMarker(userMarker, Number(location.latitude), Number(location.longitude), RADIUS * 1.03);
    userMarker.visible = true;
  },
  get latest() { return latest; }
};

window.addEventListener('resize', resize);
resize();
updateISS().catch(error => window.dispatchEvent(new CustomEvent('iss:error', { detail: error })));
updateOrbit();
setInterval(() => updateISS().catch(error => window.dispatchEvent(new CustomEvent('iss:error', { detail: error }))), 5000);
setInterval(updateOrbit, 60000);

function animate() {
  requestAnimationFrame(animate);
  earthGroup.rotation.y += 0.00022;
  controls.update();
  renderer.render(scene, camera);
}
animate();
