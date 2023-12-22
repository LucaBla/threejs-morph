import { loadBVHAnimation } from "./bvhLoader";
import { loadFBXAnimation } from "./fbxLoader";
import { loadGLTFAnimation } from "./gltfLoader";
import { Quaternion, QuaternionKeyframeTrack, SkeletonHelper, VectorKeyframeTrack } from "three";
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';


let animationsArray = [];

let animationsToApply = [];

let baseAnimation;

async function morphAnimations(fileArray, weights, model){
  console.log(fileArray);
  animationsArray = await createAnimationsArray(fileArray, model);
  applyWeights(weights);
  setBaseAnimation();
  addMissingTracksToBaseAnimation();
  //addMissing teleports model to bottom
  normalizeKeyFrameTrackValueArrays();
  combineAnimations();
  console.log(animationsArray);
  console.log(animationsToApply);
  console.log(baseAnimation);
  console.log(weights);

  baseAnimation.tracks.forEach(track=>{
    console.log(track.validate());
  });

  return baseAnimation;
}

function combineAnimations(){
  //maybe müssen alle mittelwerte direkt zusammengerechnet werden
  //und nicht immer nur 2 wie aktuell
  animationsToApply.forEach(animation => {
    animation.tracks.forEach(track => {
      if(track.values.length <=4){
        return;
      }
      let baseAnimationTrack = findTrackInBaseAnimations(track.name);
      let index = baseAnimation.tracks.indexOf(baseAnimationTrack);
      baseAnimation.tracks[index].values = calculateMeanFromToArrays(
        track.values, 
        baseAnimationTrack.values
        );
    });
  });
}

function findTrackInBaseAnimations(name){
  for (const track of baseAnimation.tracks) {
    if (track.name === name) {
      return track;
    }
  }
  return null;
}

function calculateMeanFromToArrays(array1, array2){
  if (array1.length !== array2.length) {
    throw new Error("Arrays are not the same length. Cant calculate Mean.");
  }

  return array1.map((value, index) => value );
}

function normalizeKeyFrameTrackValueArrays(){
  //normalizes all quaternion and Vector value-Arrays
  //for the animations in the animationsToApply-array
  animationsToApply.forEach(animation => {
    animation.tracks.forEach(track =>{
      if(track instanceof QuaternionKeyframeTrack ||
          track instanceof VectorKeyframeTrack){
        track.values = normalizeValueArray(
          track, 
          baseAnimation.tracks[0].times
        );
      }
    })
  });
}

function normalizeValueArray(track, timesArray){
  //Works with Vector and Quaternion KeyFrameTracks
  let valueArray = track.values;
  let newLength;
  let newArray = [];
  let objectSize;

  if(track instanceof QuaternionKeyframeTrack){
    //Quaternion is representated by 4 values
    objectSize = 4;
  }
  else if(track instanceof VectorKeyframeTrack){
    //Vector is representated by 3 values
    objectSize = 3;
  }

  if(valueArray.length <= objectSize){
    return valueArray;
  }

  newLength = timesArray.length * objectSize;
  
  for(let i = 0; i < valueArray.length; i+=objectSize){
    console.log("test");
    for(let j = 0; j < objectSize; j++){
      newArray.push(valueArray[i+j]);
    }

    if(i+objectSize >= valueArray.length && 
        newArray.length < newLength){
      track.values = newArray;
      return normalizeValueArray(track, timesArray);
    }

    for(let j = 0; j < objectSize; j++){
      let mean = (valueArray[i + j] + valueArray[i+objectSize+j])
         / 2;
      newArray.push(mean);
    }

    if(newArray.length === newLength){
      return newArray;
    }
  }

  return newArray;
}

function addMissingTracksToBaseAnimation(){
  //add tracks that the other animations have, 
  //that are missing in baseAnimation
  animationsToApply.forEach(animation => {
    animation.tracks.forEach(track =>{
      if(!baseAnimationContainsTrack(track)){
        let newTrack = createNewTrack(track);

        newTrack.times = baseAnimation.tracks[0].times;
        
        let valueArraySize = getRequiredValueArraySize(newTrack);
        newTrack.values = new Array(valueArraySize).fill(0);

        baseAnimation.tracks.push(newTrack);
      }
    })
  });
}

function createNewTrack(oldTrack){
  if(oldTrack instanceof QuaternionKeyframeTrack){
    return new QuaternionKeyframeTrack(oldTrack.name,
      oldTrack.times, oldTrack.values);
  }
  else if(oldTrack instanceof VectorKeyframeTrack){
    return new VectorKeyframeTrack(oldTrack.name,
      oldTrack.times, oldTrack.values);
  }
}

function getRequiredValueArraySize(track){
  if(track instanceof QuaternionKeyframeTrack){
    return track.times.length * 4;
  }
  else{
    return track.times.length * 3;
  }
}

function applyWeights(weights){
  const identityQuaternion = new Quaternion(); 

  for(let i=0; i< animationsArray.length; i++){
    animationsArray[i].tracks.forEach(track => {
      if(!(track instanceof VectorKeyframeTrack)){
        let quaternionArray = getQuaternionsFromValuesArray(track.values);
        quaternionArray.forEach(quaternion => {
          quaternion.slerp(identityQuaternion, (1- weights[i]/100));
        });
        const newValues = [];
        for (const quaternion of quaternionArray) {
          newValues.push(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
        }
        track.values = newValues;
      }
      //track.values = track.values.map(value => value * (weights[i] /100));
    });
  }
}

function getQuaternionsFromValuesArray(quaternionValues){
  let quaternionArray =[];

  for (let i = 0; i < quaternionValues.length; i += 4) {
      const quaternion = new Quaternion(
          quaternionValues[i],
          quaternionValues[i + 1],
          quaternionValues[i + 2],
          quaternionValues[i + 3]
      );
      quaternionArray.push(quaternion);
  }
  return quaternionArray;
}

async function createAnimationsArray(fileArray, model){
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
      animation = retargetBVH(animation, model);
    }
    else if(animationFile.name.toLowerCase().endsWith('.glb')){
      animation = await loadGLTFAnimation(animationFile.content);
    }
    animationsArray.push(animation);
  }

  return animationsArray;
}

function setBaseAnimation(){
  //sets the animation with the longest duration as baseAnimation
  animationsArray.forEach(animation => {
    if(baseAnimation === undefined || 
      baseAnimation.duration < animation.duration){
        baseAnimation = animation;
    }
  });

  animationsToApply = [...animationsArray];

  let baseAnimationIndex = animationsToApply.indexOf(baseAnimation);
  
  animationsToApply.splice(baseAnimationIndex, 1);
}

function baseAnimationContainsTrack(trackToCheck){
  for (const track of baseAnimation.tracks) {
    if (track.name === trackToCheck.name) {
      console.log(`${track.name} is equal to ${trackToCheck.name}`);
      return true;
    }
  }
  return false;
}

function retargetBVH(animation, model){
  let skeletonHelper;
  
  const clip = animation.clip;
  const skeleton = animation.skeleton;

  skeletonHelper = new SkeletonHelper(skeleton.bones[0]);
  skeletonHelper.skeleton = skeleton;

  skeletonHelper.rotation.set(90,90,90);
  
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
    //preservePosition: true,
    //preserveHipPosition: true,
    //useFirstFramePosition: true
  };
  
  console.log(model);
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
  
  // model.skeleton.bones.forEach( bone =>{
  //   bone.scale.set(1,1,1);
  // });
  
  //mixer = new AnimationMixer(model);
  //model.position.set(0,0,3);
  
  console.log(newClip);
  console.log(model);
  return newClip
}

export { morphAnimations}