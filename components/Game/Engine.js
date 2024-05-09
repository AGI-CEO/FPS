import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls';
import NPC from './NPCLogic';

const Engine = ({ npcCount }) => {
  const mountRef = useRef(null);
  console.log('mountRef is set:', mountRef);
  // Stateful NPCs array
  const [npcs, setNpcs] = useState([]);
  const [canJump, setCanJump] = useState(false);
  const [isCrouched, setIsCrouched] = useState(false);
  const [isProne, setIsProne] = useState(false);
  const [isScoped, setIsScoped] = useState(false);
  const prevTimeRef = useRef(performance.now());
  const grenadeRef = useRef(null);
  const [health, setHealth] = useState(100);

  // Method to handle player taking damage
  const takeDamage = (amount) => {
    setHealth((prevHealth) => {
      const newHealth = prevHealth - amount;
      if (newHealth <= 0) {
        // Handle player death (e.g., end game, respawn, etc.)
        console.log('Player has died.');
        // Placeholder for death handling
      }
      return Math.max(0, newHealth);
    });
  };

  // Callback function to apply damage to the player from NPCs
  const applyDamageToPlayer = useCallback((damage) => {
    setHealth((prevHealth) => Math.max(0, prevHealth - damage));
  }, []);

  useEffect(() => {
    // Initialize NPCs array
    const initialNPCs = [];
    for (let i = 0; i < npcCount; i++) {
      const position = new THREE.Vector3(
        (i % 5) * 10 - 20, // x position
        0, // y position, on the ground
        Math.floor(i / 5) * 10 - 20 // z position
      );
      const npc = new NPC('/models/npc.glb'); // Path to the NPC model
      npc.position.copy(position);
      initialNPCs.push(npc);
    }
    setNpcs(initialNPCs);
  }, [npcCount]); // Only re-run when npcCount changes

  useEffect(() => {
    // Scene, Camera, Renderer setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    const mount = mountRef.current;
    mount.appendChild(renderer.domElement);

    // Debugging: Log scene and camera details
    console.log('Scene:', scene);
    console.log('Camera:', camera);

    // Pointer Lock Controls
    const controls = new PointerLockControls(camera, renderer.domElement);
    document.addEventListener('click', () => controls.lock());

    // Event listeners for player input
    const onKeyDown = (event) => {
      // Player input logic...
    };

    const onKeyUp = (event) => {
      // Player input logic...
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    // Handle window resize
    const onWindowResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', onWindowResize);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      const time = performance.now();
      const delta = (time - prevTimeRef.current) / 1000;

      // Player movement and NPC update logic...

      // Debugging: Log the camera position and rotation
      console.log('Camera position:', camera.position);
      console.log('Camera rotation:', camera.rotation);

      renderer.render(scene, camera);
      prevTimeRef.current = time;
    };
    animate();

    // Clean up on unmount
    return () => {
      renderer.forceContextLoss();
      renderer.context = null;
      renderer.domElement = null;
      mount.removeChild(renderer.domElement);
      document.removeEventListener('click', () => controls.lock());
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', onWindowResize);
      // Additional cleanup logic...
    };
  }, []); // Empty dependency array to run only on mount and unmount

  return <div ref={mountRef} />;
};

export default Engine;
