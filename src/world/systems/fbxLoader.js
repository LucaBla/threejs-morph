import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { Bone, LoadingManager, MathUtils, QuaternionKeyframeTrack, Matrix4, Quaternion, Euler, VectorKeyframeTrack, Vector3, Group } from 'three';

const fbxLoadingManager = new LoadingManager();


function loadMan(){
  return loadModel('./assets/models/men.fbx');
}

function loadWoman(){
  return loadModel('./assets/models/woman.fbx');
}

function loadMannequin(){
  return loadModel('./assets/models/mannequin.fbx');
}

async function loadModel(modelPath){
  const loader = new FBXLoader(fbxLoadingManager);

  const model = await loader.loadAsync(modelPath);
  updateBoneNamesForModel(model);
  updateMeshes(model);
  model.name = "Model";
  console.log(model);
  return model;
}

async function loadFBXAnimation(animationPath){
  const loader = new FBXLoader();

  const animation = await loader.parse(animationPath);
  updateBoneNamesForAnimation(animation.animations[0]);
  console.log(animation);

  return animation.animations[0];
}

function updateBoneNamesForModel(parent){
  if(parent.children.length === 0 || parent.children === undefined){
    return;
  }
  parent.children.forEach(child =>{
    if(child instanceof Bone && containsMixamo(child.name)){
      child.name = removeMixamorigPrefix(child.name);
      updateBoneNamesForModel(child);
    }
  })
}

function updateMeshes(parent){
  parent.children.forEach(child =>{
    if(child.isMesh){
      child.castShadow = false;
      child.receiveShadow = false;
      child.frustumCulled = false;
      child.material.transparent = false;
      child.material.alphaTest = 0.006;
      child.material.opacity = 1;
    }
  });
}

function updateBoneNamesForAnimation(animation){
  animation.tracks.forEach(track =>{
    if(containsMixamo(track.name)){
      track.name = removeMixamorigPrefix(track.name);
    }
  })
}

function removeMixamorigPrefix(inputString) {
  const prefix = "mixamorig";
  
  if (inputString.startsWith(prefix)) {
    let result = inputString.slice(prefix.length);

    if(isFirstCharANumber(result)){
      return result.slice(1);
    }
    else{
      return result;
    }
  } 
  else {
    return inputString;
  }
}

function containsMixamo(str) {
  return str.includes('mixamo');
}

function isFirstCharANumber(str) {
  return !isNaN(str.charAt(0));
}

export {loadMan, loadWoman, loadMannequin, loadFBXAnimation, fbxLoadingManager};