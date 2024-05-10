import * as THREE from 'three';

class Physics {
  constructor() {
    this.gravity = new THREE.Vector3(0, -9.81, 0); // Earth gravity in m/s^2
    this.collisionObjects = []; // Objects to test for collision
  }

  // Add an object to the list of collision objects
  addCollisionObject(object) {
    this.collisionObjects.push(object);
  }

  // Apply gravity to an object
  applyGravity(object, deltaTime) {
    if (!object.isGrounded) {
      object.velocity.add(this.gravity.clone().multiplyScalar(deltaTime));
    }
  }

  // Check for collisions and update object position
  checkCollisions(object, deltaTime) {
    let collisionOccurred = false;
    const nextPosition = object.position.clone().add(object.velocity.clone().multiplyScalar(deltaTime));

    // Check for collision with each collision object
    for (const collisionObject of this.collisionObjects) {
      // Create bounding boxes for collision detection
      const objectBoundingBox = new THREE.Box3().setFromObject(object.model);
      const collisionObjectBoundingBox = new THREE.Box3().setFromObject(collisionObject.model);

      // Check if bounding boxes intersect
      if (objectBoundingBox.intersectsBox(collisionObjectBoundingBox)) {
        collisionOccurred = true;
        // Reflect the velocity vector on collision
        const collisionNormal = new THREE.Vector3().subVectors(object.position, collisionObject.position).normalize();
        object.velocity.reflect(collisionNormal);

        // Adjust the position to the point of contact
        const directionVector = object.velocity.clone().normalize();
        const distanceToCollision = directionVector.dot(collisionNormal);
        nextPosition.addScaledVector(directionVector, -distanceToCollision);

        // Adjust the response based on the material properties
        const restitution = Math.min(object.material.restitution, collisionObject.material.restitution);
        object.velocity.multiplyScalar(restitution);

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
}

export default Physics;
