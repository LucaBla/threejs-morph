import { PerspectiveCamera } from 'three';

function createCamera() {
  //const camera = new PerspectiveCamera(35, 1, 0.1, 100);
  const camera = new PerspectiveCamera(90, 1, 0.01, 1000000000000000000);

  camera.position.set(0, 0, 250);

  return camera;
}

export { createCamera };