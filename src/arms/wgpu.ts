import * as THREE from "three/webgpu";

async function getRenderer(arm: "A" | "B" | "C") {
  const renderer = new THREE.WebGPURenderer({
    forceWebGL: arm === "B",
    antialias: true,
  });

  await renderer.init();

  return renderer;
}

export { getRenderer, THREE };
