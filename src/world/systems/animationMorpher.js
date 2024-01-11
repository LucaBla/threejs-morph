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

  animationsArray[0].tracks.forEach(track=>{
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

  return resultQuaternion;
}

function combineAnimations(weights){
  //only works with quaternions for now
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
      if(track instanceof QuaternionKeyframeTrack &&
        track.values.length > 4){
        quaternionArray.push(
          getQuaternionsFromValuesArray(track.values)
        );
      }
    })

    console.log(combineArray);
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
      let foundTrack = findTrackInBaseAnimations(trackName);
      if(foundTrack != null){
        findTrackInBaseAnimations(trackName).values = newValues;
      }
      else{
        console.error(`Track ${trackName} could not be found`);
      }
    }
  })
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
    animation.duration = baseAnimation.duration;

    animation.tracks.forEach(track =>{
      // if(track instanceof QuaternionKeyframeTrack){
      //   track.values = normalizeQuaternionValueArray(
      //     track,
      //     baseAnimation.tracks[0].times
      //   )
      // }
      // else if(track instanceof VectorKeyframeTrack){
      //   track.values = normalizeVectorValueArray(
      //     track,
      //     baseAnimation.tracks[0].times
      //   )
      // }
      track.values = normalizeTracksValueArray(
        track,
        baseAnimation.tracks[0].times
      )
    })
  });
}

function normalizeTracksValueArray(track, timesArray){

  if(!(track instanceof VectorKeyframeTrack || 
  track instanceof QuaternionKeyframeTrack)){
    console.error("Track is not of type Quaternion or VectorKeyframeTrack");
    return null
  }

  let valueArray = track.values;
  let newArray = [];
  let componentSize;
  let newLength;
  let componentsArray = [];
  let newComponentsArray = [];

  if(track instanceof QuaternionKeyframeTrack){
    componentSize = 4;
    componentsArray = getQuaternionsFromValuesArray(valueArray);
  }
  else if(track instanceof VectorKeyframeTrack){
    componentSize = 3;
    componentsArray = getVectorsFromValuesArray(valueArray);
  }

  newLength = timesArray.length * componentSize;

  if(valueArray.length === newLength){
    //Track is the right size
    track.times = baseAnimation.tracks[0].times;
    return valueArray;
  }

  if(valueArray.length <= componentSize){
    //the array only contains one object
    return valueArray;
  }

  for(let i = 0; i < componentsArray.length; i++){
    newComponentsArray.push(componentsArray[i]);

    if(newComponentsArray.length * componentSize === 
        newLength){
          break;
    }

    if( i === componentsArray.length - 1){
      //stop the for-loop
      //because there cant be a average quaternion between
      //the last quaternion and a non existing one
      break;
    }

    if(track instanceof QuaternionKeyframeTrack){
      let newQuaternion = new Quaternion;
  
      newComponentsArray.push(
        //average of two quaternions
        newQuaternion.slerpQuaternions(
          componentsArray[i], 
          componentsArray[i + 1], 
          .5
        )
      );
    }
    else if(track instanceof VectorKeyframeTrack){
      let newVector3 = new Vector3;

      newComponentsArray.push(
      //average of two quaternions
      newVector3.lerpVectors(
        componentsArray[i], 
        componentsArray[i + 1], 
        .5
      )
    );
    }

    if(newComponentsArray.length * componentSize === 
      newLength){
        break;
    }
  }

  if(track instanceof QuaternionKeyframeTrack){
    for(const quaternion of newComponentsArray){
      newArray.push(
        quaternion.x, 
        quaternion.y, 
        quaternion.z, 
        quaternion.w
      );
    }
  }
  else if(track instanceof VectorKeyframeTrack){
    for(const vector of newComponentsArray){
      newArray.push(
        vector.x, 
        vector.y, 
        vector.z
      );
    }
  }

  if(newArray.length === newLength){
    track.times = baseAnimation.tracks[0].times;
    return newArray;
  }
  else if(newArray.length < newLength){
    track.values = newArray;
    return normalizeTracksValueArray(track, timesArray);
  }
  else{
    console.error("ERROR size is: " + newArray.length + " Should be: " + newLength);
    return null;
  }
  
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

function getVectorsFromValuesArray(vectorValues){
  let vectorArray =[];

  for (let i = 0; i < vectorValues.length; i += 3) {
      const vector3 = new Vector3(
        vectorValues[i],
        vectorValues[i + 1],
        vectorValues[i + 2]
      );
      vectorArray.push(vector3);
  }
  return vectorArray;
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
    animation.name = animationFile.name.toLowerCase();
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