import { World } from './world/world.js';
import { Clock } from 'three';

const clock = new Clock();


const switchModelBtns = document.getElementsByClassName('switch-model-btn');

const weightInputWrapper = document.getElementById('weight-input-wrapper');

const skeletonInput = document.getElementById('skeleton-input');

const hipRotationInput = document.getElementById('hip-rotation-input');

const startBtn = document.getElementById("start-btn");

const downloadBtn = document.getElementById("download-btn");

const container = document.querySelector('#scene-container');

const speedSlider = document.getElementById("speed-slider");
const sliderValueDisplay = document.getElementById("speed-slider-value");

const iterationsInput = document.getElementById("iterations-input");

const fileInput = document.getElementById("file-input");

const world = new World(container);


let activeModel = document.getElementsByClassName('switch-model-btn-active')[0];

let actionWeightInputs = document.getElementsByClassName("weight-input");

let enteredWeights = [];
let fileAndInputArray=[];
let animationSpeed = 1;
let animationIterations = 1;

document.addEventListener('animationsMorphedEvent', function(event) {
  unlockDownloadButton();
});

async function main() {
  world.render();
  
  const modelIdentifier = activeModel.id.split("-")[0];
  await world.init(modelIdentifier);
  animate(world);

  initializeEventListener();
  lockDownloadButton();
}

function animate(world){
  const delta = clock.getDelta();
  world.getControls().update();
  if(world.getMixer() != undefined){
    world.getMixer().update(delta);
  }
  if(world.getSkeletonMixer() != undefined){
    world.getSkeletonMixer().update(delta);
  }
  world.render();

  requestAnimationFrame(() => animate(world));
}

function initializeEventListener(){
  [...switchModelBtns].forEach(btn => {
    btn.addEventListener("click", ()=>{
      handleSwitchModelBtnClick(btn);
    })
  })

  skeletonInput.addEventListener("change", ()=>{
    world.handleSkeletonCheckBoxChange(skeletonInput.checked);
  })

  hipRotationInput.addEventListener("change", ()=>{
    world.handleHipRotationCheckBoxChange(hipRotationInput.checked);
  });

  startBtn.addEventListener("click", () => {
    const weightSum = sumUpWeights();
    if(weightSum >100 || weightSum < 99){
      alert("The sum of the weights must be 100 or 99!");
    }
    else{
      lockDownloadButton();
      world.handleStartBtnClick(
        enteredWeights, 
        animationSpeed, 
        animationIterations
      );
    }
  });

  downloadBtn.addEventListener("click", () =>{
    world.handleDownloadBtnClick();
  });

  speedSlider.addEventListener("input", () => {
    sliderValueDisplay.innerHTML = speedSlider.value + "x";
    animationSpeed = parseFloat(speedSlider.value);
  });

  iterationsInput.addEventListener("input", () => {
    if(iterationsInput.value < 0 || iterationsInput.value === ""){
      iterationsInput.value = 0;
    }
    while(iterationsInput.value.length > 1 && iterationsInput.value[0] == '0'){
      iterationsInput.value = iterationsInput.value.slice(1);
    }

    animationIterations = parseFloat(iterationsInput.value);
  });

  fileInput.addEventListener('change', handleFileSelect);
}

function lockDownloadButton(){
  downloadBtn.disabled = true;
}

function unlockDownloadButton(){
  downloadBtn.disabled = false;
}

function handleSwitchModelBtnClick(btn){
  if(!btn.classList.contains("switch-model-btn-active")){
    [...switchModelBtns].forEach(tempBtn => {
      if(tempBtn.classList.contains("switch-model-btn-active")){
        tempBtn.classList.remove("switch-model-btn-active");
      }
    });
    btn.classList.add("switch-model-btn-active");

    updateActiveModelReference();
    const modelIdentifier = activeModel.id.split("-")[0];
    console.log(modelIdentifier);
    world.updateModel(modelIdentifier, skeletonInput.checked);
  }
}

function updateActiveModelReference(){
  activeModel = document.getElementsByClassName('switch-model-btn-active')[0];
}

function sumUpWeights(){
  let sum = 0;

  for (let i = 0; i < enteredWeights.length; i++) {
    sum += enteredWeights[i];
  }

  return sum;
}

function updateUnassignedWeights(){
  let unassignedWeightsDisplay = document.getElementById("unassigned-weights");
  unassignedWeightsDisplay.innerHTML = (100 - sumUpWeights()).toFixed(1) + "%";
}

function handleInput(event, index){
  console.log(Array.from(actionWeightInputs));
  const input = Array.from(actionWeightInputs).find(input => input.id === index)
  if(input.value > 100){
    input.value = 100;
  }
  else if(input.value < 0){
    input.value = 0;
  }

  while(input.value.length > 1 && input.value[0] == '0'){
    input.value = input.value.slice(1);
  }

  if(input.value === ""){
    input.value = 0;
  }

  enteredWeights[Array.from(actionWeightInputs).indexOf(input)] = parseFloat(input.value);
  updateUnassignedWeights();
}

function handleFileSelect(event){
  const files = event.target.files;

  if (files.length > 0) {
    for(const file of files){
      readFile(file);
    }
  }
}

function readFile(file) {
  const reader = new FileReader();

  reader.onload = function (event) {
    const fileContent = event.target.result;

    processFileContent(fileContent, file.name);
  };

  reader.readAsArrayBuffer(file);
}

function processFileContent(fileContent, fileName) {
  if(fileName.toLowerCase().endsWith('.fbx') || 
    fileName.toLowerCase().endsWith('.bvh') ||
    fileName.toLowerCase().endsWith('.glb')){
      const file = {
        name: fileName, 
        content: fileContent
      };
    const input = createWeightInput(weightInputWrapper, fileName);
    world.handleFileUpload(file);

    fileAndInputArray.push({file: file, input: input});
  }
  else{
    alert("File must be .fbxm, .glb or .bvh!");
  }
  fileInput.value = "";
}

function createWeightInput(parentElement, labelContent){
  const label = document.createElement('label');
  label.textContent = labelContent.slice(0, -4);

  const input = document.createElement('input');
  input.type = 'number';
  input.classList.add('weight-input');
  input.id = enteredWeights.length;
  input.min = '0';
  input.max = '100';
  input.value = '0';

  enteredWeights.push(0);

  const deleteButton = document.createElement('button');
  deleteButton.classList.add('delete-button');
  deleteButton.innerHTML = `
    <img src="assets/icons/x.svg" alt="delete-button">
    `;

  const inputDeleteWrapper = document.createElement('div');
  inputDeleteWrapper.classList.add('input-delete-wrapper');
  
  const div = document.createElement('div');
  div.appendChild(label);
  div.appendChild(inputDeleteWrapper);
  
  inputDeleteWrapper.appendChild(input);
  inputDeleteWrapper.appendChild(deleteButton);
  
  parentElement.appendChild(div);

  actionWeightInputs = document.getElementsByClassName("weight-input");
  
  deleteButton.addEventListener('click', (event) => addDeleteEvent(event, input, parentElement, div));
  input.addEventListener("input", (event) => 
    handleInput(event, input.id)
  );

  return input;
}

function addDeleteEvent(event, input, parentElement, div) {
  parentElement.removeChild(div);
  actionWeightInputs = document.getElementsByClassName("weight-input");

  enteredWeights.splice(input.id, 1);
  updateUnassignedWeights();
  const fileToRemove = 
    fileAndInputArray.find(element => element.input === input).file;

  console.log(fileToRemove);
  world.handleFileRemove(fileToRemove);
  console.log(enteredWeights);
}


main();
