"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("/draco/");

const MODELS = [
  { title: "Brain", src: "/models/new_brain.glb", tag: "Nervous system" },
  { title: "Heart", src: "/models/human_heart.glb", tag: "Cardiac system" },
  { title: "Lungs", src: "/models/lungs.glb", tag: "Respiratory system" },
  { title: "Kidney", src: "/models/kidney.glb", tag: "Urinary system" },
  { title: "Stomach", src: "/models/stomach.glb", tag: "Digestive system" },
  {
    title: "Intestines",
    src: "/models/small_and_large_intestine.glb",
    tag: "Digestive system",
  },
  { title: "Spleen", src: "/models/spleen_model.glb", tag: "Lymphatic system" },
  {
    title: "Pancreas",
    src: "/models/human_pancreas_cross_section.glb",
    tag: "Digestive system",
  },
  { title: "Eye", src: "/models/realistic_human_eye.glb", tag: "Sensory system" },
  { title: "Skeleton", src: "/models/skeleton.glb", tag: "Skeletal system" },
  { title: "Spine", src: "/models/spine.glb", tag: "Skeletal system" },
] as const;

const TAGS = [
  "Nervous system",
  "Cardiac system",
  "Respiratory system",
  "Urinary system",
  "Digestive system",
  "Lymphatic system",
  "Sensory system",
  "Skeletal system",
] as const;

function ModelPanel({
  title,
  src,
  tag,
}: {
  title: string;
  src: string;
  tag: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) {
      return;
    }

    let stopViewer: (() => void) | undefined;
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
  }, [src]);

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[#078859]/22 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between border-b border-[#078859]/10 px-4 py-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[#078859]">
            {tag}
          </p>
          <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
        </div>
      </div>
      <div ref={wrapRef} className="aspect-[4/3] w-full bg-[#F7FDFA]" />
    </article>
  );
}

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

export default function AnatomyPage() {
  const [tag, setTag] = useState("All");
  const visible = useMemo(
    () => (tag === "All" ? MODELS : MODELS.filter((model) => model.tag === tag)),
    [tag],
  );

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-[#F7FDFA] to-white px-6 py-10 md:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <p className="text-sm font-medium uppercase tracking-wide text-[#078859]">
            Medica
          </p>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-4xl font-bold tracking-tight text-neutral-900">
              Anatomy
            </h1>
            <label className="flex items-center gap-2 text-sm text-neutral-600">
              <span className="sr-only">Filter by system</span>
              <select
                className="rounded-lg border border-[#078859]/30 bg-white px-3 py-2 text-sm font-medium text-neutral-900"
                value={tag}
                onChange={(event) => setTag(event.target.value)}
              >
                <option value="All">All systems</option>
                {TAGS.map((system) => (
                  <option key={system} value={system}>
                    {system}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="mt-2 max-w-xl text-neutral-600">
            Rotate models in place. Scroll to load more as they enter view.
          </p>
        </header>

        <section className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {visible.map((model) => (
            <ModelPanel key={model.src} {...model} />
          ))}
        </section>
      </div>
    </main>
  );
}
