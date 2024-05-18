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
  }, [handleContextRestored]); // Include all dependencies in the dependency array

  useEffect(() => {
    // Ensure the AudioListener is attached to the camera before attempting to resume the AudioContext
    if (!camera.current.hasAudioListener) {
      console.warn('AudioListener is not attached to the camera. Skipping AudioContext resumption.');
      setIsAudioAvailable(false);
      return;
    }
    // Check if audioListener.current is defined before accessing its context
    if (audioListener.current && audioListener.current.context) {
      const audioContext = audioListener.current.context;
      console.log(`AudioContext state before resumption attempt: ${audioContext.state}`);
      // If the AudioContext is already running, set up audio objects immediately
      if (audioContext.state === 'running') {
        console.log('AudioContext is already running. Setting up audio objects.');
        setIsAudioReady(true); // Invoke the setIsAudioReady function with true
        setupAudioObjects(); // Call setupAudioObjects to load and configure audio
      } else {
        // If the AudioContext is not running, attempt to resume it and then set up audio objects
        console.log('AudioContext is not running. Attempting to resume...');
        audioContext.resume().then(() => {
          console.log('AudioContext resumed successfully.');
          setIsAudioReady(true); // Invoke the setIsAudioReady function with true
          setupAudioObjects(); // Call setupAudioObjects to load and configure audio
        }).catch((error) => {
          console.error(`Error resuming AudioContext: ${error.message}`);
          setIsAudioAvailable(false); // Update the state to reflect that audio is unavailable
        });
      }
    } else {
      console.error('AudioListener or its context is not defined, cannot resume AudioContext or set up audio objects.');
      setIsAudioAvailable(false);
    }
  }, [audioLoader, audioFiles.gunfire, audioFiles.npcFootsteps, setIsAudioReady, setIsAudioAvailable, audioListener]);

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

      // Define box geometry and material for collision objects
      const boxGeometry = new THREE.BoxGeometry(2, 2, 2);
      const boxMaterial = new THREE.MeshLambertMaterial({ color: 0x808080 });

      // Create a large plane to serve as the ground
      const groundGeometry = new THREE.PlaneGeometry(100, 100);
      const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x707070 });
      const ground = new THREE.Mesh(groundGeometry, groundMaterial);
      ground.rotation.x = -Math.PI / 2; // Rotate the plane to be horizontal
      ground.receiveShadow = true; // Allows the plane to receive shadows
      scene.current.add(ground); // Add the ground to the scene
      console.log('Ground object created and added to the scene.');

      // Collect ground and box objects for collision detection
      const mapObjects = [];
      // Add the ground object
      mapObjects.push({
        id: 'ground',
        model: ground,
        position: ground.position,
        velocity: new THREE.Vector3() // Ground does not move
      });
      console.log('Ground object added to collision detection system.');

      // Add box objects
      for (let i = 0; i < 10; i++) {
        const box = new THREE.Mesh(boxGeometry, boxMaterial);
        box.position.set(Math.random() * 80 - 40, 1, Math.random() * 80 - 40);
        box.castShadow = true;
        scene.current.add(box);
        mapObjects.push({
          id: `box-${i}`,
          model: box,
          position: box.position,
          velocity: new THREE.Vector3() // Boxes do not move
        });
        console.log(`Box object ${i} created and added to the scene.`);
      }
      // Add map objects to the physics system
      physics.current.addCollisionObjects(mapObjects);
      console.log('Map objects added to Physics system.');

      // Add the player to the physics system
      if (player.model instanceof THREE.Object3D && player.position && player.velocity) {
        physics.current.addCollisionObjects([player]); // Corrected method call
        console.log('Player added to Physics system:', player);
      } else {
        throw new Error('Player model is not a THREE.Object3D instance or is missing position or velocity properties');
      }

      // Initialize NPCs after Physics instance is confirmed to be initialized
      const npcPromises = [];
      console.log(`Initializing NPCs with count: ${npcCount}`);
      for (let i = 0; i < npcCount; i++) {
        console.log(`Loading NPC model ${i + 1}/${npcCount}`);
        const npc = new NPC('/models/npc/vietnam_soldier.obj', applyDamageToPlayer);
        npc.id = `npc-${i}`;
        npcPromises.push(npc.loadModel());
      }

      const loadedNpcs = await Promise.all(npcPromises);
      loadedNpcs.forEach((npc, index) => {
        const position = new THREE.Vector3(
          (index % 5) * 10 - 20,
          0,
          Math.floor(index / 5) * 10 - 20
        );
        npc.position.copy(position);
        npc.velocity = new THREE.Vector3();
        scene.current.add(npc.model);
        if (npc.model instanceof THREE.Object3D && npc.position && npc.velocity) {
          physics.current.addCollisionObjects([npc]); // Corrected method call
          console.log(`NPC ${npc.id} added to Physics system`);
        } else {
          throw new Error(`NPC ${npc.id} is missing position or velocity properties`);
        }
      });
      setNpcs(loadedNpcs);
      console.log('All NPCs loaded and added to Physics system.');
      setIsPhysicsInitialized(true);
      setIsEnvironmentReady(true); // Invoke the setIsEnvironmentReady function with true once initialization is complete
    } catch (error) {
      console.error('Error during Physics and NPC initialization:', error);
      setIsPhysicsInitialized(false);
      setIsEnvironmentReady(false); // Update the state to reflect that the environment is not ready
    }
  }, [npcCount, applyDamageToPlayer, isPhysicsInitialized, setIsEnvironmentReady]);

  useEffect(() => {
    initPhysicsAndNPCs();
  }, [initPhysicsAndNPCs]); // initPhysicsAndNPCs is the only dependency

  // Ref to store the latest animate function
  const latestAnimateRef = useRef();

  // Animation loop
  const animate = useCallback(() => {
    try {
      // Ensure the Physics instance and NPCs are fully initialized before starting the animation loop
      if (!isPhysicsInitialized || !physics.current || npcs.some(npc => !npc.model)) {
        console.error('Physics instance is not initialized or NPCs are not fully loaded');
        return; // Exit early if not ready
      }

      const requestId = requestAnimationFrame(animate);
      animationFrameIdRef.current = requestId; // Store the request ID for cancellation

      const time = performance.now();
      const delta = (time - prevTimeRef.current) / 1000;

      console.log(`Animating frame at time: ${time}, delta: ${delta}`);

      // Update player physics
      if (player && player.position && player.velocity) {
        physics.current.updatePlayer(player, delta);
      } else {
        console.error('Player object is not properly initialized for physics update');
        return; // Exit early if player is not ready
      }

      // Update physics for each NPC
      npcs.forEach((npc) => {
        if (npc && npc.id && npc.model instanceof THREE.Object3D) {
          physics.current.updateNPC(npc, delta);
        } else {
          console.error('NPC object is not properly initialized for physics update', npc);
        }
      });

      // Ensure all objects are updated before rendering
      scene.current.children.forEach(child => {
        if (child instanceof THREE.Object3D) {
          child.updateMatrixWorld(true);
        }
      });

      renderer.current.render(scene.current, camera.current);
      prevTimeRef.current = time;
    } catch (error) {
      console.error('Error in animation loop:', error);
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
