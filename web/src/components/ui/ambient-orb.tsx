'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { MeshDistortMaterial } from '@react-three/drei';
import { useRef } from 'react';
import type { Mesh } from 'three';

// Small, self-contained three.js accent — a slowly rotating, gently
// distorting icosahedron in the app's amber accent (design/tokens.json's
// opstatus.maintenance border). Deliberately tiny and cheap: fixed pixel
// size, one low-poly mesh, no post-processing — a page accent, not a hero.
// Renders nothing on the server; the canvas mounts client-side only.
function Orb() {
  const meshRef = useRef<Mesh>(null);
  useFrame((_, delta) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.x += delta * 0.15;
    meshRef.current.rotation.y += delta * 0.22;
  });

  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[1.4, 4]} />
      <MeshDistortMaterial color="#d97706" distort={0.35} speed={1.4} roughness={0.25} metalness={0.4} />
    </mesh>
  );
}

export function AmbientOrb({ className }: { className?: string }) {
  return (
    <div className={className} aria-hidden="true">
      <Canvas camera={{ position: [0, 0, 4], fov: 40 }} dpr={[1, 1.5]} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[3, 2, 4]} intensity={40} color="#fdf1d8" />
        <pointLight position={[-3, -2, -2]} intensity={12} color="#d97706" />
        <Orb />
      </Canvas>
    </div>
  );
}
