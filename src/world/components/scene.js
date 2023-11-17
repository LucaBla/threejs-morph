import { Color, Scene } from '../../../node_modules/three';

function createScene() {
  const scene = new Scene();

  scene.background = new Color('#343541');

  return scene;
}

export { createScene };
