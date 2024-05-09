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
    camera.position.set(0, 5, 10); // Set camera position to view the cube
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (!renderer.getContext()) {
      console.error('Unable to initialize WebGL context');
    }
    const mount = mountRef.current;
    if (mount) {
      mount.appendChild(renderer.domElement);
    } else {
      console.error('Mount point not available for renderer');
    }

    // Debugging: Log scene and camera details
    console.log('Scene:', scene);
    console.log('Camera:', camera);

    // Add ambient light to the scene
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // Add directional light to the scene
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(0, 10, 0);
    scene.add(directionalLight);

    // Test cube
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(0, 0, 0);
    scene.add(cube);

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

      try {
        renderer.render(scene, camera);
      } catch (error) {
        console.error('Rendering error:', error);
      }
      prevTimeRef.current = time;
    };
    animate();

    // Clean up on unmount
    return () => {
      mount.removeChild(renderer.domElement);
      renderer.forceContextLoss();
      renderer.context = null;
      renderer.domElement = null;
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
