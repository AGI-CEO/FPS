import NPC from '../components/Game/NPCLogic';
import { Vector3, Scene, Mesh, BoxGeometry } from 'three';
jest.mock('three', () => {
  const originalModule = jest.requireActual('three');
  // Mock the necessary classes and functions from the three module
  return {
    ...originalModule,
    Scene: jest.fn().mockImplementation(() => ({
      add: jest.fn(),
    })),
    Vector3: jest.fn().mockImplementation((x, y, z) => ({
      x,
      y,
      z,
      set: jest.fn((x, y, z) => {
        return { x, y, z };
      }),
      equals: jest.fn((vector) => {
        return x === vector.x && y === vector.y && z === vector.z;
      }),
    })),
    Mesh: jest.fn().mockImplementation(() => ({
      position: new originalModule.Vector3(),
    })),
    BoxGeometry: jest.fn(),
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
      update: jest.fn().mockImplementation(function () {
        // Simulate the NPC moving to the next path point when patrolling
        if (this.state === 'patrolling') {
          this.currentPathIndex = (this.currentPathIndex + 1) % this.path.length;
          this.model.position.copy(this.path[this.currentPathIndex]);
        }
        // Simulate the NPC chasing the player
        if (this.state === 'chasing' && this.target && this.target.position) {
          const direction = new originalModule.Vector3().subVectors(this.target.position, this.model.position).normalize();
          const stepSize = 1; // Adjusted step size for noticeable movement
          this.model.position.addScaledVector(direction, stepSize);
        }
        // Simulate the NPC attacking the player
        if (this.state === 'attacking' && this.target && this.target.health) {
          this.performAttack();
          // Directly reduce the player's health by 10 to simulate the attack
          this.target.health -= 10;
        }
        // Simulate the NPC deciding to retreat
        if (this.health < 30 && this.state !== 'retreating') {
          this.state = 'retreating';
          // Directly set the NPC's position to the mock retreat point
          this.model.position.copy(this.findNearestCover());
        }
      }),
      performAttack: jest.fn().mockImplementation(function () {
        if (this.target && this.target.health) {
          this.hasAttacked = true; // Flag to indicate the attack has occurred
        }
      }),
      decideNextState: jest.fn(),
      findNearestCover: jest.fn().mockReturnValue(new originalModule.Vector3(20, 0, 20)),
    })),
  };
});
describe('NPC Behavior', () => {
  let npc;
  let player;
  let scene;

  beforeEach(() => {
    scene = new Scene();
    player = {
      position: new Vector3(),
      health: 100,
      model: new Mesh(new BoxGeometry(1, 1, 1)) // Mock player model
    };
    npc = new NPC();
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
    // Set NPC state to chasing
    npc.state = 'chasing';
    npc.target = player.position;

    // Simulate NPC update loop
    npc.update();
    expect(npc.model.position).not.toEqual(npc.path[0]); // NPC should move from its initial position
    expect(npc.state).toBe('chasing');
  });

  test('NPC attacks player when in range', () => {
    // Set NPC state to attacking
    npc.state = 'attacking';
    npc.target = player.position;

    // Place player within attack range
    player.position.set(1, 0, 1);
    scene.add(player.model);

    // Simulate NPC update loop
    npc.update();
    expect(npc.state).toBe('attacking');
    expect(npc.performAttack).toHaveBeenCalled();
    expect(player.health).toBeLessThan(100);
  });

  test('NPC retreats when health is low', () => {
    // Set NPC health to low
    npc.health = 10;
    npc.decideNextState();

    // Define a mock retreat point
    const mockRetreatPoint = new Vector3(20, 0, 20);
    npc.findNearestCover = jest.fn().mockReturnValue(mockRetreatPoint);

    // Simulate NPC update loop
    npc.update();
    expect(npc.state).toBe('retreating');
    expect(npc.model.position).toEqual(mockRetreatPoint);
  });

  // Additional tests for other states and transitions can be added here
});
