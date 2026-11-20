import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Heart,
  Info,
  Layers,
  Moon,
  Pause,
  RotateCw,
  Ruler,
  Sun,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { formatPrice, SIZES } from '../data/products';
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
}

const CATEGORIES: CategoryFilter[] = ['All', 'Tops', 'Outerwear'];

const VIEW_ANGLES: Array<{ key: 'front' | 'right' | 'back' | 'left'; label: string; deg: number }> = [
  { key: 'front', label: 'Front', deg: 0 },
  { key: 'right', label: 'Right', deg: 90 },
  { key: 'back', label: 'Back', deg: 180 },
  { key: 'left', label: 'Left', deg: 270 },
];

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
}: ShowroomStageProps) {
  const [zoomed, setZoomed] = useState(false);
  const [lighting, setLighting] = useState<LightingMode>('daylight');
  const [showSpecs, setShowSpecs] = useState(false);
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);
  const [isOutfitDrawerOpen, setIsOutfitDrawerOpen] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  // Smooth 360-degree turntable rotation state (continuous degrees)
  const [displayAngle, setDisplayAngle] = useState(0);
  const [isAutoSpinning, setIsAutoSpinning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const currentAngleRef = useRef(0);
  const targetAngleRef = useRef(0);
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartAngleRef = useRef(0);
  const autoSpinRef = useRef(false);

  useEffect(() => {
    autoSpinRef.current = isAutoSpinning;
  }, [isAutoSpinning]);

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

  // Preload all 4 turnaround angles + product studio photography for flicker-free 360° rotation
  useEffect(() => {
    products.forEach((p) => {
      [
        p.showroomViews.front,
        p.showroomViews.right,
        p.showroomViews.back,
        p.showroomViews.left,
        p.productImage,
      ].forEach((src) => {
        const img = new Image();
        img.src = src;
      });
    });
  }, [products]);

  // Smooth rAF damping loop for 360° rotation (drag settling, presets, and continuous auto-spin)
  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      if (autoSpinRef.current && !isDraggingRef.current) {
        // Complete a calm, editorial 360° rotation every ~5.5 seconds
        targetAngleRef.current += dt * 66;
      }

      const diff = targetAngleRef.current - currentAngleRef.current;
      if (Math.abs(diff) > 0.04) {
        currentAngleRef.current += diff * (1 - Math.exp(-12 * dt));
        setDisplayAngle(currentAngleRef.current);
      } else if (currentAngleRef.current !== targetAngleRef.current) {
        currentAngleRef.current = targetAngleRef.current;
        setDisplayAngle(currentAngleRef.current);
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const stepCarousel = useCallback(
    (delta: number) => {
      if (filteredProducts.length <= 1) return;
      const nextIndex =
        (activeIndex + delta + filteredProducts.length) % filteredProducts.length;
      onSelectProduct(filteredProducts[nextIndex].id);
    },
    [activeIndex, filteredProducts, onSelectProduct],
  );

  // Keyboard arrow navigation for switching garments
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
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stepCarousel, isBagOpen, isSizeGuideOpen, isOutfitDrawerOpen]);

  // Drag horizontally across the model stage to rotate 360°
  const handleStagePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    isDraggingRef.current = true;
    setIsDragging(true);
    setIsAutoSpinning(false);
    dragStartXRef.current = e.clientX;
    dragStartAngleRef.current = targetAngleRef.current;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleStagePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartXRef.current;
    // 260px drag covers a full 360° turn for effortless control
    targetAngleRef.current = dragStartAngleRef.current + dx * 0.95;
  };

  const handleStagePointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsDragging(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    // Gently settle to nearest razor-sharp 90° studio frame on release
    const snapped = Math.round(targetAngleRef.current / 90) * 90;
    targetAngleRef.current = snapped;
  };

  const rotateToAngle = (deg: number) => {
    setIsAutoSpinning(false);
    const delta = shortestDegDelta(normalizeDeg(targetAngleRef.current), deg);
    targetAngleRef.current += delta;
  };

  const stepRotation90 = () => {
    setIsAutoSpinning(false);
    const nextQuarter = Math.round(targetAngleRef.current / 90) * 90 + 90;
    targetAngleRef.current = nextQuarter;
  };

  // Compute the two neighboring photorealistic turnaround frames + smoothstep blend
  const normalizedDeg = normalizeDeg(displayAngle);
  const roundedDeg = Math.round(normalizedDeg) % 360;
  const activeQuadrantIndex = Math.round(normalizedDeg / 90) % 4;

  const turnaroundFrames = useMemo(
    () => [
      activeProduct.showroomViews.front,
      activeProduct.showroomViews.right,
      activeProduct.showroomViews.back,
      activeProduct.showroomViews.left,
    ],
    [activeProduct],
  );

  const sectorFloat = normalizedDeg / 90; // 0..4
  const idxA = Math.floor(sectorFloat) % 4;
  const idxB = (idxA + 1) % 4;
  const rawFraction = sectorFloat - Math.floor(sectorFloat);
  const blendB = smoothstep(rawFraction);

  // Subtle horizontal parallax micro-shift during cross-dissolve for fluid 360° feel
  const transitionOffsetPx = Math.sin(rawFraction * Math.PI) * 3;

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
      aria-label="Interactive 360-Degree Virtual Try-On Showroom"
      className={`relative w-full h-[calc(100vh-84px)] min-h-[600px] max-h-[960px] overflow-hidden select-none bg-[#C8B8A2] transition-[filter] duration-300 ${
        isBagOpen || isOutfitDrawerOpen ? 'blur-[5px] scale-[1.005]' : ''
      }`}
    >
      {/* Full-Bleed Architectural Showroom + Interactive 360° Photorealistic Model */}
      <div
        onPointerDown={handleStagePointerDown}
        onPointerMove={handleStagePointerMove}
        onPointerUp={handleStagePointerEnd}
        onPointerCancel={handleStagePointerEnd}
        style={{ touchAction: 'pan-y' }}
        aria-label={`Drag horizontally to rotate model 360 degrees wearing ${activeProduct.name}`}
        className={`absolute inset-0 overflow-hidden ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        <AnimatePresence mode="sync">
          <motion.div
            key={activeProduct.id}
            initial={{ opacity: 0, scale: zoomed ? 1.34 : 1.015 }}
            animate={{
              opacity: 1,
              scale: zoomed ? 1.32 : 1,
              y: zoomed ? '8%' : '0%',
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 will-change-transform"
          >
            {/* Base angle frame (A) */}
            <div
              className="absolute inset-0 will-change-transform"
              style={{
                transform: `translate3d(${-transitionOffsetPx}px, 0, 0) scale(1.008)`,
              }}
            >
              <ResilientImage
                src={turnaroundFrames[idxA]}
                alt={`Model wearing ${activeProduct.name} (${VIEW_ANGLES[idxA].label} view)`}
                fallbackTitle={activeProduct.name}
                className={`w-full h-full object-cover object-[center_24%] pointer-events-none transition-[filter] duration-500 ${
                  lighting === 'gallery'
                    ? 'brightness-[0.84] contrast-[1.08] saturate-[0.94]'
                    : 'brightness-100 contrast-100'
                }`}
              />
            </div>

            {/* Blended neighbor angle frame (B) during continuous 360° sweep */}
            {blendB > 0.002 && (
              <div
                className="absolute inset-0 will-change-transform pointer-events-none"
                style={{
                  opacity: blendB,
                  transform: `translate3d(${transitionOffsetPx}px, 0, 0) scale(1.008)`,
                }}
              >
                <ResilientImage
                  src={turnaroundFrames[idxB]}
                  alt={`Model wearing ${activeProduct.name} (${VIEW_ANGLES[idxB].label} view)`}
                  fallbackTitle={activeProduct.name}
                  className={`w-full h-full object-cover object-[center_24%] transition-[filter] duration-500 ${
                    lighting === 'gallery'
                      ? 'brightness-[0.84] contrast-[1.08] saturate-[0.94]'
                      : 'brightness-100 contrast-100'
                  }`}
                />
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Measured subtle gallery mood vignette & top/bottom legibility gradients */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 transition-opacity duration-500 ${
            lighting === 'gallery'
              ? 'bg-[radial-gradient(circle_at_50%_42%,transparent_26%,rgba(16,12,9,0.58)_100%)] opacity-100'
              : 'bg-[radial-gradient(circle_at_50%_45%,transparent_48%,rgba(24,18,12,0.22)_100%)] opacity-100'
          }`}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/48 via-black/15 to-transparent"
        />
      </div>

      {/* Top-Center Category Filter Switcher (All / Tops / Outerwear) */}
      <div className="pointer-events-none relative z-30 pt-5 flex justify-center px-4">
        <div
          role="tablist"
          aria-label="Garment category filter"
          className="pointer-events-auto inline-flex items-center gap-1 p-1 rounded-full bg-black/22 backdrop-blur-md border border-white/25 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.3)]"
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
                  isSelected ? 'text-[#171615]' : 'text-white/90 hover:text-white'
                }`}
              >
                {isSelected && (
                  <motion.span
                    layoutId="showroomCategoryPill"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    className="absolute inset-0 rounded-full bg-white shadow-sm"
                  />
                )}
                <span className="relative z-10">{category}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Left Vertical Showroom Utility Pill (360° Auto-Spin, Zoom, Lighting, Specs, Wishlist) */}
      <aside
        aria-label="Showroom viewing controls"
        className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-1.5 p-1.5 rounded-full bg-white/24 backdrop-blur-md border border-white/35 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.28)]"
      >
        <button
          type="button"
          onClick={() => setIsAutoSpinning((s) => !s)}
          aria-label={isAutoSpinning ? 'Pause 360 degree rotation' : 'Play 360 degree rotation'}
          title={isAutoSpinning ? 'Pause 360° spin' : '360° auto-rotate'}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
            isAutoSpinning
              ? 'bg-white text-[#171615] shadow-sm'
              : 'text-white hover:bg-white/20'
          }`}
        >
          {isAutoSpinning ? (
            <Pause className="w-4 h-4" />
          ) : (
            <RotateCw className="w-4 h-4" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setZoomed((z) => !z)}
          aria-label={zoomed ? 'Reset showroom view' : 'Zoom in on garment detail'}
          title={zoomed ? 'Full silhouette view' : 'Inspect garment detail'}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
            zoomed
              ? 'bg-white text-[#171615] shadow-sm'
              : 'text-white hover:bg-white/20'
          }`}
        >
          {zoomed ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={() =>
            setLighting((l) => (l === 'daylight' ? 'gallery' : 'daylight'))
          }
          aria-label={
            lighting === 'daylight'
              ? 'Switch to evening gallery lighting'
              : 'Switch to warm daylight'
          }
          title={
            lighting === 'daylight' ? 'Evening gallery lighting' : 'Warm daylight'
          }
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
            lighting === 'gallery'
              ? 'bg-white text-[#171615] shadow-sm'
              : 'text-white hover:bg-white/20'
          }`}
        >
          {lighting === 'daylight' ? (
            <Moon className="w-4 h-4" />
          ) : (
            <Sun className="w-4 h-4" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setShowSpecs((s) => !s)}
          aria-label="Toggle fabric and fit details"
          title="Fabric & fit specifications"
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
            showSpecs
              ? 'bg-white text-[#171615] shadow-sm'
              : 'text-white hover:bg-white/20'
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
              ? 'bg-white text-[#171615] shadow-sm'
              : 'text-white hover:bg-white/20'
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
              ? 'bg-white text-[#171615] shadow-sm'
              : 'text-white hover:bg-white/20'
          }`}
        >
          <Heart className={`w-4 h-4 ${isSaved ? 'fill-[#171615]' : ''}`} />
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
            className="absolute left-16 sm:left-20 top-1/2 -translate-y-1/2 z-30 w-[290px] sm:w-[320px] rounded-2xl bg-white/92 dark:bg-[#141312]/94 backdrop-blur-xl border border-white/70 dark:border-white/[0.12] shadow-[0_24px_60px_-14px_rgba(20,16,12,0.34)] p-5 text-[#171615] dark:text-[#F4F1EC]"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="text-[11px] text-[#6D665E] dark:text-[#9E978F] tracking-wide">
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
                className="p-1 text-[#6D665E] dark:text-[#9E978F] hover:text-[#171615] dark:hover:text-[#F4F1EC] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs leading-relaxed text-[#45413C] dark:text-[#B5AEA6] mb-4">
              {activeProduct.description}
            </p>
            <dl className="space-y-2.5 text-xs border-t border-black/[0.08] dark:border-white/[0.1] pt-3.5">
              <div className="flex justify-between gap-3">
                <dt className="text-[#78716A] dark:text-[#9E978F] shrink-0">Fabric</dt>
                <dd className="text-right font-medium text-[#171615] dark:text-[#F4F1EC]">
                  {activeProduct.specs.fabric}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[#78716A] dark:text-[#9E978F] shrink-0">Weight</dt>
                <dd className="text-right font-medium text-[#171615] dark:text-[#F4F1EC] tabular-nums">
                  {activeProduct.specs.weight}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[#78716A] dark:text-[#9E978F] shrink-0">Origin</dt>
                <dd className="text-right font-medium text-[#171615] dark:text-[#F4F1EC]">
                  {activeProduct.specs.origin}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[#78716A] dark:text-[#9E978F] shrink-0">Fit</dt>
                <dd className="text-right font-medium text-[#171615] dark:text-[#F4F1EC]">
                  {activeProduct.specs.fit}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[#78716A] dark:text-[#9E978F] shrink-0">Sizing</dt>
                <dd className="text-right text-[#45413C] dark:text-[#B5AEA6]">
                  {activeProduct.specs.modelNote}
                </dd>
              </div>
            </dl>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsSizeGuideOpen(true)}
                className="py-2 px-2.5 rounded-lg border border-black/[0.12] dark:border-white/[0.16] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-xs font-medium text-[#171615] dark:text-[#F4F1EC] inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
              >
                <Ruler className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Size Guide</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSpecs(false);
                  setIsOutfitDrawerOpen(true);
                }}
                className="py-2 px-2.5 rounded-lg bg-[#171615] dark:bg-[#F4F1EC] hover:bg-[#2C2A27] dark:hover:bg-[#E4DFD8] text-xs font-medium text-white dark:text-[#171615] inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Style Look</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Curved 3D Perspective Floating Garment Carousel (Left & Right of Model) */}
      <div
        className={`showroom-perspective pointer-events-none absolute inset-0 z-20 flex items-center justify-center transition-opacity duration-300 ${
          zoomed ? 'opacity-0 pointer-events-none' : 'opacity-100'
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
                className={`pointer-events-auto group absolute flex flex-col items-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-2xl ${
                  isInner ? 'hidden md:flex z-20' : 'hidden xl:flex z-10'
                }`}
                style={{ transformStyle: 'preserve-3d' }}
              >
                <div
                  className={`relative rounded-xl overflow-hidden bg-[#F4F1EC]/94 ring-1 ring-white/55 transition-shadow duration-300 ${
                    isInner
                      ? 'w-[148px] lg:w-[172px] xl:w-[186px] aspect-[3/4] shadow-[0_26px_54px_-14px_rgba(20,14,10,0.42)] group-hover:shadow-[0_32px_64px_-12px_rgba(20,14,10,0.52)]'
                      : 'w-[136px] xl:w-[152px] aspect-[3/4] shadow-[0_20px_40px_-14px_rgba(20,14,10,0.34)]'
                  }`}
                >
                  <ResilientImage
                    src={product.productImage}
                    alt={product.name}
                    fallbackTitle={product.name}
                    className="w-full h-full object-contain p-2.5 transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                  <div className="absolute inset-x-0 bottom-0 py-2 bg-gradient-to-t from-[#171615]/75 via-[#171615]/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex justify-center">
                    <span className="text-[10px] font-medium tracking-[0.14em] uppercase text-white">
                      Try On
                    </span>
                  </div>
                </div>

                <div className="mt-3 text-center px-2">
                  <p className="text-xs lg:text-[13px] font-medium text-white tracking-tight drop-shadow-[0_1px_6px_rgba(0,0,0,0.72)] whitespace-nowrap">
                    {product.name}
                  </p>
                  <p className="text-[11px] lg:text-xs text-white/90 tabular-nums mt-0.5 drop-shadow-[0_1px_6px_rgba(0,0,0,0.72)]">
                    {formatPrice(product.priceUsd, currency)}
                  </p>
                </div>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Mobile Prev / Next Carousel Arrows */}
      {filteredProducts.length > 1 && !zoomed && (
        <>
          <button
            type="button"
            onClick={() => stepCarousel(-1)}
            aria-label="Previous garment"
            className="md:hidden absolute left-4 bottom-36 z-30 w-10 h-10 rounded-full bg-white/80 backdrop-blur-md border border-white/60 text-[#171615] flex items-center justify-center shadow-lg cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => stepCarousel(1)}
            aria-label="Next garment"
            className="md:hidden absolute right-4 bottom-36 z-30 w-10 h-10 rounded-full bg-white/80 backdrop-blur-md border border-white/60 text-[#171615] flex items-center justify-center shadow-lg cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Bottom Floating 360° Turntable Strip + Purchase Dock */}
      <div className="absolute inset-x-0 bottom-4 sm:bottom-5 z-30 flex flex-col items-center px-3 sm:px-6 pointer-events-none">
        {/* Compact 360° Angle Control Bar directly below the model */}
        <div className="pointer-events-auto mb-2.5 inline-flex items-center gap-1 px-1.5 py-1 rounded-full bg-black/32 backdrop-blur-md border border-white/25 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.3)] text-white">
          <button
            type="button"
            onClick={stepRotation90}
            aria-label="Rotate model 90 degrees"
            title="Turn 90°"
            className="inline-flex items-center gap-1.5 pl-2.5 pr-2 py-1 rounded-full text-[11px] font-medium text-white/95 hover:bg-white/15 transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums"
          >
            <RotateCw className="w-3 h-3" aria-hidden="true" />
            <span>360° · {roundedDeg}°</span>
          </button>

          <span aria-hidden="true" className="h-3.5 w-px bg-white/25 mx-0.5" />

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
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-white text-[#171615] shadow-xs'
                      : 'text-white/85 hover:text-white hover:bg-white/15'
                  }`}
                >
                  {angle.label}
                </button>
              );
            })}
          </div>

          <span aria-hidden="true" className="hidden sm:inline-block h-3.5 w-px bg-white/25 mx-0.5" />

          <button
            type="button"
            onClick={() => setIsAutoSpinning((s) => !s)}
            className={`hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              isAutoSpinning
                ? 'bg-white text-[#171615]'
                : 'text-white/85 hover:text-white hover:bg-white/15'
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
        </div>

        {/* Purchase Dock */}
        <div className="pointer-events-auto w-full max-w-[850px] rounded-2xl bg-white/86 dark:bg-[#141312]/88 backdrop-blur-xl border border-white/65 dark:border-white/[0.14] shadow-[0_24px_56px_-14px_rgba(18,14,10,0.42)] px-3 sm:px-4 py-2.5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 sm:gap-4 transition-colors duration-200">
          {/* Active Garment Thumbnail + Name + Price */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-lg bg-[#F4F1EC] dark:bg-[#1F1D1A] border border-black/[0.06] dark:border-white/[0.08] overflow-hidden shrink-0">
              <ResilientImage
                src={activeProduct.productImage}
                alt={activeProduct.name}
                fallbackTitle={activeProduct.name}
                className="w-full h-full object-contain p-1"
              />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-medium text-[#171615] dark:text-[#F4F1EC] leading-tight truncate">
                {activeProduct.name}
              </h1>
              <p className="text-xs text-[#59534C] dark:text-[#A8A199] tabular-nums mt-0.5">
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
                        ? 'bg-[#171615] dark:bg-[#F4F1EC] text-white dark:text-[#171615] shadow-sm'
                        : 'bg-black/[0.05] dark:bg-white/[0.09] text-[#3F3B36] dark:text-[#D4CEC7] hover:bg-black/[0.11] dark:hover:bg-white/[0.16]'
                    }`}
                  >
                    {size}
                  </button>
                );
              })}
            </div>

            <span
              aria-hidden="true"
              className="h-5 w-px bg-black/[0.1] dark:bg-white/[0.14] shrink-0 hidden sm:inline-block"
            />

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsSizeGuideOpen(true)}
                aria-label={`Open size guide for ${activeProduct.name}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-[#3F3B36] dark:text-[#D4CEC7] hover:text-[#171615] dark:hover:text-[#F4F1EC] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Ruler className="w-3.5 h-3.5 stroke-[1.75]" aria-hidden="true" />
                <span>Size guide</span>
              </button>

              <button
                type="button"
                onClick={() => setIsOutfitDrawerOpen(true)}
                aria-label={`Complete the outfit for ${activeProduct.name}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-[#3F3B36] dark:text-[#D4CEC7] hover:text-[#171615] dark:hover:text-[#F4F1EC] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5 stroke-[1.75]" aria-hidden="true" />
                <span>Complete look</span>
              </button>
            </div>
          </div>

          {/* Primary Action: Add to bag */}
          <button
            type="button"
            onClick={handleAddClick}
            className="order-2 sm:order-3 inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-lg bg-[#171615] dark:bg-[#F4F1EC] hover:bg-[#2C2A27] dark:hover:bg-[#E4DFD8] active:scale-[0.98] text-white dark:text-[#171615] text-xs font-medium tracking-wide transition-all whitespace-nowrap shrink-0 cursor-pointer shadow-sm"
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
                    ? 'w-5 bg-white shadow-sm'
                    : 'w-1.5 bg-white/45 hover:bg-white/75'
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
