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
  console.log(baseAnimation);
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

  console.log(baseAnimation);

  return baseAnimation;
}

function weightedAverageQuaternions(quaternions, weights) {
  // calculates the weighted average of the given quaternions
  // each quaternion is multiplied by its corresponding weight
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

  // calculate the weighted sums of forward and upward vectors
  for (let i = 0; i < count; i++) {
    const weightedForward = new Vector3(0, 0, 1).applyQuaternion(quaternions[i]).multiplyScalar(weights[i]);
    const weightedUpward = new Vector3(0, 1, 0).applyQuaternion(quaternions[i]).multiplyScalar(weights[i]);

    forwardSum.add(weightedForward);
    upwardSum.add(weightedUpward);
  }

  // calculate the average of the weighted sums
  forwardSum.divideScalar(count);
  upwardSum.divideScalar(count);

  const resultQuaternion = new Quaternion();
  const matrix = new Matrix4();

  // Create a rotation matrix 
  // that aligns the object to the forward vector, 
  // with upward as the orientation
  matrix.lookAt(forwardSum, new Vector3(), upwardSum);

  //set the quaternion based on the rotation matrix
  resultQuaternion.setFromRotationMatrix(matrix);

  return resultQuaternion;
}

function weightedAverageVector3(vectors, weights){
  // calculates the weighted average of the given Vectors
  // each Vector is multiplied by its corresponding weight
  if (vectors.length === 0 || vectors.length !== weights.length) {
    console.log(vectors.length);
    console.log(weights.length);
    console.error("VectorList is empty or has a different size than the weightsList");
    return null;
  }

  let weightedSum = new Vector3();

  // calculate the weighted vectors and sums them up
  for (let i = 0; i < vectors.length; i++) {
    const weightedVector = vectors[i].clone().multiplyScalar(weights[i]);
    weightedSum.add(weightedVector);
  }

  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

  if (totalWeight !== 0) {
    // returns the average of all the weighted vectors
    const average = weightedSum.divideScalar(totalWeight);
    return average;
  } else {
    console.error("totalWeight is 0!");
    return null;
  }
}

function combineAnimations(weights){
  // combines the given animations by combining their KeyFrameTracks
  const tracksToCombineList = getTracksToCombineList();

  // iterarte throughtracks with the same name to combine them
  for(const sameNamedTracks of tracksToCombineList) {
    // extract name and type of the track
    const trackName = findFirstNameInTrackList(sameNamedTracks);
    const trackType = trackName.split('.')[1];
    
    //elements meaning either quaternion or vector3
    const elementsTracksArrays = [];

    // converting the KeyFrameTracks of tracks with the same name to
    // element(quaternion/vector) arrays and then adding these arrays 
    // to the elementsTracksArrays
    sameNamedTracks.forEach(track => {
      if(track !== null){
        let elementArray;
        if(trackType === 'quaternion'){
          elementArray = getQuaternionsFromValuesArray(track.values);
        }
        else if(trackType === 'position' || trackType === 'scale'){
          elementArray = getVectorsFromValuesArray(track.values);
        }
        else{
          console.error('Invalid Type!');
        }

        elementsTracksArrays.push(elementArray);
      }
      else{
        elementsTracksArrays.push(null);
      }
    })

    // calculates the weighted average of the elementsTracksArrays
    let averagedElementsArray = 
      weightedAverageElementArray(elementsTracksArrays, weights);
    
    const newValuesArray = [];

    // convert the weighted averaged elements
    // from the averagedElementsArray to an array
    // to make them compatible with KeyFrameTracks
    for(const element of averagedElementsArray){
      newValuesArray.push(
        ...elementToArray(element)
      );
    }

    if(findTrackInBaseAnimations(trackName)){
      // exchanges the values of a given track
      // with the calculated weighted averages
      exchangeTrackValuesInBaseAnimation(newValuesArray, trackName);
    }
    else{
      // track could not be found in baseAnimation
      // so a new one will be created
      addTrackToBaseAnimation(trackName, trackType, newValuesArray);
    }
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
  // adds a new track to the baseAnimation
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
  // exchanges the values of a track in the baseAnimation
  // with the given values
  let foundTrack = findTrackInBaseAnimations(trackName);
    if(foundTrack != null){
      findTrackInBaseAnimations(trackName).values = newValues;
    }
}

function elementToArray(element){
  // converts a element of type quaternion or Vector3 to an array
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
  // searches through all the animations that should be combined
  // returns an array of arrays combining all the
  // tracks with the same name (meaning these should be combined)
  const tracksToCombineList = [];
  let sameNamedTracks = [];

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
  // returns an array containing the weighted averaged elements
  // of the given elementArray
  // elementArray is an array of arrays containing elements (q/v3)
  // every array in the elementArray represents a KeyFrameTrack ValueArray

  // weightsArray should not be modified during the calculations
  // otherwiseweights will be missing if the algortithm is started again
  const tempWeights = [...weights];

  // find the type (Quaternion/Vector3) of the elements in the array
  const type = findFirstTypeInElementList(elementArray);

  if(elementArray.length > 0){
    // array to store elements with the same index 
    // from different arrays
    const sameIndexElements = [];

    const averagedElementsArrays = [];

    // determine the length of each array in the elementArray
    const elementsArrayElementLength = 
      findFirstLengthInElementLists(elementArray);

      // find indexes to remove if an element is null in elementArray
      const indexesToRemove = [];
      for(let i = 0; i < elementsArrayElementLength; i++){
        if(elementArray[i] === null){
          // track had no element with this index 
          // so it is removed from calculations
          indexesToRemove.push(i);
        }
      }
      
      // remove elements and corresponding weights
      // for indexes marked for removal
      for (let i = indexesToRemove.length - 1; i >= 0; i--) {
        const index = indexesToRemove[i];
        elementArray.splice(index, 1);
        tempWeights.splice(index, 1);
      }
    
    for(let i = 0; i < elementsArrayElementLength; i++){
      // gather elements with the same index from different arrays
      // inside elementArray
      for(let j = 0; j < elementArray.length; j++){
        sameIndexElements.push(elementArray[j][i]);
      }

      let weightedElement;

      // calculate weighted average
      // based on element type (Quaternion or Vector3)
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

      // clear the sameIndexElements array for the next iteration
      sameIndexElements.length = 0;
    }

    return(averagedElementsArrays);
  }

  // handle the case where the elementArray is empty
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
  // normalizes the values array of a KeyFrameTrack
  // normalizing means adkusting the array to the given times array
  // quaternion value arrays need to be x4 the size of times array
  // vector3 needs to be x3
  if(!(track instanceof VectorKeyframeTrack || 
  track instanceof QuaternionKeyframeTrack)){
    console.error("Track is not of type Quaternion or VectorKeyframeTrack");
    return null
  }

  if(track.values.length === 0){
    console.error(`Track${track.name} values array is empty!`);
    return track.values;
  }

  let valueArray = track.values;
  let newArray = [];
  let elementSize;
  let newLength;
  let elementsArray = [];
  let newElementsArray = [];

  // determines the size of an element based on track type
  // and converts the value arrays into elementsArrays
  if(track instanceof QuaternionKeyframeTrack){
    elementSize = 4;
    elementsArray = getQuaternionsFromValuesArray(valueArray);
  }
  else if(track instanceof VectorKeyframeTrack){
    elementSize = 3;
    elementsArray = getVectorsFromValuesArray(valueArray);
  }

  // calculates the desired length of the normalized values array
  newLength = timesArray.length * elementSize;

  // check if the values array is already of the correct size
  if(valueArray.length === newLength){
    track.times = baseAnimation.tracks[0].times;
    return valueArray;
  }

  // check if the values array is smaller than the element size
  if(valueArray.length <= elementSize){
    // the array only contains one object
    // double it so the function can then fill it
    elementsArray = elementsArray.concat(elementsArray);
  }

  for(let i = 0; i < elementsArray.length; i++){
    newElementsArray.push(elementsArray[i]);

    // check if the new elements array has reached the desired length
    if(newElementsArray.length * elementSize === 
        newLength){
          break;
    }

    // check if the current iteration is the last element in the array
    if( i === elementsArray.length - 1){
      // Stop the loop 
      // since there cannot be an average between the last 
      // and a non-existing element
      break;
    }

    // interpolate values based on track type
    if(track instanceof QuaternionKeyframeTrack){
      let newQuaternion = new Quaternion;
  
      newElementsArray.push(
        //average of two quaternions
        newQuaternion.slerpQuaternions(
          elementsArray[i], 
          elementsArray[i + 1], 
          .5
        )
      );
    }
    else if(track instanceof VectorKeyframeTrack){
      let newVector3 = new Vector3;

      newElementsArray.push(
      //average of two vectors
      newVector3.lerpVectors(
        elementsArray[i], 
        elementsArray[i + 1], 
        .5
      )
    );
    }

    // check if the new elements array has reached the desired length
    if(newElementsArray.length * elementSize === 
      newLength){
        break;
    }
  }

  // convert the new elements array 
  // to a flat array of values based on track type
  if(track instanceof QuaternionKeyframeTrack){
    for(const quaternion of newElementsArray){
      newArray.push(
        quaternion.x, 
        quaternion.y, 
        quaternion.z, 
        quaternion.w
      );
    }
  }
  else if(track instanceof VectorKeyframeTrack){
    for(const vector of newElementsArray){
      newArray.push(
        vector.x, 
        vector.y, 
        vector.z
      );
    }
  }

  // check if the new array is of the correct length
  if(newArray.length === newLength){
    track.times = baseAnimation.tracks[0].times;
    return newArray;
  }
  else if(newArray.length < newLength){
    // new array is smaller than the desired length 
    // update track values and run function recursively
    track.values = newArray;
    return normalizeTracksValueArray(track, timesArray);
  }
  else{
    // new array is larger than the desired length
    console.error("ERROR size is: " + newArray.length + " Should be: " + newLength);
    return null;
  }
  
}

function fillTrackNameList(){
  // fill the list with the names of all the tracks
  // of the animations that should be combined
  animationsArray.forEach(animation =>{
    animation.tracks.forEach(track =>{
      if(!trackNameList.includes(track.name)){
        trackNameList.push(track.name);
      }
    })
  })
}

function getVectorsFromValuesArray(vectorValues){
  // receives an array of values representing multiple Vector3s
  // and returns an array of Vector3 elements
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
  // receives an array of values representing multiple quaternions
  // and returns an array of quaternion elements
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
  // receives the fileArray, loads the animations from these files
  // and returns an array of said animations
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

  return newBaseAnimation;
}

export { morphAnimations}