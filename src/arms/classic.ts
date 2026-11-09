import * as THREE from "three";

function getRenderer() {
  return new THREE.WebGLRenderer({ antialias: true });
}

export { getRenderer, THREE };
