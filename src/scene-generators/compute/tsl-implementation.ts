import * as THREE from "three/webgpu";
import { n, scene, randomRange, spread } from "../../main";
import { Fn, If, instancedArray, instanceIndex, uniform } from "three/tsl";

let updateCompute: THREE.ComputeNode;

export function createParticleScene_TSL() {
  const startPositions = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    startPositions[i * 3 + 0] = randomRange(spread);
    startPositions[i * 3 + 1] = randomRange(spread);
    startPositions[i * 3 + 2] = randomRange(spread);
  }

  const positions = instancedArray(startPositions, "vec3");
  const velocities = instancedArray(n, "float");

  const gravity = uniform(-0.01);
  const floorY = uniform(-30);
  const bounciness = uniform(0.9);

  updateCompute = Fn(() => {
    const position = positions.element(instanceIndex);
    const velocity = velocities.element(instanceIndex);

    velocity.addAssign(gravity);
    position.y.addAssign(velocity);

    If(position.y.lessThan(floorY), () => {
      position.y.assign(floorY);
      velocity.assign(velocity.negate().mul(bounciness));
    });
  })().compute(n);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(3), 3),
  );

  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.1,
    sizeAttenuation: true,
  });
  material.positionNode = positions.toAttribute();

  const points = new THREE.Points(geometry, material);
  points.count = n;
  scene.add(points);
}

export function moveParticles_TSL(renderer: THREE.WebGPURenderer) {
  renderer.compute(updateCompute);
}
