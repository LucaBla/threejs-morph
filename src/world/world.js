import { AnimationMixer, LoopRepeat, SkeletonHelper } from 'three';
import { createCamera } from './components/camera.js';
import { createCube } from './components/cube.js';
import { createLights } from './components/lights.js';
import { createScene } from './components/scene.js';
import { createControls } from './systems/controls.js';
import { loadFBXAnimation} from "./systems/fbxLoader.js"
import { loadManGLTF, loadWomanGLTF, loadMannequinGLTF, loadGLTFAnimation } from './systems/gltfLoader.js';
import { loadBVHAnimation } from './systems/bvhLoader.js';
import { morphAnimations } from './systems/animationMorpher.js';
import { animationsMorphedEvent } from '../animationMorphedEvent.js';

import { createRenderer } from './systems/renderer.js';
import { Resizer } from './systems/resizer.js';

import { exportGLTF } from './systems/gltfExporter.js';

let model;
let scene;
let camera;
let renderer;
let controls;
let mixer;

let helper;
let skeletonMixer;

let fileArray = [];

let animationsToDownload = [];

let lockHipRotation = false;

class World {
  constructor(container) {
    camera = createCamera();
    scene = createScene();
    renderer = createRenderer();
    controls = createControls(camera, renderer.domElement);

    container.append(renderer.domElement);

    const {ambientLight, light} = createLights();

    scene.add(light, ambientLight);

    const resizer = new Resizer(container, camera, renderer);
    resizer.onResize = () => {
      this.render();
    };
  }

  async init(modelIdentifier){
    await this.updateModel(modelIdentifier);
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

  getSkeletonMixer(){
    return skeletonMixer;
  }

  async updateModel(modelIdentifier, showSkeleton = undefined){
    let newModel = null;
    if(modelIdentifier === "man"){
      newModel = await loadManGLTF();
    }
    else if(modelIdentifier === "woman"){
      newModel = await loadWomanGLTF();
    }
    else if(modelIdentifier === "mannequin"){
      newModel = await loadMannequinGLTF();
    }
    else{
      console.error("Invalid modelIdentifier!");
    }

    if(newModel !== null){
      this.removeOldModel();
      model = newModel;
      model.position.set(0,-80,0);
      scene.add(model);
      helper = new SkeletonHelper(model);
      if(showSkeleton){
        scene.add(helper);
      }
      this.render();
    }
  }

  removeOldModel(){
    if(model !== undefined){
      scene.remove(model);
      scene.remove(helper);

      helper.dispose();
    }
  }

  validateEnteredWeights(enteredWeights){
    for(const number of enteredWeights){
      if(isNaN(number)){
        alert("Please enter valid numbers!");
        return false;
      }
    }

    return true;
  }

  setAnimationOptions(animation, animationIterations, animationSpeed){
    if(animationIterations === 0){
      animation.setLoop(LoopRepeat, Infinity);
    }
    else{
      animation.setLoop(LoopRepeat, animationIterations);
    }
    animation.setEffectiveWeight(1);
    animation.setEffectiveTimeScale(animationSpeed);
  }

  async handleStartBtnClick(enteredWeights, animationSpeed, 
      animationIterations){
    animationsToDownload = [];

    if(!this.validateEnteredWeights(enteredWeights)){
      return
    }

    let morphedAnimation = await morphAnimations(
      fileArray, 
      enteredWeights, 
      model,
      lockHipRotation
    );

    mixer = new AnimationMixer(model);
    const clippedMorphedAnim = mixer.clipAction(morphedAnimation);

    this.setAnimationOptions(
      clippedMorphedAnim, 
      animationIterations, 
      animationSpeed
    );

    clippedMorphedAnim.play();

    animationsToDownload.push(clippedMorphedAnim._clip);

    document.dispatchEvent(animationsMorphedEvent);
  }

  handleDownloadBtnClick(){
    exportGLTF(scene, animationsToDownload);
  }

  handleFileUpload(file){
    fileArray.push(file);
  }

  handleFileRemove(file){
    const fileToRemoveIndex = fileArray.findIndex(element => element === file);
    fileArray.splice(fileToRemoveIndex, 1);
  }

  handleSkeletonCheckBoxChange(isChecked){
    if(isChecked && !scene.children.includes(helper)){
      scene.add(helper);
    }
    else if(!isChecked && scene.children.includes(helper)){
      scene.remove(helper);
    }
  }

  handleHipRotationCheckBoxChange(isChecked){
    if(isChecked){
      lockHipRotation = true;
    }
    else{
      lockHipRotation = false;
    }
  }
}

export { World };
