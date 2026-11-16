import {
  n,
  geometry,
  material,
  randomRange,
  spread,
  fingerPrintArray,
  meshArray,
  scene,
  type HybridThree,
} from "../main";

export function createNonInstancedSceneContent(THREE: HybridThree) {
  let offset = 0;
  for (let i = 0; i < n; i++) {
    const cube = new THREE.Mesh(geometry, material);
    cube.position.x = randomRange(spread);
    cube.position.y = randomRange(spread);
    cube.position.z = randomRange(spread);
    cube.rotation.x = randomRange(spread);
    cube.rotation.y = randomRange(spread);
    cube.rotation.z = randomRange(spread);

    fingerPrintArray[offset + 0] = cube.position.x;
    fingerPrintArray[offset + 1] = cube.position.y;
    fingerPrintArray[offset + 2] = cube.position.z;
    fingerPrintArray[offset + 3] = cube.rotation.x;
    fingerPrintArray[offset + 4] = cube.rotation.y;
    fingerPrintArray[offset + 5] = cube.rotation.z;
    offset += 6;

    meshArray.push(cube);
    scene.add(cube);
  }
}
