import { SkeletonHelper } from 'three';
import { BVHLoader } from 'three/examples/jsm/loaders/BVHLoader.js';
import { renamingMap } from '../components/renamingMap';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

async function loadBVHAnimation(animationBuffer){
  // const loader = new BVHLoader();
  // console.log(animationPath);

  // //const animation = await loader.loadAsync(animationPath);
  // const animation = await loader.parse(animationPath);
  // return animation.animations[0];
  return new Promise((resolve, reject) => {
    const loader = new BVHLoader();

    const text = new TextDecoder().decode(animationBuffer);
    const animation = loader.parse(text);
    
    if (animation) {
      //animation.clip.tracks = animation.clip.tracks.filter(track => !(track instanceof VectorKeyframeTrack));
      //animation.skeleton.bones[0].position.set(0,0,0);
      updateBoneNamesForAnimation(animation.clip);
      updateBoneNamesForSkeleton(animation.skeleton);
      resolve(animation);
    } else {
      reject(new Error('Failed to parse BVH animation.'));
    }
  });
}

function updateBoneNamesForAnimation(animation){
  for(const track of animation.tracks){
    const oldName = getSubstringBeforeDot(track.name);

    if(renamingMap.hasOwnProperty(oldName)){
      const newName = renamingMap[oldName];
      track.name = track.name.replace(oldName, newName);
    }
    else{
      console.warn(`Could not find bone ${oldName} in renamingMap!`);
    }
  }

  console.log(animation);
}

function updateBoneNamesForSkeleton(skeleton){
  for(const bone of skeleton.bones){
    const oldName = getSubstringBeforeDot(bone.name);

    if(oldName === "ENDSITE"){
      continue;
    }

    if(renamingMap.hasOwnProperty(oldName)){
      bone.name = renamingMap[oldName];
    }
    else{
      console.warn(`Could not find bone ${oldName} in renamingMap!`);
    }
  }
}

function getSubstringBeforeDot(inputString) {
  const parts = inputString.split('.');
  return parts.length > 1 ? parts[0] : inputString;
}

function retargetBVH(animation, model){
  let skeletonHelper;
  
  const clip = animation.clip;
  const skeleton = animation.skeleton;

  skeletonHelper = new SkeletonHelper(skeleton.bones[0]);
  skeletonHelper.skeleton = skeleton;

  skeletonHelper.rotation.set(90,90,90);
  
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
    //preserveHipPosition: false,
    //useFirstFramePosition: true
  };
  
  const newClip = SkeletonUtils.retargetClip(model.children[1], skeletonHelper, clip, options);
  
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
  
  return newClip
}

export {loadBVHAnimation, retargetBVH};