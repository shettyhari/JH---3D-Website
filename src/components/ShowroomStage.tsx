import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Film,
  Heart,
  Info,
  Layers,
  Moon,
  Pause,
  RotateCcw,
  RotateCw,
  Ruler,
  Sparkles,
  Sun,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { formatPrice, SHOWROOM_BACKDROP_IMAGE, SIZES } from '../data/products';
import { playClickSound, playGarmentSwitchSound, playTurntableTick } from '../services/soundEffects';
import { updateProduct } from '../services/storeService';
import { getShowroomVideoBlob, saveShowroomVideo } from '../services/videoStore';
import { CategoryFilter, CurrencyCode, LightingMode, Product, Size } from '../types';
import { CompleteOutfitDrawer } from './CompleteOutfitDrawer';
import { ResilientImage } from './ResilientImage';
import { SizeGuideModal } from './SizeGuideModal';

interface ShowroomStageProps {
  products: Product[];
  activeCategory: CategoryFilter;
  onSelectCategory: (cat: CategoryFilter) => void;
  activeProductId: string;
  onSelectProduct: (productId: string) => void;
  selectedSize: Size;
  onSelectSize: (size: Size) => void;
  currency: CurrencyCode;
  wishlistIds: string[];
  onToggleWishlist: (productId: string) => void;
  onAddToBag: (productId: string, size: Size) => void;
  onAddMultipleToBag: (items: Array<{ productId: string; size: Size }>) => void;
  isBagOpen: boolean;
  onOpenAIStylist?: () => void;
}

type ZoomFocusPreset = 'full' | 'torso' | 'detail';

const CATEGORIES: CategoryFilter[] = ['All', 'Tops', 'Outerwear'];

const VIEW_ANGLES: Array<{ key: 'front' | 'right' | 'back' | 'left'; label: string; deg: number }> = [
  { key: 'front', label: 'Front', deg: 0 },
  { key: 'right', label: 'Right', deg: 90 },
  { key: 'back', label: 'Back', deg: 180 },
  { key: 'left', label: 'Left', deg: 270 },
];

const ZOOM_PRESETS: Array<{ id: ZoomFocusPreset; label: string; scale: number; panY: number }> = [
  { id: 'full', label: 'Full', scale: 1.0, panY: 0 },
  { id: 'torso', label: 'Torso', scale: 1.65, panY: 10 },
  { id: 'detail', label: 'Detail', scale: 2.35, panY: 16 },
];

const MIN_ZOOM = 1.0;
const MAX_ZOOM = 2.8;

function normalizeDeg(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

function shortestDegDelta(fromDeg: number, toDeg: number): number {
  let diff = ((toDeg - fromDeg + 180) % 360) - 180;
  if (diff < -180) diff += 360;
  return diff;
}

function smoothstep(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

interface OrderedAngleFrame {
  deg: number;
  label: string;
  src: string;
}

const UHD_CACHE_VERSION = 'uhd2';

function withUhdAsset(src: string): string {
  if (!src) return src;
  if (src.startsWith('/src/assets/images/') && !src.includes('?')) {
    return `${src}?v=${UHD_CACHE_VERSION}`;
  }
  return src;
}

function buildOrderedAngleFrames(product: Product): OrderedAngleFrame[] {
  const v = product.showroomViews;
  const candidates: Array<{ deg: number; label: string; src?: string }> = [
    { deg: 0, label: 'Front', src: v.front },
    { deg: 45, label: 'Front-Right', src: v.frontRight },
    { deg: 90, label: 'Right', src: v.right },
    { deg: 135, label: 'Back-Right', src: v.backRight },
    { deg: 180, label: 'Back', src: v.back },
    { deg: 225, label: 'Back-Left', src: v.backLeft },
    { deg: 270, label: 'Left', src: v.left },
    { deg: 315, label: 'Front-Left', src: v.frontLeft },
  ];
  return candidates.filter((c): c is OrderedAngleFrame => Boolean(c.src && c.src.trim()));
}

export function ShowroomStage({
  products,
  activeCategory,
  onSelectCategory,
  activeProductId,
  onSelectProduct,
  selectedSize,
  onSelectSize,
  currency,
  wishlistIds,
  onToggleWishlist,
  onAddToBag,
  onAddMultipleToBag,
  isBagOpen,
  onOpenAIStylist,
}: ShowroomStageProps) {
  const [zoomScale, setZoomScale] = useState(1.0);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [lighting, setLighting] = useState<LightingMode>('daylight');
  const [showSpecs, setShowSpecs] = useState(false);
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);
  const [isOutfitDrawerOpen, setIsOutfitDrawerOpen] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  // Smooth 360-degree real-human rotation state (continuous degrees)
  const [displayAngle, setDisplayAngle] = useState(0);
  const [isAutoSpinning, setIsAutoSpinning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Active 360° real-human spin video state (resolved from IndexedDB or URL)
  const [activeVideoSrc, setActiveVideoSrc] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [uploadingStageVideo, setUploadingStageVideo] = useState(false);
  const videoElRef = useRef<HTMLVideoElement | null>(null);

  const currentAngleRef = useRef(0);
  const targetAngleRef = useRef(0);
  const isDraggingRef = useRef(false);
  const dragModeRef = useRef<'rotate' | 'pan'>('rotate');
  const dragStartRef = useRef({ x: 0, y: 0, angle: 0, panX: 0, panY: 0 });
  const autoSpinRef = useRef(false);
  const zoomScaleRef = useRef(1.0);
  const stageContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    autoSpinRef.current = isAutoSpinning;
  }, [isAutoSpinning]);

  useEffect(() => {
    zoomScaleRef.current = zoomScale;
  }, [zoomScale]);

  const filteredProducts = useMemo(() => {
    if (activeCategory === 'All') return products;
    return products.filter((p) => p.category === activeCategory);
  }, [products, activeCategory]);

  const activeIndex = useMemo(() => {
    const idx = filteredProducts.findIndex((p) => p.id === activeProductId);
    return idx >= 0 ? idx : 0;
  }, [filteredProducts, activeProductId]);

  const activeProduct = filteredProducts[activeIndex] ?? products[0];
  const isSaved = wishlistIds.includes(activeProduct.id);
  const isZoomed = zoomScale > 1.04;

  // Ordered real-human angle frames (4 or 8 angles depending on product)
  const angleFrames = useMemo(
    () => buildOrderedAngleFrames(activeProduct),
    [activeProduct],
  );

  // Load 360° real-human video blob (if attached to activeProduct)
  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    setVideoDuration(0);

    if (activeProduct.showroomVideoId) {
      void getShowroomVideoBlob(activeProduct.showroomVideoId).then((blob) => {
        if (cancelled) return;
        if (blob) {
          objectUrl = URL.createObjectURL(blob);
          setActiveVideoSrc(objectUrl);
        } else {
          setActiveVideoSrc(activeProduct.showroomVideoUrl || null);
        }
      });
    } else if (activeProduct.showroomVideoUrl) {
      setActiveVideoSrc(activeProduct.showroomVideoUrl);
    } else {
      setActiveVideoSrc(null);
    }

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [activeProduct.id, activeProduct.showroomVideoId, activeProduct.showroomVideoUrl]);

  // Preload persistent Ultra-HD showroom stage + all real-human turnaround angles + studio photography
  useEffect(() => {
    const backdropImg = new Image();
    backdropImg.src = withUhdAsset(SHOWROOM_BACKDROP_IMAGE);

    products.forEach((p) => {
      const urls = [
        p.showroomViews.front,
        p.showroomViews.frontRight,
        p.showroomViews.right,
        p.showroomViews.backRight,
        p.showroomViews.back,
        p.showroomViews.backLeft,
        p.showroomViews.left,
        p.showroomViews.frontLeft,
        p.productImage,
      ];
      urls.forEach((src) => {
        if (!src) return;
        const img = new Image();
        img.src = withUhdAsset(src);
      });
    });
  }, [products]);

  // Smooth rAF damping loop for 360° rotation & real-human video frame scrubbing
  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      if (autoSpinRef.current && !(isDraggingRef.current && dragModeRef.current === 'rotate')) {
        // Calm, editorial 360° turn every ~6 seconds
        targetAngleRef.current += dt * 60;
      }

      const diff = targetAngleRef.current - currentAngleRef.current;
      if (Math.abs(diff) > 0.03) {
        currentAngleRef.current += diff * (1 - Math.exp(-13 * dt));
        setDisplayAngle(currentAngleRef.current);
      } else if (currentAngleRef.current !== targetAngleRef.current) {
        currentAngleRef.current = targetAngleRef.current;
        setDisplayAngle(currentAngleRef.current);
      }

      // Sync real-human 360° video currentTime to exact continuous rotation angle
      const vid = videoElRef.current;
      if (vid && Number.isFinite(vid.duration) && vid.duration > 0.1) {
        const targetTime = (normalizeDeg(currentAngleRef.current) / 360) * vid.duration;
        if (Math.abs(vid.currentTime - targetTime) > 0.015) {
          try {
            vid.currentTime = targetTime;
          } catch {
            // Ignore seek while buffering
          }
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const clampPan = useCallback((x: number, y: number, scale: number) => {
    if (scale <= 1.02) return { x: 0, y: 0 };
    const maxShift = ((scale - 1) / (2 * scale)) * 92; // percentage bounds
    return {
      x: Math.max(-maxShift, Math.min(maxShift, x)),
      y: Math.max(-maxShift, Math.min(maxShift, y)),
    };
  }, []);

  const applyZoom = useCallback(
    (nextScale: number, targetPanY?: number) => {
      const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Number(nextScale.toFixed(2))));
      setZoomScale(clamped);
      setPanOffset((prev) =>
        clampPan(
          clamped <= 1.02 ? 0 : prev.x,
          targetPanY !== undefined ? targetPanY : clamped <= 1.02 ? 0 : prev.y,
          clamped,
        ),
      );
    },
    [clampPan],
  );

  const selectZoomPreset = useCallback(
    (presetId: ZoomFocusPreset) => {
      const preset = ZOOM_PRESETS.find((p) => p.id === presetId) ?? ZOOM_PRESETS[0];
      applyZoom(preset.scale, preset.panY);
    },
    [applyZoom],
  );

  const stepCarousel = useCallback(
    (delta: number) => {
      if (filteredProducts.length <= 1) return;
      const nextIndex =
        (activeIndex + delta + filteredProducts.length) % filteredProducts.length;
      onSelectProduct(filteredProducts[nextIndex].id);
    },
    [activeIndex, filteredProducts, onSelectProduct],
  );

  // Keyboard shortcuts: Left/Right switch garments, +/- zooms
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        isBagOpen ||
        isSizeGuideOpen ||
        isOutfitDrawerOpen
      ) {
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        stepCarousel(1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        stepCarousel(-1);
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        applyZoom(zoomScaleRef.current + 0.35);
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        applyZoom(zoomScaleRef.current - 0.35);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    stepCarousel,
    applyZoom,
    isBagOpen,
    isSizeGuideOpen,
    isOutfitDrawerOpen,
  ]);

  // Attach a real-human 360° video directly from the Showroom toolbar
  const handleStageVideoUpload = async (file: File | undefined) => {
    if (!file || !file.type.startsWith('video/')) return;
    setUploadingStageVideo(true);
    try {
      const videoId = await saveShowroomVideo(file);
      await updateProduct({
        ...activeProduct,
        showroomVideoId: videoId,
      });
    } finally {
      setUploadingStageVideo(false);
    }
  };

  // Drag horizontally to rotate 360° (when at 100%) or drag to pan HD detail (when zoomed in)
  const handleStagePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    isDraggingRef.current = true;
    setIsDragging(true);

    if (zoomScaleRef.current > 1.05 && !e.shiftKey) {
      dragModeRef.current = 'pan';
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        angle: targetAngleRef.current,
        panX: panOffset.x,
        panY: panOffset.y,
      };
    } else {
      dragModeRef.current = 'rotate';
      setIsAutoSpinning(false);
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        angle: targetAngleRef.current,
        panX: panOffset.x,
        panY: panOffset.y,
      };
    }
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleStagePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    if (dragModeRef.current === 'pan') {
      const rect = stageContainerRef.current?.getBoundingClientRect();
      const w = rect?.width || 900;
      const h = rect?.height || 700;
      const scale = zoomScaleRef.current;
      const nextX = dragStartRef.current.panX + (dx / w) * (100 / scale) * 1.15;
      const nextY = dragStartRef.current.panY + (dy / h) * (100 / scale) * 1.15;
      setPanOffset(clampPan(nextX, nextY, scale));
    } else {
      // Smooth 360° drag rotation (works continuously for video or multi-angle photos)
      targetAngleRef.current = dragStartRef.current.angle + dx * 0.9;
    }
  };

  const handleStagePointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsDragging(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    // In multi-angle photo mode, settle gently onto nearest sharp camera frame.
    // In 360° real-human video mode, stay at exact dragged degree!
    if (dragModeRef.current === 'rotate' && !activeVideoSrc && angleFrames.length > 0) {
      const stepDeg = 360 / angleFrames.length;
      targetAngleRef.current = Math.round(targetAngleRef.current / stepDeg) * stepDeg;
    }
  };

  const handleStageWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (Math.abs(e.deltaY) < 4) return;
    // Allow smooth scroll-wheel zoom when holding Ctrl/Meta or directly over the model
    if (e.ctrlKey || e.metaKey || isZoomed) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.22 : -0.22;
      applyZoom(zoomScaleRef.current + delta);
    }
  };

  const handleStageDoubleClick = () => {
    if (zoomScale > 1.2) {
      selectZoomPreset('full');
    } else {
      selectZoomPreset('torso');
    }
  };

  const rotateToAngle = (deg: number) => {
    setIsAutoSpinning(false);
    const delta = shortestDegDelta(normalizeDeg(targetAngleRef.current), deg);
    targetAngleRef.current += delta;
  };

  const stepRotation90 = () => {
    setIsAutoSpinning(false);
    const step = activeVideoSrc ? 45 : angleFrames.length >= 8 ? 45 : 90;
    const nextAngle = Math.round(targetAngleRef.current / step) * step + step;
    targetAngleRef.current = nextAngle;
  };

  // Compute neighbouring real-human frames + smoothstep blend for 4-angle or 8-angle turnaround
  const normalizedDeg = normalizeDeg(displayAngle);
  const roundedDeg = Math.round(normalizedDeg) % 360;
  const activeQuadrantIndex = Math.round(normalizedDeg / 90) % 4;
  const activeZoomPreset: ZoomFocusPreset =
    zoomScale < 1.3 ? 'full' : zoomScale < 2.0 ? 'torso' : 'detail';

  const frameBlend = useMemo(() => {
    if (angleFrames.length === 0) {
      return {
        frameA: activeProduct.showroomImage,
        frameB: activeProduct.showroomImage,
        labelA: 'Front',
        labelB: 'Front',
        blendB: 0,
        offsetPx: 0,
      };
    }
    if (angleFrames.length === 1) {
      return {
        frameA: angleFrames[0].src,
        frameB: angleFrames[0].src,
        labelA: angleFrames[0].label,
        labelB: angleFrames[0].label,
        blendB: 0,
        offsetPx: 0,
      };
    }

    // Find bracketing frames around normalizedDeg on the 0..360 circle
    let idxA = angleFrames.length - 1;
    let idxB = 0;
    for (let i = 0; i < angleFrames.length; i++) {
      const next = (i + 1) % angleFrames.length;
      const degA = angleFrames[i].deg;
      const degB = next === 0 ? 360 : angleFrames[next].deg;
      if (normalizedDeg >= degA && normalizedDeg <= degB) {
        idxA = i;
        idxB = next;
        break;
      }
    }

    const degA = angleFrames[idxA].deg;
    const degB = idxB === 0 ? 360 : angleFrames[idxB].deg;
    const span = Math.max(1, degB - degA);
    const rawFraction = Math.max(0, Math.min(1, (normalizedDeg - degA) / span));

    return {
      frameA: angleFrames[idxA].src,
      frameB: angleFrames[idxB].src,
      labelA: angleFrames[idxA].label,
      labelB: angleFrames[idxB].label,
      blendB: smoothstep(rawFraction),
      offsetPx: Math.sin(rawFraction * Math.PI) * 3,
    };
  }, [angleFrames, normalizedDeg, activeProduct.showroomImage]);

  // Compute symmetrical circular slots (-2, -1, +1, +2) around the active center item
  const floatingSlots = useMemo(() => {
    const total = filteredProducts.length;
    if (total <= 1) return [];

    const slots: Array<{ product: Product; offset: -2 | -1 | 1 | 2 }> = [];
    const seen = new Set<string>([activeProduct.id]);

    const addOffset = (offset: -2 | -1 | 1 | 2) => {
      const idx = (activeIndex + offset + total * 4) % total;
      const candidate = filteredProducts[idx];
      if (candidate && !seen.has(candidate.id)) {
        seen.add(candidate.id);
        slots.push({ product: candidate, offset });
      }
    };

    addOffset(1);
    addOffset(-1);
    if (total >= 4) {
      addOffset(2);
      addOffset(-2);
    }

    return slots;
  }, [filteredProducts, activeIndex, activeProduct.id]);

  const handleAddClick = () => {
    onAddToBag(activeProduct.id, selectedSize);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1100);
  };

  return (
    <section
      aria-label="Interactive Real-Human 360-Degree Virtual Try-On Showroom"
      className={`relative w-full h-[calc(100vh-84px)] min-h-[620px] max-h-[980px] overflow-hidden select-none bg-[#4A3222] transition-[filter] duration-300 ${
        isBagOpen || isOutfitDrawerOpen ? 'blur-[5px] scale-[1.005]' : ''
      }`}
    >
      {/* Full-Bleed Unified Brown, Gold & Amber Architectural Showroom + Real Photorealistic Human */}
      <div
        ref={stageContainerRef}
        onPointerDown={handleStagePointerDown}
        onPointerMove={handleStagePointerMove}
        onPointerUp={handleStagePointerEnd}
        onPointerCancel={handleStagePointerEnd}
        onWheel={handleStageWheel}
        onDoubleClick={handleStageDoubleClick}
        style={{ touchAction: isZoomed ? 'none' : 'pan-y' }}
        aria-label={
          isZoomed
            ? `Drag to pan zoomed detail of ${activeProduct.name}`
            : `Drag horizontally to rotate real model 360 degrees wearing ${activeProduct.name}`
        }
        className={`absolute inset-0 overflow-hidden ${
          isDragging ? 'cursor-grabbing' : isZoomed ? 'cursor-move' : 'cursor-grab'
        }`}
      >
        {/* Native-Resolution Ultra-HD Stage Frame (uses exact layout sizing instead of blurry rasterized CSS scale) */}
        <div
          className="absolute transition-[width,height,left,top] ease-out"
          style={{
            width: `${zoomScale * 100}%`,
            height: `${zoomScale * 100}%`,
            left: `${50 - zoomScale * 50 + panOffset.x * zoomScale}%`,
            top: `${50 - zoomScale * 50 + panOffset.y * zoomScale}%`,
            transitionDuration: isDragging && dragModeRef.current === 'pan' ? '0ms' : '240ms',
          }}
        >
          {/* Persistent Locked Showroom Stage Backdrop — never shifts between products */}
          <img
            src={withUhdAsset(SHOWROOM_BACKDROP_IMAGE)}
            alt=""
            aria-hidden="true"
            decoding="sync"
            referrerPolicy="no-referrer"
            className={`uhd-crisp absolute inset-0 w-full h-full object-cover object-[center_24%] pointer-events-none transition-[filter] duration-500 ${
              lighting === 'gallery'
                ? 'brightness-[0.86] contrast-[1.09] saturate-[0.95]'
                : 'brightness-100 contrast-[1.02] saturate-[1.02]'
            }`}
          />

          {/* MODE 1: True 60fps Real-Human 360° Spin Video Scrubber (when video is attached) */}
          {activeVideoSrc ? (
            /* MODE 1: True 60fps Real-Human 360° Spin Video Scrubber (when video is attached) */
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <video
                ref={videoElRef}
                src={activeVideoSrc}
                muted
                playsInline
                preload="auto"
                onLoadedMetadata={(e) => {
                  const dur = e.currentTarget.duration;
                  if (Number.isFinite(dur) && dur > 0) {
                    setVideoDuration(dur);
                  }
                }}
                className={`w-full h-full object-cover object-[center_24%] transition-[filter] duration-500 ${
                  lighting === 'gallery'
                    ? 'brightness-[0.86] contrast-[1.09] saturate-[0.95]'
                    : 'brightness-100 contrast-[1.02] saturate-[1.02]'
                }`}
              />
            </div>
          ) : (
            /* MODE 2: Ultra-HD Real Photorealistic Human Multi-Angle Turnaround (4-Angle or 8-Angle) */
            <AnimatePresence mode="sync">
              <motion.div
                key={activeProduct.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-0"
              >
                {(() => {
                  const isCustomUpload = (src: string) =>
                    !src.startsWith('/src/assets/images/');
                  const customA = isCustomUpload(frameBlend.frameA);
                  const customB = isCustomUpload(frameBlend.frameB);
                  const isMidBlend =
                    frameBlend.blendB > 0.004 &&
                    frameBlend.blendB < 0.996 &&
                    frameBlend.frameB !== frameBlend.frameA;
                  const srcA = withUhdAsset(frameBlend.frameA);
                  const srcB = withUhdAsset(frameBlend.frameB);

                  return (
                    <>
                      {/* Base angle frame (A) — zero transform at rest for native pixel-crisp rendering */}
                      {customA ? (
                        <div className="absolute inset-0 flex items-center justify-center pt-12 pb-28 pointer-events-none">
                          <div className="relative w-[220px] sm:w-[270px] md:w-[300px] aspect-[3/4] rounded-2xl overflow-hidden bg-[#FBF4E8]/94 shadow-[0_32px_70px_-18px_rgba(34,18,8,0.55)] ring-1 ring-[#D4A243]/55">
                            <ResilientImage
                              src={srcA}
                              alt={`${activeProduct.name} (${frameBlend.labelA} view)`}
                              fallbackTitle={activeProduct.name}
                              fetchPriority="high"
                              className={`w-full h-full object-contain p-3 transition-[filter] duration-500 ${
                                lighting === 'gallery'
                                  ? 'brightness-[0.88] contrast-[1.07]'
                                  : 'brightness-100 contrast-[1.02]'
                              }`}
                            />
                          </div>
                        </div>
                      ) : (
                        <div
                          className="absolute inset-0"
                          style={
                            isMidBlend
                              ? { transform: `translate3d(${-frameBlend.offsetPx}px, 0, 0)` }
                              : undefined
                          }
                        >
                          <ResilientImage
                            src={srcA}
                            alt={`Real model wearing ${activeProduct.name} (${frameBlend.labelA} view)`}
                            fallbackTitle={activeProduct.name}
                            fetchPriority="high"
                            className={`uhd-crisp w-full h-full object-cover object-[center_24%] pointer-events-none transition-[filter] duration-500 ${
                              lighting === 'gallery'
                                ? 'brightness-[0.86] contrast-[1.09] saturate-[0.95]'
                                : 'brightness-100 contrast-[1.02] saturate-[1.02]'
                            }`}
                          />
                        </div>
                      )}

                      {/* Blended neighbor angle frame (B) only during active 360° sweep */}
                      {isMidBlend &&
                        (customB ? (
                          <div
                            className="absolute inset-0 flex items-center justify-center pt-12 pb-28 pointer-events-none"
                            style={{ opacity: frameBlend.blendB }}
                          >
                            <div className="relative w-[220px] sm:w-[270px] md:w-[300px] aspect-[3/4] rounded-2xl overflow-hidden bg-[#FBF4E8]/94 shadow-[0_32px_70px_-18px_rgba(34,18,8,0.55)] ring-1 ring-[#D4A243]/55">
                              <ResilientImage
                                src={srcB}
                                alt={`${activeProduct.name} (${frameBlend.labelB} view)`}
                                fallbackTitle={activeProduct.name}
                                className={`w-full h-full object-contain p-3 transition-[filter] duration-500 ${
                                  lighting === 'gallery'
                                    ? 'brightness-[0.88] contrast-[1.07]'
                                    : 'brightness-100 contrast-[1.02]'
                                }`}
                              />
                            </div>
                          </div>
                        ) : (
                          <div
                            className="absolute inset-0 pointer-events-none"
                            style={{
                              opacity: frameBlend.blendB,
                              transform: `translate3d(${frameBlend.offsetPx}px, 0, 0)`,
                            }}
                          >
                            <ResilientImage
                              src={srcB}
                              alt={`Real model wearing ${activeProduct.name} (${frameBlend.labelB} view)`}
                              fallbackTitle={activeProduct.name}
                              className={`uhd-crisp w-full h-full object-cover object-[center_24%] transition-[filter] duration-500 ${
                                lighting === 'gallery'
                                  ? 'brightness-[0.86] contrast-[1.09] saturate-[0.95]'
                                  : 'brightness-100 contrast-[1.02] saturate-[1.02]'
                              }`}
                            />
                          </div>
                        ))}
                    </>
                  );
                })()}
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* Evening gallery vignette (zero haze in Daylight mode for crystal-clear Ultra-HD clarity) */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 transition-opacity duration-500 ${
            lighting === 'gallery'
              ? 'bg-[radial-gradient(circle_at_50%_42%,transparent_32%,rgba(24,13,6,0.56)_100%)] opacity-100'
              : 'opacity-0'
          }`}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-[#1A0E07]/48 via-[#2A1810]/12 to-transparent"
        />
      </div>

      {/* Top Bar: Centered Category Filter + Active View Badge */}
      <div className="pointer-events-none relative z-30 pt-4 sm:pt-5 px-4 sm:px-6 flex items-center justify-between gap-3">
        {/* Left badge: active real-human mode (360° Video or Photo Angles + Zoom %) */}
        <div className="hidden md:flex items-center gap-2 min-w-[200px]">
          <div className="pointer-events-auto inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#26160C]/78 backdrop-blur-md border border-[#E5B54F]/35 text-[11px] font-medium text-[#F5D27E] shadow-[0_8px_22px_-8px_rgba(16,8,3,0.5)]">
            <span>
              {activeVideoSrc
                ? `360° Real Video${videoDuration > 0 ? ` · ${videoDuration.toFixed(1)}s` : ''}`
                : `Real Model · ${angleFrames.length} Angles`}
            </span>
            {isZoomed && (
              <>
                <span aria-hidden="true" className="h-3 w-px bg-[#E5B54F]/35" />
                <span className="text-[#FFF5E4] tabular-nums">
                  {Math.round(zoomScale * 100)}%
                </span>
              </>
            )}
          </div>
        </div>

        {/* Top-Center Category Filter Switcher (All / Tops / Outerwear) */}
        <div
          role="tablist"
          aria-label="Garment category filter"
          className="pointer-events-auto mx-auto md:mx-0 inline-flex items-center gap-1 p-1 rounded-full bg-[#26160C]/76 backdrop-blur-md border border-[#E5B54F]/35 shadow-[0_10px_28px_-8px_rgba(22,12,6,0.5)]"
        >
          {CATEGORIES.map((category) => {
            const isSelected = activeCategory === category;
            return (
              <button
                key={category}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => onSelectCategory(category)}
                className={`relative px-4 py-1.5 text-xs font-medium rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isSelected ? 'text-[#1E1109]' : 'text-[#F6E4C1]/90 hover:text-[#FFF8EC]'
                }`}
              >
                {isSelected && (
                  <motion.span
                    layoutId="showroomCategoryPill"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    className="absolute inset-0 rounded-full bg-gradient-to-r from-[#D4A243] via-[#E5B54F] to-[#EFC86A] shadow-sm"
                  />
                )}
                <span className="relative z-10">{category}</span>
              </button>
            );
          })}
        </div>

        {/* Right: AI Stylist consultation button */}
        <div className="pointer-events-auto flex items-center gap-2 min-w-[200px] justify-end">
          {onOpenAIStylist && (
            <button
              type="button"
              onClick={onOpenAIStylist}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-[#26160C]/90 to-[#3A2214]/90 backdrop-blur-md border border-[#E5B54F]/50 text-[#F5D27E] hover:border-[#E5B54F] hover:shadow-lg hover:shadow-amber-500/20 transition-all text-xs font-medium cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>AI Stylist</span>
            </button>
          )}
        </div>
      </div>

      {/* Left Vertical Showroom Utility Pill */}
      <aside
        aria-label="Showroom viewing controls"
        className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-1.5 p-1.5 rounded-full bg-[#26160C]/72 backdrop-blur-md border border-[#E5B54F]/35 shadow-[0_12px_32px_-8px_rgba(22,12,6,0.45)]"
      >
        <label
          title={
            uploadingStageVideo
              ? 'Saving 360° video...'
              : activeVideoSrc
                ? 'Replace 360° real-human video for this garment'
                : 'Upload 360° real-human spin video (MP4/WebM)'
          }
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
            activeVideoSrc
              ? 'bg-[#E5B54F] text-[#1E1109] shadow-sm'
              : 'text-[#F8E7C8] hover:bg-[#E5B54F]/20 hover:text-[#FFF8EC]'
          }`}
        >
          <Film className="w-4 h-4" />
          <input
            type="file"
            accept="video/mp4,video/webm,video/quicktime,video/*"
            disabled={uploadingStageVideo}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              void handleStageVideoUpload(e.target.files?.[0]);
              e.target.value = '';
            }}
            className="sr-only"
          />
        </label>

        <button
          type="button"
          onClick={() => setIsAutoSpinning((s) => !s)}
          aria-label={isAutoSpinning ? 'Pause 360 degree rotation' : 'Play 360 degree rotation'}
          title={isAutoSpinning ? 'Pause 360° spin' : '360° auto-rotate'}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
            isAutoSpinning
              ? 'bg-[#E5B54F] text-[#1E1109] shadow-sm'
              : 'text-[#F8E7C8] hover:bg-[#E5B54F]/20 hover:text-[#FFF8EC]'
          }`}
        >
          {isAutoSpinning ? <Pause className="w-4 h-4" /> : <RotateCw className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={() =>
            lighting === 'daylight' ? setLighting('gallery') : setLighting('daylight')
          }
          aria-label={
            lighting === 'daylight'
              ? 'Switch to evening gallery lighting'
              : 'Switch to warm daylight'
          }
          title={lighting === 'daylight' ? 'Evening gallery lighting' : 'Warm daylight'}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
            lighting === 'gallery'
              ? 'bg-[#E5B54F] text-[#1E1109] shadow-sm'
              : 'text-[#F8E7C8] hover:bg-[#E5B54F]/20 hover:text-[#FFF8EC]'
          }`}
        >
          {lighting === 'daylight' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={() => setShowSpecs((s) => !s)}
          aria-label="Toggle fabric and fit details"
          title="Fabric & fit specifications"
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
            showSpecs
              ? 'bg-[#E5B54F] text-[#1E1109] shadow-sm'
              : 'text-[#F8E7C8] hover:bg-[#E5B54F]/20 hover:text-[#FFF8EC]'
          }`}
        >
          <Info className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => setIsOutfitDrawerOpen(true)}
          aria-label={`Complete the outfit for ${activeProduct.name}`}
          title="Complete the outfit"
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
            isOutfitDrawerOpen
              ? 'bg-[#E5B54F] text-[#1E1109] shadow-sm'
              : 'text-[#F8E7C8] hover:bg-[#E5B54F]/20 hover:text-[#FFF8EC]'
          }`}
        >
          <Layers className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => onToggleWishlist(activeProduct.id)}
          aria-label={isSaved ? 'Remove from saved pieces' : 'Save piece to wishlist'}
          title={isSaved ? 'Saved' : 'Save piece'}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
            isSaved
              ? 'bg-[#E5B54F] text-[#1E1109] shadow-sm'
              : 'text-[#F8E7C8] hover:bg-[#E5B54F]/20 hover:text-[#FFF8EC]'
          }`}
        >
          <Heart className={`w-4 h-4 ${isSaved ? 'fill-[#9A4A0A] text-[#9A4A0A]' : ''}`} />
        </button>
      </aside>

      {/* Optional Slide-In Garment Specification Sheet */}
      <AnimatePresence>
        {showSpecs && (
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-16 sm:left-20 top-1/2 -translate-y-1/2 z-30 w-[290px] sm:w-[320px] rounded-2xl bg-[#FFFBF4]/95 dark:bg-[#1B110B]/95 backdrop-blur-xl border border-[#C6922E]/35 dark:border-[#D4A243]/30 shadow-[0_24px_60px_-14px_rgba(32,18,8,0.42)] p-5 text-[#2A1810] dark:text-[#F7EFE2]"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="text-[11px] text-[#9A4A0A] dark:text-[#E5B54F] tracking-wide font-medium">
                  {activeProduct.category} · {activeProduct.color}
                </p>
                <h2 className="font-editorial text-2xl font-medium leading-tight mt-0.5">
                  {activeProduct.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowSpecs(false)}
                aria-label="Close specifications"
                className="p-1 text-[#7D5B3F] dark:text-[#A98C6D] hover:text-[#2A1810] dark:hover:text-[#F7EFE2] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs leading-relaxed text-[#5E402A] dark:text-[#D4BEA1] mb-4">
              {activeProduct.description}
            </p>
            <dl className="space-y-2.5 text-xs border-t border-[#3B2314]/[0.12] dark:border-[#D4A243]/[0.18] pt-3.5">
              <div className="flex justify-between gap-3">
                <dt className="text-[#7D5B3F] dark:text-[#A98C6D] shrink-0">Fabric</dt>
                <dd className="text-right font-medium text-[#2A1810] dark:text-[#F7EFE2]">
                  {activeProduct.specs.fabric}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[#7D5B3F] dark:text-[#A98C6D] shrink-0">Weight</dt>
                <dd className="text-right font-medium text-[#2A1810] dark:text-[#F7EFE2] tabular-nums">
                  {activeProduct.specs.weight}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[#7D5B3F] dark:text-[#A98C6D] shrink-0">Origin</dt>
                <dd className="text-right font-medium text-[#2A1810] dark:text-[#F7EFE2]">
                  {activeProduct.specs.origin}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[#7D5B3F] dark:text-[#A98C6D] shrink-0">Fit</dt>
                <dd className="text-right font-medium text-[#2A1810] dark:text-[#F7EFE2]">
                  {activeProduct.specs.fit}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[#7D5B3F] dark:text-[#A98C6D] shrink-0">Sizing</dt>
                <dd className="text-right text-[#5E402A] dark:text-[#D4BEA1]">
                  {activeProduct.specs.modelNote}
                </dd>
              </div>
            </dl>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsSizeGuideOpen(true)}
                className="py-2 px-2.5 rounded-lg border border-[#3B2314]/20 dark:border-[#D4A243]/30 hover:bg-[#3B2314]/[0.06] dark:hover:bg-[#D4A243]/10 text-xs font-medium text-[#2A1810] dark:text-[#F7EFE2] inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
              >
                <Ruler className="w-3.5 h-3.5 text-[#B45309] dark:text-[#E5B54F]" aria-hidden="true" />
                <span>Size Guide</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSpecs(false);
                  setIsOutfitDrawerOpen(true);
                }}
                className="py-2 px-2.5 rounded-lg bg-[#3B2314] dark:bg-[#E0AD42] hover:bg-[#52311C] dark:hover:bg-[#EBC05E] text-xs font-medium text-[#FFF8EC] dark:text-[#1B1009] inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Style Look</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Curved Perspective Floating Garment Carousel (Left & Right of Real Model — hides cleanly when zoomed) */}
      <div
        className={`showroom-perspective pointer-events-none absolute inset-0 z-20 flex items-center justify-center transition-opacity duration-300 ${
          isZoomed ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        <AnimatePresence initial={false}>
          {floatingSlots.map(({ product, offset }) => {
            const isInner = Math.abs(offset) === 1;
            const direction = offset > 0 ? 1 : -1;

            const xOffset = isInner ? direction * 23.5 : direction * 38;
            const yOffset = isInner ? -16 : -26;
            const scale = isInner ? 1 : 0.76;
            const rotateY = isInner ? -direction * 13 : -direction * 24;
            const opacity = isInner ? 0.98 : 0.72;

            return (
              <motion.button
                key={product.id}
                type="button"
                onClick={() => onSelectProduct(product.id)}
                initial={{
                  opacity: 0,
                  scale: 0.68,
                  x: `${direction * 44}vw`,
                  y: yOffset,
                  rotateY,
                }}
                animate={{
                  opacity,
                  scale,
                  x: `${xOffset}vw`,
                  y: yOffset,
                  rotateY,
                }}
                exit={{
                  opacity: 0,
                  scale: 0.65,
                  x: `${direction * 46}vw`,
                }}
                whileHover={{
                  scale: scale * 1.05,
                  y: yOffset - 6,
                  opacity: 1,
                }}
                transition={{
                  type: 'spring',
                  stiffness: 260,
                  damping: 28,
                  mass: 0.9,
                }}
                aria-label={`Try on ${product.name} (${formatPrice(
                  product.priceUsd,
                  currency,
                )})`}
                className={`pointer-events-auto group absolute flex flex-col items-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5B54F] rounded-2xl ${
                  isInner ? 'hidden md:flex z-20' : 'hidden xl:flex z-10'
                }`}
                style={{ transformStyle: 'preserve-3d' }}
              >
                <div
                  className={`relative rounded-xl overflow-hidden bg-[#FBF4E8]/95 ring-1 ring-[#D4A243]/55 transition-shadow duration-300 ${
                    isInner
                      ? 'w-[148px] lg:w-[172px] xl:w-[186px] aspect-[3/4] shadow-[0_26px_54px_-14px_rgba(32,16,6,0.48)] group-hover:shadow-[0_32px_64px_-12px_rgba(32,16,6,0.58)] group-hover:ring-[#E5B54F]'
                      : 'w-[136px] xl:w-[152px] aspect-[3/4] shadow-[0_20px_40px_-14px_rgba(32,16,6,0.38)]'
                  }`}
                >
                  <ResilientImage
                    src={withUhdAsset(product.productImage)}
                    alt={product.name}
                    fallbackTitle={product.name}
                    className="uhd-crisp w-full h-full object-contain p-2.5 transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                  <div className="absolute inset-x-0 bottom-0 py-2 bg-gradient-to-t from-[#26150B]/88 via-[#26150B]/35 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex justify-center">
                    <span className="text-[10px] font-medium tracking-[0.14em] uppercase text-[#F5D27E]">
                      Try On
                    </span>
                  </div>
                </div>

                <div className="mt-3 text-center px-2">
                  <p className="text-xs lg:text-[13px] font-medium text-[#FFF8EC] tracking-tight drop-shadow-[0_1px_6px_rgba(20,10,4,0.82)] whitespace-nowrap">
                    {product.name}
                  </p>
                  <p className="text-[11px] lg:text-xs text-[#F4D896] tabular-nums mt-0.5 drop-shadow-[0_1px_6px_rgba(20,10,4,0.82)]">
                    {formatPrice(product.priceUsd, currency)}
                  </p>
                </div>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Mobile Prev / Next Carousel Arrows */}
      {filteredProducts.length > 1 && !isZoomed && (
        <>
          <button
            type="button"
            onClick={() => stepCarousel(-1)}
            aria-label="Previous garment"
            className="md:hidden absolute left-4 bottom-40 z-30 w-10 h-10 rounded-full bg-[#26160C]/80 backdrop-blur-md border border-[#E5B54F]/45 text-[#F6DFA2] flex items-center justify-center shadow-lg cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => stepCarousel(1)}
            aria-label="Next garment"
            className="md:hidden absolute right-4 bottom-40 z-30 w-10 h-10 rounded-full bg-[#26160C]/80 backdrop-blur-md border border-[#E5B54F]/45 text-[#F6DFA2] flex items-center justify-center shadow-lg cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Bottom Floating 360° Turntable + HD Zoom Bar + Purchase Dock */}
      <div className="absolute inset-x-0 bottom-3.5 sm:bottom-5 z-30 flex flex-col items-center px-3 sm:px-6 pointer-events-none">
        {/* Compact 360° Angle & HD Zoom Control Bar directly below the real model */}
        <div className="pointer-events-auto mb-2.5 max-w-full overflow-x-auto no-scrollbar rounded-full bg-[#26160C]/84 backdrop-blur-md border border-[#E5B54F]/38 shadow-[0_10px_28px_-8px_rgba(20,10,4,0.55)] px-2 py-1 text-[#FFF5E4]">
          <div className="inline-flex items-center gap-1 whitespace-nowrap">
            <button
              type="button"
              onClick={stepRotation90}
              aria-label="Step model rotation"
              title="Turn angle · Drag stage to rotate 360°"
              className="inline-flex items-center gap-1.5 pl-2.5 pr-2 py-1 rounded-full text-[11px] font-medium text-[#F5D27E] hover:bg-[#E5B54F]/18 transition-colors shrink-0 cursor-pointer tabular-nums"
            >
              <RotateCw className="w-3 h-3" aria-hidden="true" />
              <span>360° · {roundedDeg}°</span>
            </button>

            <span aria-hidden="true" className="h-3.5 w-px bg-[#E5B54F]/30 mx-0.5 shrink-0" />

            <div role="radiogroup" aria-label="Model rotation angle" className="flex items-center gap-0.5">
              {VIEW_ANGLES.map((angle, index) => {
                const isActive = !isAutoSpinning && activeQuadrantIndex === index;
                return (
                  <button
                    key={angle.key}
                    type="button"
                    role="radio"
                    aria-checked={isActive}
                    onClick={() => rotateToAngle(angle.deg)}
                    className={`px-2 py-1 rounded-full text-[11px] font-medium transition-colors shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-[#E5B54F] text-[#1E1109]'
                        : 'text-[#F6E4C1]/85 hover:text-[#FFF8EC] hover:bg-[#E5B54F]/15'
                    }`}
                  >
                    {angle.label}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setIsAutoSpinning((s) => !s)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors shrink-0 cursor-pointer ${
                isAutoSpinning
                  ? 'bg-[#E5B54F] text-[#1E1109]'
                  : 'text-[#F6E4C1]/85 hover:text-[#FFF8EC] hover:bg-[#E5B54F]/15'
              }`}
            >
              {isAutoSpinning ? (
                <>
                  <Pause className="w-3 h-3" aria-hidden="true" />
                  <span>Pause</span>
                </>
              ) : (
                <span>Spin</span>
              )}
            </button>

            <span aria-hidden="true" className="h-3.5 w-px bg-[#E5B54F]/30 mx-1 shrink-0" />

            {/* HD Zoom Focus Presets (Full / Torso / Detail) + Zoom +/- */}
            <div role="radiogroup" aria-label="HD Zoom level" className="flex items-center gap-0.5">
              {ZOOM_PRESETS.map((preset) => {
                const active = activeZoomPreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => selectZoomPreset(preset.id)}
                    className={`px-2 py-1 rounded-full text-[11px] font-medium transition-colors shrink-0 cursor-pointer ${
                      active
                        ? 'bg-[#E5B54F] text-[#1E1109]'
                        : 'text-[#F6E4C1]/85 hover:text-[#FFF8EC] hover:bg-[#E5B54F]/15'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            <div className="inline-flex items-center gap-0.5 ml-0.5">
              <button
                type="button"
                onClick={() => applyZoom(zoomScale - 0.35)}
                disabled={zoomScale <= MIN_ZOOM + 0.01}
                aria-label="Zoom out"
                title="Zoom out (-)"
                className="w-6 h-6 rounded-full flex items-center justify-center text-[#F6E4C1] hover:bg-[#E5B54F]/20 disabled:opacity-40 cursor-pointer"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => applyZoom(zoomScale + 0.35)}
                disabled={zoomScale >= MAX_ZOOM - 0.01}
                aria-label="Zoom in"
                title="Zoom in (+)"
                className="w-6 h-6 rounded-full flex items-center justify-center text-[#F6E4C1] hover:bg-[#E5B54F]/20 disabled:opacity-40 cursor-pointer"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              {isZoomed && (
                <button
                  type="button"
                  onClick={() => selectZoomPreset('full')}
                  aria-label="Reset zoom"
                  title="Reset zoom"
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[#F5D27E] hover:bg-[#E5B54F]/20 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Purchase Dock */}
        <div className="pointer-events-auto w-full max-w-[880px] rounded-2xl bg-[#FFFBF4]/92 dark:bg-[#1B110B]/92 backdrop-blur-xl border border-[#C6922E]/35 dark:border-[#E5B54F]/30 shadow-[0_24px_56px_-14px_rgba(28,15,6,0.48)] px-3 sm:px-4 py-2.5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 sm:gap-4 transition-colors duration-200">
          {/* Active Garment Thumbnail + Name + INR Price */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-lg bg-[#F3E7D3] dark:bg-[#261911] border border-[#C6922E]/25 dark:border-[#D4A243]/25 overflow-hidden shrink-0">
              <ResilientImage
                src={withUhdAsset(activeProduct.productImage)}
                alt={activeProduct.name}
                fallbackTitle={activeProduct.name}
                className="uhd-crisp w-full h-full object-contain p-1"
              />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-medium text-[#2A1810] dark:text-[#F7EFE2] leading-tight truncate">
                {activeProduct.name}
              </h1>
              <p className="text-xs font-medium text-[#9A4A0A] dark:text-[#E5B54F] tabular-nums mt-0.5">
                {formatPrice(activeProduct.priceUsd, currency)}
              </p>
            </div>
          </div>

          {/* Circular Size Selector (XS S M L XL) + Size Guide & Complete Outfit Triggers */}
          <div className="flex items-center gap-2 order-3 sm:order-2 w-full sm:w-auto justify-center flex-wrap sm:flex-nowrap">
            <div
              role="radiogroup"
              aria-label="Select garment size"
              className="flex items-center gap-1.5"
            >
              {SIZES.map((size) => {
                const isSelected = selectedSize === size;
                return (
                  <button
                    key={size}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => onSelectSize(size)}
                    className={`w-8 h-8 rounded-full text-[11px] font-medium transition-all flex items-center justify-center shrink-0 cursor-pointer ${
                      isSelected
                        ? 'bg-[#3B2314] dark:bg-[#E0AD42] text-[#F8E2A8] dark:text-[#1B1009] ring-1 ring-[#C6922E]/60 shadow-sm'
                        : 'bg-[#3B2314]/[0.07] dark:bg-[#D4A243]/[0.12] text-[#4E3320] dark:text-[#E2CCA9] hover:bg-[#C6922E]/20 dark:hover:bg-[#D4A243]/25'
                    }`}
                  >
                    {size}
                  </button>
                );
              })}
            </div>

            <span
              aria-hidden="true"
              className="h-5 w-px bg-[#3B2314]/[0.14] dark:bg-[#D4A243]/[0.22] shrink-0 hidden sm:inline-block"
            />

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsSizeGuideOpen(true)}
                aria-label={`Open size guide for ${activeProduct.name}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-[#5E402A] dark:text-[#D4BEA1] hover:text-[#9A4A0A] dark:hover:text-[#E5B54F] hover:bg-[#C6922E]/10 dark:hover:bg-[#D4A243]/12 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Ruler className="w-3.5 h-3.5 stroke-[1.75] text-[#B45309] dark:text-[#E5B54F]" aria-hidden="true" />
                <span>Size guide</span>
              </button>

              <button
                type="button"
                onClick={() => setIsOutfitDrawerOpen(true)}
                aria-label={`Complete the outfit for ${activeProduct.name}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-[#5E402A] dark:text-[#D4BEA1] hover:text-[#9A4A0A] dark:hover:text-[#E5B54F] hover:bg-[#C6922E]/10 dark:hover:bg-[#D4A243]/12 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5 stroke-[1.75] text-[#B45309] dark:text-[#E5B54F]" aria-hidden="true" />
                <span>Complete look</span>
              </button>
            </div>
          </div>

          {/* Primary Action: Add to bag in rich Amber-Gold */}
          <button
            type="button"
            onClick={handleAddClick}
            className="order-2 sm:order-3 inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#9A4A0A] via-[#B45309] to-[#C6922E] hover:from-[#7C3A08] hover:via-[#9A4A0A] hover:to-[#B45309] dark:from-[#D49B35] dark:via-[#E0AD42] dark:to-[#ECC25C] dark:hover:from-[#E0AD42] dark:hover:to-[#F3CF74] active:scale-[0.98] text-[#FFFDF9] dark:text-[#1B1009] text-xs font-semibold tracking-wide transition-all whitespace-nowrap shrink-0 cursor-pointer shadow-sm"
          >
            {justAdded ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Added</span>
              </>
            ) : (
              <span>Add to bag</span>
            )}
          </button>
        </div>

        {/* Minimal Carousel Progress Dots */}
        <div className="pointer-events-auto mt-2 flex items-center gap-1.5">
          {filteredProducts.map((item) => {
            const active = item.id === activeProduct.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectProduct(item.id)}
                aria-label={`View ${item.name}`}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  active
                    ? 'w-5 bg-[#E5B54F] shadow-sm'
                    : 'w-1.5 bg-[#FFF3DC]/45 hover:bg-[#F5D27E]/85'
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* Garment Size Guide Modal */}
      <SizeGuideModal
        isOpen={isSizeGuideOpen}
        onClose={() => setIsSizeGuideOpen(false)}
        product={activeProduct}
        selectedSize={selectedSize}
        onSelectSize={onSelectSize}
      />

      {/* Complete the Outfit Complementary Recommendations Drawer */}
      <CompleteOutfitDrawer
        isOpen={isOutfitDrawerOpen}
        onClose={() => setIsOutfitDrawerOpen(false)}
        activeProduct={activeProduct}
        activeSize={selectedSize}
        products={products}
        currency={currency}
        onTryInShowroom={onSelectProduct}
        onAddSingleToBag={onAddToBag}
        onAddBundleToBag={onAddMultipleToBag}
      />
    </section>
  );
}
