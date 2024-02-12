import { Bone, BoxGeometry, SkinnedMesh, Triangle } from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

const exporter = new GLTFExporter();

function exportGLTF(scene, animationsToDownload){
  
  const options = {
    binary: true, // if true, export as binary
    trs: false,   // if true, saves transform, rotation and scale
    onlyVisible: true, // if true, exports only visible objects
    truncateDrawRange: true, // if true, shortens the DrawRange in geometries
    embedImages: true, // if true, saves textures as Base64-Inline
    animations: animationsToDownload, // the array of animations to be exported
};

const exportScene = createExportScene(scene);

exporter.parse(exportScene, function (result) {
  if (result instanceof ArrayBuffer) {
      // ArrayBuffer can be saved in File
      saveArrayBuffer(result, 'morphedAnimation.glb');
      console.log(result);
  } else {
      // result could not be converted to ArrayBuffer
      // try to return it as a JSON-Object
      console.error('Fehler beim Exportieren der GLB-Datei.');
      console.log(JSON.stringify( result, null, 2 ));
      console.log(typeof result);
  }
},function ( error ) {

  console.log( error );

}, options);

}

function saveArrayBuffer(buffer, filename) {
  // blob is a file-like object of raw data
  // the file can only be downloaded by clicking a link
  // so a link to the file is created and instantly clicked by js
  const blob = new Blob([buffer]);
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

function createExportScene(scene){
  const exportScene = scene.clone();

  clearUpExportScene(exportScene);

  return exportScene;
}

function clearUpExportScene(exportScene){
  // remove everything from the export scene
  // expect the skeleton of the model
  exportScene.children.forEach(child => {
    if(child.name === "Model"){
      child.children.forEach(subChild =>{
        if(subChild instanceof Bone){
          child.children = [subChild];
          exportScene.children = [child];
        }
      })
    }
  });
}

export {exportGLTF};
