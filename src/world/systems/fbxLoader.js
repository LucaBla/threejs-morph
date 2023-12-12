import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { Bone, LoadingManager, MathUtils, QuaternionKeyframeTrack, Matrix4, Quaternion, Euler, VectorKeyframeTrack, Vector3 } from 'three';

const menLoadingManager = new LoadingManager();


async function loadMen(){
  const loader = new FBXLoader(menLoadingManager);

  const men = await loader.loadAsync('./assets/models/men.fbx');
  updateBoneNamesForModel(men);
  updateMeshes(men);
  console.log(men);
  return men;
}

async function loadFBXAnimation(animationPath){
  const loader = new FBXLoader();

  //const animation = await loader.loadAsync(animationPath);
  const animation = await loader.parse(animationPath);
  console.log(animation);
  updateBoneNamesForAnimation(animation.animations[0]);
  retargetVectorKeyFrameTrackToGLTF(animation.animations[0]);
  retargetQuaternionKeyFrameTrackToGLTF(animation.animations[0]);
  return animation.animations[0];
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

function retargetVectorKeyFrameTrackToGLTF(animation){
  for(const track of animation.tracks){
    if(track instanceof VectorKeyframeTrack){
      let j = 0;
      for(let i = 0; i < track.values.length; i++){
        if(j === 2){
          let newYValue = track.values[i];
          track.values[i] = -track.values[i-1];
          track.values[i-1] = newYValue;

          j = 0;
          //skip j++ for this iteration
          //prevents j from starting at 1 for the next Vector
          continue;
        }
        j++;
      }
    }
  }
}

function retargetQuaternionKeyFrameTrackToGLTF(animation) {
  let quaternionArray = [];
  for (const track of animation.tracks) {
    if (track instanceof QuaternionKeyframeTrack) {
      if(track.name !== 'Hips.quaternion'){
        return;
      }

      for (let i = 0; i < track.values.length; i+= 4) {
        let q = new Quaternion(
          track.values[i], 
          track.values[i+1], 
          track.values[i+2], 
          track.values[i+3]
        );
	      let w = new Quaternion();
    	  //w.setFromAxisAngle(new Vector3(-1,0,0), Math.PI / 4);
        w.setFromEuler(new Euler(-1.570796461153735,0,-0));
    	  q.premultiply(w);
        track.values[i] = q.x;
        track.values[i+1] = q.y;
        track.values[i+2] = q.z;
        track.values[i+3] = q.w;
      }
    }
  }
  console.log(quaternionArray);
}

function updateMeshes(parent){
  parent.children.forEach(child =>{
    if(child.isMesh){
      child.castShadow = false;
      child.receiveShadow = false;
      child.frustumCulled = false;
      child.material.transparent = false;
      //child.material.side = THREE.DoubleSide;
      child.material.alphaTest = 0.006;
      child.material.opacity = 1;
    }
  });
}

function updateBoneNamesForAnimation(animation){
  animation.tracks.forEach(track =>{
    if(containsMixamo(track.name)){
      track.name = removeCharactersUntilNumber(track.name);
    }
  })
  console.log(animation);
}

function containsNumber(str) {
  return /\d/.test(str);
}

function containsMixamo(str) {
  return str.includes('mixamo');
}

function removeCharactersUntilNumber(str) {
  let newStr = str.replace(/^[^\d]*(\d.*)$/, "$1");
  return newStr.slice(1);
}

export {loadMen, loadFBXAnimation, menLoadingManager};