import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const Engine = () => {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    mount.appendChild(renderer.domElement);

    // Camera position
    camera.position.z = 5;

    // Add a simple cube to the scene
    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    // Add a light to the scene
    const light = new THREE.PointLight(0xffffff, 1, 100);
    light.position.set(10, 10, 10);
    scene.add(light);

    // Set a clear color for the renderer
    renderer.setClearColor(0x202020);

    // NPC creation logic
    const createNPC = (id, x, y, z) => {
      const npcGeometry = new THREE.SphereGeometry(0.5, 32, 32);
      const npcMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
      const npc = new THREE.Mesh(npcGeometry, npcMaterial);
      npc.position.set(x, y, z);
      npc.userData.id = id;
      scene.add(npc);
    };

    // Create NPCs with unique IDs
    for (let i = 0; i < 5; i++) {
      createNPC(i, Math.random() * 10 - 5, Math.random() * 10 - 5, Math.random() * 10 - 5);
    }

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      cube.rotation.x += 0.01;
      cube.rotation.y += 0.01;
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup on unmount
    return () => {
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} style={{ width: '100%', height: '100%' }} />;
};

export default Engine;
