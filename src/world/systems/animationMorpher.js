import { loadBVHAnimation, retargetBVH } from "./bvhLoader";
import { loadFBXAnimation } from "./fbxLoader";
import { loadGLTFAnimation } from "./gltfLoader";
import { Matrix4, Quaternion, QuaternionKeyframeTrack, Vector3, VectorKeyframeTrack } from "three";


let animationsArray = [];

let baseAnimation;

let trackNameList;

async function morphAnimations(fileArray, weights, model, isHipsRotationLocked){
  animationsArray = await createAnimationsArray(fileArray, model);

  let weightsCopy = removeZeroWeightAnimationsFromArray(weights);
  baseAnimation = findBaseAnimation();
  trackNameList = [];
  fillTrackNameList();
  normalizeKeyFrameTrackValueArrays();
  combineAnimations(weightsCopy);

  baseAnimation.tracks.forEach(track=>{
    track.validate();
  });

  if(isHipsRotationLocked){
    findTrackInBaseAnimations("Hips.quaternion").values = baseAnimation.tracks[0].values.map(() => 0);
  }

  return baseAnimation;
}

function weightedAverageQuaternions(quaternions, weights) {
  if (quaternions.length === 0 || 
      weights.length !== quaternions.length) {
    console.error('Ungültige Eingabeparameter');
    console.log(quaternions);
    console.log(weights);
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

  //Create a rotation matrix 
  //that aligns the object to the forward vector, 
  //with upward as the orientation
  matrix.lookAt(forwardSum, new Vector3(), upwardSum);

  //set the quaternion based on the rotation matrix
  resultQuaternion.setFromRotationMatrix(matrix);

  return resultQuaternion;
}

function weightedAverageVector3(vectors, weights){
  if (vectors.length === 0 || vectors.length !== weights.length) {
    console.log(vectors.length);
    console.log(weights.length);
    console.error("VectorList is empty or has a different size than the weightsList");
    return null;
  }

  let weightedSum = new Vector3();

  for (let i = 0; i < vectors.length; i++) {
    const weightedVector = vectors[i].clone().multiplyScalar(weights[i]);
    weightedSum.add(weightedVector);
  }

  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

  if (totalWeight !== 0) {
    const average = weightedSum.divideScalar(totalWeight);
    return average;
  } else {
    console.error("totalWeight is 0!");
    return null;
  }
}

function combineAnimations(weights){
  const tracksToCombineList = getTracksToCombineList();

  for(const sameNamedTracks of tracksToCombineList) {
    const trackName = findFirstNameInTrackList(sameNamedTracks);
    const trackType = trackName.split('.')[1];
      //elements meaning quaternion or vector3
      const elementsTracksArrays = [];

      sameNamedTracks.forEach(track => {
        if(track !== null){
          let element;
          if(trackType === 'quaternion'){
            element = getQuaternionsFromValuesArray(track.values);
          }
          else if(trackType === 'position' || trackType === 'scale'){
            element = getVectorsFromValuesArray(track.values);
          }
          else{
            console.error('Invalid Type!');
          }

          elementsTracksArrays.push(element);
        }
        else{
          elementsTracksArrays.push(null);
        }
      })

      let averagedElementsArray = 
        weightedAverageElementArray(elementsTracksArrays, weights);
      
        const newValuesArray = [];

        for(const element of averagedElementsArray){
          newValuesArray.push(
            ...elementToArray(element)
          );
        }

        if(findTrackInBaseAnimations(trackName)){
          exchangeTrackValuesInBaseAnimation(newValuesArray, trackName);
        }
        else{
        //track could not be found in baseAnimation
        addTrackToBaseAnimation(trackName, trackType, newValuesArray);
        }
  }
}

function getTypeFromTrack(track){
  if(track instanceof VectorKeyframeTrack){
    return Vector3.constructor;
  }
  else if(track instanceof QuaternionKeyframeTrack){
    return Quaternion.constructor;
  }
  else{
    console.error("Invalid Type!");
    return null;
  }
}

function findFirstNameInTrackList(trackList){
  for(const track of trackList){
    if(track !== null){
      return track.name;
    }
  }
}

function addTrackToBaseAnimation(trackName, trackType, newValues){
  let newTrack;

  if(trackType === 'quaternion'){
    newTrack = new QuaternionKeyframeTrack(
      trackName, 
      baseAnimation.tracks[0].times, 
      newValues
    )
  }
  else if(trackType === 'position'){
    newTrack = new VectorKeyframeTrack(
      trackName, 
      baseAnimation.tracks[0].times, 
      newValues
    )
  }
  else if(trackType === 'scale'){
    newTrack = new VectorKeyframeTrack(
      trackName, 
      baseAnimation.tracks[0].times, 
      newValues
    )
  }
  else{
    console.error('Invalid Type!' + trackType);
  }

  baseAnimation.tracks.push(newTrack);
}

function exchangeTrackValuesInBaseAnimation(newValues, trackName){
  let foundTrack = findTrackInBaseAnimations(trackName);
    if(foundTrack != null){
      findTrackInBaseAnimations(trackName).values = newValues;
    }
}

function elementToArray(element){
  if(element instanceof Quaternion){
    return quaternionToArray(element);
  }
  else if(element instanceof Vector3){
    return vector3ToArray(element);
  }
  else{
    console.error("Invalid Type!");
    return null;
  }
}

function quaternionToArray(quaternion){
  let result = [];

  result.push(
    quaternion.x,
    quaternion.y,
    quaternion.z,
    quaternion.w
  );

  return(result);
}

function vector3ToArray(vector3){
  let result = [];

  result.push(
    vector3.x,
    vector3.y,
    vector3.z
  );

  return(result);
}

function getTracksToCombineList(){
  const tracksToCombineList = [];
  let sameNamedTracks = [];

  //find all the tracks with the same name
  trackNameList.forEach(trackName =>{
    animationsArray.forEach(animation =>{
      let searchedTrack = findTrackInAnimation(animation, trackName);
      sameNamedTracks.push(searchedTrack);
    })

    tracksToCombineList.push(sameNamedTracks);
    sameNamedTracks = [];
  })

  return tracksToCombineList;
}

function findFirstTypeInElementList(elementList){
  for(const element of elementList){
    if(element !== null){
      return element[0].constructor;
    }
  }
}

function findFirstLengthInElementLists(elementList){
  for(const element of elementList){
    if(element !== null){
      return element.length;
    }
  }
}

function weightedAverageElementArray(elementArray, weights){
  const tempWeights = [...weights];
  const type = findFirstTypeInElementList(elementArray);

  if(elementArray.length > 0){
    const sameIndexElements = [];
    const averagedElementsArrays = [];

    //the size of all the element arrays in elementArray
    const elementsArrayElementLength = 
      findFirstLengthInElementLists(elementArray);

      const indexesToRemove = [];
      for(let i = 0; i < elementsArrayElementLength; i++){
        if(elementArray[i] === null){
          //this track had no element with this name
          //so its removed because it cant be used to calculate the average
          indexesToRemove.push(i);
        }
      }
      
      for (let i = indexesToRemove.length - 1; i >= 0; i--) {
        const index = indexesToRemove[i];
        elementArray.splice(index, 1);
        tempWeights.splice(index, 1);
      }
    
    for(let i = 0; i < elementsArrayElementLength; i++){
      for(let j = 0; j < elementArray.length; j++){
        sameIndexElements.push(elementArray[j][i]);
      }
      let weightedElement;
      if(type === Quaternion){
        weightedElement = weightedAverageQuaternions(
          sameIndexElements, tempWeights)
      }
      else if(type === Vector3){
        weightedElement = weightedAverageVector3(sameIndexElements, 
          tempWeights)
      }
      else{
        console.error("Type Error " + type);
      }
      
      averagedElementsArrays.push(
        weightedElement
      );

      sameIndexElements.length = 0;
    }

    return(averagedElementsArrays);
  }
  console.error("Could not weight Quaternion Array!");
  return null;
}

function findTrackInAnimation(animation, trackName){
  for(const track of animation.tracks){
    if(track.name === trackName){
      return track;
    }
  }

  console.warn(`Could not find track:\n ${trackName}\n in Animation:\n ${animation.name}`);
  return null;
}

function removeZeroWeightAnimationsFromArray(weights){
  let weightsCopy = [...weights];

  for(let i = weights.length -1; i >= 0; i--){
    if(weightsCopy[i] === 0){
      weightsCopy.splice(i, 1);
      animationsArray.splice(i,1);
    }
  }

  return weightsCopy;
}

function findTrackInBaseAnimations(name){
  for (const track of baseAnimation.tracks) {
    if (track.name === name) {
      return track;
    }
  }
  return null;
}

function normalizeKeyFrameTrackValueArrays(){
  //normalizes all quaternion and Vector value-Arrays
  for(const animation of animationsArray){
    // if(animation === baseAnimation){
    //   continue;
    // }

    animation.duration = baseAnimation.duration;

    animation.tracks.forEach(track =>{
      track.values = normalizeTracksValueArray(
        track,
        baseAnimation.tracks[0].times
      )
    })
  }
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
    //double it so the function can then fill it
    componentsArray = componentsArray.concat(componentsArray);
    //return valueArray;
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
      //average of two vectors
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
  let animationsArray = [];

  for (const animationFile of fileArray) {
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

function findBaseAnimation(){
  //sets the animation with the longest duration as baseAnimation
  let newBaseAnimation;

  animationsArray.forEach(animation => {
    if(newBaseAnimation === undefined || 
      newBaseAnimation.duration < animation.duration){
        newBaseAnimation = animation;
    }
  });

  return newBaseAnimation.clone();
}

export { morphAnimations}