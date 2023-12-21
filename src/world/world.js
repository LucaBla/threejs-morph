import { AnimationAction, AnimationClip, AnimationMixer, LoopRepeat, QuaternionKeyframeTrack, SkeletonHelper, VectorKeyframeTrack } from 'three';
import { createCamera } from './components/camera.js';
import { createCube } from './components/cube.js';
import { createLights } from './components/lights.js';
import { createScene } from './components/scene.js';
import { createControls } from './systems/controls.js';
import { loadMan, loadWoman, fbxLoadingManager, loadFBXAnimation, loadMannequin} from "./systems/fbxLoader.js"
import { loadManGLTF, loadWomanGLTF, loadMannequinGLTF, gltfLoadingManager, loadGLTFAnimation } from './systems/gltfLoader.js';
import { loadBVHAnimation } from './systems/bvhLoader.js';

import { createRenderer } from './systems/renderer.js';
import { Resizer } from './systems/resizer.js';

import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { exportGLTF } from './systems/gltfExporter.js';

let model;
let scene;
let camera;
let renderer;
let controls;
let mixer;

let helper;
let skeletonMixer;
let skeletonHelper;

let fileArray = [];

let animationsToDownload = [];

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
    //scene.add(cube);

    const resizer = new Resizer(container, camera, renderer);
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

  async initializeAnimations(model, weights, animationSpeed, loopAmount){
    // let animations = await this.createAnimationsArray(
    //   [
    //     'assets/animations/rightHook.fbx',
    //     'assets/animations/handRaising.fbx',
    //     'assets/animations/fistPump.fbx'
    //   ]);
    let animations = await this.createAnimationsArray();
      let actionsArray = [];

      this.normalizeTimeTracks(animations, weights);

      mixer = new AnimationMixer(model);

      actionsArray = this.clipActions(mixer, animations);
      this.setupActions(actionsArray, weights, animationSpeed, loopAmount);
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

      if(actionArray[i].tracks != undefined){
        //if true then this is a fbx-file
        actionArray[i].tracks.forEach(track => {
          const scaleFactor = biggestTimeTrack.length / track.times.length;
    
          track.times = track.times.map(time => time * scaleFactor);
        });
      }
      else{
        //this must be a bvh-file
        actionArray[i].clip.tracks.forEach(track => {
          const scaleFactor = biggestTimeTrack.length / track.times.length;
    
          track.times = track.times.map(time => time * scaleFactor);
        });
      }
      
      if(actionArray[i].duration != undefined){
        actionArray[i].duration = biggestTimeTrack[biggestTimeTrack.length - 1];
      }
      else{
        actionArray[i].clip.duration = biggestTimeTrack[biggestTimeTrack.length - 1];
      }
      console.log(actionArray[i]);
    }
  }

  findBiggestTimeTrack(actionArray, weights){
    let biggestTimeTrack = null;

    for(let i = 0; i < actionArray.length; i++){
      if(weights[i] == 0){
        continue;
      }
      if(actionArray[i].tracks != undefined){
        //if true then this is a fbx-file
        actionArray[i].tracks.forEach(track => {
          if(biggestTimeTrack == null || 
             track.times.length > biggestTimeTrack.length){
              biggestTimeTrack = track.times;
          }
        });
      }
      else{
        //this must be a bvh-file
        actionArray[i].clip.tracks.forEach(track => {
          if(biggestTimeTrack == null || 
             track.times.length > biggestTimeTrack.length){
              biggestTimeTrack = track.times;
          }
        });
      }
    }

    return biggestTimeTrack;
  }

  async createAnimationsArray(){
    console.log(fileArray);
    let animationsArray = [];

    for (const animationFile of fileArray) {
      console.log(animationFile);
      let animation = null;

      if(animationFile.name.toLowerCase().endsWith('.fbx')){
        animation = await loadFBXAnimation(animationFile.content);
      }
      else if(animationFile.name.toLowerCase().endsWith('.bvh')){
        animation = await loadBVHAnimation(animationFile.content);
      }
      else if(animationFile.name.toLowerCase().endsWith('.glb')){
        animation = await loadGLTFAnimation(animationFile.content);
      }
      animationsArray.push(animation);
    }

    return animationsArray;
  }

  clipActions(mixer, animationsArray){
    let actionArray = [];
    let newAction;

    animationsArray.forEach(animation => {
      if(animation instanceof AnimationClip){
        console.log(animation);
        newAction = mixer.clipAction(animation);
        actionArray.push(newAction);
      }
      else{
        //bvh-file
        console.log(animation.clip);
        console.log(model);
        const retargetedClip = this.retargetBVH(animation, model);
        newAction = mixer.clipAction(retargetedClip);
        //newAction = mixer.clipAction(animation.clip);
        actionArray.push(newAction);
      }
    });

    return actionArray;
  }

  setupActions(actionArray, weights, animationSpeed, loopAmount){
    for(let i = 0; i < actionArray.length; i++){
      if(loopAmount === 0){
        actionArray[i].setLoop(LoopRepeat, Infinity);
      }
      else{
        actionArray[i].setLoop(LoopRepeat, loopAmount);
      }

      actionArray[i].setEffectiveWeight(weights[i]);
      actionArray[i].setEffectiveTimeScale(animationSpeed);
      actionArray[i].play();

      animationsToDownload.push(actionArray[i]._clip);
    }
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
      //fbxLoadingManager.onLoad = this.render;
      model = newModel;
      console.log(model);
      model.position.set(0,-80,0);
      //model.scale.set(.01,.01,.01);
      scene.add(model);
      helper = new SkeletonHelper(model);
      if(showSkeleton){
        scene.add(helper);
      }
      this.render();
    }
  }

  removeOldModel(){
    console.log(model);
    if(model !== undefined){
      console.log("model removed");
      scene.remove(model);
      scene.remove(helper);

      helper.dispose();
      //model.dispose();
    }
  }

  handleStartBtnClick(enteredWeights, animationSpeed, animationIterations){
    console.log(enteredWeights);
    for(const number of enteredWeights){
      if(isNaN(number)){
        alert("Please enter valid numbers!");
        return;
      }
    }
    this.initializeAnimations(model, enteredWeights, animationSpeed, animationIterations);
  }

  handleDownloadBtnClick(){
    exportGLTF(scene, animationsToDownload);
  }

  handleFileUpload(fileContent, fileName){
    fileArray.push({content: fileContent, name: fileName});
  }

  handleFileRemove(index){
    fileArray.splice(index, 1);
    console.log(index);
  }

  handleSkeletonCheckBoxChange(isChecked){
    if(isChecked && !scene.children.includes(helper)){
      scene.add(helper);
    }
    else if(!isChecked && scene.children.includes(helper)){
      scene.remove(helper);
    }
  }

  retargetBVH(animation, model){
    const clip = animation.clip;
    const skeleton = animation.skeleton;

    skeletonHelper = new SkeletonHelper(skeleton.bones[0]);
    skeletonHelper.skeleton = skeleton;

    scene.add(skeleton.bones[0]);
    scene.add(skeletonHelper);
    skeletonHelper.rotation.set(90,90,90);
    skeletonMixer = new AnimationMixer(skeleton.bones[0]);
    console.log(skeletonMixer, clip);
    let action = skeletonMixer.clipAction(clip);
    action.play();
    
    console.log(skeleton);
    
    if(!model.skeleton){
      model.traverse(child =>{
        if(child.skeleton){
          model.skeleton = child.skeleton;
        }
      })
    }
    // *Special Note* SkeletonUtils.retargetClip seems to output an animationClip
    // with more frames (time arrays) than necessary and a reduced duration.
    // I'm supplying fps and modifying input clip duration to fix that
    
    /* get fps from first track. */
    const fps = 1 / clip.tracks[0].times[1] || 1;
    clip.duration += 1 / fps;
    
    const options = {
      fps: fps,
      //useTargetMatrix: true,
      //.preservePosition: true,
      //preserveHipPosition: true,
      //useFirstFramePosition: true
    };
    
    console.log(model);
    console.log(helper);
    const newClip = SkeletonUtils.retargetClip(model.children[1], skeletonHelper, clip, options);
    console.log(model);
    
    model.traverse(function(child) {
      if (child.type === "SkinnedMesh") {
        child.pose();
      }
    });
    
    newClip.tracks.forEach( track =>{
      if(track.name.includes("[")){
        track.name = track.name.replace(".bones[", "").replace(/\]/g, "");
      }
    });
    
    console.log(model.skeleton);
    
    model.skeleton.bones.forEach( bone =>{
      bone.scale.set(1,1,1);
    });
    
    //mixer = new AnimationMixer(model);
    //model.position.set(0,0,3);
    
    console.log(newClip);
    console.log(model);
    return newClip
  }
}

export { World };
