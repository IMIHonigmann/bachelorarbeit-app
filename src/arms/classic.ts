import * as THREE from "three";

function getRenderer() {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  const gl = renderer.getContext() as WebGL2RenderingContext;
  const ext = gl.getExtension("WEBGL_debug_renderer_info");
  const gpu = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "unknown";

  console.log(gpu);

  return renderer;
}

export { getRenderer, THREE };
