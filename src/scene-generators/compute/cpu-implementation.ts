import { n, scene, randomRange, spread, type HybridThree } from "../../main";

let positionAttribute: InstanceType<HybridThree["BufferAttribute"]>;
let velocities: Float32Array<ArrayBuffer>;

export function createParticleScene_CPU(THREE: HybridThree) {
  const positions = new Float32Array(n * 3);
  velocities = new Float32Array(n);

  for (let i = 0; i < n; i++) {
    positions[i * 3 + 0] = randomRange(spread);
    positions[i * 3 + 1] = randomRange(spread);
    positions[i * 3 + 2] = randomRange(spread);
    velocities[i] = 0;
  }

  const geometry = new THREE.BufferGeometry();
  positionAttribute = new THREE.BufferAttribute(positions, 3);
  geometry.setAttribute("position", positionAttribute);

  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.1,
    sizeAttenuation: true,
  });

  const points = new THREE.Points(geometry, material);
  scene.add(points);
}

export function moveParticles(step: number) {
  const floorPosY = -30;
  const positions = positionAttribute.array;
  const BOUNCINESS = 0.9;
  for (let i = 0; i < n; i++) {
    velocities[i] += step;
    positions[i * 3 + 1] += velocities[i];
    if (positions[i * 3 + 1] < floorPosY) {
      positions[i * 3 + 1] = floorPosY;
      velocities[i] = -velocities[i] * BOUNCINESS;
    }
  }
  positionAttribute.needsUpdate = true;
}
