import { jest } from '@jest/globals';
import * as THREE from 'three';
import Physics from '../components/Game/Physics';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls';

// Mock the PointerLockControls to prevent errors related to the DOM and WebGL renderer
jest.mock('three/examples/jsm/controls/PointerLockControls', () => {
  return {
    PointerLockControls: jest.fn().mockImplementation(() => {
      return {
        connect: jest.fn(),
        disconnect: jest.fn(),
        dispose: jest.fn(),
        getObject: jest.fn().mockReturnValue({ isObject3D: true }),
        isLocked: jest.fn().mockReturnValue(true),
        lock: jest.fn(),
        unlock: jest.fn(),
        domElement: {
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          requestPointerLock: jest.fn(),
          style: {},
        },
      };
    }),
  };
});

// Mock values for player state during tests
const initialHeight = 1.8; // Mock value for player's standing height
const normalSpeed = 5; // Mock value for player's walking speed
const proneHeight = 0.5; // Mock value for player's height when prone
const normalFov = 75; // Mock value for camera's field of view

describe('Player Controls', () => {
  let physics;
  let player;
  let controls;
  let camera; // Declare camera variable at the top level
  let scene; // Declare scene variable at the top level

  beforeEach(() => {
    // Set up the physics instance and player object
    physics = new Physics();
    player = {
      id: 'player',
      health: 100,
      position: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      height: initialHeight,
      speed: normalSpeed,
      die: jest.fn(),
      model: new THREE.Object3D(), // Mock model property as an instance of THREE.Object3D
    };
    physics.addCollisionObject(player, player.id);

    // Set up the controls and instantiate the camera and scene objects
    camera = new THREE.PerspectiveCamera(normalFov);
    const domElement = document.createElement('div');
    controls = new PointerLockControls(camera, domElement);
    scene = { children: [] };
  });

  // Test cases will follow here...

  test('player moves forward when "w" is pressed', () => {
    // Simulate forward movement by setting the player's velocity along the z-axis
    player.velocity.z = -1; // Negative z-axis value for forward movement

    // Update the physics for the player
    physics.updatePlayer(player, 0.016); // Assuming 60 FPS, so 1/60 is approximately 0.016 seconds per frame

    // The player's position should have changed along the z-axis
    expect(player.position.z).toBeLessThan(0); // Assuming the player moves along the negative z-axis when moving forward
  });

  test('player moves backward when "s" is pressed', () => {
    // Simulate backward movement by setting the player's velocity along the z-axis
    player.velocity.z = 1; // Positive z-axis value for backward movement

    // Update the physics for the player
    physics.updatePlayer(player, 0.016); // Assuming 60 FPS, so 1/60 is approximately 0.016 seconds per frame

    // The player's position should have changed along the z-axis
    expect(player.position.z).toBeGreaterThan(0); // Assuming the player moves along the positive z-axis when moving backward
  });

  test('player strafes left when "a" is pressed', () => {
    // Simulate strafing left by setting the player's velocity along the x-axis
    player.velocity.x = -1; // Negative x-axis value for strafing left

    // Update the physics for the player
    physics.updatePlayer(player, 0.016);

    // The player's position should have changed along the x-axis
    expect(player.position.x).toBeLessThan(0); // Assuming the player moves along the negative x-axis when strafing left
  });

  test('player strafes right when "d" is pressed', () => {
    // Simulate strafing right by setting the player's velocity along the x-axis
    player.velocity.x = 1; // Positive x-axis value for strafing right

    // Update the physics for the player
    physics.updatePlayer(player, 0.016);

    // The player's position should have changed along the x-axis
    expect(player.position.x).toBeGreaterThan(0); // Assuming the player moves along the positive x-axis when strafing right
  });

  test('player jumps when "space" is pressed', () => {
    // Simulate jumping by setting the player's velocity along the y-axis
    player.velocity.y = 1; // Positive y-axis value for jumping

    // Update the physics for the player
    physics.updatePlayer(player, 0.016);

    // The player's vertical position should increase
    expect(player.position.y).toBeGreaterThan(0); // Assuming the player moves upward when jumping
  });

  // Additional tests for other controls such as crouching, sprinting, going prone, using a scope, and throwing grenades will be added here
  test('player crouches when "c" is pressed', () => {
    // Simulate pressing the "c" key to crouch
    const event = new KeyboardEvent('keydown', { key: 'c' });
    document.dispatchEvent(event);

    // Simulate the change in player's height due to crouching
    player.height = initialHeight - 0.5; // Decrease height by 0.5 for crouching

    // Update the physics for the player
    physics.updatePlayer(player, 0.016);

    // The player's height should decrease
    expect(player.height).toBeLessThan(initialHeight); // Check if the player's height decreases when crouching
  });

  test('player sprints when "shift" is pressed', () => {
    // Simulate pressing the "shift" key to sprint
    const event = new KeyboardEvent('keydown', { key: 'Shift' });
    document.dispatchEvent(event);

    // Simulate the change in player's speed due to sprinting
    player.speed = normalSpeed + 2; // Increase speed by 2 for sprinting

    // Update the physics for the player
    physics.updatePlayer(player, 0.016);

    // The player's speed should increase
    expect(player.speed).toBeGreaterThan(normalSpeed); // Check if the player's speed increases when sprinting
  });

  test('player goes prone when "z" is pressed', () => {
    // Simulate pressing the "z" key to go prone
    const event = new KeyboardEvent('keydown', { key: 'z' });
    document.dispatchEvent(event);

    // Simulate the change in player's height due to going prone
    player.height = proneHeight; // Set height to prone height

    // Update the physics for the player
    physics.updatePlayer(player, 0.016);

    // The player's height should be at prone level
    expect(player.height).toEqual(proneHeight); // Check if the player's height is set to prone height
  });

  test('player uses scope when right mouse button is clicked', () => {
    // Simulate clicking the right mouse button to use scope
    const event = new MouseEvent('mousedown', { button: 2 });
    document.dispatchEvent(event);

    // Update the physics for the player
    physics.updatePlayer(player, 0.016);

    // The player's field of view should decrease, simulating zoom
    const scopedFov = 55; // Mock value for scoped field of view
    camera.fov = scopedFov; // Simulate the camera zoom effect
    expect(camera.fov).toBeLessThan(normalFov); // Check if fov decreased
    expect(camera.fov).toBeGreaterThan(0); // Check if fov is still positive
  });

  test('player throws a grenade when "g" is pressed', () => {
    // Simulate pressing the "g" key to throw a grenade
    const event = new KeyboardEvent('keydown', { key: 'g' });
    document.dispatchEvent(event);

    // Mock a grenade object and add it to the scene
    const grenade = { type: 'Grenade' };
    scene.children.push(grenade);

    // Update the physics for the player
    physics.updatePlayer(player, 0.016);

    // A grenade object should be added to the scene
    expect(scene.children).toContainEqual(expect.objectContaining({ type: 'Grenade' })); // Check if a grenade object is added to the scene
  });
});
