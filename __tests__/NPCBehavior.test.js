import NPC from '../components/Game/NPCLogic';
import THREE from 'three';
import { jest } from '@jest/globals';

jest.mock('../components/Game/NPCLogic'); // Mock the NPCLogic class

describe('NPC Behavior', () => {
  let npc;
  let player;
  let scene;

  beforeEach(() => {
    scene = new THREE.Scene();
    player = {
      position: new THREE.Vector3(),
      health: 100,
      model: new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1)) // Mock player model
    };
    npc = new NPC({
      position: new THREE.Vector3(),
      health: 100,
      state: 'patrolling',
      path: [new THREE.Vector3(0, 0, 0), new THREE.Vector3(10, 0, 10)],
      target: player
    });
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

    // Mock the performAttack method
    npc.performAttack = jest.fn();
    npc.performAttack.mockImplementation(() => {
      player.health -= npc.weaponDamage;
    });

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
    const mockRetreatPoint = new THREE.Vector3(20, 0, 20);
    npc.findNearestCover = jest.fn().mockReturnValue(mockRetreatPoint);

    // Simulate NPC update loop
    npc.update();
    expect(npc.state).toBe('retreating');
    expect(npc.position).toEqual(mockRetreatPoint);
  });

  // Additional tests for other states and transitions can be added here
});
