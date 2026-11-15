import * as THREE from "three/webgpu";

async function getRenderer(arm: "A" | "B" | "C") {
  const renderer = new THREE.WebGPURenderer({
    forceWebGL: arm === "B",
    antialias: true,
  });

  await renderer.init();

  const api = "isWebGPUBackend" in renderer.backend ? "webgpu" : "webgl2";

  if (api === "webgl2" && arm === "C") {
    throw new Error(
      `Arm C uses the WebGL2 Backend which should not be the case.`,
    );
  }
  if (api === "webgpu" && arm === "B") {
    throw new Error(
      `Arm B uses the WebGPU Backend which should not be the case.`,
    );
  }

  let gpuInfo;
  if (api === "webgl2") {
    const gl = renderer.getContext() as WebGL2RenderingContext;
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const gpu = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "unknown";
    gpuInfo = gpu;
  }
  if (api === "webgpu") {
    const adapter = await navigator.gpu.requestAdapter();
    gpuInfo = adapter?.info.description;
  }

  return { renderer, api, gpuInfo };
}

export { getRenderer, THREE };
