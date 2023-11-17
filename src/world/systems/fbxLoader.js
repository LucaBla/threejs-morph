import { FBXLoader } from '../../../node_modules/three/examples/jsm/loaders/FBXLoader.js';
import { LoadingManager } from '../../../node_modules/three';

const menLoadingManager = new LoadingManager();


async function loadMen(){
  const loader = new FBXLoader(menLoadingManager);

  const men = await loader.loadAsync('../../../assets/models/men.fbx');
  return men;
}

async function loadAnimation(animationPath){
  const loader = new FBXLoader();

  //const animation = await loader.loadAsync(animationPath);
  const animation = await loader.parse(animationPath);
  return animation.animations[0];
}

export {loadMen, loadAnimation, menLoadingManager};