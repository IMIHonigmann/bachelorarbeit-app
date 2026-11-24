import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { FXAAPass } from "three/addons/postprocessing/FXAAPass.js";
import type { PostSceneFactory } from "./types";

export const createPostScene_GL: PostSceneFactory<THREE.WebGLRenderer> = ({
  renderer,
  scene,
  camera,
  postParams,
}) => {
  const renderScene = new RenderPass(scene, camera);

  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const bloomPass = new UnrealBloomPass(
    size,
    postParams.strength / 3,
    postParams.radius,
    postParams.threshold,
  );

  const outputPass = new OutputPass();

  const fxaaPass = new FXAAPass();

  const composer = new EffectComposer(renderer);
  composer.addPass(renderScene);
  composer.addPass(bloomPass);
  composer.addPass(outputPass);
  composer.addPass(fxaaPass);

  return { render: () => composer.render() };
};
