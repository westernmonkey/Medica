"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("/draco/");

function startViewer(wrap: HTMLDivElement, src: string) {
  const width = wrap.clientWidth;
  const height = wrap.clientHeight;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf7fdfa);
  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
  wrap.appendChild(renderer.domElement);

  scene.add(new THREE.AmbientLight(0xffffff, 1));
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(1, 1, 1);
  scene.add(directionalLight);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  const loader = new GLTFLoader();
  loader.setDRACOLoader(dracoLoader);
  loader.load(
    src,
    (gltf) => {
      const model = gltf.scene;
      scene.add(model);

      if (src.endsWith("stomach.glb")) {
        model.rotation.y = THREE.MathUtils.degToRad(45);
        model.updateMatrixWorld(true);
      }

      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const halfFov = THREE.MathUtils.degToRad(camera.fov / 2);
      const distance = (maxDim / 2 / Math.tan(halfFov)) / 0.7;

      camera.near = distance / 100;
      camera.far = distance * 100;
      camera.updateProjectionMatrix();
      camera.position.set(center.x, center.y, center.z + distance);
      camera.lookAt(center);
      controls.target.copy(center);
      controls.update();
    },
    undefined,
    (error) => {
      console.error(error);
    },
  );

  function onWindowResize() {
    camera.aspect = wrap.clientWidth / wrap.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(wrap.clientWidth, wrap.clientHeight);
  }

  window.addEventListener("resize", onWindowResize);

  function animate() {
    controls.update();
    renderer.render(scene, camera);
  }

  renderer.setAnimationLoop(animate);

  return () => {
    window.removeEventListener("resize", onWindowResize);
    renderer.setAnimationLoop(null);
    controls.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };
}

export function AnatomyViewer({
  src,
  lazy = false,
  className,
}: {
  src: string;
  lazy?: boolean;
  className?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) {
      return;
    }

    let stopViewer: (() => void) | undefined;

    if (!lazy) {
      stopViewer = startViewer(wrap, src);
      return () => stopViewer?.();
    }

    let started = false;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry.isIntersecting || started) {
          return;
        }
        started = true;
        observer.disconnect();
        stopViewer = startViewer(wrap, src);
      },
      { threshold: 0.35 },
    );

    observer.observe(wrap);

    return () => {
      observer.disconnect();
      stopViewer?.();
    };
  }, [src, lazy]);

  return <div ref={wrapRef} className={className} />;
}
