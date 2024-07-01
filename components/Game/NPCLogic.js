import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { AudioLoader, PositionalAudio } from 'three';
import { Pathfinding } from 'three-pathfinding';

class NPC {
  // Static property to keep track of the last assigned ID
  static lastAssignedId = 0;

  constructor(modelUrl, applyDamageToPlayer, audioListener) {
    // Assign a unique ID to the NPC and increment the last assigned ID
    this.id = NPC.lastAssignedId++;
    console.log(`Creating NPC with ID: ${this.id}`);
    this.modelUrl = modelUrl; // Use the modelUrl parameter to set the model URL
    this.applyDamageToPlayer = applyDamageToPlayer;
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
    this.lastFireTime = performance.now(); // Initialize last fire time to allow immediate firing
    this.weaponDamage = 10; // Damage dealt per shot
    this.accuracyVariation = 0.1; // Accuracy variation range for NPC aim

    // Placeholder properties for gunshot and footsteps audio
    this.gunshotAudio = null;
    this.footstepsAudio = null;

    this.initAudio(audioListener);

    this.playerCollider = null; // To be set with the player's collision mesh
    this.pathfinding = new Pathfinding(); // Initialize the pathfinding instance
    this.navMesh = null; // This will hold the navigation mesh
    this.isInCover = false; // Initialize isInCover property
    this.maxHealth = 100; // Initialize maxHealth property
    // Load the model and navigation mesh
    this.loadModel().then(() => {
      console.log(`NPC with ID: ${this.id} has loaded its model.`);
      this.loadNavMesh('/models/level.nav.glb').then(() => {
        console.log(`NPC with ID: ${this.id} has loaded its navMesh.`);
      });
    });
  }

  initAudio(audioListener) {
    // Ensure audioListener and its context are defined before proceeding
    if (!audioListener || !audioListener.context) {
      console.error('AudioListener or its context is not defined.');
      return;
    }

    console.log(`AudioListener is defined, context state before resuming: ${audioListener.context.state}`);
    // Check if the AudioContext state is 'running' before creating PositionalAudio objects
    if (audioListener.context.state !== 'running') {
      audioListener.context.resume().then(() => {
        console.log('AudioContext resumed successfully');
        console.log(`AudioContext state after resuming: ${audioListener.context.state}`);
        this.createAudioObjects(audioListener);
      }).catch((error) => {
        console.error('Error resuming AudioContext:', error);
      });
    } else {
      console.log('AudioContext is already running');
      this.createAudioObjects(audioListener);
    }
  }

  createAudioObjects(audioListener) {
    this.gunshotAudio = new PositionalAudio(audioListener);
    this.footstepsAudio = new PositionalAudio(audioListener);

    // Load footsteps audio
    const audioLoader = new AudioLoader();
    audioLoader.load('/sounds/mixkit-crunchy-footsteps-loop-535.wav', (buffer) => {
      this.footstepsAudio.setBuffer(buffer);
      this.footstepsAudio.setRefDistance(10);
      this.footstepsAudio.setVolume(0.5);
      // Set more properties as needed
    }, undefined, (error) => {
      console.error('An error happened while loading the footsteps audio:', error);
    });

    // Load gunshot audio
    audioLoader.load('/sounds/gunshot.mp3', (buffer) => {
      this.gunshotAudio.setBuffer(buffer);
      this.gunshotAudio.setRefDistance(10);
      this.gunshotAudio.setVolume(0.5);
      // Set more properties as needed
    }, undefined, (error) => {
      console.error('An error happened while loading the gunshot audio:', error);
    });
  }

  loadModel() {
    return new Promise((resolve, reject) => {
      console.log(`Loading model for NPC with ID: ${this.id}`);
      const loader = new OBJLoader();
      loader.load(this.modelUrl, (object) => {
        // The object loaded by OBJLoader should be an instance of THREE.Object3D.
        // If it's not, we log an error and reject the promise.
        if (!(object instanceof THREE.Object3D)) {
          console.error(`Loaded model is not an instance of THREE.Object3D: ${object}`);
          reject(new Error('Model is not an instance of THREE.Object3D'));
          return;
        }
        // If the object is a group and contains children, we assume the first child
        // is the model we're interested in. This is a common pattern when loading .obj files.
        if (object instanceof THREE.Group && object.children.length > 0) {
          this.model = object.children[0];
        } else {
          this.model = object;
        }
        console.log(`Model loaded, instance of THREE.Object3D: ${this.model instanceof THREE.Object3D}`);
        this.mixer = new THREE.AnimationMixer(this.model);
        resolve(this); // Resolve the promise with the NPC instance
      }, undefined, (error) => {
        console.error('An error happened while loading the model:', error);
        reject(error); // Reject the promise if there's an error
      });
    });
  }

  loadNavMesh(navMeshUrl) {
    return new Promise((resolve, reject) => {
      console.log(`Loading navMesh for NPC with ID: ${this.id}`);
      const loader = new GLTFLoader(); // Keep using GLTFLoader for the navMesh as it's a .glb file
      loader.load(navMeshUrl, (gltf) => {
        let navMesh = gltf.scene.children.find(child => child.isMesh);
        this.navMesh = navMesh;
        let zone = Pathfinding.createZone(navMesh.geometry);
        this.pathfinding.setZoneData('level1', zone);
        resolve(this); // Resolve the promise with the NPC instance
      }, undefined, (error) => {
        console.error('An error happened while loading the nav mesh:', error);
        reject(error); // Reject the promise if there's an error
      });
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
        // Determine if the NPC needs to retreat and find cover
        if (this.health < this.maxHealth * 0.3 && !this.isInCover) {
          // Find the nearest cover point using the pathfinding system
          const coverPoint = this.findNearestCover();
          if (coverPoint) {
            this.retreatPoint = coverPoint;
            this.isInCover = true;
          }
        }

        // Move the NPC towards the retreat point if not already in cover
        if (!this.isInCover) {
          const retreatDirection = this.retreatPoint.clone().sub(this.position).normalize();
          const retreatDistance = this.position.distanceTo(this.retreatPoint);
          if (retreatDistance > 1) {
            this.position.add(retreatDirection.multiplyScalar(this.velocity.length() * deltaTime));
          } else {
            this.isInCover = true; // NPC has reached cover
          }
        }

        // If in cover and health is below max, initiate healing
        if (this.isInCover && this.health < this.maxHealth) {
          this.heal(deltaTime);
        }

        // Transition to idle state if health is fully restored or if the player is no longer a threat
        if (this.health === this.maxHealth || !this.isPlayerThreat()) {
          this.setIdle();
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
    let distanceToPlayer = this.position.distanceTo(this.playerPosition);

    // If the player is within attack range and enough time has passed since the last shot
    if (distanceToPlayer <= this.attackRange && (!this.lastFireTime || performance.now() - this.lastFireTime >= this.fireRate)) {
      // Orient the NPC towards the player
      let direction = this.playerPosition.clone().sub(this.position).normalize();
      this.model.lookAt(this.playerPosition);

      // Introduce accuracy variation based on distance
      let accuracyFactor = Math.min(distanceToPlayer / this.attackRange, 1);
      let accuracyOffset = new THREE.Vector3(
        (Math.random() - 0.5) * this.accuracyVariation * accuracyFactor,
        (Math.random() - 0.5) * this.accuracyVariation * accuracyFactor,
        (Math.random() - 0.5) * this.accuracyVariation * accuracyFactor
      );
      let modifiedDirection = direction.add(accuracyOffset).normalize();

      // Perform raycasting for hit detection with accuracy variation
      let raycaster = new THREE.Raycaster(this.position, modifiedDirection);
      let intersects = raycaster.intersectObject(this.playerCollider);

      // If the player is hit
      if (intersects.length > 0) {
        // Apply damage to the player
        this.applyDamageToPlayer(this.weaponDamage);
        console.log('NPC fires gun and hits the player');
      } else {
        console.log('NPC fires gun but misses the player');
      }

      // Play gunshot sound
      this.gunshotAudio.play();

      // Update the last fire time
      this.lastFireTime = performance.now();
    } else if (distanceToPlayer > this.attackRange) {
      // If the player is out of range, switch to chase state
      this.setChase(this.playerPosition);
    }
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

    // Play footsteps sound if the NPC is moving
    if (moveDistance > 0) {
      this.playFootstepsSound();
    }

    // Check if the NPC has reached the current waypoint
    if (this.position.distanceTo(waypoint) < 1) {
      this.currentWaypointIndex = (this.currentWaypointIndex + 1) % this.waypoints.length; // Move to the next waypoint
      if (this.currentWaypointIndex === 0 && this.waypoints.length > 1) {
        // If we've reached the last waypoint, loop back to the first
        this.changeAction('Turn');
        setTimeout(() => this.changeAction('Walk'), 1000); // Simulate a pause at the waypoint
      } else {
        this.changeAction('Walk');
      }
    }

    console.log(`NPC is patrolling. Current waypoint index: ${this.currentWaypointIndex}, Position:`, this.position);
  }

  chase(deltaTime) {
    if (!this.navMesh) return; // NavMesh not loaded

    // Use the pathfinding instance to find a path to the player's position
    const path = this.pathfinding.findPath(this.position, this.playerPosition, 'level1', 0);
    if (!path || path.length === 0) return; // Pathfinding failed or not necessary

    // Move along the calculated path
    const moveDistance = this.velocity.length() * deltaTime;
    const nextPathPoint = new THREE.Vector3().fromArray(path[0]);

    // Check if the player is within attack range
    const distanceToPlayer = this.position.distanceTo(this.playerPosition);
    if (distanceToPlayer <= this.attackRange) {
      this.setAttack(); // Transition to attack state
    } else {
      // Check for line of sight to the player
      const raycaster = new THREE.Raycaster(this.position, this.playerPosition.clone().sub(this.position).normalize());
      const intersects = raycaster.intersectObject(this.playerCollider);
      if (intersects.length === 0) {
        // If there is a clear line of sight, move directly towards the player
        this.position.add(this.playerPosition.clone().sub(this.position).normalize().multiplyScalar(moveDistance));
      } else {
        // If there is no clear line of sight, follow the path
        this.position.add(nextPathPoint.clone().sub(this.position).normalize().multiplyScalar(moveDistance));
      }
      // Change to run animation if available
      this.changeAction('Run');

      // Play footsteps sound if the NPC is moving
      if (moveDistance > 0 && !this.footstepsAudio.isPlaying) {
        this.playFootstepsSound();
      }
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

  playFootstepsSound() {
    if (this.footstepsAudio.isPlaying) {
      this.footstepsAudio.stop();
    }
    this.footstepsAudio.play();
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

  onPlayerHit(damage) {
    // Invoke the callback to apply damage to the player
    this.applyDamageToPlayer(damage);
  }

  findNearestCover() {
    // TODO: Implement the logic to iterate over predefined cover points and select the closest one
    // This is a placeholder and should be replaced with actual cover point finding logic
    return new THREE.Vector3(0, 0, 0); // Replace with actual cover point finding logic
  }

  heal(deltaTime) {
    // Placeholder logic for healing over time
    // In the actual game, this would increment the NPC's health by a certain amount each second
    // For now, we'll just add a fixed amount to the health
    this.health += 10 * deltaTime;
    if (this.health > this.maxHealth) {
      this.health = this.maxHealth;
    }
  }

  isPlayerThreat() {
    // Placeholder logic for determining if the player is a threat
    // In the actual game, this would consider factors like the player's health, weapon status, and distance
    // For now, we'll just return true if the player is within a certain range
    const threatRange = 30; // The range within which the player is considered a threat
    return this.position.distanceTo(this.playerPosition) < threatRange;
  }
}

export default NPC;
