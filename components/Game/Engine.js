import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Pathfinding } from 'three-pathfinding';
import NPC from './NPCLogic';
import Physics from './Physics'; // Import the Physics class

// Player object to manage health and death
const player = {
  health: 100,
  die: () => {
    console.log('Player has died.');
    // Placeholder for death handling, such as ending the game or triggering a respawn
  }
};

// HUD component to display player's health
const HUD = ({ health }) => {
  return (
    <div style={{ position: 'absolute', top: '10px', left: '10px', color: 'white', zIndex: 100 }}>
      Health: {health}
    </div>
  );
};

const Engine = ({ npcCount }) => {
  const mountRef = useRef(null);
  const scene = useRef(new THREE.Scene());
  const camera = useRef(new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000));
  camera.current.position.set(0, 5, 10); // Set camera position to view the cube
  const renderer = useRef(new THREE.WebGLRenderer());
  const ambientLight = useRef(new THREE.AmbientLight(0xffffff, 0.5));
  const directionalLight = useRef(new THREE.DirectionalLight(0xffffff, 0.5));
  directionalLight.current.position.set(0, 10, 0);
  const physics = useRef(null); // Changed to null initialization

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

  // useRef to store the animation frame request ID
  const animationFrameIdRef = useRef();

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
  }, []); // Removed animate from the dependency array

  // Named function to handle WebGL context lost event
  function handleContextLost(event) {
    console.log('WebGL context lost. Attempting to restore...');
    event.preventDefault();
  }

  const handleContextRestored = useCallback((event) => {
    console.log('WebGL context restored. Reinitializing...');
    try {
      if (!mountRef.current) {
        throw new Error('Mount point is not available for reinitializing the renderer');
      }

      renderer.current = new THREE.WebGLRenderer();
      renderer.current.setSize(window.innerWidth, window.innerHeight);
      mountRef.current.appendChild(renderer.current.domElement);

      scene.current.add(ambientLight.current);
      scene.current.add(directionalLight.current);
      camera.current.aspect = window.innerWidth / window.innerHeight;
      camera.current.updateProjectionMatrix();

      animate();
    } catch (error) {
      console.error('Error during WebGL context restoration:', error);
    }
  }, [animate]); // Added animate to the dependency array

  useEffect(() => {
    // Initialize NPCs array
    const initialNPCs = [];
    console.log(`Initializing NPCs with count: ${npcCount}`); // Log the start of NPC initialization
    for (let i = 0; i < npcCount; i++) {
      const position = new THREE.Vector3(
        (i % 5) * 10 - 20, // x position
        0, // y position, on the ground
        Math.floor(i / 5) * 10 - 20 // z position
      );
      // Provide the onModelLoaded callback to the NPC constructor
      const npc = new NPC('/models/npc.glb', applyDamageToPlayer, (model) => {
        if (model instanceof THREE.Object3D) {
          scene.current.add(model);
          initialNPCs.push(npc);
          console.log(`NPC added to initialNPCs array:`, npc); // Log when an NPC is added
        } else {
          console.error(`Failed to load NPC model or model is not an instance of THREE.Object3D:`, model);
        }
      });
    }
    setNpcs(initialNPCs);
    console.log(`setNpcs called with initialNPCs array:`, initialNPCs); // Log when setNpcs is called
  }, [npcCount, applyDamageToPlayer]); // Include npcCount and applyDamageToPlayer in the dependency array to re-run only when they change

  // Renderer and PointerLockControls initialization
  useEffect(() => {
    // Ensure that mountRef.current is available before initializing the renderer
    if (!mountRef.current) {
      console.error('Mount point is not available for initializing the renderer');
      return;
    }

    // Initialize the renderer
    renderer.current = new THREE.WebGLRenderer();
    renderer.current.setSize(window.innerWidth, window.innerHeight);
    mountRef.current.appendChild(renderer.current.domElement);

    // Initialize PointerLockControls
    const controls = new PointerLockControls(camera.current, renderer.current.domElement);

    // Add event listeners for WebGL context
    renderer.current.domElement.addEventListener('webglcontextlost', handleContextLost, false);
    renderer.current.domElement.addEventListener('webglcontextrestored', handleContextRestored, false);

    // Add other relevant initialization code here...

    return () => {
      // Use a stable reference to mountRef.current for the cleanup function
      const stableMountRef = mountRef.current;
      // Clean up event listeners and renderer on unmount
      if (renderer.current && renderer.current.domElement && stableMountRef) {
        renderer.current.domElement.removeEventListener('webglcontextlost', handleContextLost);
        renderer.current.domElement.removeEventListener('webglcontextrestored', handleContextRestored);
        stableMountRef.removeChild(renderer.current.domElement);
        renderer.current.dispose();
      }
    };
  }, [handleContextRestored]); // Include handleContextRestored in the dependency array

  // Initialize the Physics instance once when the component mounts
  useEffect(() => {
    physics.current = new Physics();
    // Additional setup if necessary
  }, []); // Empty dependency array to run only once on mount

  // Ref to store the latest animate function
  const latestAnimateRef = useRef();

  // Animation loop
  const animate = useCallback(() => {
    const requestId = requestAnimationFrame(animate);
    animationFrameIdRef.current = requestId; // Store the request ID for cancellation

    const time = performance.now();
    const delta = (time - prevTimeRef.current) / 1000;

    // Ensure that the updatePlayer method is called on the physics instance
    if (!physics.current) {
      console.error('Physics instance is not initialized');
      return; // Early return to prevent further execution if physics instance is not available
    }
    physics.current.updatePlayer(player, delta);

    // Update physics for each NPC
    npcs.forEach((npc) => {
      if (npc.model && npc.model instanceof THREE.Object3D) {
        physics.current.updateNPC(npc, delta);
      } else {
        console.error('NPC model is not an instance of THREE.Object3D or is null', npc);
      }
    });

    // Update NPCs
    npcs.forEach((npc, index) => {
      if (npc.isAlive) {
        npc.update(delta); // Update NPC based on the elapsed time
      }
    });

    try {
      renderer.current.render(scene.current, camera.current);
    } catch (error) {
      console.error('Rendering error:', error);
    }
    prevTimeRef.current = time;
  }, [physics, npcs]); // Include physics and npcs as dependencies of animate

  // Update the ref with the latest animate function after it's defined
  useEffect(() => {
    latestAnimateRef.current = animate;
  }, [animate]);

  // Start the animation loop and handle cleanup
  useEffect(() => {
    const animateCallback = () => latestAnimateRef.current();
    animateCallback();
    // Cleanup function to cancel the animation frame request
    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [npcs]); // Include npcs in the dependency array

  // Render the HUD component above the Three.js canvas
  return (
    <>
      <HUD health={health} />
      <div ref={mountRef} />
    </>
  );
};

export default Engine;
