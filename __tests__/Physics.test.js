import Physics from '../components/Game/Physics';
import THREE from 'three';

describe('Physics', () => {
  let physics;
  let object;

  beforeEach(() => {
    physics = new Physics();
    object = {
      position: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      isGrounded: false,
      model: new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1)) // Mock model property
    };
  });

  test('should create a Physics instance', () => {
    expect(physics).toBeDefined();
    expect(physics.gravity).toEqual(new THREE.Vector3(0, -9.81, 0));
    expect(physics.collisionObjects).toEqual([]);
  });

  test('should apply gravity to an object', () => {
    const deltaTime = 0.1; // Small deltaTime to ensure gravity has a noticeable effect
    const initialY = object.position.y;
    physics.applyGravity(object, deltaTime); // Apply gravity for deltaTime
    physics.updateObject(object, deltaTime); // Update object to apply velocity to position
    expect(object.position.y).toBeLessThan(initialY);
  });

  test('should detect collisions between objects', () => {
    const otherObject = {
      position: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      isGrounded: false,
      model: new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1)), // Mock model property
      id: 1
    };
    physics.addCollisionObject(object, 0);
    physics.addCollisionObject(otherObject, 1);

    object.position.set(0, 0, 0);
    otherObject.position.set(0, 1, 0); // Positioned right above the object

    physics.update(1); // Update physics for 1 second

    // Expect the objects to have collided and the position of the object to have changed
    expect(object.position.y).not.toBe(0);
    expect(otherObject.position.y).not.toBe(1);
  });
});
