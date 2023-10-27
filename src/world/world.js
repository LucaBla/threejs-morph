import { AnimationMixer, LoopRepeat } from 'three';
import { createCamera } from './components/camera.js';
import { createCube } from './components/cube.js';
import { createLights } from './components/lights.js';
import { createScene } from './components/scene.js';
import { createControls } from './systems/controls.js';
import { loadHookAnimation, loadMen, menLoadingManager} from "./systems/fbxLoader.js"

import { createRenderer } from './systems/renderer.js';
import { Resizer } from './systems/resizer.js';

let scene;
let camera;
let renderer;
let controls;
let mixer;

class World {
  constructor(container) {
    camera = createCamera();
    scene = createScene();
    renderer = createRenderer();
    controls = createControls(camera, renderer.domElement);
    container.append(renderer.domElement);


    const cube = createCube();
    const {ambientLight, light} = createLights();

    scene.add(light, ambientLight);
    scene.add(cube);

    const resizer = new Resizer(container, camera, renderer);
  }

  async init(){
    const men = await loadMen();
    const hookAnim = await loadHookAnimation();
    const loadingManager = menLoadingManager;
    
    mixer = new AnimationMixer(men);
    const action = mixer.clipAction(hookAnim.animations[0]);

    action.setLoop(LoopRepeat, Infinity);
    action.play();
    menLoadingManager.onLoad = this.render;

    console.log(hookAnim.animations[0]);
    men.position.set(0,0,3);
    men.scale.set(.01,.01,.01);
    scene.add(men);
    this.render();
  }

  render() {
    // draw a single frame
    renderer.render(scene, camera);
  }

  getControls(){
    return controls;
  }

  getMixer(){
    return mixer;
  }

}

export { World };
