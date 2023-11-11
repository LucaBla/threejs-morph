import { AnimationMixer, LoopRepeat, QuaternionKeyframeTrack, VectorKeyframeTrack } from 'three';
import { createCamera } from './components/camera.js';
import { createCube } from './components/cube.js';
import { createLights } from './components/lights.js';
import { createScene } from './components/scene.js';
import { createControls } from './systems/controls.js';
import { loadMen, menLoadingManager, loadAnimation} from "./systems/fbxLoader.js"

import { createRenderer } from './systems/renderer.js';
import { Resizer } from './systems/resizer.js';

let model;
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
    model = await loadMen();

    menLoadingManager.onLoad = this.render;

    model.position.set(0,0,3);
    model.scale.set(.01,.01,.01);
    scene.add(model);
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

  async initializeAnimations(model, weights, animationSpeed){
    let animations = await this.createAnimationsArray(
      [
        'assets/animations/rightHook.fbx',
        'assets/animations/handRaising.fbx',
        'assets/animations/fistPump.fbx'
      ]);
      let actionsArray = [];

      this.normalizeTimeTracks(animations, weights);

      mixer = new AnimationMixer(model);

      actionsArray = this.clipActions(mixer, animations);
      this.setupActions(actionsArray, weights, animationSpeed);
  }

  normalizeTimeTracks(actionArray, weights){
    //find biggest timeTrack
    //set all timeTracks in both to biggest timeTrack
    //or scale all timeTracks based on biggest timeTrack
    let biggestTimeTrack = this.findBiggestTimeTrack(actionArray, weights);
    console.log(biggestTimeTrack);

    for(let i = 0; i < actionArray.length; i++){
      if(weights[i] == 0){
        continue;
      }

      actionArray[i].tracks.forEach(track => {
        const scaleFactor = biggestTimeTrack.length / track.times.length;
  
        track.times = track.times.map(time => time * scaleFactor);
      });
      
      actionArray[i].duration = biggestTimeTrack[biggestTimeTrack.length - 1];
    }
  }

  findBiggestTimeTrack(actionArray, weights){
    let biggestTimeTrack = null;

    for(let i = 0; i < actionArray.length; i++){
      if(weights[i] == 0){
        continue;
      }

      actionArray[i].tracks.forEach(track => {
        if(biggestTimeTrack == null || 
           track.times.length > biggestTimeTrack.length){
            biggestTimeTrack = track.times;
        }
      });
    }

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

  setupActions(actionArray, weights, animationSpeed){
    for(let i = 0; i < actionArray.length; i++){
      actionArray[i].setLoop(LoopRepeat, Infinity);
      actionArray[i].setEffectiveWeight(weights[i]);
      actionArray[i].setEffectiveTimeScale(animationSpeed);
      actionArray[i].play();
    }
  }

  handleStartBtnClick(enteredWeights, animationSpeed){
    console.log(enteredWeights);
    for(const number of enteredWeights){
      if(isNaN(number)){
        alert("Please enter valid numbers!");
        return;
      }
    }
    this.initializeAnimations(model, enteredWeights, animationSpeed);
  }
}

export { World };
