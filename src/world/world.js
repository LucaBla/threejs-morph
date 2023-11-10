import { AnimationMixer, LoopRepeat, QuaternionKeyframeTrack, VectorKeyframeTrack } from 'three';
import { createCamera } from './components/camera.js';
import { createCube } from './components/cube.js';
import { createLights } from './components/lights.js';
import { createScene } from './components/scene.js';
import { createControls } from './systems/controls.js';
import { loadMen, menLoadingManager, loadAnimation} from "./systems/fbxLoader.js"

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

    let animations = await this.createAnimationsArray(
      [
        'assets/animations/rightHook.fbx',
        'assets/animations/handRaising.fbx',
        'assets/animations/fistPump.fbx'
      ]);
      let actionsArray = [];

    this.normalizeTimeTracks(animations);
    
    mixer = new AnimationMixer(men);

    actionsArray = this.clipActions(mixer, animations);
    this.setupActions(actionsArray);

    console.log(animations);

    menLoadingManager.onLoad = this.render;

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

  normalizeTimeTracks(actionArray){
    //find biggest timeTrack
    //set all timeTracks in both to biggest timeTrack
    let biggestTimeTrack = this.findBiggestTimeTrack(actionArray);
    console.log(biggestTimeTrack);

    actionArray.forEach(action => {
      action.tracks.forEach(track => {
        const scaleFactor = biggestTimeTrack.length / track.times.length;
  
        track.times = track.times.map(time => time * scaleFactor);
      });
      
      action.duration = biggestTimeTrack[biggestTimeTrack.length - 1];
    });
  }

  findBiggestTimeTrack(actionArray){
    let biggestTimeTrack = null;

    actionArray.forEach(action => {
      action.tracks.forEach(track => {
        if(biggestTimeTrack == null || 
           track.times.length > biggestTimeTrack.length){
            biggestTimeTrack = track.times;
        }
      });
    });

    return biggestTimeTrack;
  }

  async createAnimationsArray(animationsPathArray){
    let animationsArray = [];

    for (const path of animationsPathArray) {
      const animation = await loadAnimation(path);
      animationsArray.push(animation);
    }

    return animationsArray;
  }

  clipActions(mixer, animationsArray){
    let actionArray = [];
    let newAction;

    animationsArray.forEach(animation => {
      newAction = mixer.clipAction(animation);
      actionArray.push(newAction);
    });

    return actionArray;
  }

  setupActions(actionArray){
    actionArray.forEach(action => {
      action.setLoop(LoopRepeat, Infinity);
      action.setEffectiveWeight(0.5);
      action.play();
    });
  }
}

export { World };
