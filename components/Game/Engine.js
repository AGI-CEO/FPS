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

  // State to track if the Physics instance is initialized
  const [isPhysicsInitialized, setIsPhysicsInitialized] = useState(false);

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
    event.preventDefault();
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

      // Removed the direct call to animate to prevent the ReferenceError
      // The animation loop will be started by the useEffect hook that calls animate
    } catch (error) {
      console.error('Error during WebGL context restoration:', error);
    }
  }, []); // Removed animate from the dependency array

  useEffect(() => {
    // Renderer and PointerLockControls initialization
    // Ensure that mountRef.current is available before initializing the renderer
    const currentMountRef = mountRef.current;
    if (!currentMountRef) {
      console.error('Mount point is not available for initializing the renderer');
      return;
    }

    // Initialize the renderer
    renderer.current = new THREE.WebGLRenderer();
    renderer.current.setSize(window.innerWidth, window.innerHeight);
    currentMountRef.appendChild(renderer.current.domElement);

    // Initialize PointerLockControls
    const controls = new PointerLockControls(camera.current, renderer.current.domElement);

    // Add event listeners for WebGL context
    renderer.current.domElement.addEventListener('webglcontextlost', handleContextLost, false);
    renderer.current.domElement.addEventListener('webglcontextrestored', handleContextRestored, false);

    // Add other relevant initialization code here...

    return () => {
      // Capture the current value of mountRef.current in a variable
      const stableMountRef = currentMountRef;
      // Clean up event listeners and renderer on unmount
      if (renderer.current && renderer.current.domElement && stableMountRef) {
        renderer.current.domElement.removeEventListener('webglcontextlost', handleContextLost);
        renderer.current.domElement.removeEventListener('webglcontextrestored', handleContextRestored);
        stableMountRef.removeChild(renderer.current.domElement);
        renderer.current.dispose();
      }
    };
  }, [handleContextRestored]); // Include handleContextRestored in the dependency array

  // Function to initialize Physics instance and NPCs
  const initPhysicsAndNPCs = useCallback(async () => {
    if (isPhysicsInitialized) {
      console.log('Physics and NPCs are already initialized.');
      return;
    }

    try {
      console.log('Initializing Physics instance...');
      physics.current = new Physics();
      console.log('Physics instance initialized.');

      const npcPromises = [];
      console.log(`Initializing NPCs with count: ${npcCount}`);
      for (let i = 0; i < npcCount; i++) {
        console.log(`Loading NPC model ${i + 1}/${npcCount}`);
        const npc = new NPC('/models/npc.glb', applyDamageToPlayer);
        npcPromises.push(npc.loadModel());
      }

      await Promise.all(npcPromises).then((loadedNpcs) => {
        loadedNpcs.forEach((npc, index) => {
          const position = new THREE.Vector3(
            (index % 5) * 10 - 20, // x position
            0, // y position, on the ground
            Math.floor(index / 5) * 10 - 20 // z position
          );
          scene.current.add(npc.model);
          npc.position.copy(position);
          physics.current.addCollisionObject(npc);
        });
        setNpcs(loadedNpcs);
        console.log('All NPCs loaded, setting Physics as initialized.');
        setIsPhysicsInitialized(true);
      });
    } catch (error) {
      console.error('Error during Physics and NPC initialization:', error);
      setIsPhysicsInitialized(false);
    }
  }, [npcCount, applyDamageToPlayer, isPhysicsInitialized]);

  useEffect(() => {
    initPhysicsAndNPCs();
  }, [initPhysicsAndNPCs]); // initPhysicsAndNPCs is the only dependency

  // Ref to store the latest animate function
  const latestAnimateRef = useRef();

  // Animation loop
  const animate = useCallback(() => {
    // Ensure the Physics instance and NPCs are fully initialized before starting the animation loop
    if (!isPhysicsInitialized || !physics.current || npcs.some(npc => !npc.model)) {
      console.error('Physics instance is not initialized or NPCs are not fully loaded');
      return; // Exit early if not ready
    }
    if (typeof physics.current.updatePlayer !== 'function' || typeof physics.current.updateNPC !== 'function') {
      console.error('updatePlayer or updateNPC method is not available on Physics instance');
      return; // Exit early if method is not available
    }

    const requestId = requestAnimationFrame(animate);
    animationFrameIdRef.current = requestId; // Store the request ID for cancellation

    const time = performance.now();
    const delta = (time - prevTimeRef.current) / 1000;

    // Update player physics
    physics.current.updatePlayer(player, delta);

    // Update physics for each NPC
    npcs.forEach((npc) => {
      if (npc.model instanceof THREE.Object3D) {
        physics.current.updateNPC(npc, delta);
      } else {
        console.error('NPC model is not an instance of THREE.Object3D or is null', npc);
      }
    });

    // Update NPCs
    npcs.forEach((npc) => {
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
  }, [isPhysicsInitialized, physics, npcs]); // Include isPhysicsInitialized, physics, and npcs as dependencies of animate

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
