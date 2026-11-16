import type { Mesh } from "three";
import "./style.css";
import { mulberry32 } from "./deterministic-random";
import {
  createInstancedSceneContent,
  rotateInstanced,
} from "./scene-generators/instanced";
import {
  createNonInstancedSceneContent,
  rotateNonInstanced,
} from "./scene-generators/noninstanced";

const params = new URLSearchParams(window.location.search);
const nParam = params.get("n") ?? 1000;
export const n = Number(nParam);
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

const arm = params.get("arm") ?? "C";
if (arm !== "A" && arm !== "B" && arm !== "C") {
  throw new Error(`${arm} is not a valid arm`);
}

const seed = Number(params.get("seed") ?? 67);

if (Number.isNaN(seed)) {
  throw new Error(`Your seed is NaN did you pass a string?`);
}

if (!Number.isInteger(seed)) {
  throw new Error(
    `Your seed ${seed} is supposed to be an integer. Floats are not allowed.`,
  );
}

const MAX_SEED = 2 ** 32 - 1;
if (seed > MAX_SEED) {
  throw new Error(
    `Your seed ${seed} is a value bigger than ${MAX_SEED} and would secretly cause duplicate seeds. Aborting. (Choose a smaller number)`,
  );
}

const mode = params.get("mode");

if (mode !== "noninstanced" && mode !== "instanced") {
  throw new Error(`Your selected mode ${mode} is not a valid parameter.`);
}

const deterministicRandom = mulberry32(seed);

let isRunValid = !document.hidden;
console.log(
  `Note: Don't switch tabs now for valid results. \n Run is currently considered ${isRunValid ? "valid" : "invalid"}`,
);

document.addEventListener("visibilitychange", () => {
  if (!isRunValid) return;
  isRunValid = false;
  console.log(
    "WARNING: You hid the page and therefore the run will be considered invalid",
  );
});

const moduleStart = performance.now();
const { THREE, getRenderer } =
  arm == "A" ? await import("./arms/classic") : await import("./arms/wgpu");
const moduleLoad = performance.now() - moduleStart;

export type HybridThree = typeof THREE;

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("App root element #app not found");
}

const sceneBuildStart = performance.now();
export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
);

export const geometry = new THREE.BoxGeometry(1, 1, 1);
export const material = new THREE.MeshStandardMaterial({
  color: 0x00aaff,
  roughness: 0.5,
  metalness: 0.2,
});

export function randomRange(max: number) {
  return deterministicRandom() * max * 2 - max;
}

export const spread = Math.cbrt(n) * 2;
export const meshArray: Mesh[] = new Array();

export const fingerPrintArray = new Float64Array(n * 6);
export let offset = 0;

export const instancedCubes = new THREE.InstancedMesh(geometry, material, n);
export const instanceRotations = new Float64Array(n * 3);
export const instancePositions = new Float64Array(n * 3);

mode === "noninstanced"
  ? createNonInstancedSceneContent(THREE)
  : createInstancedSceneContent(THREE);

const sceneBuildTime = performance.now() - sceneBuildStart;

const hashBuffer = await crypto.subtle.digest("SHA-256", fingerPrintArray);
const hash = new Uint8Array(hashBuffer).toHex();

camera.position.z = spread * 3.5;

const rendererInitStart = performance.now();
const { renderer, api, gpuInfo } = await getRenderer(arm);
const rendererInitTime = performance.now() - rendererInitStart;

console.log(nParam, renderer);
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

let firstFrame = 0;
renderer.setAnimationLoop((time) => {
  const cpuStart = performance.now();
  timer.update(time);
  const deltaSeconds = Math.max(0, timer.getDelta());

  const rotationStep = 0.01;

  mode === "noninstanced"
    ? rotateNonInstanced(rotationStep)
    : rotateInstanced(rotationStep, THREE);

  const renderStart = performance.now();
  renderer.render(scene, camera);
  if (frame === 0) {
    firstFrame = performance.now() - renderStart;
  }

  // measuring shenanigans
  const cpuEnd = performance.now();

  if (frame >= WARMUP && frame < WARMUP + SAMPLES) {
    frameMs[frame - WARMUP] = deltaSeconds * 1000;
    cpuMs[frame - WARMUP] = cpuEnd - cpuStart;
  }

  frame++;

  let screenshotDataURL;
  if (frame === WARMUP + Math.floor(SAMPLES / 2)) {
    // screenshot on certain frame
    screenshotDataURL = renderer.domElement.toDataURL();
  }

  if (frame === WARMUP + SAMPLES) {
    const drawCalls =
      api === "webgpu"
        ? renderer.info.render.drawCalls
        : renderer.info.render.calls;

    window.__benchResult = {
      startup: {
        moduleLoad,
        sceneBuildTime,
        rendererInitTime,
        firstFrame,
      },
      config: {
        mode,
        n,
        arm,
        seed,
      },
      environment: {
        api: api,
        gpuInfo: {
          description: gpuInfo,
          userAgent: navigator.userAgent,
        },
      },
      devicePixelRatio: window.devicePixelRatio,
      resolution: { width: window.innerWidth, height: window.innerHeight },
      summary: {
        frame: summarize(frameMs),
        cpu: summarize(cpuMs),
      },
      frames: {
        cpuMs: Array.from(cpuMs),
        frameMs: Array.from(frameMs),
      },
      drawCalls: drawCalls,
      fingerprint: hash,
      date: Date.now(),
      valid: isRunValid,
      warnings: [isRunValid ? "" : "The window turned hidden during the run."],
    };
    // downloadJson(window.__benchResult, `arm-${arm}_n-${n}_seed-${seed}.json`);
    console.log("Benchmark results have been written!");
    console.log(window.__benchResult);
  }
});

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)]);

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});
