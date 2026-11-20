import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { LightingMode, Product, ProductHotspot } from '../types';
import { playClickSound, playTurntableTick } from '../services/soundEffects';

interface ThreeCanvasProps {
  product: Product;
  lightingMode: LightingMode;
  rotationDeg: number;
  onRotationChange?: (deg: number) => void;
  activeHotspotId?: string | null;
  onSelectHotspot?: (hotspot: ProductHotspot | null) => void;
  zoomScale?: number;
  isAutoRotate?: boolean;
}

export const ThreeCanvas: React.FC<ThreeCanvasProps> = ({
  product,
  lightingMode,
  rotationDeg,
  onRotationChange,
  activeHotspotId,
  onSelectHotspot,
  zoomScale = 1.0,
  isAutoRotate = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelGroupRef = useRef<THREE.Group | null>(null);
  const lightsGroupRef = useRef<THREE.Group | null>(null);
  const reqAnimRef = useRef<number | null>(null);
  const [screenHotspots, setScreenHotspots] = useState<
    Array<{ id: string; x: number; y: number; hotspot: ProductHotspot; visible: boolean }>
  >([]);

  // Convert product color string to a hex color for Three.js materials
  const getProductColorHex = useCallback((colorName: string): number => {
    const lower = colorName.toLowerCase();
    if (lower.includes('navy') || lower.includes('blue')) return 0x1b2838;
    if (lower.includes('chalk') || lower.includes('white') || lower.includes('cream')) return 0xefede8;
    if (lower.includes('black') || lower.includes('charcoal')) return 0x18181b;
    if (lower.includes('olive') || lower.includes('green') || lower.includes('sage')) return 0x414833;
    if (lower.includes('camel') || lower.includes('linen') || lower.includes('sand') || lower.includes('khaki')) return 0xc2a688;
    if (lower.includes('grey') || lower.includes('gray')) return 0x64748b;
    if (lower.includes('stripe') || lower.includes('breton')) return 0x223249;
    return 0x334155;
  }, []);

  // Initialize Three.js Scene
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 700;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 0.6, 3.4);
    cameraRef.current = camera;

    // 3. Renderer with antialiasing and sRGB color space
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = false;
    controls.minDistance = 1.8;
    controls.maxDistance = 4.5;
    controls.maxPolarAngle = Math.PI / 2 + 0.05; // Don't go below floor
    controls.minPolarAngle = Math.PI / 4;
    controlsRef.current = controls;

    // 5. Lighting Setup
    const lightsGroup = new THREE.Group();
    scene.add(lightsGroup);
    lightsGroupRef.current = lightsGroup;

    // 6. Model Group (mannequin / garment & stage)
    const modelGroup = new THREE.Group();
    scene.add(modelGroup);
    modelGroupRef.current = modelGroup;

    // Build Circular Stage Pedestal
    const stageGeo = new THREE.CylinderGeometry(1.2, 1.25, 0.08, 48);
    const stageMat = new THREE.MeshStandardMaterial({
      color: 0x141416,
      roughness: 0.35,
      metalness: 0.1,
    });
    const stageMesh = new THREE.Mesh(stageGeo, stageMat);
    stageMesh.position.y = -0.96;
    stageMesh.receiveShadow = true;
    modelGroup.add(stageMesh);

    // Stage Trim Ring
    const ringGeo = new THREE.TorusGeometry(1.21, 0.012, 16, 64);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37, // subtle brushed brass
      metalness: 0.8,
      roughness: 0.2,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.position.y = -0.92;
    modelGroup.add(ringMesh);

    // Build Procedural High-Fidelity Mannequin & Garment
    const mannequinGroup = new THREE.Group();
    mannequinGroup.name = 'garmentGroup';

    // Mannequin Base Pole
    const poleGeo = new THREE.CylinderGeometry(0.02, 0.02, 1.8, 16);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x222224, metalness: 0.9, roughness: 0.2 });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.y = -0.05;
    mannequinGroup.add(pole);

    // Mannequin Head / Finial
    const headGeo = new THREE.SphereGeometry(0.12, 32, 24);
    const headMat = new THREE.MeshStandardMaterial({ color: 0x2c2c30, roughness: 0.4, metalness: 0.1 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 0.92;
    mannequinGroup.add(head);

    // Mannequin Neck
    const neckGeo = new THREE.CylinderGeometry(0.065, 0.08, 0.15, 24);
    const neck = new THREE.Mesh(neckGeo, headMat);
    neck.position.y = 0.78;
    mannequinGroup.add(neck);

    // Garment Torso Mesh (PBR cloth)
    const torsoGeo = new THREE.CylinderGeometry(0.34, 0.27, 0.95, 32);
    // Taper to chest and waist
    const posAttr = torsoGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const y = posAttr.getY(i);
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);
      // Oval chest profile
      posAttr.setZ(i, z * 0.75);
      if (y > 0.1) {
        // Broad shoulders
        posAttr.setX(i, x * 1.18);
      }
    }
    torsoGeo.computeVertexNormals();

    const clothColor = getProductColorHex(product.color);
    const isJacket = product.category === 'Outerwear';
    const clothMat = new THREE.MeshPhysicalMaterial({
      color: clothColor,
      roughness: isJacket ? 0.45 : 0.65,
      metalness: isJacket ? 0.15 : 0.02,
      clearcoat: isJacket ? 0.25 : 0.05,
      clearcoatRoughness: 0.3,
      sheen: 0.8,
      sheenColor: new THREE.Color(clothColor).offsetHSL(0, 0, 0.15),
    });
    clothMat.name = 'clothMaterial';

    const torso = new THREE.Mesh(torsoGeo, clothMat);
    torso.position.y = 0.28;
    torso.castShadow = true;
    torso.receiveShadow = true;
    mannequinGroup.add(torso);

    // Left and Right Sleeves
    const sleeveGeo = new THREE.CylinderGeometry(0.11, 0.085, 0.72, 24);
    sleeveGeo.computeVertexNormals();

    const leftSleeve = new THREE.Mesh(sleeveGeo, clothMat);
    leftSleeve.position.set(-0.46, 0.22, 0);
    leftSleeve.rotation.z = 0.24;
    leftSleeve.castShadow = true;
    mannequinGroup.add(leftSleeve);

    const rightSleeve = new THREE.Mesh(sleeveGeo, clothMat);
    rightSleeve.position.set(0.46, 0.22, 0);
    rightSleeve.rotation.z = -0.24;
    rightSleeve.castShadow = true;
    mannequinGroup.add(rightSleeve);

    // Collar / Rib trim
    const collarGeo = new THREE.TorusGeometry(0.18, 0.025, 16, 32);
    const collarMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(clothColor).multiplyScalar(0.75),
      roughness: 0.8,
    });
    const collar = new THREE.Mesh(collarGeo, collarMat);
    collar.rotation.x = Math.PI / 2.1;
    collar.position.set(0, 0.74, 0.03);
    mannequinGroup.add(collar);

    modelGroup.add(mannequinGroup);

    // Load custom GLTF if provided
    if (product.model3dUrl) {
      const loader = new GLTFLoader();
      loader.load(
        product.model3dUrl,
        (gltf) => {
          mannequinGroup.visible = false;
          gltf.scene.position.y = -0.92;
          gltf.scene.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          modelGroup.add(gltf.scene);
        },
        undefined,
        (err) => {
          console.warn('GLTF load fallback to procedural model', err);
          mannequinGroup.visible = true;
        }
      );
    }

    // Animation Loop
    let lastAngle = 0;
    const animate = () => {
      reqAnimRef.current = requestAnimationFrame(animate);

      if (controlsRef.current) {
        controlsRef.current.update();
      }

      // Sync model rotation with user turntable controls
      if (modelGroupRef.current) {
        const targetRad = (rotationDeg * Math.PI) / 180;
        modelGroupRef.current.rotation.y = targetRad;

        // Sound on rotation ticks
        const currentDeg = Math.round(rotationDeg);
        if (Math.abs(currentDeg - lastAngle) >= 12) {
          playTurntableTick(currentDeg - lastAngle);
          lastAngle = currentDeg;
        }
      }

      // Update Screen Coordinates for 3D Hotspots
      if (cameraRef.current && rendererRef.current && containerRef.current && product.hotspots) {
        const rect = containerRef.current.getBoundingClientRect();
        const updated = product.hotspots.map((hs) => {
          const v = new THREE.Vector3(...hs.position);
          if (modelGroupRef.current) {
            v.applyMatrix4(modelGroupRef.current.matrixWorld);
          }
          v.project(cameraRef.current!);

          // Check if hotspot is facing the camera (z < 1 and normal facing camera)
          const isFrontFacing = v.z < 1.0;
          const x = (v.x * 0.5 + 0.5) * rect.width;
          const y = (-(v.y * 0.5) + 0.5) * rect.height;

          return {
            id: hs.id,
            x,
            y,
            hotspot: hs,
            visible: isFrontFacing,
          };
        });
        setScreenHotspots(updated);
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    animate();

    // Resize Observer
    const resizeObserver = new ResizeObserver(() => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      if (reqAnimRef.current) cancelAnimationFrame(reqAnimRef.current);
      controls.dispose();
      renderer.dispose();
      scene.clear();
    };
  }, [product.id]);

  // Update Dynamic Lighting when lightingMode changes
  useEffect(() => {
    const lightsGroup = lightsGroupRef.current;
    if (!lightsGroup) return;

    lightsGroup.clear();

    if (lightingMode === 'daylight') {
      // Daylight Studio: High-key clean white daylight (5500K)
      const ambient = new THREE.AmbientLight(0xffffff, 1.4);
      lightsGroup.add(ambient);

      // Key light
      const keyLight = new THREE.DirectionalLight(0xfff8f0, 2.2);
      keyLight.position.set(2.5, 4.0, 3.0);
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.bias = -0.0005;
      lightsGroup.add(keyLight);

      // Soft fill light
      const fillLight = new THREE.DirectionalLight(0xecf2ff, 1.2);
      fillLight.position.set(-2.5, 2.0, 2.0);
      lightsGroup.add(fillLight);

      // Sharp crisp rim light
      const rimLight = new THREE.DirectionalLight(0xffffff, 1.8);
      rimLight.position.set(0, 3.0, -3.0);
      lightsGroup.add(rimLight);
    } else {
      // Gallery Spotlight: Moody, architectural, warm-golden spotlighting
      const ambient = new THREE.AmbientLight(0x181820, 0.8);
      lightsGroup.add(ambient);

      // Overhead warm spotlight
      const spotLight = new THREE.SpotLight(0xffe2b8, 4.5);
      spotLight.position.set(0, 4.5, 1.2);
      spotLight.angle = Math.PI / 5;
      spotLight.penumbra = 0.6;
      spotLight.castShadow = true;
      spotLight.shadow.mapSize.width = 1024;
      spotLight.shadow.mapSize.height = 1024;
      lightsGroup.add(spotLight);

      // Subtle warm amber rim
      const rimLight = new THREE.DirectionalLight(0xffaa55, 2.0);
      rimLight.position.set(2.5, 1.5, -2.5);
      lightsGroup.add(rimLight);

      // Cool cyan floor wash
      const floorWash = new THREE.PointLight(0x4466aa, 1.2, 8);
      floorWash.position.set(-1.8, -0.6, 1.5);
      lightsGroup.add(floorWash);
    }
  }, [lightingMode]);

  // Update cloth material when color/product changes
  useEffect(() => {
    if (!modelGroupRef.current) return;
    const clothColor = getProductColorHex(product.color);
    modelGroupRef.current.traverse((child) => {
      if ((child as THREE.Mesh).isMesh && (child as THREE.Mesh).material) {
        const mat = (child as THREE.Mesh).material as THREE.MeshPhysicalMaterial;
        if (mat.name === 'clothMaterial') {
          mat.color.setHex(clothColor);
          if (mat.sheenColor) {
            mat.sheenColor.set(new THREE.Color(clothColor).offsetHSL(0, 0, 0.15));
          }
          mat.needsUpdate = true;
        }
      }
    });
  }, [product.color, getProductColorHex]);

  // Update Camera zoom / position based on zoom preset
  useEffect(() => {
    if (!cameraRef.current || !controlsRef.current) return;
    const targetDist = 3.4 / (zoomScale || 1.0);
    const camera = cameraRef.current;
    const dir = camera.position.clone().sub(controlsRef.current.target).normalize();
    camera.position.copy(controlsRef.current.target).addScaledVector(dir, targetDist);
    controlsRef.current.update();
  }, [zoomScale]);

  return (
    <div className="relative w-full h-full select-none">
      {/* Three.js Canvas Container */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* 3D Hotspot Interactive Pins */}
      {screenHotspots.map(({ id, x, y, hotspot, visible }) => {
        if (!visible) return null;
        const isActive = activeHotspotId === id;
        return (
          <div
            key={id}
            style={{
              transform: `translate3d(${x}px, ${y}px, 0)`,
              position: 'absolute',
              top: 0,
              left: 0,
              pointerEvents: 'auto',
            }}
            className="-ml-3 -mt-3 z-20 group"
          >
            <button
              onClick={() => {
                playClickSound();
                onSelectHotspot?.(isActive ? null : hotspot);
              }}
              title={hotspot.title}
              className={`relative flex items-center justify-center w-7 h-7 rounded-full backdrop-blur-md transition-all duration-300 ${
                isActive
                  ? 'bg-amber-400 text-stone-950 scale-125 shadow-lg shadow-amber-500/40'
                  : 'bg-stone-900/80 text-amber-200 border border-amber-300/40 hover:scale-110 hover:bg-stone-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
              {/* Ripple aura */}
              <span
                className={`absolute inset-0 rounded-full border border-current opacity-40 ${
                  isActive ? 'animate-ping' : ''
                }`}
              />
            </button>

            {/* Hover Tooltip */}
            <div className="absolute left-8 top-1/2 -translate-y-1/2 hidden group-hover:block whitespace-nowrap bg-stone-950/90 text-stone-100 text-xs px-2.5 py-1.5 rounded border border-stone-800 shadow-xl pointer-events-none backdrop-blur-md z-30">
              <p className="font-medium text-amber-300">{hotspot.title}</p>
              <p className="text-[10px] text-stone-400">{hotspot.description}</p>
            </div>
          </div>
        );
      })}

      {/* 3D Interaction Badge */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none flex items-center gap-2 bg-stone-950/60 backdrop-blur-md border border-stone-800/80 rounded-full px-3 py-1 text-[11px] text-stone-300">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span>Interactive WebGL 3D</span>
        <span className="text-stone-500 text-[10px]">· Drag to Rotate</span>
      </div>
    </div>
  );
};
