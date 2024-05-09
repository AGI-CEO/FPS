import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

class NPC {
  constructor(modelUrl) {
    this.modelUrl = modelUrl;
    this.position = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.acceleration = new THREE.Vector3();
    this.health = 100;
    this.isAlive = true;
    this.model = null;
    this.mixer = null;
    this.actions = {};
    this.currentAction = '';
    this.loadModel();
  }

  loadModel() {
    const loader = new GLTFLoader();
    loader.load(this.modelUrl, (gltf) => {
      this.model = gltf.scene;
      this.mixer = new THREE.AnimationMixer(this.model);
      gltf.animations.forEach((clip) => {
        const action = this.mixer.clipAction(clip);
        this.actions[clip.name] = action;
        if (clip.name === 'Idle') {
          this.currentAction = 'Idle';
          action.play();
        }
      });
    }, undefined, (error) => {
      console.error('An error happened while loading the model:', error);
    });
  }

  update(deltaTime) {
    if (this.mixer) {
      this.mixer.update(deltaTime);
    }
    // Placeholder for NPC AI logic, pathfinding, and tactical behavior
  }

  takeDamage(amount) {
    this.health -= amount;
    if (this.health <= 0) {
      this.die();
    }
  }

  die() {
    this.isAlive = false;
    this.changeAction('Die');
  }

  changeAction(actionName) {
    if (this.actions[actionName] && this.currentAction !== actionName) {
      const prevAction = this.actions[this.currentAction];
      const newAction = this.actions[actionName];
      prevAction.fadeOut(1);
      newAction.reset().fadeIn(1).play();
      this.currentAction = actionName;
    }
  }
}

export default NPC;
