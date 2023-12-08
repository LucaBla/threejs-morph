import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { Bone, LoadingManager } from 'three';

const menLoadingManager = new LoadingManager();


async function loadMen(){
  const loader = new FBXLoader(menLoadingManager);

  const men = await loader.loadAsync('./assets/models/men.fbx');
  updateBoneNamesForModel(men);
  console.log(men);
  return men;
}

async function loadFBXAnimation(animationPath){
  const loader = new FBXLoader();

  //const animation = await loader.loadAsync(animationPath);
  const animation = await loader.parse(animationPath);
  updateBoneNamesForAnimation(animation.animations[0]);
  return animation.animations[0];
}

function updateBoneNamesForModel(parent){
  if(parent.children.length === 0 || parent.children === undefined){
    return;
  }
  parent.children.forEach(child =>{
    if(child instanceof Bone && containsNumber(child.name)){
      child.name = removeCharactersUntilNumber(child.name);
      updateBoneNamesForModel(child);
    }
  })
}

function updateBoneNamesForAnimation(animation){
  animation.tracks.forEach(track =>{
    if(containsNumber(track.name)){
      track.name = removeCharactersUntilNumber(track.name);
    }
  })
  console.log(animation);
}

function containsNumber(str) {
  return /\d/.test(str);
}

function removeCharactersUntilNumber(str) {
  // Entferne alle Zeichen vor und einschließlich der ersten Zahl
  let newStr = str.replace(/^[^\d]*(\d.*)$/, "$1");
  return newStr.slice(1);
}

export {loadMen, loadFBXAnimation, menLoadingManager};