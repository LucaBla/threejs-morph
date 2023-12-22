import { VectorKeyframeTrack } from 'three';
import { BVHLoader } from 'three/examples/jsm/loaders/BVHLoader.js';

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
      console.log(animation);
      resolve(animation);
    } else {
      reject(new Error('Failed to parse BVH animation.'));
    }
  });
}

export {loadBVHAnimation};