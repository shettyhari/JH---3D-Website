import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Eye, Heart, Plus, X } from 'lucide-react';
import { formatPrice, SIZES } from '../data/products';
import { CurrencyCode, Product, Size } from '../types';
import { ResilientImage } from './ResilientImage';

interface QuickViewModalProps {
  product: Product | null;
  currency: CurrencyCode;
  selectedSize: Size;
  isSaved: boolean;
  onSelectSize: (size: Size) => void;
  onToggleWishlist: (productId: string) => void;
  onAddToBag: (productId: string, size: Size) => void;
  onTryInShowroom: (productId: string) => void;
  onClose: () => void;
}

type PreviewView = 'studio' | 'model';

export function QuickViewModal({
  product,
  currency,
  selectedSize,
  isSaved,
  onSelectSize,
  onToggleWishlist,
  onAddToBag,
  onTryInShowroom,
  onClose,
}: QuickViewModalProps) {
  const [previewView, setPreviewView] = useState<PreviewView>('studio');

  useEffect(() => {
    setPreviewView('studio');
  }, [product?.id]);

  useEffect(() => {
    if (!product) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [product, onClose]);

  const activeMeasurements = product
    ? product.measurements[selectedSize]
    : null;

  return (
    <AnimatePresence>
      {product && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="quick-view-title"
        >
          {/* Dimmed backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#1A0E07]/52 backdrop-blur-xs"
          />

          {/* Compact 2-column modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-[780px] max-h-[90vh] bg-[#FFFBF4] dark:bg-[#1B110B] text-[#2A1810] dark:text-[#F7EFE2] rounded-2xl shadow-2xl border border-[#C6922E]/30 dark:border-[#D4A243]/28 overflow-hidden grid grid-cols-1 md:grid-cols-[310px_1fr] items-stretch"
          >
            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close quick view"
              className="absolute top-3.5 right-3.5 z-20 w-9 h-9 rounded-full bg-[#FFFBF4]/92 dark:bg-[#261911]/92 hover:bg-[#FFFBF4] dark:hover:bg-[#322015] border border-[#C6922E]/30 dark:border-[#D4A243]/30 flex items-center justify-center text-[#5E402A] dark:text-[#D4BEA1] hover:text-[#2A1810] dark:hover:text-[#F7EFE2] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Left Column: Studio / Model Image */}
            <div className="relative bg-[#F3E7D3] dark:bg-[#23160E] border-b md:border-b-0 md:border-r border-[#3B2314]/[0.1] dark:border-[#D4A243]/[0.18] flex flex-col justify-between min-h-[280px] md:min-h-[480px]">
              <button
                type="button"
                onClick={() => onToggleWishlist(product.id)}
                aria-label={
                  isSaved
                    ? `Remove ${product.name} from saved`
                    : `Save ${product.name}`
                }
                className="absolute top-3.5 left-3.5 z-10 w-9 h-9 rounded-full bg-[#FFFBF4]/90 dark:bg-[#1B110B]/90 backdrop-blur-sm border border-[#C6922E]/30 dark:border-[#D4A243]/30 flex items-center justify-center text-[#2A1810] dark:text-[#F7EFE2] hover:bg-[#FFFBF4] dark:hover:bg-[#291A11] transition-colors cursor-pointer"
              >
                <Heart
                  className={`w-4 h-4 ${
                    isSaved
                      ? 'fill-[#B45309] text-[#B45309] dark:fill-[#E5B54F] dark:text-[#E5B54F]'
                      : ''
                  }`}
                />
              </button>

              <div className="relative flex-1 w-full overflow-hidden">
                <ResilientImage
                  src={
                    previewView === 'studio'
                      ? product.productImage
                      : product.showroomImage
                  }
                  alt={
                    previewView === 'studio'
                      ? `${product.name} studio view`
                      : `${product.name} worn on model`
                  }
                  fallbackTitle={product.name}
                  className={
                    previewView === 'studio'
                      ? 'w-full h-full object-contain p-7'
                      : 'w-full h-full object-cover object-[center_20%]'
                  }
                />
              </div>

              {/* View switcher: Studio vs On Model */}
              <div className="p-3 flex items-center justify-center border-t border-[#3B2314]/[0.1] dark:border-[#D4A243]/[0.18] bg-[#FFFBF4]/80 dark:bg-[#1B110B]/85 backdrop-blur-xs">
                <div
                  role="tablist"
                  aria-label="Product image view"
                  className="inline-flex items-center gap-1 p-0.5 bg-[#3B2314]/[0.08] dark:bg-[#D4A243]/[0.12] rounded-lg"
                >
                  {(
                    [
                      { id: 'studio', label: 'Studio' },
                      { id: 'model', label: 'On Model' },
                    ] as const
                  ).map((tab) => {
                    const active = previewView === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => setPreviewView(tab.id)}
                        className={`px-3 py-1 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          active
                            ? 'bg-[#3B2314] dark:bg-[#E0AD42] text-[#F8E2A8] dark:text-[#1B1009] shadow-xs'
                            : 'text-[#5E402A] dark:text-[#D4BEA1] hover:text-[#2A1810] dark:hover:text-[#F7EFE2]'
                        }`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column: Key Product Specs & Purchase Controls */}
            <div className="flex flex-col max-h-[60vh] md:max-h-[90vh] overflow-y-auto">
              <div className="p-6 flex-1 space-y-5">
                {/* Title, unboxed metadata, and price */}
                <div className="pr-8">
                  <p className="text-[11px] text-[#7D5B3F] dark:text-[#B99A74] flex items-center gap-1.5 flex-wrap">
                    <span>{product.category}</span>
                    <span aria-hidden="true">·</span>
                    <span>{product.color}</span>
                    {product.isNewArrival && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-[#B45309] dark:text-[#E5B54F] font-semibold">
                          New Arrival
                        </span>
                      </>
                    )}
                  </p>
                  <div className="mt-1 flex items-baseline justify-between gap-4">
                    <h2
                      id="quick-view-title"
                      className="font-editorial text-[28px] leading-tight font-medium text-[#2A1810] dark:text-[#F7EFE2] text-balance"
                    >
                      {product.name}
                    </h2>
                    <span className="text-base font-semibold tabular-nums text-[#9A4A0A] dark:text-[#E5B54F] shrink-0">
                      {formatPrice(product.priceUsd, currency)}
                    </span>
                  </div>
                  <p className="text-[13px] text-[#5E402A] dark:text-[#D4BEA1] mt-2 leading-relaxed">
                    {product.description}
                  </p>
                </div>

                {/* Key Specifications Grid */}
                <div className="pt-4 border-t border-[#3B2314]/[0.12] dark:border-[#D4A243]/[0.18]">
                  <h3 className="text-[11px] font-medium text-[#9A4A0A] dark:text-[#E5B54F] mb-3 uppercase tracking-wider">
                    Key Specifications
                  </h3>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3 text-xs">
                    <div>
                      <dt className="text-[#7D5B3F] dark:text-[#A98C6D]">Fabric</dt>
                      <dd className="text-[#2A1810] dark:text-[#F7EFE2] font-medium mt-0.5 leading-snug">
                        {product.specs.fabric}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[#7D5B3F] dark:text-[#A98C6D]">Weight</dt>
                      <dd className="text-[#2A1810] dark:text-[#F7EFE2] font-medium mt-0.5 leading-snug">
                        {product.specs.weight}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[#7D5B3F] dark:text-[#A98C6D]">Fit</dt>
                      <dd className="text-[#2A1810] dark:text-[#F7EFE2] font-medium mt-0.5 leading-snug">
                        {product.specs.fit}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[#7D5B3F] dark:text-[#A98C6D]">Origin</dt>
                      <dd className="text-[#2A1810] dark:text-[#F7EFE2] font-medium mt-0.5 leading-snug">
                        {product.specs.origin}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[#7D5B3F] dark:text-[#A98C6D]">Care</dt>
                      <dd className="text-[#2A1810] dark:text-[#F7EFE2] font-medium mt-0.5 leading-snug">
                        {product.specs.care}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[#7D5B3F] dark:text-[#A98C6D]">Reference</dt>
                      <dd className="text-[#2A1810] dark:text-[#F7EFE2] font-medium mt-0.5 leading-snug">
                        {product.specs.modelNote}
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* Size Selector + Live Selected-Size Dimensions */}
                <div className="pt-4 border-t border-[#3B2314]/[0.12] dark:border-[#D4A243]/[0.18]">
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="text-xs font-medium text-[#2A1810] dark:text-[#F7EFE2]">
                      Select Size
                    </span>
                    {activeMeasurements && (
                      <span className="text-[11px] text-[#7D5B3F] dark:text-[#B99A74] tabular-nums">
                        Chest {activeMeasurements.chest} cm · Length{' '}
                        {activeMeasurements.length} cm · Shoulder{' '}
                        {activeMeasurements.shoulder} cm
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {SIZES.map((s) => {
                      const active = selectedSize === s;
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => onSelectSize(s)}
                          aria-pressed={active}
                          className={`flex-1 h-9 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                            active
                              ? 'bg-[#3B2314] dark:bg-[#E0AD42] text-[#F8E2A8] dark:text-[#1B1009]'
                              : 'bg-[#3B2314]/[0.07] dark:bg-[#D4A243]/[0.12] text-[#5E402A] dark:text-[#D4BEA1] hover:bg-[#C6922E]/20 dark:hover:bg-[#D4A243]/24'
                          }`}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="px-6 py-4 border-t border-[#3B2314]/[0.12] dark:border-[#D4A243]/[0.18] bg-[#F6EDE0] dark:bg-[#23160E] flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    onAddToBag(product.id, selectedSize);
                    onClose();
                  }}
                  className="flex-1 py-2.5 px-4 rounded-lg bg-gradient-to-r from-[#9A4A0A] via-[#B45309] to-[#C6922E] hover:from-[#7C3A08] hover:to-[#B45309] dark:from-[#D49B35] dark:to-[#E5B54F] text-[#FFFDF9] dark:text-[#1B1009] text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>
                    Add to Bag ({selectedSize}) ·{' '}
                    <span className="tabular-nums">
                      {formatPrice(product.priceUsd, currency)}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onTryInShowroom(product.id);
                  }}
                  className="py-2.5 px-4 rounded-lg bg-[#FFFBF4] dark:bg-[#1B110B] hover:bg-[#3B2314]/[0.06] dark:hover:bg-[#D4A243]/12 border border-[#3B2314]/20 dark:border-[#D4A243]/30 text-[#2A1810] dark:text-[#F7EFE2] text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-[#B45309] dark:text-[#E5B54F]" />
                  <span>Try in Showroom</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
