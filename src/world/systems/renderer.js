import { WebGLRenderer } from '../../../node_modules/three';

function createRenderer() {
  const renderer = new WebGLRenderer();

  return renderer;
}

export { createRenderer };
