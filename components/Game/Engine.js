import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Pathfinding } from 'three-pathfinding';
import NPC from './NPCLogic';
import Physics from './Physics'; // Import the Physics class
import { AudioListener, Audio, PositionalAudio } from 'three';

// Player object to manage health, death, and physics properties
const player = {
  id: 'player', // Unique ID for the player
  health: 100,
  position: new THREE.Vector3(), // Player's initial position
  velocity: new THREE.Vector3(), // Player's initial velocity
  // Initialize the player's model as an empty THREE.Group to act as a placeholder for the actual model
  model: new THREE.Group(), // Placeholder for the player's model for physics and rendering
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

const Engine = ({ npcCount = 5, map = 'defaultMap', setIsAudioReady, setIsEnvironmentReady }) => {
  const mountRef = useRef(null);
  const scene = useRef(new THREE.Scene());
  const camera = useRef(new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000));
  camera.current.position.set(0, 5, 10); // Set camera position to view the cube
  // Memoize the AudioListener to prevent re-creation on every render
  const audioListener = useMemo(() => {
    if (!camera.current.userData.audioListener) {
      const listener = new THREE.AudioListener();
      camera.current.add(listener); // Attach the AudioListener to the camera
      camera.current.userData.audioListener = listener; // Store the AudioListener in the camera's userData for reference
      console.log('AudioListener added to camera.');
      return listener;
    }
    return camera.current.userData.audioListener; // Return the existing AudioListener if already attached
  }, []);
  const renderer = useRef(new THREE.WebGLRenderer());
  const ambientLight = useRef(new THREE.AmbientLight(0xffffff, 0.5));
  const directionalLight = useRef(new THREE.DirectionalLight(0xffffff, 0.5));
  directionalLight.current.position.set(0, 10, 0);
  const physics = useRef(null); // Changed to null initialization

  // Audio file paths
  const audioFiles = {
    gunfire: '/sounds/gunshot.mp3',
    npcFootsteps: '/sounds/mixkit-crunchy-footsteps-loop-535.wav',
    // Add more audio file paths as needed
  };

  // AudioLoader for loading audio files
  const audioLoader = useMemo(() => new THREE.AudioLoader(), []); // Memoize the AudioLoader to prevent re-creation on every render

  // Placeholder functions for audio loading progress and error handling
  function onProgress(xhr) {
    console.log((xhr.loaded / xhr.total * 100) + '% loaded');
  }

  function onError(err) {
    console.error('An error happened during audio loading', err);
  }

  // State to track if the Physics instance is initialized
  const [isPhysicsInitialized, setIsPhysicsInitialized] = useState(false);
  // State to track the availability of audio
  const [isAudioAvailable, setIsAudioAvailable] = useState(true);

  console.log('mountRef is set:', mountRef);
  // Stateful NPCs array
  const [npcs, setNpcs] = useState([]);
  const [canJump, setCanJump] = useState(false);
  const [isCrouched, setIsCrouched] = useState(false);
  const [isProne, setIsProne] = useState(false);
  const [isScoped, setIsScoped] = useState(false);
  const prevTimeRef = useRef(performance.now());
  const grenadeRef = useRef(null);
  // State to track player's health
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

      // Create a large plane to serve as the ground
      const groundGeometry = new THREE.PlaneGeometry(100, 100);
      const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x707070 });
      const ground = new THREE.Mesh(groundGeometry, groundMaterial);
      ground.rotation.x = -Math.PI / 2; // Rotate the plane to be horizontal
      ground.receiveShadow = true; // Allows the plane to receive shadows
      scene.current.add(ground); // Add the ground to the scene

      // Create boxes to serve as obstacles
      const boxGeometry = new THREE.BoxGeometry(2, 2, 2);
      const boxMaterial = new THREE.MeshLambertMaterial({ color: 0x808080 });
      for (let i = 0; i < 10; i++) {
        const box = new THREE.Mesh(boxGeometry, boxMaterial);
        box.position.set(Math.random() * 80 - 40, 1, Math.random() * 80 - 40); // Randomly position the boxes
        box.castShadow = true; // Allows the box to cast shadows
        scene.current.add(box); // Add the box to the scene
      }

      camera.current.aspect = window.innerWidth / window.innerHeight;
      camera.current.updateProjectionMatrix();

      // Removed the direct call to animate to prevent the ReferenceError
      // The animation loop will be started by the useEffect hook that calls animate
    } catch (error) {
      console.error('Error during WebGL context restoration:', error);
    }
  }, []); // Removed animate from the dependency array

  // Function to resume AudioContext on user interaction
  const resumeAudioContext = useCallback(() => {
    console.log('Attempting to resume AudioContext...');
    // Ensure the AudioListener is created and attached to the camera
    if (!audioListener) {
      console.error('AudioListener is not defined.');
      setIsAudioAvailable(false);
      return;
    }
    // Ensure the AudioListener's context is in a valid state
    const audioContext = audioListener.context;
    if (!audioContext) {
      console.error('AudioListener context is not defined.');
      setIsAudioAvailable(false);
      return;
    }
    console.log(`AudioContext state before resuming: ${audioContext.state}`);
    // Only attempt to resume the AudioContext if it's in a suspended state
    if (audioContext.state === 'suspended') {
      audioContext.resume().then(() => {
        console.log('AudioContext resumed successfully.');
        setIsAudioReady(true);
      }).catch((error) => {
        console.error(`Error resuming AudioContext: ${error.message}`);
        setIsAudioAvailable(false);
      });
    } else if (audioContext.state === 'running') {
      console.log('AudioContext is already running.');
      setIsAudioReady(true);
    } else {
      console.error(`Unexpected AudioContext state: ${audioContext.state}`);
      setIsAudioAvailable(false);
    }
    console.log('AudioListener and AudioContext status checked.');
  }, [audioListener, setIsAudioReady, setIsAudioAvailable]);

  // Initialize the audio system
  useEffect(() => {
    // Function to set up audio objects after AudioContext is resumed or confirmed to be running
    const setupAudioObjects = () => {
      // Create an Audio object for gunfire
      const gunfire = new Audio(audioListener);
      audioLoader.load(audioFiles.gunfire, (buffer) => {
        gunfire.setBuffer(buffer);
        gunfire.setLoop(false);
        gunfire.setVolume(0.5);
      }, onProgress, onError);

      // Create a PositionalAudio object for NPC footsteps
      const npcFootsteps = new PositionalAudio(audioListener);
      audioLoader.load(audioFiles.npcFootsteps, (buffer) => {
        npcFootsteps.setBuffer(buffer);
        npcFootsteps.setRefDistance(10);
        npcFootsteps.setLoop(true);
        npcFootsteps.setVolume(0.5);
      }, onProgress, onError);

      // Add more audio objects setup as needed
    };

    // Add event listener to resume AudioContext on user interaction
    document.addEventListener('click', resumeAudioContext);

    // Clean up event listener
    return () => {
      document.removeEventListener('click', resumeAudioContext);
    };
  }, [audioListener, setIsAudioReady, setIsAudioAvailable, audioLoader, audioFiles.gunfire, audioFiles.npcFootsteps, resumeAudioContext]); // Include missing dependency in the dependency array

  // Function to initialize Physics instance and NPCs
  const initPhysicsAndNPCs = useCallback(async () => {
    console.log('initPhysicsAndNPCs: Function called with map:', map, 'npcCount:', npcCount);
    if (isPhysicsInitialized) {
      console.log('initPhysicsAndNPCs: Physics and NPCs are already initialized.');
      return;
    }

    // Validate and set default values for game initialization parameters
    const validMap = map || 'defaultMap';
    const validNpcCount = !isNaN(npcCount) && npcCount > 0 ? parseInt(npcCount) : 5;

    console.log(`initPhysicsAndNPCs: Using map: ${validMap} and npcCount: ${validNpcCount}`);

    try {
      console.log('initPhysicsAndNPCs: Initializing Physics instance...');
      physics.current = new Physics();
      console.log('initPhysicsAndNPCs: Physics instance initialized.');

      // Initialize NPCs here...
      const npcPromises = [];
      for (let i = 0; i < validNpcCount; i++) {
        // Assign a unique ID to each NPC based on the loop index
        const npcId = `npc-${i}`;
        console.log(`initPhysicsAndNPCs: Creating NPC with ID: ${npcId}`);
        const npc = new NPC('/models/npc/vietnam_soldier.obj', applyDamageToPlayer, audioListener, npcId);
        console.log(`initPhysicsAndNPCs: Loading model for NPC with ID: ${npcId}`);
        // Push the model loading promise with error handling
        npcPromises.push(npc.loadModel().then(model => {
          if (!(model instanceof THREE.Object3D)) {
            throw new Error(`NPC model for ID: ${npcId} is not an instance of THREE.Object3D`);
          }
          console.log(`initPhysicsAndNPCs: NPC model loaded successfully for ID: ${npcId}`);
          return npc;
        }).catch(error => {
          console.error(`Error loading NPC model for ID: ${npcId}: ${error.message}`);
          return null; // Return null to filter out unsuccessful loads
        }));
      }
      const loadedNpcs = (await Promise.all(npcPromises)).filter(npc => npc !== null);
      // Additional diagnostic logs to verify the state of each NPC
      loadedNpcs.forEach(npc => {
        console.log(`initPhysicsAndNPCs: NPC with ID: ${npc.id} has model:`, npc.model);
      });
      console.log(`initPhysicsAndNPCs: Loaded NPCs:`, loadedNpcs.map(npc => npc.id));
      // Additional diagnostic logs to verify the state of each NPC
      loadedNpcs.forEach(npc => {
        console.log(`initPhysicsAndNPCs: NPC with ID: ${npc.id} has model:`, npc.model);
      });
      console.log(`initPhysicsAndNPCs: Loaded NPCs:`, loadedNpcs.map(npc => npc.id));
      setNpcs(loadedNpcs);

      // Check if all NPCs are initialized
      let allNpcsInitialized = loadedNpcs.length === validNpcCount;
      console.log(`initPhysicsAndNPCs: All NPCs initialized: ${allNpcsInitialized}`);

      if (physics.current && allNpcsInitialized) {
        setIsPhysicsInitialized(true);
        setIsEnvironmentReady(true); // Invoke the setIsEnvironmentReady function with true once initialization is complete
        console.log('initPhysicsAndNPCs: Initialization complete. Environment is ready.');
      } else {
        console.warn('initPhysicsAndNPCs: Some NPCs could not be loaded or do not have a defined ID. Proceeding with available NPCs.');
        setIsPhysicsInitialized(true);
        setIsEnvironmentReady(allNpcsInitialized); // Environment is considered ready only if all NPCs are initialized
      }
    } catch (error) {
      console.error('initPhysicsAndNPCs: Error during Physics and NPC initialization:', error);
      setIsPhysicsInitialized(false);
      setIsEnvironmentReady(false); // Update the state to reflect that the environment is not ready
    }
  }, [isPhysicsInitialized, setIsEnvironmentReady, map, npcCount, applyDamageToPlayer, audioListener]);

  useEffect(() => {
    initPhysicsAndNPCs();
  }, [initPhysicsAndNPCs]); // initPhysicsAndNPCs is the only dependency

  // Ref to store the latest animate function
  const latestAnimateRef = useRef();

  // Animation loop
  const animate = useCallback(() => {
    try {
      // Diagnostic log to check the state of the Physics instance
      console.log('animate: Checking Physics instance initialization:', physics.current !== null);
      // Diagnostic log to check the initialization state of each NPC
      npcs.forEach((npc, index) => {
        console.log(`animate: Checking NPC[${index}] initialization:`, npc && npc.model instanceof THREE.Object3D && npc.id);
      });

      const requestId = requestAnimationFrame(animate);
      animationFrameIdRef.current = requestId; // Store the request ID for cancellation

      const time = performance.now();
      const delta = (time - prevTimeRef.current) / 1000;

      // Update player physics
      if (player && player.position && player.velocity && isPhysicsInitialized) {
        physics.current.updatePlayer(player, delta);
      }

      // Update physics for each NPC that is loaded and has a valid model
      if (isPhysicsInitialized) {
        npcs.forEach((npc) => {
          if (npc && npc.model instanceof THREE.Object3D && npc.id) {
            physics.current.updateNPC(npc, delta);
          }
        });
      }

      // Ensure all objects are updated before rendering
      scene.current.children.forEach(child => {
        if (child instanceof THREE.Object3D) {
          child.updateMatrixWorld(true);
        }
      });

      renderer.current.render(scene.current, camera.current);
      prevTimeRef.current = time;
    } catch (error) {
      console.error('animate: Error in animation loop:', error);
      // Optionally, stop the animation loop if a critical error occurs
      cancelAnimationFrame(animationFrameIdRef.current);
    }
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
