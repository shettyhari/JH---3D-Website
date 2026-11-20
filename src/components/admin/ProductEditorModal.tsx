import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { PRESET_GALLERY_ASSETS, SIZES } from '../../data/products';
import { sanitizeSku, slugifyId } from '../../services/storeService';
import { Product, ProductStatus, Size } from '../../types';
import { ResilientImage } from '../ResilientImage';

interface ProductEditorModalProps {
  isOpen: boolean;
  editingProduct: Product | null;
  existingIds: string[];
  onClose: () => void;
  onSave: (product: Product, isNew: boolean) => Promise<void>;
}

const DEFAULT_MEASUREMENTS = {
  XS: { chest: 102, length: 67, shoulder: 44.5, sleeve: 61 },
  S: { chest: 108, length: 69, shoulder: 46.5, sleeve: 62.5 },
  M: { chest: 114, length: 71, shoulder: 48.5, sleeve: 64 },
  L: { chest: 120, length: 73, shoulder: 50.5, sleeve: 65.5 },
  XL: { chest: 126, length: 75, shoulder: 52.5, sleeve: 67 },
};

function buildBlankProduct(): Product {
  const preset = PRESET_GALLERY_ASSETS[0];
  return {
    id: '',
    sku: `JH-NEW-${Math.floor(100 + Math.random() * 900)}`,
    name: '',
    priceUsd: 4999,
    costUsd: 1850,
    category: 'Tops',
    color: 'Warm Stone',
    tagline: 'Architectural everyday silhouette milled in Portugal.',
    description:
      'Constructed with dense organic cotton and minimal tonal finishing for year-round layering.',
    status: 'active',
    showroomImage: preset.showroomViews.front,
    showroomViews: { ...preset.showroomViews },
    productImage: preset.productImage,
    sizes: [...SIZES],
    stock: { XS: 8, S: 14, M: 18, L: 12, XL: 6 },
    lowStockThreshold: 6,
    isNewArrival: true,
    isBestseller: false,
    pairWithIds: [],
    outfitPairings: [],
    specs: {
      fabric: '100% Organic Cotton',
      weight: '280 GSM',
      origin: 'Porto, Portugal',
      fit: 'Regular boxy silhouette, true to size',
      modelNote: 'Model is 6\'1" (185 cm) wearing size M',
      care: 'Machine wash cold gentle, dry flat',
    },
    measurements: {
      XS: { ...DEFAULT_MEASUREMENTS.XS },
      S: { ...DEFAULT_MEASUREMENTS.S },
      M: { ...DEFAULT_MEASUREMENTS.M },
      L: { ...DEFAULT_MEASUREMENTS.L },
      XL: { ...DEFAULT_MEASUREMENTS.XL },
    },
  };
}

export function ProductEditorModal({
  isOpen,
  editingProduct,
  existingIds,
  onClose,
  onSave,
}: ProductEditorModalProps) {
  const [form, setForm] = useState<Product>(() => buildBlankProduct());
  const [activeTab, setActiveTab] = useState<'details' | 'media' | 'specs'>('details');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isNew = !editingProduct;

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setActiveTab('details');
    if (editingProduct) {
      setForm(JSON.parse(JSON.stringify(editingProduct)) as Product);
    } else {
      setForm(buildBlankProduct());
    }
  }, [isOpen, editingProduct]);

  if (!isOpen) return null;

  const grossMarginPct =
    form.priceUsd > 0
      ? Math.round(((form.priceUsd - form.costUsd) / form.priceUsd) * 100)
      : 0;

  const handleApplyPreset = (presetIdx: number) => {
    const preset = PRESET_GALLERY_ASSETS[presetIdx];
    if (!preset) return;
    setForm((prev) => ({
      ...prev,
      productImage: preset.productImage,
      showroomImage: preset.showroomViews.front,
      showroomViews: { ...preset.showroomViews },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) {
      setError('Product name is required.');
      return;
    }

    const resolvedId = isNew
      ? slugifyId(form.id || form.name, 64)
      : form.id;

    if (isNew && existingIds.includes(resolvedId)) {
      setError(`A product with ID "${resolvedId}" already exists. Choose another name or slug.`);
      return;
    }

    setSaving(true);
    try {
      await onSave(
        {
          ...form,
          id: resolvedId,
          sku: sanitizeSku(form.sku),
          showroomImage: form.showroomViews.front || form.showroomImage,
        },
        isNew,
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save product.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={isNew ? 'Create product' : `Edit ${editingProduct.name}`}
    >
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/45 backdrop-blur-[2px]"
      />
      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-[640px] h-full bg-white dark:bg-[#141312] text-[#171615] dark:text-[#F4F1EC] border-l border-black/[0.08] dark:border-white/[0.1] flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-black/[0.08] dark:border-white/[0.1] flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold tracking-tight">
              {isNew ? 'Add New Garment' : `Edit ${editingProduct.name}`}
            </h2>
            <p className="text-xs text-[#6D665E] dark:text-[#9E978F] mt-0.5">
              {isNew
                ? 'Publishes directly to the Jhonty Hub catalog and inventory ledger.'
                : `SKU ${form.sku} · ID ${form.id}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close product editor"
            className="p-1.5 text-[#6D665E] dark:text-[#9E978F] hover:text-[#171615] dark:hover:text-[#F4F1EC] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sub-tabs */}
        <div className="px-6 pt-3 border-b border-black/[0.08] dark:border-white/[0.1] flex items-center gap-6 text-xs font-medium">
          {(
            [
              { id: 'details', label: 'Core Details & Stock' },
              { id: 'media', label: 'Showroom & Studio Media' },
              { id: 'specs', label: 'Specs & Measurements' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === tab.id
                  ? 'border-[#171615] dark:border-[#F4F1EC] text-[#171615] dark:text-[#F4F1EC]'
                  : 'border-transparent text-[#6D665E] dark:text-[#9E978F] hover:text-[#171615] dark:hover:text-[#F4F1EC]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/25 text-xs text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {activeTab === 'details' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#45413C] dark:text-[#C8C2BA] mb-1.5">
                    Garment Name *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={120}
                    value={form.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      setForm((prev) => ({
                        ...prev,
                        name,
                        id: isNew ? slugifyId(name, 64) : prev.id,
                      }));
                    }}
                    placeholder="Merino Crewneck Knit"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-black/[0.14] dark:border-white/[0.16] bg-white dark:bg-[#1A1917] focus:outline-none focus:border-[#171615] dark:focus:border-[#F4F1EC]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#45413C] dark:text-[#C8C2BA] mb-1.5">
                    SKU *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={32}
                    value={form.sku}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, sku: e.target.value.toUpperCase() }))
                    }
                    placeholder="JH-TOP-007"
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-black/[0.14] dark:border-white/[0.16] bg-white dark:bg-[#1A1917] focus:outline-none focus:border-[#171615] dark:focus:border-[#F4F1EC]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#45413C] dark:text-[#C8C2BA] mb-1.5">
                    Category
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        category: e.target.value as 'Tops' | 'Outerwear',
                      }))
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-black/[0.14] dark:border-white/[0.16] bg-white dark:bg-[#1A1917]"
                  >
                    <option value="Tops">Tops</option>
                    <option value="Outerwear">Outerwear</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#45413C] dark:text-[#C8C2BA] mb-1.5">
                    Colorway *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={80}
                    value={form.color}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, color: e.target.value }))
                    }
                    placeholder="Oatmeal Melange"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-black/[0.14] dark:border-white/[0.16] bg-white dark:bg-[#1A1917]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#45413C] dark:text-[#C8C2BA] mb-1.5">
                    Catalog Status
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        status: e.target.value as ProductStatus,
                      }))
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-black/[0.14] dark:border-white/[0.16] bg-white dark:bg-[#1A1917]"
                  >
                    <option value="active">Active (Live)</option>
                    <option value="draft">Draft (Hidden)</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              {/* Pricing & Margin */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-[#FAF9F7] dark:bg-[#191816] border border-black/[0.06] dark:border-white/[0.08]">
                <div>
                  <label className="block text-xs font-medium text-[#45413C] dark:text-[#C8C2BA] mb-1">
                    Retail (INR ₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={10000000}
                    step="1"
                    required
                    value={form.priceUsd}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        priceUsd: Math.max(0, Number(e.target.value) || 0),
                      }))
                    }
                    className="w-full px-2.5 py-1.5 text-sm font-mono tabular-nums rounded-md border border-black/[0.14] dark:border-white/[0.16] bg-white dark:bg-[#141312]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#45413C] dark:text-[#C8C2BA] mb-1">
                    Unit Cost (INR ₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={10000000}
                    step="1"
                    required
                    value={form.costUsd}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        costUsd: Math.max(0, Number(e.target.value) || 0),
                      }))
                    }
                    className="w-full px-2.5 py-1.5 text-sm font-mono tabular-nums rounded-md border border-black/[0.14] dark:border-white/[0.16] bg-white dark:bg-[#141312]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#45413C] dark:text-[#C8C2BA] mb-1">
                    Low-Stock Alert
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={500}
                    value={form.lowStockThreshold}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        lowStockThreshold: Math.max(
                          0,
                          Math.round(Number(e.target.value) || 0),
                        ),
                      }))
                    }
                    className="w-full px-2.5 py-1.5 text-sm font-mono tabular-nums rounded-md border border-black/[0.14] dark:border-white/[0.16] bg-white dark:bg-[#141312]"
                  />
                </div>
                <div className="flex flex-col justify-center">
                  <span className="text-xs text-[#6D665E] dark:text-[#9E978F]">
                    Gross Margin
                  </span>
                  <span
                    className={`text-lg font-semibold font-mono tabular-nums mt-0.5 ${
                      grossMarginPct >= 50
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-amber-700 dark:text-amber-400'
                    }`}
                  >
                    {grossMarginPct}%
                  </span>
                </div>
              </div>

              {/* Merchandising Flags */}
              <div className="flex flex-wrap items-center gap-6">
                <label className="inline-flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(form.isNewArrival)}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        isNewArrival: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 accent-[#171615] dark:accent-[#F4F1EC]"
                  />
                  <span>Feature in New Arrivals</span>
                </label>
                <label className="inline-flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(form.isBestseller)}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        isBestseller: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 accent-[#171615] dark:accent-[#F4F1EC]"
                  />
                  <span>Feature in Bestsellers</span>
                </label>
              </div>

              {/* Per-Size Inventory */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-[#45413C] dark:text-[#C8C2BA]">
                  Per-Size Inventory Allocation (Units)
                </p>
                <div className="grid grid-cols-5 gap-2.5">
                  {SIZES.map((sz: Size) => (
                    <div
                      key={sz}
                      className="p-2.5 rounded-lg border border-black/[0.08] dark:border-white/[0.1] bg-[#FAF9F7] dark:bg-[#191816]"
                    >
                      <label className="block text-[11px] font-medium text-[#6D665E] dark:text-[#9E978F] mb-1">
                        Size {sz}
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100000}
                        value={form.stock[sz]}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            stock: {
                              ...prev.stock,
                              [sz]: Math.max(0, Math.round(Number(e.target.value) || 0)),
                            },
                          }))
                        }
                        className="w-full px-2 py-1 text-sm font-mono tabular-nums rounded border border-black/[0.12] dark:border-white/[0.16] bg-white dark:bg-[#141312]"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Copy */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-[#45413C] dark:text-[#C8C2BA] mb-1.5">
                    Short Tagline *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={240}
                    value={form.tagline}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, tagline: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-black/[0.14] dark:border-white/[0.16] bg-white dark:bg-[#1A1917]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#45413C] dark:text-[#C8C2BA] mb-1.5">
                    Editorial Description *
                  </label>
                  <textarea
                    rows={3}
                    required
                    maxLength={1200}
                    value={form.description}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, description: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-black/[0.14] dark:border-white/[0.16] bg-white dark:bg-[#1A1917]"
                  />
                </div>
              </div>
            </>
          )}

          {activeTab === 'media' && (
            <div className="space-y-5">
              <div>
                <p className="text-xs font-medium text-[#45413C] dark:text-[#C8C2BA] mb-2">
                  Apply Jhonty Hub Studio Turnaround Preset
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {PRESET_GALLERY_ASSETS.map((preset, idx) => {
                    const selected =
                      form.showroomViews.front === preset.showroomViews.front;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => handleApplyPreset(idx)}
                        className={`p-2 rounded-lg border text-left transition-colors cursor-pointer ${
                          selected
                            ? 'border-[#171615] dark:border-[#F4F1EC] bg-[#FAF9F7] dark:bg-[#1E1C1A]'
                            : 'border-black/[0.08] dark:border-white/[0.1] hover:border-black/25 dark:hover:border-white/25'
                        }`}
                      >
                        <div className="aspect-[16/10] rounded overflow-hidden bg-[#F4F1EC] dark:bg-[#22201D] mb-1.5">
                          <ResilientImage
                            src={preset.showroomViews.front}
                            alt={preset.label}
                            fallbackTitle={preset.label}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <p className="text-[11px] font-medium truncate">
                          {preset.label.replace(' Studio Set', '')}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-black/[0.08] dark:border-white/[0.1]">
                <div>
                  <label className="block text-xs font-medium text-[#45413C] dark:text-[#C8C2BA] mb-1">
                    Flat-Lay Product Image URL
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={500}
                    value={form.productImage}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, productImage: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-black/[0.14] dark:border-white/[0.16] bg-white dark:bg-[#1A1917]"
                  />
                </div>
                {(['front', 'right', 'back', 'left'] as const).map((angle) => (
                  <div key={angle}>
                    <label className="block text-xs font-medium text-[#45413C] dark:text-[#C8C2BA] mb-1 capitalize">
                      Showroom {angle} View URL
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={500}
                      value={form.showroomViews[angle]}
                      onChange={(e) => {
                        const val = e.target.value;
                        setForm((prev) => ({
                          ...prev,
                          showroomImage:
                            angle === 'front' ? val : prev.showroomImage,
                          showroomViews: {
                            ...prev.showroomViews,
                            [angle]: val,
                          },
                        }));
                      }}
                      className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-black/[0.14] dark:border-white/[0.16] bg-white dark:bg-[#1A1917]"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'specs' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {(
                  [
                    ['fabric', 'Fabric Composition'],
                    ['weight', 'Fabric Weight'],
                    ['origin', 'Mill & Origin'],
                    ['fit', 'Fit Profile'],
                    ['modelNote', 'Model Reference'],
                    ['care', 'Care Instructions'],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-[#45413C] dark:text-[#C8C2BA] mb-1">
                      {label}
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={160}
                      value={form.specs[key]}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          specs: { ...prev.specs, [key]: e.target.value },
                        }))
                      }
                      className="w-full px-3 py-2 text-xs rounded-lg border border-black/[0.14] dark:border-white/[0.16] bg-white dark:bg-[#1A1917]"
                    />
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-black/[0.08] dark:border-white/[0.1]">
                <p className="text-xs font-medium text-[#45413C] dark:text-[#C8C2BA] mb-2.5">
                  Size Guide Measurements (cm)
                </p>
                <div className="overflow-x-auto border border-black/[0.08] dark:border-white/[0.1] rounded-lg">
                  <table className="w-full text-xs">
                    <thead className="bg-[#FAF9F7] dark:bg-[#191816] text-[#6D665E] dark:text-[#9E978F]">
                      <tr>
                        <th className="py-2 px-3 text-left font-medium">Size</th>
                        <th className="py-2 px-2 text-right font-medium">Chest</th>
                        <th className="py-2 px-2 text-right font-medium">Length</th>
                        <th className="py-2 px-2 text-right font-medium">Shoulder</th>
                        <th className="py-2 px-2 text-right font-medium">Sleeve</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/[0.06] dark:divide-white/[0.08]">
                      {SIZES.map((sz) => (
                        <tr key={sz}>
                          <td className="py-1.5 px-3 font-medium">{sz}</td>
                          {(['chest', 'length', 'shoulder', 'sleeve'] as const).map(
                            (dim) => (
                              <td key={dim} className="py-1.5 px-2 text-right">
                                <input
                                  type="number"
                                  step="0.5"
                                  value={form.measurements[sz][dim]}
                                  onChange={(e) =>
                                    setForm((prev) => ({
                                      ...prev,
                                      measurements: {
                                        ...prev.measurements,
                                        [sz]: {
                                          ...prev.measurements[sz],
                                          [dim]: Number(e.target.value) || 0,
                                        },
                                      },
                                    }))
                                  }
                                  className="w-16 text-right px-1.5 py-1 font-mono tabular-nums rounded border border-black/[0.12] dark:border-white/[0.15] bg-white dark:bg-[#141312]"
                                />
                              </td>
                            ),
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-black/[0.08] dark:border-white/[0.1] flex items-center justify-end gap-3 bg-[#FAF9F7] dark:bg-[#191816]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-lg border border-black/[0.14] dark:border-white/[0.16] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 text-xs font-medium rounded-lg bg-[#171615] dark:bg-[#F4F1EC] text-white dark:text-[#171615] hover:opacity-90 disabled:opacity-50 cursor-pointer"
          >
            {saving
              ? 'Saving...'
              : isNew
                ? 'Create Garment'
                : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
