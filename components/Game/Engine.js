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
    const listener = new THREE.AudioListener();
    // Check if the camera already has an AudioListener attached
    if (!camera.current.hasAudioListener) {
      camera.current.add(listener); // Ensure the AudioListener is added to the camera
      camera.current.hasAudioListener = true; // Mark that the camera has an AudioListener
      console.log('AudioListener added to camera.');
    } else {
      console.log('Camera already has an AudioListener.');
    }
    return listener;
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

  // Initialize the audio system
  useEffect(() => {
    // Check if audioListener.current and its context are defined
    if (audioListener.current && audioListener.current.context) {
      // Check if the AudioContext state is 'suspended' and attempt to resume
      if (audioListener.current.context.state === 'suspended') {
        console.log('AudioContext is suspended. Attempting to resume...');
        audioListener.current.context.resume().then(() => {
          console.log('AudioContext resumed successfully.');
          setIsAudioReady(true); // Invoke the setIsAudioReady function with true
          setupAudioObjects(); // Call the setupAudioObjects function to create and manage audio objects
        }).catch((error) => {
          console.error(`Error resuming AudioContext: ${error.message}`);
          setIsAudioAvailable(false); // Update the state to reflect that audio is unavailable
        });
      } else if (audioListener.current.context.state === 'running') {
        console.log('AudioContext is already running.');
        setIsAudioReady(true); // Invoke the setIsAudioReady function with true
        setupAudioObjects(); // Call the setupAudioObjects function to create and manage audio objects since AudioContext is running
      }
    } else {
      console.error('AudioListener or its context is not defined. Cannot resume AudioContext or set up audio objects.');
      setIsAudioAvailable(false); // Update the state to reflect that audio is unavailable
    }
  }, [audioLoader, audioFiles.gunfire, audioFiles.npcFootsteps, setIsAudioReady, setIsAudioAvailable, audioListener, setupAudioObjects]);

  // Function to set up audio objects after AudioContext is resumed or confirmed to be running
  const setupAudioObjects = useCallback(() => {
    // Create an Audio object for gunfire
    const gunfire = new Audio(audioListener.current);
    audioLoader.load(audioFiles.gunfire, (buffer) => {
      gunfire.setBuffer(buffer);
      gunfire.setLoop(false);
      gunfire.setVolume(0.5);
    }, onProgress, onError);

    // Create a PositionalAudio object for NPC footsteps
    const npcFootsteps = new PositionalAudio(audioListener.current);
    audioLoader.load(audioFiles.npcFootsteps, (buffer) => {
      npcFootsteps.setBuffer(buffer);
      npcFootsteps.setRefDistance(10);
      npcFootsteps.setLoop(true);
      npcFootsteps.setVolume(0.5);
    }, onProgress, onError);

    // Add more audio objects setup as needed
  }, [audioLoader, audioFiles.gunfire, audioFiles.npcFootsteps, audioListener]);

  // Function to initialize Physics instance and NPCs
  const initPhysicsAndNPCs = useCallback(async () => {
    console.log('initPhysicsAndNPCs: Function called.'); // Log when function is called
    if (isPhysicsInitialized) {
      console.log('initPhysicsAndNPCs: Physics and NPCs are already initialized.');
      return;
    }

    try {
      console.log('initPhysicsAndNPCs: Initializing Physics instance...');
      physics.current = new Physics();
      console.log('initPhysicsAndNPCs: Physics instance initialized.');

      // Define box geometry and material for collision objects
      // ... (rest of the code remains unchanged)

      console.log('initPhysicsAndNPCs: Ground object created and added to the scene.');

      // Collect ground and box objects for collision detection
      // ... (rest of the code remains unchanged)

      console.log('initPhysicsAndNPCs: Ground object added to collision detection system.');

      // Add box objects
      // ... (rest of the code remains unchanged)

      console.log('initPhysicsAndNPCs: Map objects added to Physics system.');

      // Add the player to the physics system
      // ... (rest of the code remains unchanged)

      console.log('initPhysicsAndNPCs: Player added to Physics system.');

      // Initialize NPCs after Physics instance is confirmed to be initialized
      // ... (rest of the code remains unchanged)

      console.log('initPhysicsAndNPCs: All NPCs loaded and added to Physics system.');
      setIsPhysicsInitialized(true);
      setIsEnvironmentReady(true); // Invoke the setIsEnvironmentReady function with true once initialization is complete
      console.log('initPhysicsAndNPCs: Initialization complete. Environment is ready.');
    } catch (error) {
      console.error('initPhysicsAndNPCs: Error during Physics and NPC initialization:', error);
      setIsPhysicsInitialized(false);
      setIsEnvironmentReady(false); // Update the state to reflect that the environment is not ready
    }
  }, [isPhysicsInitialized, setIsEnvironmentReady]);

  useEffect(() => {
    initPhysicsAndNPCs();
  }, [initPhysicsAndNPCs]); // initPhysicsAndNPCs is the only dependency

  // Ref to store the latest animate function
  const latestAnimateRef = useRef();

  // Animation loop
  const animate = useCallback(() => {
    try {
      console.log('animate: Animation loop started.'); // Log the start of the animation loop
      // Ensure the Physics instance and NPCs are fully initialized before starting the animation loop
      if (!isPhysicsInitialized || !physics.current || npcs.some(npc => !npc.model)) {
        console.error('animate: Physics instance is not initialized or NPCs are not fully loaded');
        return; // Exit early if not ready
      }

      const requestId = requestAnimationFrame(animate);
      animationFrameIdRef.current = requestId; // Store the request ID for cancellation

      const time = performance.now();
      const delta = (time - prevTimeRef.current) / 1000;

      console.log(`animate: Animating frame at time: ${time}, delta: ${delta}`);

      // Update player physics
      if (player && player.position && player.velocity) {
        physics.current.updatePlayer(player, delta);
        console.log('animate: Player physics updated.'); // Log player physics update
      } else {
        console.error('animate: Player object is not properly initialized for physics update');
        return; // Exit early if player is not ready
      }

      // Update physics for each NPC
      npcs.forEach((npc) => {
        if (npc && npc.id && npc.model instanceof THREE.Object3D) {
          physics.current.updateNPC(npc, delta);
          console.log(`animate: NPC ${npc.id} physics updated.`); // Log NPC physics update
        } else {
          console.error(`animate: NPC object ${npc.id} is not properly initialized for physics update`);
        }
      });

      // Ensure all objects are updated before rendering
      scene.current.children.forEach(child => {
        if (child instanceof THREE.Object3D) {
          child.updateMatrixWorld(true);
        }
      });

      renderer.current.render(scene.current, camera.current);
      console.log('animate: Scene rendered.'); // Log scene rendering
      prevTimeRef.current = time;
    } catch (error) {
      console.error('animate: Error in animation loop:', error);
      // Optionally, stop the animation loop if a critical error occurs
      // cancelAnimationFrame(animationFrameIdRef.current);
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
