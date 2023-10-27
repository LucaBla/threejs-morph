import { World } from './world/world.js';
import { Clock } from 'three';

const clock = new Clock();

async function main() {
  // Get a reference to the container element
  const container = document.querySelector('#scene-container');

  // create a new world
  const world = new World(container);

  // draw the scene
  world.render();

  await world.init();
  animate(world);
}

function animate(world){
  world.getControls().update();
  world.getMixer().update(clock.getDelta());
  world.render();

  requestAnimationFrame(() => animate(world));
}


main();
