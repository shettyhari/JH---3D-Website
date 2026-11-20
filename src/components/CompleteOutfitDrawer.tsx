import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Eye, Layers, Plus, ShoppingBag, X } from 'lucide-react';
import {
  CURRENCIES,
  formatPrice,
  FREE_DELIVERY_THRESHOLD_USD,
  SIZES,
} from '../data/products';
import { CurrencyCode, Product, Size } from '../types';
import { ResilientImage } from './ResilientImage';

interface CompleteOutfitDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeProduct: Product;
  activeSize: Size;
  products: Product[];
  currency: CurrencyCode;
  onTryInShowroom: (productId: string) => void;
  onAddSingleToBag: (productId: string, size: Size) => void;
  onAddBundleToBag: (items: Array<{ productId: string; size: Size }>) => void;
}

export function CompleteOutfitDrawer({
  isOpen,
  onClose,
  activeProduct,
  activeSize,
  products,
  currency,
  onTryInShowroom,
  onAddSingleToBag,
  onAddBundleToBag,
}: CompleteOutfitDrawerProps) {
  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    products.forEach((p) => map.set(p.id, p));
    return map;
  }, [products]);

  const pairings = useMemo(() => {
    return activeProduct.outfitPairings
      .map((entry) => {
        const product = productMap.get(entry.productId);
        if (!product) return null;
        return { ...entry, product };
      })
      .filter(
        (x): x is { productId: string; role: string; note: string; product: Product } =>
          x !== null,
      );
  }, [activeProduct, productMap]);

  // Pre-select the top complementary piece so the user can add a complete 2-piece look in one click
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pairingSizes, setPairingSizes] = useState<Record<string, Size>>({});

  useEffect(() => {
    if (pairings.length > 0) {
      setSelectedIds([pairings[0].productId]);
    } else {
      setSelectedIds([]);
    }
  }, [activeProduct.id, pairings]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const toggleSelection = (productId: string) => {
    setSelectedIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId],
    );
  };

  const getSizeFor = (productId: string): Size =>
    pairingSizes[productId] ?? activeSize;

  const bundleItems = useMemo(() => {
    const items: Array<{ product: Product; size: Size }> = [
      { product: activeProduct, size: activeSize },
    ];
    pairings.forEach((p) => {
      if (selectedIds.includes(p.productId)) {
        items.push({ product: p.product, size: getSizeFor(p.productId) });
      }
    });
    return items;
  }, [activeProduct, activeSize, pairings, selectedIds, pairingSizes]);

  const bundleTotalUsd = useMemo(
    () => bundleItems.reduce((sum, item) => sum + item.product.priceUsd, 0),
    [bundleItems],
  );

  const unlocksFreeDelivery = bundleTotalUsd >= FREE_DELIVERY_THRESHOLD_USD;

  const handleAddCompleteLook = () => {
    onAddBundleToBag(
      bundleItems.map((item) => ({
        productId: item.product.id,
        size: item.size,
      })),
    );
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-labelledby="complete-outfit-title"
        >
          {/* Dimmed backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#1A0E07]/44 backdrop-blur-[2px]"
          />

          {/* Slide-over drawer matching Jhonty Hub Brown/Gold/Amber editorial language */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-[460px] bg-[#FFFBF4] dark:bg-[#1B110B] text-[#2A1810] dark:text-[#F7EFE2] h-full shadow-[-24px_0_60px_-16px_rgba(24,12,5,0.45)] border-l border-[#C6922E]/25 dark:border-[#D4A243]/25 flex flex-col"
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-[#3B2314]/[0.12] dark:border-[#D4A243]/[0.18] flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] text-[#9A4A0A] dark:text-[#E5B54F] flex items-center gap-1.5 font-medium">
                  <Layers className="w-3.5 h-3.5 stroke-[1.6]" aria-hidden="true" />
                  <span>Studio Styling</span>
                  <span aria-hidden="true">·</span>
                  <span>{pairings.length} pairings</span>
                </p>
                <h2
                  id="complete-outfit-title"
                  className="font-editorial text-[28px] leading-tight font-medium text-[#2A1810] dark:text-[#F7EFE2] mt-0.5"
                >
                  Complete the Outfit
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close complete the outfit drawer"
                className="p-1.5 -mr-1.5 text-[#7D5B3F] dark:text-[#A98C6D] hover:text-[#2A1810] dark:hover:text-[#F7EFE2] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Anchor Piece Strip */}
            <div className="px-6 py-3.5 bg-[#F6EDE0] dark:bg-[#23160E] border-b border-[#3B2314]/[0.1] dark:border-[#D4A243]/[0.16] flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-14 rounded-lg bg-[#EFE1C9] dark:bg-[#2D1D13] border border-[#C6922E]/25 dark:border-[#D4A243]/22 overflow-hidden shrink-0">
                  <ResilientImage
                    src={activeProduct.productImage}
                    alt={activeProduct.name}
                    fallbackTitle={activeProduct.name}
                    className="w-full h-full object-contain p-1"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-[#7D5B3F] dark:text-[#B99A74]">
                    Selected Piece · Size {activeSize}
                  </p>
                  <p className="text-sm font-medium text-[#2A1810] dark:text-[#F7EFE2] truncate">
                    {activeProduct.name}
                  </p>
                </div>
              </div>
              <span className="text-sm font-semibold tabular-nums text-[#9A4A0A] dark:text-[#E5B54F] shrink-0">
                {formatPrice(activeProduct.priceUsd, currency)}
              </span>
            </div>

            {/* Scrollable Complementary Suggestions */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <p className="text-xs text-[#5E402A] dark:text-[#D4BEA1] leading-relaxed">
                Curated catalog pairings designed to balance the proportion, fabric weight, and color palette of your{' '}
                <span className="font-medium text-[#2A1810] dark:text-[#F7EFE2]">
                  {activeProduct.name}
                </span>
                .
              </p>

              <ul className="space-y-3.5">
                {pairings.map((item) => {
                  const isIncluded = selectedIds.includes(item.productId);
                  const chosenSize = getSizeFor(item.productId);

                  return (
                    <li
                      key={item.productId}
                      className={`rounded-xl border transition-colors p-3.5 ${
                        isIncluded
                          ? 'border-[#C6922E] dark:border-[#E5B54F] bg-[#FBF4E8] dark:bg-[#261911]'
                          : 'border-[#3B2314]/[0.12] dark:border-[#D4A243]/[0.18] bg-[#FFFBF4] dark:bg-[#1B110B] hover:border-[#C6922E]/60 dark:hover:border-[#E5B54F]/50'
                      }`}
                    >
                      <div className="flex gap-3.5">
                        {/* Clickable Thumbnail to Try On */}
                        <button
                          type="button"
                          onClick={() => {
                            onTryInShowroom(item.productId);
                            onClose();
                          }}
                          title={`Try on ${item.product.name} in showroom`}
                          className="w-[76px] h-[98px] rounded-lg bg-[#F3E7D3] dark:bg-[#2D1D13] border border-[#C6922E]/20 dark:border-[#D4A243]/20 overflow-hidden shrink-0 cursor-pointer group relative"
                        >
                          <ResilientImage
                            src={item.product.productImage}
                            alt={item.product.name}
                            fallbackTitle={item.product.name}
                            className="w-full h-full object-contain p-1.5 transition-transform duration-200 group-hover:scale-[1.04]"
                          />
                        </button>

                        {/* Details & Actions */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-[11px] text-[#7D5B3F] dark:text-[#B99A74]">
                                  {item.role} · {item.product.color}
                                </p>
                                <h3 className="text-sm font-medium text-[#2A1810] dark:text-[#F7EFE2] truncate mt-0.5">
                                  {item.product.name}
                                </h3>
                              </div>

                              <button
                                type="button"
                                role="checkbox"
                                aria-checked={isIncluded}
                                aria-label={`Include ${item.product.name} in complete look`}
                                onClick={() => toggleSelection(item.productId)}
                                className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors cursor-pointer mt-0.5 ${
                                  isIncluded
                                    ? 'bg-[#B45309] dark:bg-[#E0AD42] border-[#B45309] dark:border-[#E0AD42] text-[#FFFDF9] dark:text-[#1B1009]'
                                    : 'border-[#7D5B3F]/45 dark:border-[#D4A243]/40 bg-[#FFFBF4] dark:bg-[#1B110B] hover:border-[#B45309] dark:hover:border-[#E5B54F]'
                                }`}
                              >
                                {isIncluded && <Check className="w-3.5 h-3.5 stroke-[2.2]" />}
                              </button>
                            </div>

                            <p className="text-xs text-[#5E402A] dark:text-[#D4BEA1] leading-relaxed mt-1.5">
                              {item.note}
                            </p>
                          </div>

                          {/* Price, Size Selector & Quick Actions */}
                          <div className="mt-3 pt-2.5 border-t border-[#3B2314]/[0.1] dark:border-[#D4A243]/[0.15] flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold tabular-nums text-[#9A4A0A] dark:text-[#E5B54F]">
                                {formatPrice(item.product.priceUsd, currency)}
                              </span>
                              <select
                                aria-label={`Select size for ${item.product.name}`}
                                value={chosenSize}
                                onChange={(e) =>
                                  setPairingSizes((prev) => ({
                                    ...prev,
                                    [item.productId]: e.target.value as Size,
                                  }))
                                }
                                className="text-[11px] bg-[#FFFBF4] dark:bg-[#1B110B] border border-[#7D5B3F]/30 dark:border-[#D4A243]/30 rounded px-1.5 py-1 text-[#2A1810] dark:text-[#F7EFE2] cursor-pointer"
                              >
                                {SIZES.map((s) => (
                                  <option key={s} value={s}>
                                    Size {s}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  onTryInShowroom(item.productId);
                                  onClose();
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-[#3B2314]/20 dark:border-[#D4A243]/30 bg-[#FFFBF4] dark:bg-[#1B110B] hover:bg-[#3B2314]/[0.06] dark:hover:bg-[#D4A243]/12 text-[11px] font-medium text-[#2A1810] dark:text-[#F7EFE2] transition-colors whitespace-nowrap cursor-pointer"
                              >
                                <Eye className="w-3 h-3 text-[#B45309] dark:text-[#E5B54F]" aria-hidden="true" />
                                <span>Try on</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  onAddSingleToBag(item.productId, chosenSize);
                                  onClose();
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-[#3B2314] dark:bg-[#E0AD42] hover:bg-[#52311C] dark:hover:bg-[#EBC05E] text-[#F8E2A8] dark:text-[#1B1009] text-[11px] font-medium transition-colors whitespace-nowrap cursor-pointer"
                              >
                                <Plus className="w-3 h-3" aria-hidden="true" />
                                <span>Add</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Footer Bundle Summary & One-Click Add Complete Look */}
            <div className="px-6 py-5 border-t border-[#3B2314]/[0.12] dark:border-[#D4A243]/[0.18] bg-[#FFFBF4] dark:bg-[#1B110B] space-y-3">
              <div className="flex items-baseline justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-[#2A1810] dark:text-[#F7EFE2]">
                    Complete look ({bundleItems.length}{' '}
                    {bundleItems.length === 1 ? 'piece' : 'pieces'})
                  </p>
                  <p className="text-[11px] text-[#7D5B3F] dark:text-[#B99A74] mt-0.5">
                    {unlocksFreeDelivery
                      ? 'Qualifies for complimentary delivery.'
                      : `${formatPrice(
                          FREE_DELIVERY_THRESHOLD_USD - bundleTotalUsd,
                          currency,
                        )} away from free delivery.`}
                  </p>
                </div>
                <p className="text-base font-semibold tabular-nums text-[#9A4A0A] dark:text-[#E5B54F] shrink-0">
                  {formatPrice(bundleTotalUsd, currency)}{' '}
                  <span className="text-xs font-normal text-[#7D5B3F] dark:text-[#A98C6D]">
                    {CURRENCIES[currency].shortLabel}
                  </span>
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddCompleteLook}
                className="w-full py-3.5 bg-gradient-to-r from-[#9A4A0A] via-[#B45309] to-[#C6922E] hover:from-[#7C3A08] hover:to-[#B45309] dark:from-[#D49B35] dark:via-[#E0AD42] dark:to-[#ECC25C] active:scale-[0.99] text-[#FFFDF9] dark:text-[#1B1009] text-xs font-semibold tracking-[0.14em] uppercase rounded-md inline-flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <ShoppingBag className="w-3.5 h-3.5" aria-hidden="true" />
                <span>
                  Add Complete Look ({bundleItems.length}{' '}
                  {bundleItems.length === 1 ? 'Piece' : 'Pieces'})
                </span>
              </button>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
