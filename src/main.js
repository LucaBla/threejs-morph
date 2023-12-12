import { World } from './world/world.js';
import { Clock } from 'three';

const clock = new Clock();

const weightInputWrapper = document.getElementById('weight-input-wrapper');

const skeletonInput = document.getElementById('skeleton-input');

const startBtn = document.getElementById("start-btn");

const downloadBtn = document.getElementById("download-btn");

const container = document.querySelector('#scene-container');

const speedSlider = document.getElementById("speed-slider");
const sliderValueDisplay = document.getElementById("speed-slider-value");

const iterationsInput = document.getElementById("iterations-input");

const fileInput = document.getElementById("file-input");

const world = new World(container);

let actionWeightInputs = document.getElementsByClassName("weight-input");

let enteredWeights = [];
let animationSpeed = 1;
let animationIterations = 1;

async function main() {


  world.render();
  
  await world.init();
  animate(world);

  initializeEventListener();
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

  skeletonInput.addEventListener("change", ()=>{
    world.handleSkeletonCheckBoxChange(skeletonInput.checked);
  })

  startBtn.addEventListener("click", () => {
    const weightSum = sumUpWeights();
    if(weightSum >100 || weightSum < 99){
      alert("The sum of the weights must be 100 or 99!");
    }
    else{
      world.handleStartBtnClick(enteredWeights, animationSpeed, animationIterations);
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

function initializeWeightInputEventListener(){
  for(let i=0; i < actionWeightInputs.length; i++){
    actionWeightInputs[i].removeEventListener("input", handleInput);
  }
  for(let i=0; i < actionWeightInputs.length; i++){
    console.log(i);
    actionWeightInputs[i].addEventListener("input", (event) => 
      handleInput(event, i));
  }
}

function initializeEnteredWeights(){
  enteredWeights.push(0);
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
  if(actionWeightInputs[index].value > 100){
    actionWeightInputs[index].value = 100;
  }
  else if(actionWeightInputs[index].value < 0){
    actionWeightInputs[index].value = 0;
  }

  while(actionWeightInputs[index].value.length > 1 && actionWeightInputs[index].value[0] == '0'){
    actionWeightInputs[index].value = actionWeightInputs[index].value.slice(1);
  }

  if(actionWeightInputs[index].value === ""){
    actionWeightInputs[index].value = 0;
  }

  enteredWeights[index] = parseFloat(actionWeightInputs[index].value);
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
    createWeightInput(weightInputWrapper, fileName);
    initializeEnteredWeights();
    initializeWeightInputEventListener();
    world.handleFileUpload(fileContent, fileName);
  }
  else{
    alert("File must be .fbxm, .glb or .bvh!");
  }
  fileInput.value = "";
}

function createWeightInput(parentElement, labelContent){
  console.log(enteredWeights);
  const label = document.createElement('label');
  label.textContent = labelContent.slice(0, -4);

  const input = document.createElement('input');
  input.type = 'number';
  input.classList.add('weight-input');
  input.id = 'weight-input-' + enteredWeights.length;
  input.min = '0';
  input.max = '100';
  input.value = '0';

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
  
  deleteButton.addEventListener('click', (event) => addDeleteEvent(event, input, parentElement, div));
}

function addDeleteEvent(event, input, parentElement, div) {
  parentElement.removeChild(div);
  actionWeightInputs = document.getElementsByClassName("weight-input");
  enteredWeights.splice(input.id.charAt(input.id.length -1), 1);
  initializeWeightInputEventListener();
  updateUnassignedWeights();
  world.handleFileRemove(input.id.charAt(input.id.length -1));
  console.log(enteredWeights);
}


main();
