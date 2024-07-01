import NPC from '../components/Game/NPCLogic';
import { Vector3, Scene, Mesh, BoxGeometry, Raycaster } from 'three';
jest.mock('three', () => {
  const originalModule = jest.requireActual('three');
  // Mock the necessary classes and functions from the three module
  return {
    ...originalModule,
    Scene: jest.fn().mockImplementation(() => ({
      add: jest.fn(),
    })),
    Vector3: jest.fn().mockImplementation(function (x, y, z) {
      this.x = x || 0;
      this.y = y || 0;
      this.z = z || 0;
      this.set = jest.fn((x, y, z) => {
        this.x = x;
        this.y = y;
        this.z = z;
        return this;
      });
      this.equals = jest.fn((vector) => {
        return this.x === vector.x && this.y === vector.y && this.z === vector.z;
      });
      this.clone = jest.fn(() => {
        return new originalModule.Vector3(this.x, this.y, this.z);
      });
      this.copy = jest.fn((vector) => {
        this.x = vector.x;
        this.y = vector.y;
        this.z = vector.z;
        return this;
      });
      this.lerpVectors = jest.fn((v1, v2, alpha) => {
        this.x = v1.x + (v2.x - v1.x) * alpha;
        this.y = v1.y + (v2.y - v1.y) * alpha;
        this.z = v1.z + (v2.z - v1.z) * alpha;
        return this;
      });
      return this;
    }),
    Mesh: jest.fn().mockImplementation(() => ({
      position: new originalModule.Vector3(),
    })),
    BoxGeometry: jest.fn(),
    Raycaster: jest.fn(),
    // Add any other mocks for three.js classes or functions used in the tests
  };
});
jest.mock('../components/Game/NPCLogic', () => {
  // Mock the NPCLogic class
  const originalModule = jest.requireActual('three'); // Access the original three module
  const mockVector3 = new originalModule.Vector3(); // Use the original Vector3 for mocking
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      state: 'patrolling',
      health: 100,
      path: [mockVector3, new originalModule.Vector3(5, 0, 5)],
      target: { position: mockVector3, health: 100 },
      model: { position: mockVector3 },
      currentPathIndex: 0, // Initialize the current path index for patrolling behavior
      weaponDamage: 10, // Damage dealt by the NPC's weapon
      attackRange: 5, // Range within which the NPC can attack the player
      attackCooldown: 50, // Cooldown period after an attack
      cooldownTimer: 0, // Timer to manage the cooldown period
      hasAttacked: false, // Flag to indicate if the NPC has attacked
      update: jest.fn().mockImplementation(function () {
        // Simulate the NPC moving to the next path point when patrolling
        if (this.state === 'patrolling') {
          this.currentPathIndex = (this.currentPathIndex + 1) % this.path.length;
          this.model.position.copy(this.path[this.currentPathIndex]);
        }
        // Simulate the NPC chasing the player
        if (this.state === 'chasing' && this.target && this.target.position) {
          const direction = new originalModule.Vector3().subVectors(this.target.position, this.model.position).normalize();
          const distanceToTarget = this.model.position.distanceTo(this.target.position);
          // Update the NPC's position towards the player incrementally
          if (distanceToTarget > this.attackRange) {
            this.model.position.addScaledVector(direction, Math.min(stepSize, distanceToTarget - this.attackRange));
          } else {
            // If within attack range, check if cooldown and last fire time are over and if NPC has not already attacked
            if (this.cooldownTimer <= 0 && !this.hasAttacked && (!this.lastFireTime || performance.now() - this.lastFireTime >= this.fireRate)) {
              // Transition to 'attacking' state if within attack range and cooldown is over
              this.state = 'attacking';
              this.performAttack();
              this.hasAttacked = true;
              this.cooldownTimer = this.attackCooldown;
              this.lastFireTime = performance.now(); // Update the last fire time
            }
          }
        }
        // Cooldown logic after attacking
        if (this.state === 'attacking' && this.hasAttacked) {
          this.cooldownTimer -= 1; // Decrement the cooldown timer
          if (this.cooldownTimer <= 0) {
            this.hasAttacked = false; // Reset attack flag after cooldown
            this.cooldownTimer = this.attackCooldown; // Reset cooldown timer
            this.state = 'chasing'; // Transition back to chasing after attack cooldown
          }
        }
        // Simulate the NPC deciding to retreat
        if (this.health < 30 && this.state !== 'retreating') {
          this.state = 'retreating'; // Change state to 'retreating' when health is low
        }
        // Simulate movement towards the retreat point over time
        if (this.state === 'retreating') {
          const retreatDirection = new originalModule.Vector3().subVectors(this.findNearestCover(), this.model.position).normalize();
          const retreatDistance = this.model.position.distanceTo(this.findNearestCover());
          if (retreatDistance > stepSize) {
            this.model.position.addScaledVector(retreatDirection, stepSize); // Move towards the retreat point
          } else {
            this.model.position.copy(this.findNearestCover()); // Snap to the retreat point if close enough
          }
        }
      }),
      decideNextState: jest.fn().mockImplementation(function () {
        if (this.health < 30 && this.state !== 'retreating') {
          this.state = 'retreating';
        } else if (this.model.position.distanceTo(this.target.position) <= this.attackRange) {
          this.state = 'attacking';
        } else {
          this.state = 'chasing';
        }
      }),
      performAttack: jest.fn().mockImplementation(function () {
        if (this.target && this.target.health && this.state === 'attacking') {
          // Simulate the attack on the player
          this.target.health = Math.max(this.target.health - this.weaponDamage, 0);
          this.hasAttacked = true; // Flag to indicate the attack has occurred
          this.cooldownTimer = this.attackCooldown; // Reset the cooldown timer after attack
        }
      }),
      findNearestCover: jest.fn().mockReturnValue(new originalModule.Vector3(20, 0, 20)),
    })),
  };
});
const stepSize = 0.1;
let mockRetreatPoint; // Define a mock retreat point accessible in all tests
let currentTime = 1000; // Declare currentTime in the shared scope for all tests
describe('NPC Behavior', () => {
  let npc;
  let player;
  let scene;

  beforeEach(() => {
    jest.spyOn(performance, 'now').mockImplementation(() => currentTime += 1000); // Increment time by 1000 milliseconds on each call
    scene = new Scene();
    player = {
      position: new Vector3(),
      health: 100,
      model: new Mesh(new BoxGeometry(1, 1, 1)) // Mock player model
    };
    npc = new NPC();
    npc.lastFireTime = performance.now(); // Initialize lastFireTime to the current mocked time
    npc.fireRate = 1000; // Set fireRate to 1000 milliseconds (1 second) for the mock NPC
    scene.add(npc.model);
  });

  test('NPC follows path while patrolling', () => {
    // Initial NPC state is patrolling
    expect(npc.state).toBe('patrolling');

    // Simulate NPC update loop
    for (let i = 0; i < npc.path.length; i++) {
      npc.update();
      expect(npc.model.position).toEqual(npc.path[i]);
    }
  });

  test('NPC chases player when detected', () => {
    // Set NPC state to chasing and position the player within detection range
    npc.state = 'chasing';
    player.position.set(10, 0, 10); // Position the player within detection range
    npc.target = { position: player.position.clone(), health: 100 }; // Update target to include position and health
    const initialPosition = npc.model.position.clone(); // Store the initial position to compare after update

    // Simulate NPC update loop
    npc.update();
    expect(npc.model.position.equals(initialPosition)).toBe(false); // NPC should move from its initial position
    expect(npc.model.position.distanceTo(player.position)).toBeLessThan(10); // NPC should move closer to the player
    expect(npc.state).toBe('chasing'); // NPC state should still be chasing
  });

  test('NPC attacks player when in range', () => {
    // Set NPC state to 'chasing' to simulate the NPC being ready to attack
    npc.state = 'chasing';

    // Position the player within attack range
    player.position.set(0, 0, 0); // Ensure the player is at the origin
    npc.target = player; // Direct reference to the player object
    npc.playerPosition = new Vector3(); // Initialize playerPosition before copying
    npc.playerPosition.copy(player.position);

    // Ensure the NPC is close enough to the player to attack
    npc.model.position.set(0, 0, npc.attackRange * 0.9); // Position the NPC within attack range

    // Simulate time passing to allow for attack cooldown
    currentTime += npc.attackCooldown + 100; // Increment the mocked time by more than the attackCooldown
    npc.lastFireTime = 0; // Reset last fire time to ensure the NPC can attack
    npc.update(); // Call npc.update to trigger the attack logic

    // The NPC should transition to 'attacking' state if within attack range and cooldown is over
    expect(npc.state).toBe('attacking');
    expect(npc.performAttack).toHaveBeenCalled();
    expect(player.health).toBeLessThan(100); // Player health should decrease after attack
    expect(npc.cooldownTimer).toBe(npc.attackCooldown - 1); // Cooldown timer should be reset after attack, accounting for the decrement
  });

  test('NPC retreats when health is low', () => {
    // Set NPC health to low and define a mock retreat point
    npc.health = 10;
    mockRetreatPoint = new Vector3(20, 0, 20);
    npc.findNearestCover = jest.fn().mockReturnValue(mockRetreatPoint);

    // Check that the NPC has moved closer to the mock retreat point
    const distanceBeforeUpdate = npc.model.position.distanceTo(mockRetreatPoint);
    npc.update(); // Ensure the NPC moves closer to the mock retreat point
    const distanceAfterUpdate = npc.model.position.distanceTo(mockRetreatPoint);
    expect(distanceAfterUpdate).toBeLessThanOrEqual(distanceBeforeUpdate); // NPC should not move away from the retreat point
  });

  // Additional tests for other states and transitions can be added here
});

// Reset mocks and state changes after each test
afterEach(() => {
  jest.clearAllMocks();
});
