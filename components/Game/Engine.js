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

    // Set up event listeners for different browsers to handle the full screen change
    function onFullScreenChange() {
      console.log('Full screen change event triggered'); // Log when the event is triggered
      if (document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement) {
        console.log('Full screen activated, locking pointer'); // Log when full screen is activated
        controls.lock();
        console.log('Pointer lock requested'); // Log pointer lock request
      } else {
        console.log('Exited full screen'); // Log when full screen is exited
      }
      // Clean up the event listener
      cleanupFullScreenEventListeners();
    }

    // Function to clean up full screen event listeners
    function cleanupFullScreenEventListeners() {
      document.removeEventListener('fullscreenchange', onFullScreenChange);
      document.removeEventListener('webkitfullscreenchange', onFullScreenChange);
      document.removeEventListener('mozfullscreenchange', onFullScreenChange);
      document.removeEventListener('MSFullscreenChange', onFullScreenChange);
    }

    // Named function to handle click event for Pointer Lock and Fullscreen
    function handleClick() {
      console.log('handleClick function called'); // Log when the function is called
      // Add event listeners for full screen change
      document.addEventListener('fullscreenchange', onFullScreenChange);
      document.addEventListener('webkitfullscreenchange', onFullScreenChange);
      document.addEventListener('mozfullscreenchange', onFullScreenChange);
      document.addEventListener('MSFullscreenChange', onFullScreenChange);
      console.log('Event listeners for full screen change added'); // Log after adding event listeners

      // Request full screen for different browsers
      if (document.body.requestFullscreen) {
        console.log('Requesting full screen (standard)'); // Log standard full screen request
        document.body.requestFullscreen();
      } else if (document.body.mozRequestFullScreen) { /* Firefox */
        console.log('Requesting full screen (Firefox)'); // Log Firefox full screen request
        document.body.mozRequestFullScreen();
      } else if (document.body.webkitRequestFullscreen) { /* Chrome, Safari & Opera */
        console.log('Requesting full screen (Webkit)'); // Log Webkit full screen request
        document.body.webkitRequestFullscreen();
      } else if (document.body.msRequestFullscreen) { /* IE/Edge */
        console.log('Requesting full screen (IE/Edge)'); // Log IE/Edge full screen request
        document.body.msRequestFullscreen();
      } else {
        console.log('Full screen API is not supported'); // Log when full screen API is not supported
      }
    }

    // Add click event listener to the renderer's DOM element
    renderer.domElement.addEventListener('click', handleClick);

    // Event listeners for player input
    const onKeyDown = (event) => {
      // Player input logic...
    };

    const onKeyUp = (event) => {
      // Player input logic...
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    // Event listener for mouse movement
    const onMouseMove = (event) => {
      // Calculate mouse movement here and update camera rotation
      const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
      const movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

      // Apply the movement to the camera's rotation
      camera.rotation.y -= movementX * 0.002;
      camera.rotation.x -= movementY * 0.002;
    };

    document.addEventListener('mousemove', onMouseMove);

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
      renderer.domElement.removeEventListener('click', handleClick);
      renderer.domElement = null;
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      document.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onWindowResize);
      // Additional cleanup logic...
      cleanupFullScreenEventListeners();
    };
  }, []); // Empty dependency array to run only on mount and unmount

  return <div ref={mountRef} />;
};

export default Engine;
