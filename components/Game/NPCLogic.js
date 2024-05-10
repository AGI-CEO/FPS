import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Pathfinding } from 'three-pathfinding';

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
    this.pathfinding = new Pathfinding(); // Initialize the pathfinding instance
    this.navMesh = null; // This will hold the navigation mesh
    this.loadModel();
    this.loadNavMesh('/models/level.nav.glb'); // Load the navigation mesh for pathfinding
  }

  loadModel(onModelLoaded) {
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
      if (onModelLoaded) {
        onModelLoaded(this);
      }
    }, undefined, (error) => {
      console.error('An error happened while loading the model:', error);
    });
  }

  loadNavMesh(navMeshUrl) {
    const loader = new GLTFLoader();
    loader.load(navMeshUrl, (gltf) => {
      const navMesh = gltf.scene.children.find(child => child.isMesh);
      this.navMesh = navMesh;
      const zone = Pathfinding.createZone(navMesh.geometry);
      this.pathfinding.setZoneData('level1', zone);
    }, undefined, (error) => {
      console.error('An error happened while loading the navMesh:', error);
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
        // Calculate the direction and distance to the retreat point
        const retreatDirection = this.retreatPoint.clone().sub(this.position).normalize();
        const retreatDistance = this.position.distanceTo(this.retreatPoint);
        // Move the NPC towards the retreat point if not already there
        if (retreatDistance > 1) {
          this.position.add(retreatDirection.multiplyScalar(this.velocity.length() * deltaTime));
        } else {
          this.setIdle(); // Transition to idle state once the retreat point is reached
        }
        break;
      default:
        // Default behavior
        break;
    }

    console.log(`NPC State: ${this.state}, Position:`, this.position);
  }

  attack(deltaTime) {
    // Calculate the distance to the player
    const distanceToPlayer = this.position.distanceTo(this.playerPosition);

    // If the player is within attack range, orient towards the player and attack
    if (distanceToPlayer <= this.attackRange) {
      // Orient the NPC towards the player
      const direction = this.playerPosition.clone().sub(this.position).normalize();
      this.model.lookAt(this.playerPosition);

      // Perform raycasting for hit detection
      const raycaster = new THREE.Raycaster(this.position, direction);
      const intersects = raycaster.intersectObject(this.playerCollider);

      // If the player is hit
      if (intersects.length > 0) {
        // Apply damage to the player
        this.onPlayerHit(this.weaponDamage);
        console.log('NPC fires gun and hits the player');
      } else {
        console.log('NPC fires gun but misses the player');
      }

      // Play gunshot sound
      this.gunshotAudio.play();

      // Change to shoot animation if available
      this.changeAction('Shoot');
      this.lastFireTime = performance.now(); // Update the last fire time
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
    if (this.waypoints.length === 0 || !this.navMesh) return; // No waypoints defined or navMesh not loaded

    // Get the current waypoint
    const waypoint = this.waypoints[this.currentWaypointIndex];

    // Check if the player is within chase range
    const distanceToPlayer = this.position.distanceTo(this.playerPosition);
    if (distanceToPlayer <= this.chaseRange) {
      this.setChase(this.playerPosition); // Transition to chase state
      return;
    }

    // Use the pathfinding instance to find a path to the next waypoint
    const path = this.pathfinding.findPath(this.position, waypoint, 'level1', 0);
    if (!path || path.length === 0) return; // Pathfinding failed or not necessary

    // Move along the calculated path
    const moveDistance = this.velocity.length() * deltaTime;
    const nextPathPoint = new THREE.Vector3().fromArray(path[0]);
    this.position.add(nextPathPoint.clone().sub(this.position).normalize().multiplyScalar(moveDistance));

    // Check if the NPC has reached the current waypoint
    if (this.position.distanceTo(waypoint) < 1) {
      if (!this.isLookingAround) {
        this.isLookingAround = true;
        this.lookAroundStartTime = performance.now();
        this.changeAction('LookAround');
      } else if (performance.now() - this.lookAroundStartTime > 3000) {
        this.isLookingAround = false;
        this.currentWaypointIndex = (this.currentWaypointIndex + 1) % this.waypoints.length;
        this.changeAction('Walk'); // Resume walking to the next waypoint
      }
    } else {
      this.isLookingAround = false;
    }
  }

  chase(deltaTime) {
    if (!this.navMesh) return; // NavMesh not loaded

    // Use the pathfinding instance to find a path to the player's position
    const path = this.pathfinding.findPath(this.position, this.playerPosition, 'level1', 0);
    if (!path || path.length === 0) return; // Pathfinding failed or not necessary

    // Move along the calculated path
    const moveDistance = this.velocity.length() * deltaTime;
    const nextPathPoint = new THREE.Vector3().fromArray(path[0]);
    this.position.add(nextPathPoint.clone().sub(this.position).normalize().multiplyScalar(moveDistance));

    // Check if the player is within attack range
    const distanceToPlayer = this.position.distanceTo(this.playerPosition);
    if (distanceToPlayer <= this.attackRange) {
      this.setAttack(); // Transition to attack state
    } else {
      // Change to run animation if available
      this.changeAction('Run');
    }
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
      if (prevAction) {
        prevAction.fadeOut(1);
      }
      newAction.reset().fadeIn(1).play();
      this.currentAction = actionName;

      // Additional logic for LookAround action
      if (actionName === 'LookAround') {
        // Define keyframes for the LookAround animation
        const keyframes = [
          { time: 0, value: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0)) },
          { time: 1, value: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 4, 0)) },
          { time: 2, value: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -Math.PI / 4, 0)) },
          { time: 3, value: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0)) }
        ];
        // Create the LookAround animation clip
        const lookAroundClip = new THREE.AnimationClip('LookAround', 3, keyframes.map(keyframe => {
          return new THREE.QuaternionKeyframeTrack('.rotation[quaternion]', [keyframe.time], [keyframe.value.x, keyframe.value.y, keyframe.value.z, keyframe.value.w]);
        }));
        // Add the LookAround clip to the NPC's animations dictionary
        this.animations['LookAround'] = lookAroundClip;
        // Trigger the LookAround animation clip
        this.mixer.clipAction(lookAroundClip).play();
      }
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
    // Implement a more complex patrol path logic
    if (this.waypoints.length > 0) {
      this.changeAction('Walk');
      this.nextWaypoint = this.waypoints[this.currentWaypointIndex];
    } else {
      console.error('No waypoints set for patrol');
    }
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
    // Determine a retreat point that is opposite the direction of the player
    const retreatDirection = this.position.clone().sub(this.playerPosition).normalize();
    const retreatDistance = 50; // Define a safe distance to retreat
    this.retreatPoint = this.position.clone().add(retreatDirection.multiplyScalar(retreatDistance));
    this.changeAction('Retreat'); // Change to retreat animation if available
  }

  onPlayerHit(damage, applyDamageCallback) {
    // Invoke the callback to apply damage to the player
    applyDamageCallback(damage);
  }
}

export default NPC;
