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
    // Placeholder for collision detection logic
    // This will involve checking the object's next position against the collisionObjects array
    // and adjusting the position and velocity if a collision is detected
    let collisionOccurred = false;

    // Calculate the object's next position
    const nextPosition = object.position.clone().add(object.velocity.clone().multiplyScalar(deltaTime));

    // Check for collision with each collision object
    for (const collisionObject of this.collisionObjects) {
      if (nextPosition.distanceTo(collisionObject.position) < (object.size + collisionObject.size)) {
        collisionOccurred = true;
        // Reflect the velocity vector on collision
        object.velocity.reflect(new THREE.Vector3().subVectors(object.position, collisionObject.position).normalize());
        break;
      }
    }

    // If a collision occurred, adjust the position to the point of contact
    if (collisionOccurred) {
      while (nextPosition.distanceTo(collisionObject.position) < (object.size + collisionObject.size)) {
        nextPosition.sub(object.velocity.clone().multiplyScalar(deltaTime * 0.1));
      }
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

  // Update the physics for the player
  updatePlayer(player, deltaTime) {
    this.applyGravity(player, deltaTime);
    this.checkCollisions(player, deltaTime);
    player.position.add(player.velocity.clone().multiplyScalar(deltaTime));
  }

  // Update the physics for NPCs
  updateNPC(npc, deltaTime) {
    this.applyGravity(npc, deltaTime);
    this.checkCollisions(npc, deltaTime);
    npc.position.add(npc.velocity.clone().multiplyScalar(deltaTime));
  }

  // Update the physics for all objects
  update(deltaTime) {
    this.collisionObjects.forEach(object => {
      this.updateObject(object, deltaTime);
    });
  }
}

export default Physics;
