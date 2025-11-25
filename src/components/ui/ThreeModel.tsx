"use client";

import React, { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, useGLTF } from "@react-three/drei";
import { Center } from "@react-three/drei";

function BrainModel() {
  const { scene } = useGLTF("/source.glb");
  return (
    <Center>
      <primitive object={scene} scale={1.2} />
    </Center>
  );
}

function HeartModel() {
  const { scene } = useGLTF("/human_heart.glb");
  return (
    <Center>
      <primitive object={scene} scale={15} />
    </Center>
  );
}

function LungsModel() {
  const { scene } = useGLTF("/adult_heart_and_lungs.glb");
  return (
    <Center>
      <primitive object={scene} scale={5} />
    </Center>
  );
}


export default function ThreeDViewer() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-6xl mx-auto">
      {/* 🧠 Brain Viewer */}
      <div className="rounded-2xl overflow-hidden shadow-lg border border-gray-200 bg-white">
        <div className="p-4 border-b text-center font-semibold text-gray-800">
          Brain Model
        </div>
        <div className="w-full h-[400px]">
          <Canvas camera={{ position: [0, 1, 3], fov: 50 }}>
            <ambientLight intensity={0.6} />
            <directionalLight position={[3, 3, 3]} intensity={1} />
            <Suspense fallback={null}>
              <BrainModel />
              <Environment preset="studio" />
            </Suspense>
            <OrbitControls enableZoom={true} />
          </Canvas>
        </div>
      </div>
      <div className="rounded-2xl overflow-hidden shadow-lg border border-gray-200 bg-white">
        <div className="p-4 border-b text-center font-semibold text-gray-800">
          Human Heart Model
        </div>
        <div className="w-full h-[400px]">
          <Canvas camera={{ position: [0, 1, 3], fov: 50 }}>
            <ambientLight intensity={0.6} />
            <directionalLight position={[3, 3, 3]} intensity={1} />
            <Suspense fallback={null}>
              <HeartModel />
              <Environment preset="studio" />
            </Suspense>
            <OrbitControls enableZoom={true} />
          </Canvas>
        </div>
      </div>
      <div className="rounded-2xl overflow-hidden shadow-lg border border-gray-200 bg-white">
        <div className="p-4 border-b text-center font-semibold text-gray-800">
          Human Lungs Model
        </div>
        <div className="w-full h-[400px]">
          <Canvas camera={{ position: [0, 1, 3], fov: 50 }}>
            <ambientLight intensity={0.6} />
            <directionalLight position={[3, 3, 3]} intensity={1} />
            <Suspense fallback={null}>
              <LungsModel />
              <Environment preset="studio" />
            </Suspense>
            <OrbitControls enableZoom={true} />
          </Canvas>
        </div>
      </div>
    </div>
  );
}
