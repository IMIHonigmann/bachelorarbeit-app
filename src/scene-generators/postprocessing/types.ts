import type { Scene, PerspectiveCamera } from "three";

export type PostParams = {
  threshold: number;
  strength: number;
  radius: number;
};

export interface PostProcessor {
  render(): void;
}

export type PostSceneFactory<R> = (params: {
  renderer: R;
  scene: Scene;
  camera: PerspectiveCamera;
  postParams: PostParams;
}) => PostProcessor;
