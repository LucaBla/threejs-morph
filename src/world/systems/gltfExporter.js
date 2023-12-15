import { Bone, BoxGeometry, SkinnedMesh, Triangle } from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

const exporter = new GLTFExporter();

function exportGLTF(scene, animationsToDownload){
  
  // exporter.parse(
  //   scene,
  //   function ( gltf ) {
  //     console.log( gltf );
  //     downloadJSON( gltf );
  //   },
  //   function ( error ) {
  //     console.log( 'An error happened' );
  //   },
  //   options
  // );
  
  const options = {
    binary: true, // Exportiere als binäre GLB-Datei (statt GLTF)
    trs: false,   // True, wenn Transformation, Rotation und Skalierung gespeichert werden sollen
    onlyVisible: true, // True, wenn nur sichtbare Objekte exportiert werden sollen
    truncateDrawRange: true, // True, um DrawRange in Geometrien zu kürzen
    embedImages: true, // True, um Texturen als Base64-Inline zu speichern
    animations: animationsToDownload, // Array von Animationen, die exportiert werden sollen
};

const exportScene = createExportScene(scene);

console.log(exportScene);

exporter.parse(exportScene, function (result) {
  if (result instanceof ArrayBuffer) {
      // result ist eine ArrayBuffer, den du beispielsweise in eine Datei speichern kannst
      saveArrayBuffer(result, 'morphedAnimation.glb');
      console.log(result);
  } else {
      // result könnte auch ein JSON-Objekt sein, wenn binary: false im options-Objekt gesetzt ist
      console.error('Fehler beim Exportieren der GLB-Datei.');
      console.log(JSON.stringify( result, null, 2 ));
      console.log(typeof result);
  }
},function ( error ) {

  console.log( error );

}, options);

}

function saveArrayBuffer(buffer, filename) {
  const blob = new Blob([buffer], { type: 'application/octet-stream' });
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
  exportScene.children.forEach(child => {
    if(child.name === "Model"){
      child.children.forEach(subChild =>{
        if(subChild instanceof Bone){
          child.children = [subChild];
          console.log(typeof child.children[0]);
        }
      })
    }
  });
}

// function downloadJSON( json, filename ) {

// 	saveString( JSON.stringify( json ), filename );  

// }

// var link = document.createElement( 'a' );
// link.style.display = 'none';
// document.body.appendChild( link ); // Firefox workaround, see #6594

// function save( blob, filename ) {

// 	link.href = URL.createObjectURL( blob );
// 	link.download = filename;
// 	link.click();

// 	// URL.revokeObjectURL( url ); breaks Firefox...

// }

// function saveString( text, filename ) {

// 	save( new Blob( [ text ], { type: 'text/plain' } ), filename );

// }

export {exportGLTF};
