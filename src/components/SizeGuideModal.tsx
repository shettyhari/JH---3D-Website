import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Ruler, X } from 'lucide-react';
import { SIZES } from '../data/products';
import { Product, Size } from '../types';
import { ResilientImage } from './ResilientImage';

interface SizeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  selectedSize: Size;
  onSelectSize: (size: Size) => void;
}

type Unit = 'cm' | 'in';

function formatMeasurement(valueCm: number, unit: Unit): string {
  if (unit === 'cm') {
    return Number.isInteger(valueCm) ? `${valueCm}` : valueCm.toFixed(1);
  }
  const inches = valueCm / 2.54;
  return inches.toFixed(1);
}

const MEASUREMENT_GUIDANCE = [
  {
    label: 'Chest',
    detail: 'Measured flat across the garment 2 cm below the armhole, then doubled.',
  },
  {
    label: 'Body Length',
    detail: 'Measured vertically from the highest shoulder point down to the bottom hem.',
  },
  {
    label: 'Shoulder',
    detail: 'Measured straight across the back from left shoulder seam to right seam.',
  },
  {
    label: 'Sleeve',
    detail: 'Measured along the outer arm from the top shoulder seam to the cuff edge.',
  },
];

export function SizeGuideModal({
  isOpen,
  onClose,
  product,
  selectedSize,
  onSelectSize,
}: SizeGuideModalProps) {
  const [unit, setUnit] = useState<Unit>('cm');

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

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="size-guide-title"
        >
          {/* Dimmed backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#1A0E07]/52 backdrop-blur-xs"
          />

          {/* Modal container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-[640px] max-h-[88vh] bg-[#FFFBF4] dark:bg-[#1B110B] text-[#2A1810] dark:text-[#F7EFE2] rounded-2xl shadow-2xl border border-[#C6922E]/30 dark:border-[#D4A243]/28 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-[#3B2314]/[0.12] dark:border-[#D4A243]/[0.18] flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-14 rounded-lg bg-[#F3E7D3] dark:bg-[#261911] border border-[#C6922E]/25 dark:border-[#D4A243]/25 overflow-hidden shrink-0">
                  <ResilientImage
                    src={product.productImage}
                    alt={product.name}
                    fallbackTitle={product.name}
                    className="w-full h-full object-contain p-1"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-[#9A4A0A] dark:text-[#E5B54F] flex items-center gap-1.5 font-medium">
                    <Ruler className="w-3.5 h-3.5 stroke-[1.6]" aria-hidden="true" />
                    <span>Size Guide</span>
                    <span aria-hidden="true">·</span>
                    <span className="truncate">{product.category}</span>
                  </p>
                  <h2
                    id="size-guide-title"
                    className="font-editorial text-2xl sm:text-[28px] leading-tight font-medium text-[#2A1810] dark:text-[#F7EFE2] truncate"
                  >
                    {product.name}
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close size guide"
                className="p-2 -mr-1.5 text-[#7D5B3F] dark:text-[#A98C6D] hover:text-[#2A1810] dark:hover:text-[#F7EFE2] transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {/* Fit Summary + Unit Switcher */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="text-xs text-[#5E402A] dark:text-[#D4BEA1] space-y-0.5">
                  <p className="font-medium text-[#2A1810] dark:text-[#F7EFE2]">
                    {product.specs.fit}
                  </p>
                  <p className="text-[#7D5B3F] dark:text-[#A98C6D]">
                    {product.specs.modelNote}
                  </p>
                </div>

                {/* Unit Toggle (cm / in) */}
                <div
                  role="radiogroup"
                  aria-label="Measurement unit"
                  className="inline-flex items-center gap-1 p-1 bg-[#3B2314]/[0.07] dark:bg-[#D4A243]/[0.12] rounded-lg self-start sm:self-auto shrink-0"
                >
                  {(['cm', 'in'] as const).map((u) => {
                    const active = unit === u;
                    return (
                      <button
                        key={u}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => setUnit(u)}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                          active
                            ? 'bg-[#3B2314] dark:bg-[#E0AD42] text-[#F8E2A8] dark:text-[#1B1009] shadow-xs'
                            : 'text-[#5E402A] dark:text-[#D4BEA1] hover:text-[#2A1810] dark:hover:text-[#F7EFE2]'
                        }`}
                      >
                        {u === 'cm' ? 'Centimeters (cm)' : 'Inches (in)'}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Garment Measurements Comparison Table */}
              <div className="overflow-x-auto rounded-xl border border-[#3B2314]/[0.12] dark:border-[#D4A243]/[0.2]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F6EDE0] dark:bg-[#24170F] border-b border-[#3B2314]/[0.12] dark:border-[#D4A243]/[0.18] text-[11px] font-medium text-[#7D5B3F] dark:text-[#C4A67E]">
                      <th scope="col" className="py-3 pl-4 pr-3 whitespace-nowrap">
                        Size
                      </th>
                      <th scope="col" className="py-3 px-3 whitespace-nowrap text-right">
                        Chest ({unit})
                      </th>
                      <th scope="col" className="py-3 px-3 whitespace-nowrap text-right">
                        Body Length ({unit})
                      </th>
                      <th scope="col" className="py-3 px-3 whitespace-nowrap text-right">
                        Shoulder ({unit})
                      </th>
                      <th scope="col" className="py-3 pl-3 pr-4 whitespace-nowrap text-right">
                        Sleeve ({unit})
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#3B2314]/[0.08] dark:divide-[#D4A243]/[0.12] text-xs">
                    {SIZES.map((size) => {
                      const row = product.measurements[size];
                      const isSelected = size === selectedSize;
                      return (
                        <tr
                          key={size}
                          onClick={() => onSelectSize(size)}
                          className={`transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-[#3B2314] dark:bg-[#E0AD42] text-[#FFF5E0] dark:text-[#1B1009]'
                              : 'bg-[#FFFBF4] dark:bg-[#1B110B] text-[#2A1810] dark:text-[#F7EFE2] hover:bg-[#F6EDE0] dark:hover:bg-[#261911]'
                          }`}
                        >
                          <th
                            scope="row"
                            className="py-3.5 pl-4 pr-3 font-medium whitespace-nowrap"
                          >
                            <span className="inline-flex items-center gap-2">
                              <span>{size}</span>
                              {isSelected && (
                                <Check
                                  className="w-3.5 h-3.5 text-[#E5B54F] dark:text-[#1B1009]"
                                  aria-label="Currently selected size"
                                />
                              )}
                            </span>
                          </th>
                          <td className="py-3.5 px-3 text-right tabular-nums">
                            {formatMeasurement(row.chest, unit)}
                          </td>
                          <td className="py-3.5 px-3 text-right tabular-nums">
                            {formatMeasurement(row.length, unit)}
                          </td>
                          <td className="py-3.5 px-3 text-right tabular-nums">
                            {formatMeasurement(row.shoulder, unit)}
                          </td>
                          <td className="py-3.5 pl-3 pr-4 text-right tabular-nums">
                            {formatMeasurement(row.sleeve, unit)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <p className="text-[11px] text-[#7D5B3F] dark:text-[#A98C6D]">
                Click any size row to select it in the showroom. Garment tolerances are within ±1.0 cm (0.4 in) due to natural fabric finishing.
              </p>

              {/* How to Measure Reference */}
              <div className="pt-4 border-t border-[#3B2314]/[0.12] dark:border-[#D4A243]/[0.18]">
                <h3 className="text-xs font-medium text-[#2A1810] dark:text-[#F7EFE2] mb-3">
                  How we measure
                </h3>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-xs">
                  {MEASUREMENT_GUIDANCE.map((item) => (
                    <div key={item.label}>
                      <dt className="font-medium text-[#2A1810] dark:text-[#F7EFE2]">
                        {item.label}
                      </dt>
                      <dd className="text-[#7D5B3F] dark:text-[#B99A74] mt-0.5 leading-relaxed">
                        {item.detail}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>

            {/* Footer Action */}
            <div className="px-6 py-4 border-t border-[#3B2314]/[0.12] dark:border-[#D4A243]/[0.18] bg-[#F6EDE0] dark:bg-[#23160E] flex items-center justify-between gap-4">
              <p className="text-xs text-[#5E402A] dark:text-[#D4BEA1]">
                Selected size:{' '}
                <span className="font-semibold text-[#9A4A0A] dark:text-[#E5B54F]">
                  {selectedSize}
                </span>
              </p>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#9A4A0A] to-[#C6922E] hover:from-[#7C3A08] hover:to-[#B45309] dark:from-[#D49B35] dark:to-[#E5B54F] text-[#FFFDF9] dark:text-[#1B1009] text-xs font-semibold tracking-wide transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Use Size {selectedSize}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
