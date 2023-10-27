import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { LoadingManager } from 'three';

const menLoadingManager = new LoadingManager();


async function loadMen(){
  const loader = new FBXLoader(menLoadingManager);

  const men = await loader.loadAsync('assets/models/men.fbx');
  return men;
}

async function loadHookAnimation(){
  const loader = new FBXLoader();

  const hookAnimation = await loader.loadAsync('assets/animations/rightHook.fbx');
  return hookAnimation;
}

export {loadMen, loadHookAnimation, menLoadingManager};