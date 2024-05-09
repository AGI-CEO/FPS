import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls';

const Engine = () => {
  const mountRef = useRef(null);
  const [canJump, setCanJump] = useState(false);
  const prevTimeRef = useRef(performance.now());

  useEffect(() => {
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
      requestAnimationFrame(animate);

      const time = performance.now();
      const delta = (time - prevTimeRef.current) / 1000;

      // Update controls
      controls.update();

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
      mount.removeChild(renderer.domElement); // Using the copied variable for cleanup
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  return <div ref={mountRef} />;
};

export default Engine;
