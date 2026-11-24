import * as THREE from "three/webgpu";
import { pass, renderOutput } from "three/tsl";
import { bloom } from "three/addons/tsl/display/BloomNode.js";
import type { PostSceneFactory } from "./types";
import { fxaa } from "three/examples/jsm/tsl/display/FXAANode.js";

export const createPostScene_WGPU: PostSceneFactory<THREE.WebGPURenderer> = ({
  renderer,
  scene,
  camera,
  postParams,
}) => {
  const renderPipeline = new THREE.RenderPipeline(renderer);

  const scenePass = pass(scene, camera);
  const scenePassColor = scenePass
    .getTextureNode("output")
    .toInspector("Color");

  const bloomPass = bloom(
    scenePassColor,
    postParams.strength,
    postParams.radius,
    postParams.threshold,
  ).toInspector("Bloom");
  const bloomNode = scenePassColor.add(bloomPass);

  renderPipeline.outputColorTransform = false;

  renderPipeline.outputNode = fxaa(renderOutput(bloomNode));

  return { render: () => renderPipeline.render() };
};
