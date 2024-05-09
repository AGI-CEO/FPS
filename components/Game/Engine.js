import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls';

const Engine = () => {
  const mountRef = useRef(null);

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

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      // Update controls
      controls.update();
      // Render the scene
      renderer.render(scene, camera);
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
    };
  }, []);

  return <div ref={mountRef} />;
};

export default Engine;
