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
            className="fixed inset-0 bg-black/28 backdrop-blur-[2px]"
          />

          {/* Slide-over drawer matching Jhonty Hub editorial language */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-[460px] bg-white dark:bg-[#141312] text-[#171615] dark:text-[#F4F1EC] h-full shadow-[-24px_0_60px_-16px_rgba(0,0,0,0.32)] border-l border-transparent dark:border-white/[0.08] flex flex-col"
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-black/[0.08] dark:border-white/[0.1] flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] text-[#78716A] dark:text-[#9E978F] flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 stroke-[1.6]" aria-hidden="true" />
                  <span>Studio Styling</span>
                  <span aria-hidden="true">·</span>
                  <span>{pairings.length} pairings</span>
                </p>
                <h2
                  id="complete-outfit-title"
                  className="font-editorial text-[28px] leading-tight font-medium text-[#171615] dark:text-[#F4F1EC] mt-0.5"
                >
                  Complete the Outfit
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close complete the outfit drawer"
                className="p-1.5 -mr-1.5 text-[#59534C] dark:text-[#A8A199] hover:text-[#171615] dark:hover:text-[#F4F1EC] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Anchor Piece Strip */}
            <div className="px-6 py-3.5 bg-[#FAF9F7] dark:bg-[#191816] border-b border-black/[0.07] dark:border-white/[0.08] flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-14 rounded-lg bg-[#F4F1EC] dark:bg-[#22201D] border border-black/[0.06] dark:border-white/[0.08] overflow-hidden shrink-0">
                  <ResilientImage
                    src={activeProduct.productImage}
                    alt={activeProduct.name}
                    fallbackTitle={activeProduct.name}
                    className="w-full h-full object-contain p-1"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-[#6D665E] dark:text-[#9E978F]">
                    Selected Piece · Size {activeSize}
                  </p>
                  <p className="text-sm font-medium text-[#171615] dark:text-[#F4F1EC] truncate">
                    {activeProduct.name}
                  </p>
                </div>
              </div>
              <span className="text-sm font-medium tabular-nums text-[#171615] dark:text-[#F4F1EC] shrink-0">
                {formatPrice(activeProduct.priceUsd, currency)}
              </span>
            </div>

            {/* Scrollable Complementary Suggestions */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <p className="text-xs text-[#59534C] dark:text-[#A8A199] leading-relaxed">
                Curated catalog pairings designed to balance the proportion, fabric weight, and color palette of your{' '}
                <span className="font-medium text-[#171615] dark:text-[#F4F1EC]">
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
                          ? 'border-[#171615] dark:border-[#F4F1EC]/75 bg-[#FAF9F7] dark:bg-[#1C1A18]'
                          : 'border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-[#141312] hover:border-black/[0.18] dark:hover:border-white/[0.22]'
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
                          className="w-[76px] h-[98px] rounded-lg bg-[#F4F1EC] dark:bg-[#22201D] border border-black/[0.05] dark:border-white/[0.08] overflow-hidden shrink-0 cursor-pointer group relative"
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
                                <p className="text-[11px] text-[#78716A] dark:text-[#9E978F]">
                                  {item.role} · {item.product.color}
                                </p>
                                <h3 className="text-sm font-medium text-[#171615] dark:text-[#F4F1EC] truncate mt-0.5">
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
                                    ? 'bg-[#171615] dark:bg-[#F4F1EC] border-[#171615] dark:border-[#F4F1EC] text-white dark:text-[#171615]'
                                    : 'border-black/[0.22] dark:border-white/[0.24] bg-white dark:bg-[#141312] hover:border-[#171615] dark:hover:border-[#F4F1EC]'
                                }`}
                              >
                                {isIncluded && <Check className="w-3.5 h-3.5 stroke-[2.2]" />}
                              </button>
                            </div>

                            <p className="text-xs text-[#59534C] dark:text-[#A8A199] leading-relaxed mt-1.5">
                              {item.note}
                            </p>
                          </div>

                          {/* Price, Size Selector & Quick Actions */}
                          <div className="mt-3 pt-2.5 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold tabular-nums text-[#171615] dark:text-[#F4F1EC]">
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
                                className="text-[11px] bg-white dark:bg-[#141312] border border-black/[0.14] dark:border-white/[0.16] rounded px-1.5 py-1 text-[#171615] dark:text-[#F4F1EC] cursor-pointer"
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
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-black/[0.12] dark:border-white/[0.16] bg-white dark:bg-[#141312] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-[11px] font-medium text-[#171615] dark:text-[#F4F1EC] transition-colors whitespace-nowrap cursor-pointer"
                              >
                                <Eye className="w-3 h-3" aria-hidden="true" />
                                <span>Try on</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  onAddSingleToBag(item.productId, chosenSize);
                                  onClose();
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-[#171615] dark:bg-[#F4F1EC] hover:bg-[#2C2A27] dark:hover:bg-[#E4DFD8] text-white dark:text-[#171615] text-[11px] font-medium transition-colors whitespace-nowrap cursor-pointer"
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
            <div className="px-6 py-5 border-t border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-[#141312] space-y-3">
              <div className="flex items-baseline justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-[#171615] dark:text-[#F4F1EC]">
                    Complete look ({bundleItems.length}{' '}
                    {bundleItems.length === 1 ? 'piece' : 'pieces'})
                  </p>
                  <p className="text-[11px] text-[#6D665E] dark:text-[#9E978F] mt-0.5">
                    {unlocksFreeDelivery
                      ? 'Qualifies for complimentary delivery.'
                      : `${formatPrice(
                          FREE_DELIVERY_THRESHOLD_USD - bundleTotalUsd,
                          currency,
                        )} away from free delivery.`}
                  </p>
                </div>
                <p className="text-base font-semibold tabular-nums text-[#171615] dark:text-[#F4F1EC] shrink-0">
                  {formatPrice(bundleTotalUsd, currency)}{' '}
                  <span className="text-xs font-normal text-[#6D665E] dark:text-[#9E978F]">
                    {CURRENCIES[currency].shortLabel}
                  </span>
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddCompleteLook}
                className="w-full py-3.5 bg-[#171615] dark:bg-[#F4F1EC] hover:bg-[#2C2A27] dark:hover:bg-[#E4DFD8] active:scale-[0.99] text-white dark:text-[#171615] text-xs font-medium tracking-[0.14em] uppercase rounded-md inline-flex items-center justify-center gap-2 transition-all cursor-pointer"
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
