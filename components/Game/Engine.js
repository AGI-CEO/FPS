import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls';
import NPC from './NPCLogic';

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

  // Named function to handle WebGL context lost event
  function handleContextLost(event) {
    console.log('WebGL context lost. Attempting to restore...');
    event.preventDefault();
  }

  // Named function to handle WebGL context restored event
  function handleContextRestored(event) {
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
  }

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

  // Renderer and PointerLockControls initialization
  useEffect(() => {
    const mount = mountRef.current; // Copy mountRef.current to a variable for use in the cleanup function
    if (mount) {
      // Initialize the renderer
      renderer.current = new THREE.WebGLRenderer();
      renderer.current.setSize(window.innerWidth, window.innerHeight);
      mount.appendChild(renderer.current.domElement);

      // Initialize PointerLockControls
      const controls = new PointerLockControls(camera.current, renderer.current.domElement);

      // Add event listeners for WebGL context
      renderer.current.domElement.addEventListener('webglcontextlost', handleContextLost, false);
      renderer.current.domElement.addEventListener('webglcontextrestored', handleContextRestored, false);

      // Add other relevant initialization code here...

      return () => {
        // Clean up event listeners and renderer on unmount
        if (renderer.current && renderer.current.domElement) {
          renderer.current.domElement.removeEventListener('webglcontextlost', handleContextLost);
          renderer.current.domElement.removeEventListener('webglcontextrestored', handleContextRestored);
          if (mount.contains(renderer.current.domElement)) {
            mount.removeChild(renderer.current.domElement);
          }
          renderer.current.dispose();
        }
      };
    }
  }, []); // Empty dependency array to run only on mount and unmount

  useEffect(() => {
    // Scene, Camera, Renderer setup
    const mount = mountRef.current;
    console.log('mountRef.current before append:', mount);

    // Removed redundant useRef calls for ambientLight and directionalLight

    // Add ambient light to the scene
    scene.current.add(ambientLight.current);
    // Add directional light to the scene
    directionalLight.current.position.set(0, 10, 0);
    scene.current.add(directionalLight.current);

    console.log('Scene:', scene.current);
    console.log('Camera:', camera.current);

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(0, 0, 0);
    scene.current.add(cube);

    let controls;

    function onFullScreenChange() {
      console.log('Full screen change event triggered');
      if (document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement) {
        console.log('Full screen activated, locking pointer');
        controls.lock();
        console.log('Pointer lock requested');
      } else {
        console.log('Exited full screen');
      }
      cleanupFullScreenEventListeners();
    }

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

    // Conditional check before adding click event listener
    if (renderer.current && renderer.current.domElement) {
      renderer.current.domElement.addEventListener('click', handleClick);
    } else {
      console.error('Renderer DOM element is not available, cannot add click event listener');
    }

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
      camera.current.rotation.y -= movementX * 0.002;
      camera.current.rotation.x -= movementY * 0.002;
    };

    document.addEventListener('mousemove', onMouseMove);

    // Handle window resize
    const onWindowResize = () => {
      camera.current.aspect = window.innerWidth / window.innerHeight;
      camera.current.updateProjectionMatrix();
      renderer.current.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', onWindowResize);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      console.log('Animation loop started');
      const time = performance.now();
      const delta = (time - prevTimeRef.current) / 1000;

      // Player movement and NPC update logic...

      // Debugging: Log the camera position and rotation
      console.log('Camera position:', camera.current.position);
      console.log('Camera rotation:', camera.current.rotation);

      try {
        console.log('Attempting to render scene'); // Log before rendering
        renderer.current.render(scene.current, camera.current);
      } catch (error) {
        console.error('Rendering error:', error);
        console.log(error); // Log any caught rendering errors
      }
      prevTimeRef.current = time;
    };
    animate();

    // Clean up on unmount
    return () => {
      // Remove event listeners before removing the DOM element
      renderer.current.domElement.removeEventListener('click', handleClick);
      renderer.current.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.current.domElement.removeEventListener('webglcontextrestored', handleContextRestored);

      // Remove the renderer's DOM element from the mount and perform cleanup
      if (mount.contains(renderer.current.domElement)) {
        mount.removeChild(renderer.current.domElement);
      }
      renderer.current.forceContextLoss();
      renderer.current.context = null;
      renderer.current.domElement = null;

      // Remove other event listeners
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      document.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onWindowResize);
      cleanupFullScreenEventListeners();
      // Additional cleanup logic...
    };
  }, []); // Empty dependency array to run only on mount and unmount


  // Render the HUD component above the Three.js canvas
  return (
    <>
      <HUD health={health} />
      <div ref={mountRef} />
    </>
  );
};

export default Engine;
