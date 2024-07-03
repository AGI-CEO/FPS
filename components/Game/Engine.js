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

const Engine = ({ npcCount = 5 }) => {
  const mountRef = useRef(null);
  const scene = useRef(new THREE.Scene());
  const camera = useRef(new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000));
  camera.current.position.set(0, 5, 10); // Set camera position to view the cube
  const audioListener = useRef(new THREE.AudioListener());

  const applyDamageToPlayer = useCallback((damage) => {
    setHealth((prevHealth) => Math.max(0, prevHealth - damage));
  }, []); // Removed animate from the dependency array

  useEffect(() => {
    const initializeNPCs = () => {
      const initialNPCs = [];
      console.log(`Initializing NPCs with count: ${npcCount}`); // Log the start of NPC initialization

      const npcPromises = [];
      for (let i = 0; i < npcCount; i++) {
        const position = new THREE.Vector3(
          (i % 5) * 10 - 20, // x position
          0, // y position, on the ground
          Math.floor(i / 5) * 10 - 20 // z position
        );

        const npcPromise = new Promise((resolve, reject) => {
          const npc = new NPC('/models/gltf/Wolf-Blender-2.82a.glb', applyDamageToPlayer, audioListener.current, (model) => {
            if (model instanceof THREE.Object3D) {
              scene.current.add(model);
              initialNPCs.push(npc);
              console.log(`NPC added to initialNPCs array:`, npc); // Log when an NPC is added
              resolve();
            } else {
              console.error(`Failed to load NPC model or model is not an instance of THREE.Object3D:`, model);
              reject(new Error('Failed to load NPC model'));
            }
          });
        });

        npcPromises.push(npcPromise);
      }

      Promise.all(npcPromises)
        .then(() => {
          setNpcs(initialNPCs);
          console.log(`setNpcs called with initialNPCs array:`, initialNPCs); // Log when setNpcs is called
        })
        .catch((error) => {
          console.error('Error initializing NPCs:', error);
        });
    };

    if (audioListener.current && audioListener.current.context) {
      const checkAudioContext = () => {
        if (audioListener.current.context.state !== 'running') {
          audioListener.current.context.resume().then(() => {
            console.log('AudioContext resumed successfully');
            camera.current.add(audioListener.current); // Attach the AudioListener to the camera
            initializeNPCs(); // Initialize NPCs after AudioContext is resumed
          }).catch((error) => {
            console.error('Error resuming AudioContext:', error);
          });
        } else {
          camera.current.add(audioListener.current); // Attach the AudioListener to the camera
          initializeNPCs(); // Initialize NPCs if AudioContext is already running
        }
      };

      if (audioListener.current.context.state === 'suspended') {
        document.addEventListener('click', checkAudioContext, { once: true });
      } else {
        checkAudioContext();
      }
    } else {
      console.error('AudioListener or its context is not defined');
    }
  }, [applyDamageToPlayer, npcCount]);
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

  // Animation loop
  const animate = useCallback(() => {
    if (!isPhysicsInitialized || !physics.current) {
      console.error('Physics instance is not initialized');
      return; // Do not start the animation loop until the Physics instance is initialized
    }
    if (typeof physics.current.updatePlayer !== 'function') {
      console.error('updatePlayer method is not available on Physics instance');
      return; // Do not start the animation loop until the updatePlayer method is available
    }

    const requestId = requestAnimationFrame(animate);
    animationFrameIdRef.current = requestId; // Store the request ID for cancellation

    const time = performance.now();
    const delta = (time - prevTimeRef.current) / 1000;

    // Update player physics
    physics.current.updatePlayer(player, delta);

    // Update physics for each NPC
    npcs.forEach((npc) => {
      if (npc.model instanceof THREE.Object3D && npc.position && npc.velocity) {
        physics.current.updateNPC(npc, delta);
      } else {
        console.error('NPC model is not an instance of THREE.Object3D or is missing position or velocity properties', npc);
      }
    });

    // Update NPCs
    npcs.forEach((npc) => {
      if (npc.isAlive) {
        npc.update(delta); // Update NPC based on the elapsed time
      }
    });

    // Debugging logs
    console.log('Camera position:', camera.current.position);
    console.log('Number of objects in scene:', scene.current.children.length);
    console.log('Renderer size:', renderer.current.getSize(new THREE.Vector2()));

    try {
      renderer.current.render(scene.current, camera.current);
    } catch (error) {
      console.error('Rendering error:', error);
    }
    prevTimeRef.current = time;
  }, [isPhysicsInitialized, physics, npcs]); // Include isPhysicsInitialized, physics, and npcs as dependencies of animate

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
  }, [animate]); // Include animate in the dependency array

  // Renderer and PointerLockControls initialization
  useEffect(() => {
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

  // Initialize the Physics instance once when the component mounts
  useEffect(() => {
    physics.current = new Physics();
    physics.current.onReady(() => {
      setIsPhysicsInitialized(true); // Set the state to true once the Physics instance is fully initialized
      console.log('Physics instance is fully initialized');
    });
  }, []);

  useEffect(() => {
    if (isPhysicsInitialized && physics.current) {
      console.log('Physics instance is initialized, starting animation loop');
      animate(); // Start the animation loop after initializing Physics
    } else {
      console.error('Physics instance is not initialized');
    }
  }, [isPhysicsInitialized, animate]);

  // Ref to store the latest animate function
  const latestAnimateRef = useRef();

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
  }, [npcs, animate]); // Include npcs and animate in the dependency array

  // Render the HUD component above the Three.js canvas
  return (
    <>
      <HUD health={health} />
      <div ref={mountRef} />
    </>
  );
};

export default Engine;
