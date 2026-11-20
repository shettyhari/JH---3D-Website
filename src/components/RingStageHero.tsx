import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Sparkles,
  Layers,
  Ruler,
  Info,
  Check,
  Disc,
} from 'lucide-react';
import { CurrencyCode, LightingMode, Product, Size } from '../types';
import { formatPrice, SIZES } from '../data/products';
import { playClickSound, playGarmentSwitchSound, playTurntableTick } from '../services/soundEffects';
import { ResilientImage } from './ResilientImage';

interface RingStageHeroProps {
  products: Product[];
  activeProductId: string;
  onSelectProduct: (productId: string) => void;
  selectedSize: Size;
  onSelectSize: (size: Size) => void;
  currency: CurrencyCode;
  lighting: LightingMode;
  onAddToBag: (productId: string, size: Size) => void;
  onOpenAIStylist?: () => void;
  onOpenSizeGuide?: () => void;
  onOpenOutfitDrawer?: () => void;
}

const VIEW_ANGLES: Array<{ key: 'front' | 'right' | 'back' | 'left'; label: string; deg: number }> = [
  { key: 'front', label: 'Front', deg: 0 },
  { key: 'right', label: 'Right', deg: 90 },
  { key: 'back', label: 'Back', deg: 180 },
  { key: 'left', label: 'Left', deg: 270 },
];

function normalizeDeg(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

export const RingStageHero: React.FC<RingStageHeroProps> = ({
  products,
  activeProductId,
  onSelectProduct,
  selectedSize,
  onSelectSize,
  currency,
  lighting,
  onAddToBag,
  onOpenAIStylist,
  onOpenSizeGuide,
  onOpenOutfitDrawer,
}) => {
  const [garmentAngle, setGarmentAngle] = useState(0);
  const [isAutoSpinning, setIsAutoSpinning] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [stageTilt, setStageTilt] = useState({ x: 0, y: 0 });
  const [dragOffsetDeg, setDragOffsetDeg] = useState(0);
  const [isRingDragging, setIsRingDragging] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const lastAngleTickRef = useRef(0);
  const ringDragStartRef = useRef<{ startX: number; initialOffset: number } | null>(null);

  const activeIndex = useMemo(() => {
    const idx = products.findIndex((p) => p.id === activeProductId);
    return idx >= 0 ? idx : 0;
  }, [products, activeProductId]);

  const activeProduct = products[activeIndex] || products[0];

  // Reset garment angle when active product changes
  useEffect(() => {
    playGarmentSwitchSound();
    setGarmentAngle(0);
    setDragOffsetDeg(0);
  }, [activeProductId]);

  // Auto-spin active garment
  useEffect(() => {
    if (!isAutoSpinning) return;
    const interval = setInterval(() => {
      setGarmentAngle((prev) => {
        const next = (prev + 1.2) % 360;
        if (Math.abs(next - lastAngleTickRef.current) >= 15) {
          playTurntableTick(next - lastAngleTickRef.current);
          lastAngleTickRef.current = next;
        }
        return next;
      });
    }, 28);
    return () => clearInterval(interval);
  }, [isAutoSpinning]);

  // Dynamic Parallax tilt from mouse movement
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 to 0.5
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    setStageTilt({ x: ny * -7, y: nx * 10 });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setStageTilt({ x: 0, y: 0 });
  }, []);

  // Compute angle frame image for the center hero
  const heroImageSrc = useMemo(() => {
    const norm = normalizeDeg(garmentAngle);
    const views = activeProduct.showroomViews;
    if (norm >= 315 || norm < 45) return views.front;
    if (norm >= 45 && norm < 135) return views.right;
    if (norm >= 135 && norm < 225) return views.back;
    return views.left;
  }, [garmentAngle, activeProduct]);

  // Navigate carousel left/right
  const navigateCarousel = (direction: 1 | -1) => {
    playClickSound();
    const count = products.length;
    const nextIdx = (activeIndex + direction + count) % count;
    onSelectProduct(products[nextIdx].id);
  };

  const handleAddClick = () => {
    playClickSound();
    onAddToBag(activeProduct.id, selectedSize);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1600);
  };

  // 3D Ring Calculations
  const radius = 540; // Ring depth in pixels
  const numItems = products.length;
  const angleStep = 360 / Math.max(numItems, 1);

  // Mouse / Touch Drag to Spin the 3D Ring Carousel
  const handlePointerDown = (e: React.PointerEvent) => {
    // Only drag ring if targeting stage backdrop or carousel cards
    setIsRingDragging(true);
    ringDragStartRef.current = {
      startX: e.clientX,
      initialOffset: dragOffsetDeg,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isRingDragging || !ringDragStartRef.current) return;
    const deltaX = e.clientX - ringDragStartRef.current.startX;
    const newOffset = ringDragStartRef.current.initialOffset + deltaX * 0.28;
    setDragOffsetDeg(newOffset);
  };

  const handlePointerUp = () => {
    if (!isRingDragging) return;
    setIsRingDragging(false);
    // Snap to nearest item if dragged sufficiently
    const snapThreshold = angleStep * 0.35;
    if (Math.abs(dragOffsetDeg) > snapThreshold) {
      const stepDirection = dragOffsetDeg > 0 ? -1 : 1;
      navigateCarousel(stepDirection as 1 | -1);
    }
    setDragOffsetDeg(0);
    ringDragStartRef.current = null;
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="relative w-full h-full min-h-[720px] select-none overflow-hidden flex flex-col justify-between"
      style={{
        perspective: '1400px',
        perspectiveOrigin: '50% 48%',
      }}
    >
      {/* Dynamic 3D Stage Space */}
      <div
        className="absolute inset-0 flex items-center justify-center transition-transform duration-300 ease-out"
        style={{
          transformStyle: 'preserve-3d',
          transform: `rotateX(${stageTilt.x}deg) rotateY(${stageTilt.y}deg)`,
        }}
      >
        {/* 3D Circular Reflective Floor Stage */}
        <div
          aria-hidden="true"
          className="absolute w-[880px] h-[880px] rounded-full pointer-events-none"
          style={{
            transform: 'rotateX(82deg) translateZ(-280px)',
            background:
              lighting === 'gallery'
                ? 'radial-gradient(circle, rgba(229,181,79,0.18) 0%, rgba(38,22,12,0.65) 55%, transparent 72%)'
                : 'radial-gradient(circle, rgba(245,210,126,0.24) 0%, rgba(42,24,16,0.45) 52%, transparent 70%)',
            boxShadow:
              lighting === 'gallery'
                ? '0 0 120px 40px rgba(229,181,79,0.12), inset 0 0 60px rgba(212,162,67,0.2)'
                : '0 0 100px 30px rgba(245,210,126,0.14), inset 0 0 50px rgba(229,181,79,0.15)',
            border: '1.5px solid rgba(229,181,79,0.3)',
          }}
        >
          {/* Inner Golden Ring Orbit */}
          <div className="absolute inset-16 rounded-full border border-amber-400/25 border-dashed animate-[spin_60s_linear_infinite]" />
        </div>

        {/* 3D Ring Carousel Container */}
        <div
          className="relative w-full h-full flex items-center justify-center"
          style={{
            transformStyle: 'preserve-3d',
          }}
        >
          {products.map((product, idx) => {
            // Calculate spatial angle around the cylindrical ring
            let diff = idx - activeIndex;
            // Shortest circular distance wrap
            if (diff > numItems / 2) diff -= numItems;
            if (diff < -numItems / 2) diff += numItems;

            const baseAngle = diff * angleStep + dragOffsetDeg;
            const isHero = idx === activeIndex && Math.abs(dragOffsetDeg) < angleStep * 0.4;
            const distanceRatio = Math.abs(diff);

            // Dynamic depth styling
            const scale = isHero ? 1.0 : Math.max(0.68, 1 - distanceRatio * 0.14);
            const opacity = isHero ? 1 : Math.max(0.38, 1 - distanceRatio * 0.32);
            const blurAmount = isHero ? 0 : Math.min(distanceRatio * 2.5, 5);

            // Compute 3D cylinder positioning
            const rad = (baseAngle * Math.PI) / 180;
            const tx = Math.sin(rad) * radius;
            const tz = Math.cos(rad) * radius - radius; // 0 for hero, negative for background

            return (
              <div
                key={product.id}
                onClick={() => {
                  if (!isHero) {
                    playClickSound();
                    onSelectProduct(product.id);
                  }
                }}
                className={`absolute transition-all ${
                  isHero
                    ? 'z-30 cursor-default'
                    : 'z-10 cursor-pointer hover:opacity-90 hover:scale-105'
                }`}
                style={{
                  transformStyle: 'preserve-3d',
                  transform: `translate3d(${tx}px, 0px, ${tz}px) scale(${scale})`,
                  opacity,
                  filter: blurAmount > 0 ? `blur(${blurAmount}px)` : 'none',
                  transitionDuration: isRingDragging ? '0ms' : '450ms',
                  transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                {/* Carousel Card / Garment Showcase */}
                <div className="relative w-[300px] sm:w-[360px] md:w-[420px] aspect-[3/4] flex items-center justify-center group">
                  {/* Subtle Studio Glow on Hero */}
                  {isHero && (
                    <div
                      className="absolute inset-0 -bottom-10 rounded-full opacity-60 blur-3xl pointer-events-none"
                      style={{
                        background:
                          lighting === 'gallery'
                            ? 'radial-gradient(circle, rgba(229,181,79,0.3) 0%, transparent 70%)'
                            : 'radial-gradient(circle, rgba(255,248,220,0.4) 0%, transparent 70%)',
                      }}
                    />
                  )}

                  {/* Garment Image */}
                  <div className="relative w-full h-full flex items-center justify-center">
                    <ResilientImage
                      src={isHero ? heroImageSrc : product.showroomImage || product.showroomViews.front}
                      alt={product.name}
                      fallbackTitle={product.name}
                      fetchPriority={isHero ? 'high' : 'low'}
                      className={`w-full h-full object-contain pointer-events-none drop-shadow-[0_35px_35px_rgba(0,0,0,0.65)] transition-all duration-300 ${
                        lighting === 'gallery'
                          ? 'brightness-[0.9] contrast-[1.08] saturate-[0.96]'
                          : 'brightness-100 contrast-[1.02]'
                      }`}
                    />
                  </div>

                  {/* Ring Card Tag for Background Pieces */}
                  {!isHero && (
                    <div className="absolute bottom-6 inset-x-0 flex flex-col items-center pointer-events-none transition-opacity duration-300">
                      <div className="px-3 py-1 rounded-full bg-stone-950/80 backdrop-blur-md border border-amber-400/30 text-amber-200 text-[11px] font-medium shadow-lg">
                        {product.name}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Carousel Navigation Arrows */}
      <button
        type="button"
        onClick={() => navigateCarousel(-1)}
        aria-label="Previous Collection Piece"
        className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 z-40 w-11 h-11 rounded-full bg-[#26160C]/80 hover:bg-[#E5B54F] text-[#F8E7C8] hover:text-[#1E1109] backdrop-blur-md border border-[#E5B54F]/40 flex items-center justify-center transition-all shadow-xl hover:scale-110 cursor-pointer"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <button
        type="button"
        onClick={() => navigateCarousel(1)}
        aria-label="Next Collection Piece"
        className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 z-40 w-11 h-11 rounded-full bg-[#26160C]/80 hover:bg-[#E5B54F] text-[#F8E7C8] hover:text-[#1E1109] backdrop-blur-md border border-[#E5B54F]/40 flex items-center justify-center transition-all shadow-xl hover:scale-110 cursor-pointer"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Bottom Floating Control Dock */}
      <div className="relative z-30 pb-5 px-4 flex flex-col items-center gap-3 pointer-events-none">
        {/* 360° Garment Rotation Controls Bar */}
        <div className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#26160C]/85 backdrop-blur-md border border-[#E5B54F]/35 shadow-xl text-xs text-[#F6E4C1]">
          <span className="text-[11px] uppercase tracking-wider text-amber-400/90 font-semibold px-1">
            Rotate Garment:
          </span>
          {VIEW_ANGLES.map(({ key, label, deg }) => {
            const norm = normalizeDeg(garmentAngle);
            const isMatch = Math.abs(norm - deg) < 45 || (deg === 0 && norm >= 315);
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  playClickSound();
                  setGarmentAngle(deg);
                }}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  isMatch
                    ? 'bg-[#E5B54F] text-[#1E1109] font-bold shadow-sm'
                    : 'text-[#F6E4C1]/75 hover:text-white hover:bg-white/10'
                }`}
              >
                {label}
              </button>
            );
          })}

          <span className="w-px h-3.5 bg-[#E5B54F]/30 mx-1" />

          {/* Auto-Spin Toggle */}
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setIsAutoSpinning((s) => !s);
            }}
            title={isAutoSpinning ? 'Pause Auto-Spin' : 'Start 360° Auto-Spin'}
            className={`p-1.5 rounded-full transition-all cursor-pointer ${
              isAutoSpinning ? 'bg-amber-400 text-stone-950 font-bold' : 'text-stone-300 hover:text-white'
            }`}
          >
            <RotateCw className={`w-3.5 h-3.5 ${isAutoSpinning ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Hero Product Info & Action Dock */}
        <div className="pointer-events-auto w-full max-w-[840px] rounded-2xl bg-[#FFFBF4]/94 dark:bg-[#1B110B]/94 backdrop-blur-xl border border-[#C6922E]/35 dark:border-[#E5B54F]/30 shadow-[0_24px_56px_-14px_rgba(28,15,6,0.48)] px-4 py-3 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3">
          {/* Garment Title, Category & Price in INR */}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-serif font-medium text-[#2A1810] dark:text-[#F7EFE2] truncate">
                {activeProduct.name}
              </h2>
              <span className="text-[10px] tracking-wider uppercase px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold border border-amber-500/25">
                {activeProduct.category}
              </span>
            </div>
            <p className="text-xs font-semibold text-[#8C5E28] dark:text-[#E5B54F] tracking-wide mt-0.5">
              {formatPrice(activeProduct.priceUsd, currency)}
            </p>
          </div>

          {/* Sizing & Utilities */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-[#3B2314]/[0.05] dark:bg-[#D4A243]/[0.08] p-1 rounded-full border border-[#C6922E]/25">
              {SIZES.map((size) => {
                const isSelected = selectedSize === size;
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => {
                      playClickSound();
                      onSelectSize(size);
                    }}
                    className={`w-7 h-7 rounded-full text-[11px] font-medium transition-all flex items-center justify-center cursor-pointer ${
                      isSelected
                        ? 'bg-[#3B2314] dark:bg-[#E0AD42] text-[#F8E2A8] dark:text-[#1B1009] shadow-sm font-bold'
                        : 'text-[#5E402A] dark:text-[#D4BEA1] hover:text-amber-500'
                    }`}
                  >
                    {size}
                  </button>
                );
              })}
            </div>

            {onOpenSizeGuide && (
              <button
                type="button"
                onClick={onOpenSizeGuide}
                title="Open Size Guide"
                className="p-2 rounded-full hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 transition-colors cursor-pointer"
              >
                <Ruler className="w-4 h-4" />
              </button>
            )}

            {onOpenOutfitDrawer && (
              <button
                type="button"
                onClick={onOpenOutfitDrawer}
                title="Complete The Look"
                className="p-2 rounded-full hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 transition-colors cursor-pointer"
              >
                <Layers className="w-4 h-4" />
              </button>
            )}

            {/* Add to Bag CTA */}
            <button
              type="button"
              onClick={handleAddClick}
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#9A4A0A] via-[#B45309] to-[#C6922E] hover:from-[#7C3A08] hover:via-[#9A4A0A] text-white text-xs font-semibold tracking-wide shadow-md transition-all active:scale-95 cursor-pointer"
            >
              {justAdded ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Added</span>
                </>
              ) : (
                <span>Add to Bag</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
