import { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import heroImage from '@/assets/hero-night-highway.png';

// 3D Billboard Component
function Billboard() {
  const billboardRef = useRef<THREE.Mesh>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.load(heroImage, (loadedTexture) => {
      setTexture(loadedTexture);
    });
  }, []);

  // Slow rotation animation
  useFrame((state) => {
    if (billboardRef.current) {
      const t = state.clock.getElapsedTime();
      // Subtle orbit rotation
      billboardRef.current.rotation.y = Math.sin(t * 0.05) * 0.1;
      // Gentle floating
      billboardRef.current.position.y = Math.sin(t * 0.3) * 0.1;
    }
  });

  return (
    <group>
      {/* Main Billboard */}
      <mesh ref={billboardRef} position={[0, 0, 0]}>
        <boxGeometry args={[4, 2.5, 0.2]} />
        <meshStandardMaterial 
          map={texture}
          emissive={new THREE.Color(0x0066FF)}
          emissiveIntensity={0.1}
        />
      </mesh>

      {/* Billboard Frame */}
      <mesh position={[0, 0, -0.15]}>
        <boxGeometry args={[4.2, 2.7, 0.1]} />
        <meshStandardMaterial 
          color={0x1a1a2e}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {/* Support Pole */}
      <mesh position={[0, -2.5, 0]}>
        <cylinderGeometry args={[0.1, 0.15, 3, 8]} />
        <meshStandardMaterial 
          color={0x2a2a3e}
          metalness={0.9}
          roughness={0.3}
        />
      </mesh>

      {/* Glow Effect */}
      <pointLight position={[0, 0, 2]} intensity={0.5} color={0x0094FF} distance={8} />
    </group>
  );
}

// City Environment
function CityEnvironment() {
  return (
    <>
      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -4, 0]}>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial 
          color={0x0a0a15}
          metalness={0.3}
          roughness={0.8}
        />
      </mesh>

      {/* Ambient city lights */}
      <pointLight position={[-5, 2, -5]} intensity={0.3} color={0xFFAA00} />
      <pointLight position={[5, 2, -5]} intensity={0.3} color={0xFF6600} />
      <pointLight position={[0, 3, -8]} intensity={0.4} color={0x0066FF} />
    </>
  );
}

// Star Field
function StarField() {
  const starsRef = useRef<THREE.Points>(null);

  useEffect(() => {
    if (starsRef.current) {
      const positions = new Float32Array(300 * 3);
      for (let i = 0; i < 300; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 50;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 50;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 50;
      }
      starsRef.current.geometry.setAttribute(
        'position',
        new THREE.BufferAttribute(positions, 3)
      );
    }
  }, []);

  useFrame(() => {
    if (starsRef.current) {
      starsRef.current.rotation.y += 0.0001;
    }
  });

  return (
    <points ref={starsRef}>
      <bufferGeometry />
      <pointsMaterial size={0.05} color={0xffffff} transparent opacity={0.6} />
    </points>
  );
}

// Main WebGL Scene
export const WebGLBillboard = () => {
  const [supportsWebGL, setSupportsWebGL] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check for WebGL support
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    setSupportsWebGL(!!gl);

    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
  }, []);

  // Fallback for mobile or reduced motion
  if (!supportsWebGL || prefersReducedMotion || window.innerWidth < 768) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <img 
          src={heroImage} 
          alt="Go-Ads Billboard" 
          className="w-full h-full object-contain opacity-90"
          style={{
            filter: 'drop-shadow(0 0 30px rgba(0, 148, 255, 0.4))',
          }}
        />
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <Canvas 
        gl={{ 
          antialias: true, 
          alpha: true,
          powerPreference: 'high-performance'
        }}
      >
        <color attach="background" args={['transparent']} />
        
        <PerspectiveCamera makeDefault position={[0, 0, 8]} fov={50} />
        
        {/* Lighting */}
        <ambientLight intensity={0.3} />
        <directionalLight position={[5, 5, 5]} intensity={0.5} />
        <directionalLight position={[-5, -5, -5]} intensity={0.2} />
        
        {/* Scene Elements */}
        <StarField />
        <CityEnvironment />
        <Billboard />
        
        {/* Gentle auto-rotation controls */}
        <OrbitControls 
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.3}
          maxPolarAngle={Math.PI / 2}
          minPolarAngle={Math.PI / 3}
        />
      </Canvas>
    </div>
  );
};
