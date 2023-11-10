import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { LoadingManager } from 'three';

const menLoadingManager = new LoadingManager();


async function loadMen(){
  const loader = new FBXLoader(menLoadingManager);

  const men = await loader.loadAsync('assets/models/men.fbx');
  return men;
}

async function loadAnimation(animationPath){
  const loader = new FBXLoader();

  const animation = await loader.loadAsync(animationPath);
  return animation.animations[0];
}

export {loadMen, loadAnimation, menLoadingManager};