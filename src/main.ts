import "./style.css";
import * as THREE from "three";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("App root element #app not found");
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
);

const params = new URLSearchParams(window.location.search);
const nParam = params.get("n") ?? 1000;
const n = Number(nParam);
if (Number.isNaN(n)) {
  throw new Error(`Parameter "${nParam}" is not a number`);
}
if (n < 1) {
  throw new Error(
    `Parameter "${nParam}" is less than 1 or is a null accidentally converted to 0`,
  );
}
if (!Number.isInteger(n)) {
  throw new Error(`Parameter "${nParam}" is not a whole number`);
}

console.log(nParam);

const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshStandardMaterial({
  color: 0x00aaff,
  roughness: 0.5,
  metalness: 0.2,
});

function randomRange(max: number) {
  return Math.random() * max * 2 - max;
}

const spread = Math.cbrt(n) * 2;
const meshArray: Array<THREE.Mesh> = new Array();

for (let i = 0; i < n; i++) {
  const cube = new THREE.Mesh(geometry, material);
  cube.position.x = randomRange(spread);
  cube.position.y = randomRange(spread);
  cube.position.z = randomRange(spread);
  cube.rotation.x = randomRange(spread);
  cube.rotation.y = randomRange(spread);
  cube.rotation.z = randomRange(spread);
  meshArray.push(cube);
  scene.add(cube);
}

camera.position.z = spread * 3.5;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
app.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(3, 3, 5);
scene.add(directionalLight);

const timer = new THREE.Timer();

const WARMUP = 120;
const SAMPLES = 600;
const frameMs = new Float64Array(SAMPLES);
const cpuMs = new Float64Array(SAMPLES);
let frame = 0;

function summarize(values: Float64Array) {
  const sorted = values.slice().sort();
  const at = (q: number) => sorted[Math.floor(q * (sorted.length - 1))];
  const mean = sorted.reduce((a, b) => a + b, 0) / sorted.length;

  return { mean, p50: at(0.5), p95: at(0.95), p99: at(0.99) };
}

renderer.setAnimationLoop((time) => {
  const cpuStart = performance.now();
  timer.update(time);
  const deltaSeconds = Math.max(0, timer.getDelta());

  for (let i = 0; i < meshArray.length; i++) {
    const rotationStep = 0.01;
    meshArray[i].rotation.x += rotationStep;
    meshArray[i].rotation.y += rotationStep;
  }
  renderer.render(scene, camera);

  // measuring shenanigans
  const cpuEnd = performance.now();

  if (frame >= WARMUP && frame < WARMUP + SAMPLES) {
    frameMs[frame - WARMUP] = deltaSeconds * 1000;
    cpuMs[frame - WARMUP] = cpuEnd - cpuStart;
  }
  frame++;

  if (frame === WARMUP + SAMPLES) {
    console.log({
      n,
      frame: summarize(frameMs),
      cpu: summarize(cpuMs),
      drawCalls: renderer.info.render.calls,
    });
  }
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});
