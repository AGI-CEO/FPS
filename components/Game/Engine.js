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
    // Function to initialize NPCs and add them to the state
    const initializeNPCs = (npcCount) => {
      const initialNPCs = [];
      for (let i = 0; i < npcCount; i++) {
        // Instantiate NPC with initial properties
        // The starting positions and other properties would be determined by the game's design
        // For simplicity, we're placing NPCs in a grid-like pattern
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
    };

    // Call the initializeNPCs function to populate the npcs array with the npcCount from props
    initializeNPCs(npcCount);

    // Scene, Camera, Renderer setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    const mount = mountRef.current; // Copying to a variable for cleanup
    mount.appendChild(renderer.domElement);

    // Pointer Lock Controls
    const controls = new PointerLockControls(camera, renderer.domElement);
    document.addEventListener('click', () => controls.lock());

    // Player movement
    const velocity = new THREE.Vector3();
    const direction = new THREE.Vector3();
    let isSprinting = false;

    function throwGrenade() {
      // Define the grenade properties
      const grenadeMass = 0.2; // Arbitrary mass for the grenade
      const throwForce = 20; // Arbitrary throw force
      const grenadeGeometry = new THREE.SphereGeometry(0.2, 32, 32);
      const grenadeMaterial = new THREE.MeshBasicMaterial({ color: 0xdddddd });
      const grenade = new THREE.Mesh(grenadeGeometry, grenadeMaterial);

      // Set the initial position to the player's current location
      grenade.position.copy(controls.getObject().position);

      // Calculate the initial velocity based on the player's direction and throw force
      const throwDirection = new THREE.Vector3();
      camera.getWorldDirection(throwDirection);
      grenade.velocity = throwDirection.multiplyScalar(throwForce);

      // Assign the grenade to the ref
      grenadeRef.current = grenade;

      // Add the grenade to the scene
      scene.add(grenade);
    }

    function explodeGrenade(position) {
      // Create a particle system to simulate the explosion
      const particlesGeometry = new THREE.BufferGeometry();
      const vertices = [];
      for (let i = 0; i < 100; i++) {
        const x = position.x + Math.random() * 2 - 1;
        const y = position.y + Math.random() * 2 - 1;
        const z = position.z + Math.random() * 2 - 1;
        vertices.push(x, y, z);
      }
      particlesGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      const particlesMaterial = new THREE.PointsMaterial({
        color: 0xffa500,
        size: 0.2,
        map: new THREE.TextureLoader().load('textures/particle.png'),
        blending: THREE.AdditiveBlending,
        transparent: true
      });
      const particlesSystem = new THREE.Points(particlesGeometry, particlesMaterial);

      scene.add(particlesSystem);

      // Remove particles after a short duration
      setTimeout(() => {
        scene.remove(particlesSystem);
      }, 1500);

      // Audio listener attached to the camera
      const audioListener = new THREE.AudioListener();
      camera.add(audioListener);

      // Sound source
      const explosionSound = new THREE.Audio(audioListener);

      // Load a sound and set it as the Audio object's buffer
      const audioLoader = new THREE.AudioLoader();
      audioLoader.load('sounds/explosion.mp3', function(buffer) {
        explosionSound.setBuffer(buffer);
        explosionSound.setVolume(0.75);
        explosionSound.play();
      });

      console.log('Grenade exploded at:', position);
      // TODO: Implement more sophisticated explosion effects if needed
    }

    const onKeyDown = function (event) {
      switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
          direction.z -= 1;
          break;
        case 'ArrowLeft':
        case 'KeyA':
          direction.x -= 1;
          break;
        case 'ArrowDown':
        case 'KeyS':
          direction.z += 1;
          break;
        case 'ArrowRight':
        case 'KeyD':
          direction.x += 1;
          break;
        case 'Space':
          if (canJump === true) velocity.y += 350;
          setCanJump(false);
          break;
        case 'ShiftLeft':
          isSprinting = true;
          break;
        case 'ControlLeft':
          // Toggle crouch: reduce or reset player height
          if (isCrouched) {
            controls.getObject().position.y += 20;
            setIsCrouched(false);
          } else {
            controls.getObject().position.y -= 20;
            setIsCrouched(true);
          }
          break;
        case 'KeyZ':
          // Toggle prone: reduce or reset player height even more
          if (isProne) {
            controls.getObject().position.y += 40;
            setIsProne(false);
          } else {
            controls.getObject().position.y -= 40;
            setIsProne(true);
          }
          break;
        case 'KeyF':
          // Toggle scope: zoom in or out camera
          if (isScoped) {
            camera.fov *= 2;
            setIsScoped(false);
          } else {
            camera.fov /= 2;
            setIsScoped(true);
          }
          camera.updateProjectionMatrix();
          break;
        case 'KeyG':
          // Grenade throw: initiate grenade throw mechanics
          throwGrenade();
          break;
        // More controls to be implemented
      }
    };

    const onKeyUp = function (event) {
      switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
          direction.z += 1;
          break;
        case 'ArrowLeft':
        case 'KeyA':
          direction.x += 1;
          break;
        case 'ArrowDown':
        case 'KeyS':
          direction.z -= 1;
          break;
        case 'ArrowRight':
        case 'KeyD':
          direction.x -= 1;
          break;
        case 'ShiftLeft':
          isSprinting = false;
          break;
        // More controls to be reset
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    // Animation loop
    const animate = () => {
      console.log('Animation loop started');
      requestAnimationFrame(animate);

      const time = performance.now();
      const delta = (time - prevTimeRef.current) / 1000;

      // Removed controls.update() as it is not a method of PointerLockControls

      // Update player movement
      velocity.x -= velocity.x * 10.0 * delta;
      velocity.z -= velocity.z * 10.0 * delta;
      velocity.y -= 9.8 * 100.0 * delta; // 100.0 = mass

      direction.normalize(); // this ensures consistent movements in all directions

      if (direction.z > 0) {
        velocity.z -= (isSprinting ? 800.0 : 400.0) * delta;
      }
      if (direction.z < 0) {
        velocity.z += (isSprinting ? 800.0 : 400.0) * delta;
      }
      if (direction.x > 0) {
        velocity.x += (isSprinting ? 800.0 : 400.0) * delta;
      }
      if (direction.x < 0) {
        velocity.x -= (isSprinting ? 800.0 : 400.0) * delta;
      }

      if (canJump === false) {
        velocity.y = Math.max(0, velocity.y);
      }

      controls.moveRight(-velocity.x * delta);
      controls.moveForward(-velocity.z * delta);

      if (controls.getObject().position.y < 10) {
        velocity.y = 0;
        controls.getObject().position.y = 10;
        setCanJump(true);
      }

      // Update NPCs and handle interactions with the player
      npcs.forEach(npc => {
        npc.update(delta, applyDamageToPlayer); // Pass applyDamageToPlayer to the NPC update method
      });

      // Update grenade trajectory if a grenade has been thrown
      if (grenadeRef.current) {
        // Gravity constant
        const gravity = new THREE.Vector3(0, -9.81, 0);

        // Update grenade velocity with gravity
        grenadeRef.current.velocity.add(gravity.multiplyScalar(delta));

        // Update grenade position with velocity
        grenadeRef.current.position.add(grenadeRef.current.velocity.clone().multiplyScalar(delta));

        // Check for collision with the ground (y=0 for simplicity)
        if (grenadeRef.current.position.y <= 0) {
          grenadeRef.current.position.y = 0;
          explodeGrenade(grenadeRef.current.position);
          scene.remove(grenadeRef.current);
          grenadeRef.current = null;
        }
      }

      // Render the scene
      renderer.render(scene, camera);

      prevTimeRef.current = time;
    };
    animate();

    // Handle window resize
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Clean up on unmount
    return () => {
      if (renderer) {
        renderer.forceContextLoss();
        renderer.context = null;
        renderer.domElement = null;
      }
      mount.removeChild(renderer.domElement); // Using the copied variable for cleanup
      document.removeEventListener('click', () => controls.lock());
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      // Clean up NPCs
      npcs.forEach(npc => {
        // Assuming each NPC has a model that is a child of the scene
        if (npc.model) scene.remove(npc.model);

        // Dispose of the model and any associated resources
        if (npc.model) {
          npc.model.traverse((object) => {
            if (!object.isMesh) return;
            if (object.geometry) object.geometry.dispose();
            if (object.material) object.material.dispose();
          });
        }

        // Stop all mixer actions and dispose of the mixer
        if (npc.mixer) {
          npc.mixer.stopAllAction();
          npc.mixer.uncacheRoot(npc.model);
        }
      });
    };
  }, [npcCount]); // Removed other dependencies to prevent re-renders due to state changes

  return <div ref={mountRef} />;
};

export default Engine;
