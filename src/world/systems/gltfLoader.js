import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Bone, LoadingManager } from 'three';

const menLoadingManagerGLTF = new LoadingManager();

async function loadManGLTF(){
  const loader = new GLTFLoader(menLoadingManagerGLTF);

  const men = await loader.loadAsync('./assets/models/men.glb');
  updateBoneNamesForModel(men.scene.children[0]);
  updateMeshes(men.scene.children[0]);
  console.log(men);
  updateScale(men);
  men.scene.children[0].name = "Model";
  return men.scene.children[0];
}

async function loadGLTFAnimation(animationPath){
  const loader = new GLTFLoader();

  console.log(animationPath);
  const animation = await loader.parseAsync(animationPath);
  console.log(animation);
  updateBoneNamesForAnimation(animation.animations[0]);
  return animation.animations[0];
}

function updateScale(men){
  men.scene.children[0].scale.set(1, 1, 1);
}

function updateBoneNamesForModel(parent){
  if(parent.children.length === 0 || parent.children === undefined){
    return;
  }
  parent.children.forEach(child =>{
    if(child instanceof Bone && containsMixamo(child.name)){
      child.name = removeCharactersUntilNumber(child.name);
      updateBoneNamesForModel(child);
    }
  })
}

function updateBoneNamesForAnimation(animation){
  animation.tracks.forEach(track =>{
    if(containsMixamo(track.name)){
      track.name = removeCharactersUntilNumber(track.name);
    }
  })
  console.log(animation);
}

function updateMeshes(parent){
  parent.children.forEach(child =>{
    if(child.isMesh){
      child.castShadow = false;
      child.receiveShadow = false;
      child.frustumCulled = false;
      //child.material.transparent = false;
      //child.material.side = THREE.DoubleSide;
      //child.material.alphaTest = 0.006;
      child.material.opacity = 1;
    }
  });
}

function containsMixamo(str) {
  return str.includes('mixamo');
}

function removeCharactersUntilNumber(str) {
  let newStr = str.replace(/^[^\d]*(\d.*)$/, "$1");
  return newStr.slice(1);
}

export {loadManGLTF, loadGLTFAnimation, menLoadingManagerGLTF};