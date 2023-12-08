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
      //test(animation);
      console.log(animation.clip.tracks);
      resolve(animation);
    } else {
      reject(new Error('Failed to parse BVH animation.'));
    }
  });
}

function test(animation){
  console.log(animation.clip);
  animation.clip.tracks.forEach(track => {
    if(track instanceof VectorKeyframeTrack){
      let j = 0;
      for(let i = 0; i < track.values.length; i++){
        if(j === 0){
          track.values[i] += 51;
        }
        else if(j === 1){
          track.values[i] -= 98;
        }
        else if(j == 2){
          track.values[i] += 10;
          j = 0;
        }
      }
    }
  });
}

export {loadBVHAnimation};