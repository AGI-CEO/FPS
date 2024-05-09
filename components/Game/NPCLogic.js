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
    this.state = 'idle'; // The initial state of the NPC
    this.waypoints = []; // Waypoints for patrolling
    this.currentWaypointIndex = 0; // Current waypoint index
    this.playerPosition = new THREE.Vector3(); // The player's position for chasing
    this.chaseRange = 50; // The range within which the NPC will start chasing the player
    this.attackRange = 20; // The range within which the NPC can effectively attack the player
    this.fireRate = 1000; // Time between shots in milliseconds
    this.lastFireTime = null; // Last time the NPC fired a shot
    this.weaponDamage = 10; // Damage dealt per shot
    this.gunshotAudio = new Audio('/sounds/gunshot.mp3'); // Path to gunshot sound
    this.playerCollider = null; // To be set with the player's collision mesh
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

    // Update the NPC state machine
    switch (this.state) {
      case 'idle':
        // Perform idle behavior
        break;
      case 'patrol':
        this.patrol(deltaTime);
        break;
      case 'chase':
        this.chase(deltaTime);
        break;
      case 'attack':
        this.attack(deltaTime);
        break;
      case 'retreat':
        // Perform retreat behavior
        break;
      default:
        // Default behavior
        break;
    }
  }

  attack(deltaTime) {
    // Calculate the distance to the player
    const distanceToPlayer = this.position.distanceTo(this.playerPosition);

    // If the player is within attack range, orient towards the player and attack
    if (distanceToPlayer <= this.attackRange) {
      const direction = this.playerPosition.clone().sub(this.position).normalize();
      this.model.lookAt(this.playerPosition);
      this.fireGun();
      this.changeAction('Shoot'); // Change to shoot animation if available
    } else {
      this.setChase(this.playerPosition); // If the player is out of range, switch to chase state
    }
  }

  fireGun() {
    // Check if the NPC can fire based on the cooldown
    if (this.lastFireTime && (performance.now() - this.lastFireTime) < this.fireRate) {
      return; // Not enough time has passed since the last shot
    }

    // Raycasting for hit detection
    const raycaster = new THREE.Raycaster();
    raycaster.set(this.position, this.playerPosition.clone().sub(this.position).normalize());
    // Placeholder for player collision detection
    // const intersects = raycaster.intersectObject(this.playerCollider);

    // Placeholder for hit detection callback
    // if (intersects.length > 0) {
    //   // Hit detected
    //   this.onPlayerHit(this.weaponDamage); // Placeholder for callback function when the player is hit
    // } else {
    //   console.log('NPC fires gun but misses the player'); // Placeholder for miss logic
    // }

    // Play gunshot sound
    this.gunshotAudio.play(); // Assuming gunshotAudio is an audio object for the gunshot sound

    this.lastFireTime = performance.now(); // Update the last fire time
  }

  patrol(deltaTime) {
    if (this.waypoints.length === 0) return; // No waypoints defined

    // Placeholder for pathfinding logic to the next waypoint
    // TODO: Implement pathfinding algorithm to navigate to the next waypoint
    const pathToNextWaypoint = this.calculatePath(this.position, this.waypoints[this.currentWaypointIndex]);
    if (!pathToNextWaypoint) return; // Pathfinding failed or not necessary

    // Move along the calculated path
    const moveDistance = this.velocity.length() * deltaTime;
    this.position.add(pathToNextWaypoint[0].clone().sub(this.position).normalize().multiplyScalar(moveDistance));

    // Check if the NPC has reached the current waypoint
    if (this.position.distanceTo(this.waypoints[this.currentWaypointIndex]) < 1) {
      this.currentWaypointIndex = (this.currentWaypointIndex + 1) % this.waypoints.length;
      this.changeAction('Walk'); // Change to walk animation if available
    }
  }

  chase(deltaTime) {
    // Placeholder for pathfinding logic towards the player
    // TODO: Implement pathfinding algorithm to navigate towards the player's position
    const pathToPlayer = this.calculatePath(this.position, this.playerPosition);
    if (!pathToPlayer) return; // Pathfinding failed or not necessary

    // Move along the calculated path
    const moveDistance = this.velocity.length() * deltaTime;
    this.position.add(pathToPlayer[0].clone().sub(this.position).normalize().multiplyScalar(moveDistance));

    // Change to run animation if available
    this.changeAction('Run');
  }

  calculatePath(startPosition, targetPosition) {
    // Simple pathfinding algorithm that calculates a direct line to the target
    // This is a placeholder for a more complex pathfinding implementation
    const path = [];
    const direction = targetPosition.clone().sub(startPosition).normalize();
    const distance = startPosition.distanceTo(targetPosition);
    const steps = distance; // Assuming each step is 1 unit for simplicity
    for (let i = 1; i <= steps; i++) {
      path.push(startPosition.clone().add(direction.clone().multiplyScalar(i)));
    }
    return path;
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

  // State transition methods
  setIdle() {
    this.state = 'idle';
    this.changeAction('Idle');
  }

  setPatrol(waypoints) {
    this.state = 'patrol';
    this.waypoints = waypoints;
    this.currentWaypointIndex = 0;
    this.changeAction('Walk'); // Change to walk animation if available
  }

  setChase(playerPosition) {
    this.state = 'chase';
    this.playerPosition = playerPosition;
    this.changeAction('Run'); // Change to run animation if available
  }

  setAttack() {
    this.state = 'attack';
    // Define attack behavior and action transitions
  }

  setRetreat() {
    this.state = 'retreat';
    // Define retreat behavior and action transitions
  }
}

export default NPC;
