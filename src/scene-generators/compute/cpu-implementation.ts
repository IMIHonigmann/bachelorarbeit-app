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

export function moveParticles(
  gravity: number,
  floorY: number,
  bounciness: number,
) {
  const positions = positionAttribute.array;
  for (let i = 0; i < n; i++) {
    velocities[i] += gravity;
    positions[i * 3 + 1] += velocities[i];
    if (positions[i * 3 + 1] < floorY) {
      positions[i * 3 + 1] = floorY;
      velocities[i] = -velocities[i] * bounciness;
    }
  }
  positionAttribute.needsUpdate = true;
}
