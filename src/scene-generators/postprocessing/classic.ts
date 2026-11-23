import * as THREE from "three";
import {
  RenderPass,
  UnrealBloomPass,
  OutputPass,
  EffectComposer,
  FXAAPass,
} from "three/examples/jsm/Addons.js";

export type PostParams = {
  threshold: number;
  strength: number;
  radius: number;
};

export async function createPostScene_GL(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  postParams: PostParams,
) {
  const renderScene = new RenderPass(scene, camera);

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.5,
    0.4,
    0.85,
  );

  const fxaaPass = new FXAAPass();

  bloomPass.threshold = postParams.threshold;
  bloomPass.strength = postParams.strength;
  bloomPass.radius = postParams.radius;

  const outputPass = new OutputPass();

  const composer = new EffectComposer(renderer);
  composer.addPass(renderScene);
  composer.addPass(bloomPass);
  composer.addPass(fxaaPass);
  composer.addPass(outputPass);

  return composer;
}
