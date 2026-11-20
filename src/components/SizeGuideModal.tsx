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
            className="fixed inset-0 bg-black/38 backdrop-blur-xs"
          />

          {/* Modal container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-[640px] max-h-[88vh] bg-white dark:bg-[#141312] text-[#171615] dark:text-[#F4F1EC] rounded-2xl shadow-2xl border border-black/[0.08] dark:border-white/[0.1] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-black/[0.08] dark:border-white/[0.1] flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-14 rounded-lg bg-[#F4F1EC] dark:bg-[#1E1C1A] border border-black/[0.06] dark:border-white/[0.08] overflow-hidden shrink-0">
                  <ResilientImage
                    src={product.productImage}
                    alt={product.name}
                    fallbackTitle={product.name}
                    className="w-full h-full object-contain p-1"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-[#78716A] dark:text-[#9E978F] flex items-center gap-1.5">
                    <Ruler className="w-3.5 h-3.5 stroke-[1.6]" aria-hidden="true" />
                    <span>Size Guide</span>
                    <span aria-hidden="true">·</span>
                    <span className="truncate">{product.category}</span>
                  </p>
                  <h2
                    id="size-guide-title"
                    className="font-editorial text-2xl sm:text-[28px] leading-tight font-medium text-[#171615] dark:text-[#F4F1EC] truncate"
                  >
                    {product.name}
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close size guide"
                className="p-2 -mr-1.5 text-[#59534C] dark:text-[#A8A199] hover:text-[#171615] dark:hover:text-[#F4F1EC] transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {/* Fit Summary + Unit Switcher */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="text-xs text-[#45413C] dark:text-[#B5AEA6] space-y-0.5">
                  <p className="font-medium text-[#171615] dark:text-[#F4F1EC]">
                    {product.specs.fit}
                  </p>
                  <p className="text-[#6D665E] dark:text-[#9E978F]">
                    {product.specs.modelNote}
                  </p>
                </div>

                {/* Unit Toggle (cm / in) */}
                <div
                  role="radiogroup"
                  aria-label="Measurement unit"
                  className="inline-flex items-center gap-1 p-1 bg-black/[0.05] dark:bg-white/[0.08] rounded-lg self-start sm:self-auto shrink-0"
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
                            ? 'bg-white dark:bg-[#262320] text-[#171615] dark:text-[#F4F1EC] shadow-xs'
                            : 'text-[#59534C] dark:text-[#A8A199] hover:text-[#171615] dark:hover:text-[#F4F1EC]'
                        }`}
                      >
                        {u === 'cm' ? 'Centimeters (cm)' : 'Inches (in)'}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Garment Measurements Comparison Table */}
              <div className="overflow-x-auto rounded-xl border border-black/[0.08] dark:border-white/[0.1]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#FAF9F7] dark:bg-[#1B1917] border-b border-black/[0.08] dark:border-white/[0.1] text-[11px] font-medium text-[#6D665E] dark:text-[#A8A199]">
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
                  <tbody className="divide-y divide-black/[0.06] dark:divide-white/[0.08] text-xs">
                    {SIZES.map((size) => {
                      const row = product.measurements[size];
                      const isSelected = size === selectedSize;
                      return (
                        <tr
                          key={size}
                          onClick={() => onSelectSize(size)}
                          className={`transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-[#171615] dark:bg-[#F4F1EC] text-white dark:text-[#171615]'
                              : 'bg-white dark:bg-[#141312] text-[#171615] dark:text-[#F4F1EC] hover:bg-[#FAF9F7] dark:hover:bg-[#1D1B19]'
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
                                  className="w-3.5 h-3.5 text-white/90 dark:text-[#171615]/90"
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

              <p className="text-[11px] text-[#78716A] dark:text-[#9E978F]">
                Click any size row to select it in the showroom. Garment tolerances are within ±1.0 cm (0.4 in) due to natural fabric finishing.
              </p>

              {/* How to Measure Reference */}
              <div className="pt-4 border-t border-black/[0.08] dark:border-white/[0.1]">
                <h3 className="text-xs font-medium text-[#171615] dark:text-[#F4F1EC] mb-3">
                  How we measure
                </h3>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-xs">
                  {MEASUREMENT_GUIDANCE.map((item) => (
                    <div key={item.label}>
                      <dt className="font-medium text-[#171615] dark:text-[#F4F1EC]">
                        {item.label}
                      </dt>
                      <dd className="text-[#6D665E] dark:text-[#9E978F] mt-0.5 leading-relaxed">
                        {item.detail}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>

            {/* Footer Action */}
            <div className="px-6 py-4 border-t border-black/[0.08] dark:border-white/[0.1] bg-[#FAF9F7] dark:bg-[#191816] flex items-center justify-between gap-4">
              <p className="text-xs text-[#59534C] dark:text-[#A8A199]">
                Selected size:{' '}
                <span className="font-semibold text-[#171615] dark:text-[#F4F1EC]">
                  {selectedSize}
                </span>
              </p>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-lg bg-[#171615] dark:bg-[#F4F1EC] hover:bg-[#2C2A27] dark:hover:bg-[#E4DFD8] text-white dark:text-[#171615] text-xs font-medium tracking-wide transition-colors whitespace-nowrap shrink-0 cursor-pointer"
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
