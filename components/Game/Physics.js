import * as THREE from 'three';

class Physics {
  constructor() {
    this.gravity = new THREE.Vector3(0, -9.81, 0); // Earth gravity in m/s^2
    this.collisionObjects = []; // Objects to test for collision
  }

  // Add an object to the list of collision objects
  addCollisionObject(object, id) {
    // Ensure the object has a velocity property initialized as a THREE.Vector3 instance
    if (!object.velocity) {
      object.velocity = new THREE.Vector3();
    }
    // Ensure the object has a position property initialized as a THREE.Vector3 instance
    if (!object.position) {
      object.position = new THREE.Vector3();
    }
    // Ensure the object has an ID
    if (id === undefined) {
      console.error('Attempted to add an object without an ID to the physics system', object);
      return; // Do not add the object to the physics system if it has no ID
    }
    object.id = id;
    console.log(`Adding object with ID: ${object.id}`); // Log the ID of the object being added
    this.collisionObjects.push(object);
  }

  // Apply gravity to an object
  applyGravity(object, deltaTime) {
    if (!object.isGrounded) {
      // Ensure the object has a velocity property before applying gravity
      if (!object.velocity) {
        object.velocity = new THREE.Vector3();
      }
      object.velocity.add(this.gravity.clone().multiplyScalar(deltaTime));
    }
  }

  // Check for collisions and update object position
  // Check for collisions and update object position
  checkCollisions(object, deltaTime) {
    if (!object.position || !object.velocity) {
      console.error(`Physics.checkCollisions: object with ID ${object.id} is missing position or velocity properties`, object);
      return; // Exit the function if required properties are missing
    }
    if (object.id === undefined) {
      console.error('Physics.checkCollisions: object ID is undefined', object);
      return; // Exit the function if the ID is undefined
    }
    if (!(object.model instanceof THREE.Object3D)) {
      console.error(`Physics.checkCollisions: object with ID ${object.id} has an invalid or undefined model property`, object);
      return; // Exit the function if the model property is invalid
    }

    let collisionOccurred = false;
    const nextPosition = object.position.clone().add(object.velocity.clone().multiplyScalar(deltaTime));

    // Check for collision with each collision object
    for (const collisionObject of this.collisionObjects) {
      if (!(collisionObject.model instanceof THREE.Object3D)) {
        console.error(`Physics.checkCollisions: collision object with ID ${collisionObject.id} has an invalid or undefined model property`, collisionObject);
        continue; // Skip this collision object if the model property is invalid
      }
      // Create bounding boxes for collision detection
      const objectBoundingBox = new THREE.Box3().setFromObject(object.model);
      const collisionObjectBoundingBox = new THREE.Box3().setFromObject(collisionObject.model);

      // Check if bounding boxes intersect
      if (objectBoundingBox.intersectsBox(collisionObjectBoundingBox)) {
        collisionOccurred = true;
        // Calculate the collision normal
        const collisionNormal = new THREE.Vector3().subVectors(collisionObjectBoundingBox.getCenter(new THREE.Vector3()), objectBoundingBox.getCenter(new THREE.Vector3())).normalize();
        // Reflect the velocity vector on collision
        object.velocity.reflect(collisionNormal).multiplyScalar(-1);
        // Apply friction and restitution
        const friction = Math.min(object.material?.friction ?? 0.5, collisionObject.material?.friction ?? 0.5);
        const restitution = Math.min(object.material?.restitution ?? 0.5, collisionObject.material?.restitution ?? 0.5);
        object.velocity.multiplyScalar(restitution).addScaledVector(collisionNormal, -friction);

        // Adjust the position to the point of contact
        // Estimate the penetration depth as half the smallest dimension of the object's bounding box
        const penetrationDepth = objectBoundingBox.min.clone().sub(objectBoundingBox.max).length() * 0.5;
        nextPosition.addScaledVector(collisionNormal, -penetrationDepth);

        break;
      }
    }

    // If a collision occurred, adjust the position to the point of contact
    if (collisionOccurred) {
      object.position.copy(nextPosition);
    } else {
      // If no collision, update the position normally
      object.position.copy(nextPosition);
    }

    // Update grounded status
    object.isGrounded = collisionOccurred;
  }

  // Update the physics state of an object
  updateObject(object, deltaTime) {
    this.applyGravity(object, deltaTime);
    this.checkCollisions(object, deltaTime);
    object.position.add(object.velocity.clone().multiplyScalar(deltaTime));
  }

  // Update the physics for all objects
  update(deltaTime) {
    this.collisionObjects.forEach(object => {
      this.updateObject(object, deltaTime);
    });
  }

  // Update the physics state of the player
  updatePlayer(player, deltaTime) {
    // Apply gravity to the player
    this.applyGravity(player, deltaTime);

    // Check for collisions and update player position
    this.checkCollisions(player, deltaTime);

    // Additional player-specific physics updates can be added here
  }

  // Update the physics state of an NPC
  updateNPC(npc, deltaTime) {
    // Apply gravity to the NPC
    this.applyGravity(npc, deltaTime);

    // Check for collisions and update NPC position
    this.checkCollisions(npc, deltaTime);

    // Additional NPC-specific physics updates can be added here
  }
}

export default Physics;
