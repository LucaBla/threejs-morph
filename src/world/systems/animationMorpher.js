import { loadBVHAnimation } from "./bvhLoader";
import { loadFBXAnimation } from "./fbxLoader";
import { loadGLTFAnimation } from "./gltfLoader";
import { Bone, Matrix4, Quaternion, QuaternionKeyframeTrack, SkeletonHelper, Vector3, VectorKeyframeTrack } from "three";
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';


let animationsArray = [];

let animationsToApply = [];

let baseAnimation;

const trackNameList = [];

async function morphAnimations(fileArray, weights, model){
  console.log(fileArray);
  animationsArray = await createAnimationsArray(fileArray, model);
  //applyWeights VectoryKeyframeTrack not implemented
  removeZeroWeightAnimationsFromArray(weights);
  //applyWeights(weights, model);
  setBaseAnimation();
  fillTrackNameList();
  //addMissingTracksToBaseAnimation();
  //addMissing teleports model to bottom
  normalizeKeyFrameTrackValueArrays();
  combineAnimations(weights);
  console.log(animationsArray);
  console.log(animationsToApply);
  console.log(baseAnimation);
  console.log(weights);

  baseAnimation.tracks.forEach(track=>{
    console.log(track.validate());
  });

  return baseAnimation;
}

function weightedAverageQuaternions(quaternions, weights) {
  // Überprüfe die Bedingungen
  if (!quaternions || quaternions.length === 0 || !weights || weights.length < quaternions.length) {
      console.log(quaternions);
      console.log(weights);
      console.error('Ungültige Eingabeparameter');
      return null;
  }

  const count = quaternions.length;
  let forwardSum = new Vector3();
  let upwardSum = new Vector3();

  for (let i = 0; i < count; i++) {
      const weightedForward = new Vector3(0, 0, 1).applyQuaternion(quaternions[i]).multiplyScalar(weights[i]);
      const weightedUpward = new Vector3(0, 1, 0).applyQuaternion(quaternions[i]).multiplyScalar(weights[i]);

      forwardSum.add(weightedForward);
      upwardSum.add(weightedUpward);
  }

  forwardSum.divideScalar(count);
  upwardSum.divideScalar(count);

  const resultQuaternion = new Quaternion();
  const matrix = new Matrix4();

  // Erzeuge eine Rotationsmatrix, die das Objekt auf den forward Vektor ausrichtet, mit upward als Orientierung
  matrix.lookAt(forwardSum, new Vector3(), upwardSum);

  // Setze das Quaternion basierend auf der Rotationsmatrix
  resultQuaternion.setFromRotationMatrix(matrix);

  console.log(resultQuaternion);

  return resultQuaternion;
}

function combineAnimations(weights){
  //maybe müssen alle mittelwerte direkt zusammengerechnet werden
  //und nicht immer nur 2 wie aktuell
  let combineArray = [];

  trackNameList.forEach(trackName =>{
    animationsArray.forEach(animation =>{
      animation.tracks.forEach(track =>{
        if(track.name === trackName){
          combineArray.push(track);
          //break;
        }
      });
    })

    const quaternionArray = [];
    
    combineArray.forEach(track =>{
      if(track instanceof QuaternionKeyframeTrack){
        quaternionArray.push(
          getQuaternionsFromValuesArray(track.values)
        );
      }
    })
    combineArray = [];

    if(quaternionArray.length > 0){
      let averageArray = [];
      const resultArray =[];
      console.log(quaternionArray)
      console.log(combineArray);
      for(let i = 0; i < quaternionArray[0].length; i++){
        for(let j = 0; j < quaternionArray.length; j++){
          //j
          averageArray.push(quaternionArray[j][i]);
        }
        resultArray.push(
          weightedAverageQuaternions(averageArray, weights)
        );
        averageArray = [];
      }
      const newValues = [];
      for (const quaternion of resultArray) {
        newValues.push(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
      }
      findTrackInBaseAnimations(trackName).values = newValues;
    }
    //multiplyArrays(combineArray);
    //tracks combinieren
    //track in baseAnimation ersetzen
  })
  /////////////////////////////////////
  // animationsToApply.forEach(animation => {
  //   animation.tracks.forEach(track => {
  //     if(track.values.length <=4){
  //       return;
  //     }
  //     let baseAnimationTrack = findTrackInBaseAnimations(track.name);
  //     let index = baseAnimation.tracks.indexOf(baseAnimationTrack);
  //     baseAnimation.tracks[index].values = calculateMeanFromTwoArrays(
  //       track.values, 
  //       baseAnimationTrack.values
  //       );
  //   });
  // });
}

function multiplyArrays(...arrays) {
  console.log(arrays);
  // Überprüfe, ob alle Arrays die gleiche Länge haben
  const length = arrays[0].length;
  if (arrays.some(array => array.length !== length)) {
      console.error('Alle Arrays müssen die gleiche Länge haben.');
      return;
  }

  // Multipliziere die Elemente der Arrays elementweise
  const resultArray = arrays[0].map((_, index) =>
      arrays.reduce((product, array) => product * array[index], 1)
  );

  return resultArray;
}

function removeZeroWeightAnimationsFromArray(weights){
  console.log(weights);
  for(let i = 0; i < weights.length; i++){
    if(weights[i] === 0){
      weights.splice(i, 1);
      animationsArray.splice(i,1);
    }
  }
}

function findTrackInBaseAnimations(name){
  for (const track of baseAnimation.tracks) {
    if (track.name === name) {
      return track;
    }
  }
  return null;
}

function calculateMeanFromTwoArrays(array1, array2){
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
    for(let j = 0; j < objectSize; j++){
      //add the values from one valueArray object to the new array
      newArray.push(valueArray[i+j]);
    }

    if(i+objectSize >= valueArray.length && 
        newArray.length < newLength){
      //the new array is still to small
      //so this function needs to be called again (recursivly)
      track.values = newArray;
      return normalizeValueArray(track, timesArray);
    }

    for(let j = 0; j < objectSize; j++){
      //create a new mean object between two objects from the valueArray
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

function fillTrackNameList(){
  //fill the list with all track names
  animationsArray.forEach(animation =>{
    animation.tracks.forEach(track =>{
      if(!trackNameList.includes(track.name)){
        trackNameList.push(track.name);
      }
    })
  })
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

function applyWeights(weights, model){
  for(let i=0; i< animationsArray.length; i++){
    animationsArray[i].tracks.forEach(track => {
      if(!(track instanceof VectorKeyframeTrack)){
        let quaternionArray = getQuaternionsFromValuesArray(track.values);
        let modelBone = getModelBoneFromTrack(track, model);

        console.log(modelBone);
        
        quaternionArray.forEach(quaternion => {
          quaternion.slerp(modelBone.quaternion, (1- weights[i]/100));
        });
        const newValues = [];
          for (const quaternion of quaternionArray) {
            newValues.push(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
          }
        track.values = newValues;
      }
    });
  }
}

function getModelBoneFromTrack(track, model){
  const boneName = getBoneNameFromTrack(track);

  
  let skeleton;
  
  model.children.forEach(child =>{
    if(child instanceof Bone){
      skeleton = child;
    }
  })

  return findBoneByName(skeleton, boneName);
}

function findBoneByName(skeleton, boneName) {
  function recursiveSearch(bone) {
    if (bone.name === boneName) {
      return bone;
    }

    for (let i = 0; i < bone.children.length; i++) {
      const foundBone = recursiveSearch(bone.children[i]);
      if (foundBone) {
        return foundBone;
      }
    }

    return null;
  }

  return recursiveSearch(skeleton);
}

function getBoneNameFromTrack(track){
  const trackName = track.name;

  const trackNameParts = trackName.split('.');
  return trackNameParts[0];
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