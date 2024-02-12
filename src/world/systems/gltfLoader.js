import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Bone, LoadingManager } from 'three';

const gltfLoadingManager = new LoadingManager();

function loadManGLTF(){
  return loadModel('./assets/models/man.glb');
}

function loadWomanGLTF(){
  return loadModel('./assets/models/woman.glb');
}

function loadMannequinGLTF(){
  return loadModel('./assets/models/mannequin.glb');
}

async function loadModel(modelPath){
  const loader = new GLTFLoader(gltfLoadingManager);

  let model = await loader.loadAsync(modelPath);
  model = model.scene.children[0];
  updateScale(model);
  updateBoneNamesForModel(model);
  updateMeshes(model);
  model.name = "Model";
  return model;
}

async function loadGLTFAnimation(animationPath){
  const loader = new GLTFLoader();

  const animation = await loader.parseAsync(animationPath);

  updateBoneNamesForAnimation(animation.animations[0]);

  console.log(animation);
  return animation.animations[0];
}

function updateScale(model){
  model.scale.set(1, 1, 1);
}

function updateBoneNamesForModel(parent){
  // removes the mixamo-prefix from the bone names
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

function updateBoneNamesForAnimation(animation){
  // removes the mixamo-prefix from the track names
  animation.tracks.forEach(track =>{
    if(containsMixamo(track.name)){
      track.name = removeMixamorigPrefix(track.name);
    }
  })
}

function updateMeshes(parent){
  parent.children.forEach(child =>{
    if(child.isMesh){
      child.castShadow = false;
      child.receiveShadow = false;
      child.frustumCulled = false;
      child.material.opacity = 1;
    }
  });
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

export {loadManGLTF, loadWomanGLTF, loadMannequinGLTF, loadGLTFAnimation, gltfLoadingManager};