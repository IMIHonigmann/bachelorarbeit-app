import {
  randomRange,
  n,
  spread,
  instancedCubes,
  instanceRotations,
  instancePositions,
  fingerPrintArray,
  scene,
  type HybridThree,
} from "../main";

export function createInstancedSceneContent(THREE: HybridThree) {
  let offset = 0;
  const dummy = new THREE.Object3D();
  const r = randomRange;

  for (let i = 0; i < n; i++) {
    dummy.position.set(r(spread), r(spread), r(spread));
    dummy.rotation.set(r(spread), r(spread), r(spread));
    dummy.updateMatrix();
    instancedCubes.setMatrixAt(i, dummy.matrix);

    instanceRotations.set(
      [dummy.rotation.x, dummy.rotation.y, dummy.rotation.z],
      i * 3,
    );
    instancePositions.set(
      [dummy.position.x, dummy.position.y, dummy.position.z],
      i * 3,
    );

    fingerPrintArray[offset + 0] = dummy.position.x;
    fingerPrintArray[offset + 1] = dummy.position.y;
    fingerPrintArray[offset + 2] = dummy.position.z;
    fingerPrintArray[offset + 3] = dummy.rotation.x;
    fingerPrintArray[offset + 4] = dummy.rotation.y;
    fingerPrintArray[offset + 5] = dummy.rotation.z;
    offset += 6;
  }

  instancedCubes.instanceMatrix.needsUpdate = true;
  scene.add(instancedCubes);
}

export function rotateInstanced(rotationStep: number, THREE: HybridThree) {
  const dummy = new THREE.Object3D();
  for (let i = 0; i < n; i++) {
    const j = i * 3;
    instanceRotations[j] += rotationStep;
    instanceRotations[j + 1] += rotationStep;

    dummy.rotation.set(
      instanceRotations[j],
      instanceRotations[j + 1],
      instanceRotations[j + 2],
    );
    dummy.position.set(
      instancePositions[j],
      instancePositions[j + 1],
      instancePositions[j + 2],
    );
    dummy.updateMatrix();
    instancedCubes.setMatrixAt(i, dummy.matrix);
  }
  instancedCubes.instanceMatrix.needsUpdate = true;
}
