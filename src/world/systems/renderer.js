import { WebGLRenderer } from 'three';

function createRenderer() {
  const renderer = new WebGLRenderer({ 
    logarithmicDepthBuffer: true,
    antialias: true,
  });

  return renderer;
}

export { createRenderer };
