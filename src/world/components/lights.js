import { DirectionalLight, AmbientLight } from 'three';

function createLights() {
  const ambientLight = new AmbientLight(
    'white', 5
  );

  const light = new DirectionalLight('white', 8);

  light.position.set(10, 10, 10);

  return { ambientLight, light };
}

export { createLights };