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
        getObject: jest.fn().mockReturnValue(new THREE.Object3D()),
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

describe('Player Controls', () => {
  let physics;
  let player;
  let controls;

  beforeEach(() => {
    // Set up the physics instance and player object
    physics = new Physics();
    player = {
      id: 'player',
      health: 100,
      position: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      die: jest.fn(),
    };
    physics.addCollisionObject(player, player.id);

    // Set up the controls
    const camera = new THREE.PerspectiveCamera();
    const domElement = document.createElement('div');
    controls = new PointerLockControls(camera, domElement);
  });

  test('player moves forward when "w" is pressed', () => {
    // Simulate pressing the "w" key to move forward
    const event = new KeyboardEvent('keydown', { key: 'w' });
    document.dispatchEvent(event);

    // Update the physics for the player
    physics.updatePlayer(player, 0.016); // Assuming 60 FPS, so 1/60 is approximately 0.016 seconds per frame

    // The player's position should have changed along the z-axis
    expect(player.position.z).toBeLessThan(0); // Assuming the player moves along the negative z-axis when moving forward
  });

  test('player moves backward when "s" is pressed', () => {
    // Simulate pressing the "s" key to move backward
    const event = new KeyboardEvent('keydown', { key: 's' });
    document.dispatchEvent(event);

    // Update the physics for the player
    physics.updatePlayer(player, 0.016); // Assuming 60 FPS, so 1/60 is approximately 0.016 seconds per frame

    // The player's position should have changed along the z-axis
    expect(player.position.z).toBeGreaterThan(0); // Assuming the player moves along the positive z-axis when moving backward
  });

  test('player strafes left when "a" is pressed', () => {
    // Simulate pressing the "a" key to strafe left
    const event = new KeyboardEvent('keydown', { key: 'a' });
    document.dispatchEvent(event);

    // Update the physics for the player
    physics.updatePlayer(player, 0.016);

    // The player's position should have changed along the x-axis
    expect(player.position.x).toBeLessThan(0); // Assuming the player moves along the negative x-axis when strafing left
  });

  test('player strafes right when "d" is pressed', () => {
    // Simulate pressing the "d" key to strafe right
    const event = new KeyboardEvent('keydown', { key: 'd' });
    document.dispatchEvent(event);

    // Update the physics for the player
    physics.updatePlayer(player, 0.016);

    // The player's position should have changed along the x-axis
    expect(player.position.x).toBeGreaterThan(0); // Assuming the player moves along the positive x-axis when strafing right
  });

  test('player jumps when "space" is pressed', () => {
    // Simulate pressing the "space" key to jump
    const event = new KeyboardEvent('keydown', { key: ' ' });
    document.dispatchEvent(event);

    // Update the physics for the player
    physics.updatePlayer(player, 0.016);

    // The player's vertical position should increase
    expect(player.position.y).toBeGreaterThan(0); // Assuming the player moves upward when jumping
  });

  // Additional tests for other controls such as crouching, sprinting, going prone, using a scope, and throwing grenades will be added here
});
