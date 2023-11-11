import { World } from './world/world.js';
import { Clock } from 'three';

const clock = new Clock();

const actionWeightInputs = document.getElementsByClassName("weight-input");

const startBtn = document.getElementById("start-btn");

const container = document.querySelector('#scene-container');

const speedSlider = document.getElementById("speed-slider");
const sliderValueDisplay = document.getElementById("speed-slider-value");

let enteredWeights = [];
let animationSpeed = 1;

async function main() {
  // Get a reference to the container element

  // create a new world
  const world = new World(container);

  
  // draw the scene
  world.render();
  
  await world.init();
  animate(world);

  initializeEnteredWeights();

  initializeEventListener(world);
}

function animate(world){
  world.getControls().update();
  if(world.getMixer() != undefined){
    world.getMixer().update(clock.getDelta());
  }
  world.render();

  requestAnimationFrame(() => animate(world));
}

function initializeEventListener(world){
  startBtn.addEventListener("click", () => {
    const weightSum = sumUpWeights();
    if(weightSum >100 || weightSum < 99){
      alert("The sum of the weights must be 100 or 99!");
    }
    else{
      world.handleStartBtnClick(enteredWeights, animationSpeed);
    }
  });

  speedSlider.addEventListener("input", () => {
    sliderValueDisplay.innerHTML = speedSlider.value + "x";
    animationSpeed = parseFloat(speedSlider.value);
  });

  for(let i=0; i < actionWeightInputs.length; i++){
    actionWeightInputs[i].addEventListener("input", () =>{
      if(actionWeightInputs[i].value > 100){
        actionWeightInputs[i].value = 100;
      }
      else if(actionWeightInputs[i].value < 0){
        actionWeightInputs[i].value = 0;
      }

      while(actionWeightInputs[i].value.length > 1 && actionWeightInputs[i].value[0] == '0'){
        actionWeightInputs[i].value = actionWeightInputs[i].value.slice(1);
      }

      if(actionWeightInputs[i].value === ""){
        actionWeightInputs[i].value = 0;
      }

      //actionWeightInputs[i].value = parseFloat(actionWeightInputs[i].value);
      enteredWeights[i] = parseFloat(actionWeightInputs[i].value);
      updateUnassignedWeights();
    })
  }
}

function initializeEnteredWeights(){
  for(let i=0; i < actionWeightInputs.length; i++){
    enteredWeights.push(0);
  }
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


main();
