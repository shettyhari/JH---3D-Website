import { ChangeEvent, DragEvent, useEffect, useState } from 'react';
import { Copy, Film, ImagePlus, Trash2, Upload, X } from 'lucide-react';
import { PRESET_GALLERY_ASSETS, SIZES } from '../../data/products';
import { sanitizeSku, slugifyId } from '../../services/storeService';
import {
  deleteShowroomVideo,
  getShowroomVideoBlob,
  saveShowroomVideo,
} from '../../services/videoStore';
import { Product, ProductStatus, Size } from '../../types';
import { ResilientImage } from '../ResilientImage';

async function compressImageFile(file: File, maxDimension = 1800): Promise<string> {
  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });

  // Preserve SVGs as-is
  if (file.type === 'image/svg+xml') {
    return rawDataUrl;
  }

  return new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          const ratio = Math.min(maxDimension / width, maxDimension / height);
          width = Math.max(1, Math.round(width * ratio));
          height = Math.max(1, Math.round(height * ratio));
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(rawDataUrl);
          return;
        }
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        // Subtle studio backdrop for transparent PNGs when converting to JPEG
        ctx.fillStyle = '#F6EDE0';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.92));
      } catch {
        resolve(rawDataUrl);
      }
    };
    img.onerror = () => resolve(rawDataUrl);
    img.src = rawDataUrl;
  });
}

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
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [syncAnglesOnQuickUpload, setSyncAnglesOnQuickUpload] = useState(true);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isNew = !editingProduct;

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setActiveTab('details');
    setSyncAnglesOnQuickUpload(!editingProduct);
    if (editingProduct) {
      setForm(JSON.parse(JSON.stringify(editingProduct)) as Product);
    } else {
      setForm(buildBlankProduct());
    }
  }, [isOpen, editingProduct]);

  useEffect(() => {
    if (!isOpen) return;
    let objectUrl: string | null = null;
    let cancelled = false;

    if (form.showroomVideoId) {
      void getShowroomVideoBlob(form.showroomVideoId).then((blob) => {
        if (cancelled) return;
        if (blob) {
          objectUrl = URL.createObjectURL(blob);
          setVideoPreviewUrl(objectUrl);
        } else {
          setVideoPreviewUrl(form.showroomVideoUrl || null);
        }
      });
    } else if (form.showroomVideoUrl) {
      setVideoPreviewUrl(form.showroomVideoUrl);
    } else {
      setVideoPreviewUrl(null);
    }

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [isOpen, form.showroomVideoId, form.showroomVideoUrl]);

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

  const handleUploadSingleSlot = async (
    slot:
      | 'productImage'
      | 'front'
      | 'frontRight'
      | 'right'
      | 'backRight'
      | 'back'
      | 'backLeft'
      | 'left'
      | 'frontLeft',
    file: File | undefined,
  ) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (JPG, PNG, or WebP).');
      return;
    }
    setError(null);
    setUploadingPhoto(true);
    try {
      const dataUrl = await compressImageFile(file);
      setForm((prev) => {
        if (slot === 'productImage') {
          return { ...prev, productImage: dataUrl };
        }
        return {
          ...prev,
          showroomImage: slot === 'front' ? dataUrl : prev.showroomImage,
          showroomViews: {
            ...prev.showroomViews,
            [slot]: dataUrl,
          },
        };
      });
    } catch {
      setError('Could not process that photo. Try a different image file.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleUpload360Video = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      setError('Please choose a valid video file (MP4, WebM, or MOV).');
      return;
    }
    setError(null);
    setUploadingVideo(true);
    try {
      const videoId = await saveShowroomVideo(file);
      setForm((prev) => ({
        ...prev,
        showroomVideoId: videoId,
      }));
    } catch {
      setError('Could not store that video locally. Try a smaller MP4/WebM clip.');
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleRemove360Video = async () => {
    if (form.showroomVideoId) {
      await deleteShowroomVideo(form.showroomVideoId);
    }
    setForm((prev) => ({
      ...prev,
      showroomVideoId: undefined,
      showroomVideoUrl: undefined,
    }));
    setVideoPreviewUrl(null);
  };

  const handleQuickPhotosUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const imageFiles = Array.from(fileList)
      .filter((f) => f.type.startsWith('image/'))
      .slice(0, 5);

    if (imageFiles.length === 0) {
      setError('Please choose image files (JPG, PNG, or WebP).');
      return;
    }

    setError(null);
    setUploadingPhoto(true);
    try {
      const encoded = await Promise.all(
        imageFiles.map((f) => compressImageFile(f)),
      );

      setForm((prev) => {
        if (encoded.length === 1) {
          const single = encoded[0];
          if (syncAnglesOnQuickUpload) {
            return {
              ...prev,
              productImage: single,
              showroomImage: single,
              showroomViews: {
                front: single,
                right: single,
                back: single,
                left: single,
              },
            };
          }
          return {
            ...prev,
            productImage: single,
          };
        }

        if (encoded.length >= 5) {
          return {
            ...prev,
            productImage: encoded[0],
            showroomImage: encoded[1],
            showroomViews: {
              front: encoded[1],
              right: encoded[2],
              back: encoded[3],
              left: encoded[4],
            },
          };
        }

        // 2–4 photos: 1st is card + front, remaining fill right/back/left
        const front = encoded[0];
        const right = encoded[1] ?? front;
        const back = encoded[2] ?? front;
        const left = encoded[3] ?? right;
        return {
          ...prev,
          productImage: front,
          showroomImage: front,
          showroomViews: { front, right, back, left },
        };
      });
    } catch {
      setError('Could not process uploaded photos. Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDropPhotos = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
    void handleQuickPhotosUpload(e.dataTransfer.files);
  };

  const handleCopyFrontToAll = () => {
    const front = form.showroomViews.front || form.productImage;
    setForm((prev) => ({
      ...prev,
      showroomImage: front,
      showroomViews: {
        front,
        right: front,
        back: front,
        left: front,
      },
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
        className="fixed inset-0 bg-[#1A0E07]/52 backdrop-blur-[2px]"
      />
      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-[640px] h-full bg-[#FFFBF4] dark:bg-[#1B110B] text-[#2A1810] dark:text-[#F7EFE2] border-l border-[#C6922E]/30 dark:border-[#D4A243]/28 flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#3B2314]/[0.12] dark:border-[#D4A243]/[0.18] flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold tracking-tight">
              {isNew ? 'Add New Garment' : `Edit ${editingProduct.name}`}
            </h2>
            <p className="text-xs text-[#7D5B3F] dark:text-[#B99A74] mt-0.5">
              {isNew
                ? 'Publishes directly to the Jhonty Hub catalog and inventory ledger.'
                : `SKU ${form.sku} · ID ${form.id}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close product editor"
            className="p-1.5 text-[#7D5B3F] dark:text-[#A98C6D] hover:text-[#2A1810] dark:hover:text-[#F7EFE2] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sub-tabs */}
        <div className="px-6 pt-3 border-b border-[#3B2314]/[0.12] dark:border-[#D4A243]/[0.18] flex items-center gap-6 text-xs font-medium">
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
                  ? 'border-[#B45309] dark:border-[#E5B54F] text-[#9A4A0A] dark:text-[#E5B54F]'
                  : 'border-transparent text-[#7D5B3F] dark:text-[#A98C6D] hover:text-[#2A1810] dark:hover:text-[#F7EFE2]'
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
              {/* Quick Product Photo Upload Card */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingOver(true);
                }}
                onDragLeave={() => setIsDraggingOver(false)}
                onDrop={handleDropPhotos}
                className={`p-4 rounded-xl border transition-colors ${
                  isDraggingOver
                    ? 'border-[#B45309] dark:border-[#E5B54F] bg-[#EFE1C9] dark:bg-[#2B1B11]'
                    : 'border-[#C6922E]/30 dark:border-[#D4A243]/25 bg-[#F6EDE0] dark:bg-[#23160E]'
                }`}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="w-16 h-20 rounded-lg overflow-hidden bg-[#FFFBF4] dark:bg-[#1B110B] border border-[#C6922E]/25 dark:border-[#D4A243]/25">
                      <ResilientImage
                        src={form.productImage}
                        alt={form.name || 'Product photo preview'}
                        fallbackTitle="Photo"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="w-16 h-20 rounded-lg overflow-hidden bg-[#FFFBF4] dark:bg-[#1B110B] border border-[#C6922E]/25 dark:border-[#D4A243]/25">
                      <ResilientImage
                        src={form.showroomViews.front}
                        alt={form.name || 'Showroom preview'}
                        fallbackTitle="360°"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold text-[#2A1810] dark:text-[#F7EFE2]">
                          Product Photos
                        </p>
                        <p className="text-[11px] text-[#7D5B3F] dark:text-[#B99A74]">
                          Upload 1 photo or select up to 5 photos (card + 360° views), or drag &amp; drop here.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#9A4A0A] to-[#C6922E] dark:from-[#D49B35] dark:to-[#E5B54F] text-[#FFFDF9] dark:text-[#1B1009] text-xs font-semibold hover:opacity-95 transition-opacity cursor-pointer">
                        <Upload className="w-3.5 h-3.5" />
                        <span>
                          {uploadingPhoto ? 'Processing...' : 'Upload Photos'}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          disabled={uploadingPhoto}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => {
                            void handleQuickPhotosUpload(e.target.files);
                            e.target.value = '';
                          }}
                          className="sr-only"
                        />
                      </label>

                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#C6922E]/45 dark:border-[#D4A243]/35 bg-[#FFFBF4] dark:bg-[#1B110B] text-xs font-medium hover:bg-[#EFE1C9] dark:hover:bg-[#2E1D12] cursor-pointer">
                        <Film className="w-3.5 h-3.5 text-[#B45309] dark:text-[#E5B54F]" />
                        <span>
                          {uploadingVideo
                            ? 'Saving Video...'
                            : videoPreviewUrl
                              ? '360° Video Attached'
                              : 'Add 360° Video'}
                        </span>
                        <input
                          type="file"
                          accept="video/mp4,video/webm,video/quicktime,video/*"
                          disabled={uploadingVideo}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => {
                            void handleUpload360Video(e.target.files?.[0]);
                            e.target.value = '';
                          }}
                          className="sr-only"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => setActiveTab('media')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#3B2314]/22 dark:border-[#D4A243]/30 text-xs font-medium hover:bg-[#3B2314]/[0.06] dark:hover:bg-[#D4A243]/12 cursor-pointer"
                      >
                        <ImagePlus className="w-3.5 h-3.5 text-[#B45309] dark:text-[#E5B54F]" />
                        <span>360° Angles &amp; Presets</span>
                      </button>
                    </div>

                    <label className="inline-flex items-center gap-1.5 text-[11px] text-[#5E402A] dark:text-[#D4BEA1] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={syncAnglesOnQuickUpload}
                        onChange={(e) =>
                          setSyncAnglesOnQuickUpload(e.target.checked)
                        }
                        className="w-3.5 h-3.5 accent-[#B45309] dark:accent-[#E5B54F]"
                      />
                      <span>Apply single uploaded photo to all 360° showroom views</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#5E402A] dark:text-[#D4BEA1] mb-1.5">
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
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#7D5B3F]/30 dark:border-[#D4A243]/28 bg-[#FFFBF4] dark:bg-[#24170F] focus:outline-none focus:border-[#B45309] dark:focus:border-[#E5B54F]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#5E402A] dark:text-[#D4BEA1] mb-1.5">
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
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-[#7D5B3F]/30 dark:border-[#D4A243]/28 bg-[#FFFBF4] dark:bg-[#24170F] focus:outline-none focus:border-[#B45309] dark:focus:border-[#E5B54F]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#5E402A] dark:text-[#D4BEA1] mb-1.5">
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
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#7D5B3F]/30 dark:border-[#D4A243]/28 bg-[#FFFBF4] dark:bg-[#24170F]"
                  >
                    <option value="Tops">Tops</option>
                    <option value="Outerwear">Outerwear</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#5E402A] dark:text-[#D4BEA1] mb-1.5">
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
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#7D5B3F]/30 dark:border-[#D4A243]/28 bg-[#FFFBF4] dark:bg-[#24170F]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#5E402A] dark:text-[#D4BEA1] mb-1.5">
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
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#7D5B3F]/30 dark:border-[#D4A243]/28 bg-[#FFFBF4] dark:bg-[#24170F]"
                  >
                    <option value="active">Active (Live)</option>
                    <option value="draft">Draft (Hidden)</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              {/* Pricing & Margin */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-[#F6EDE0] dark:bg-[#23160E] border border-[#C6922E]/22 dark:border-[#D4A243]/22">
                <div>
                  <label className="block text-xs font-medium text-[#5E402A] dark:text-[#D4BEA1] mb-1">
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
                    className="w-full px-2.5 py-1.5 text-sm font-mono tabular-nums rounded-md border border-[#7D5B3F]/30 dark:border-[#D4A243]/28 bg-[#FFFBF4] dark:bg-[#1B110B]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#5E402A] dark:text-[#D4BEA1] mb-1">
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
                    className="w-full px-2.5 py-1.5 text-sm font-mono tabular-nums rounded-md border border-[#7D5B3F]/30 dark:border-[#D4A243]/28 bg-[#FFFBF4] dark:bg-[#1B110B]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#5E402A] dark:text-[#D4BEA1] mb-1">
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
                    className="w-full px-2.5 py-1.5 text-sm font-mono tabular-nums rounded-md border border-[#7D5B3F]/30 dark:border-[#D4A243]/28 bg-[#FFFBF4] dark:bg-[#1B110B]"
                  />
                </div>
                <div className="flex flex-col justify-center">
                  <span className="text-xs text-[#7D5B3F] dark:text-[#B99A74]">
                    Gross Margin
                  </span>
                  <span
                    className={`text-lg font-semibold font-mono tabular-nums mt-0.5 ${
                      grossMarginPct >= 50
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-[#B45309] dark:text-amber-400'
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
                    className="w-4 h-4 accent-[#B45309] dark:accent-[#E5B54F]"
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
                    className="w-4 h-4 accent-[#B45309] dark:accent-[#E5B54F]"
                  />
                  <span>Feature in Bestsellers</span>
                </label>
              </div>

              {/* Per-Size Inventory */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-[#5E402A] dark:text-[#D4BEA1]">
                  Per-Size Inventory Allocation (Units)
                </p>
                <div className="grid grid-cols-5 gap-2.5">
                  {SIZES.map((sz: Size) => (
                    <div
                      key={sz}
                      className="p-2.5 rounded-lg border border-[#3B2314]/[0.12] dark:border-[#D4A243]/[0.2] bg-[#F6EDE0] dark:bg-[#23160E]"
                    >
                      <label className="block text-[11px] font-medium text-[#7D5B3F] dark:text-[#B99A74] mb-1">
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
                        className="w-full px-2 py-1 text-sm font-mono tabular-nums rounded border border-[#7D5B3F]/30 dark:border-[#D4A243]/28 bg-[#FFFBF4] dark:bg-[#1B110B]"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Copy */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-[#5E402A] dark:text-[#D4BEA1] mb-1.5">
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
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#7D5B3F]/30 dark:border-[#D4A243]/28 bg-[#FFFBF4] dark:bg-[#24170F]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#5E402A] dark:text-[#D4BEA1] mb-1.5">
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
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#7D5B3F]/30 dark:border-[#D4A243]/28 bg-[#FFFBF4] dark:bg-[#24170F]"
                  />
                </div>
              </div>
            </>
          )}

          {activeTab === 'media' && (
            <div className="space-y-5">
              {/* Batch Upload & Quick Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-[#F6EDE0] dark:bg-[#23160E] border border-[#C6922E]/25 dark:border-[#D4A243]/22">
                <div>
                  <p className="text-xs font-semibold">Upload Custom Product Photos</p>
                  <p className="text-[11px] text-[#7D5B3F] dark:text-[#B99A74]">
                    Upload individual photos below or batch-select up to 5 images at once.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#9A4A0A] to-[#C6922E] dark:from-[#D49B35] dark:to-[#E5B54F] text-[#FFFDF9] dark:text-[#1B1009] text-xs font-semibold hover:opacity-95 cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingPhoto ? 'Processing...' : 'Batch Upload'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      disabled={uploadingPhoto}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        void handleQuickPhotosUpload(e.target.files);
                        e.target.value = '';
                      }}
                      className="sr-only"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handleCopyFrontToAll}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#3B2314]/22 dark:border-[#D4A243]/30 text-xs font-medium hover:bg-[#3B2314]/[0.06] dark:hover:bg-[#D4A243]/12 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5 text-[#B45309] dark:text-[#E5B54F]" />
                    <span>Copy Front to All</span>
                  </button>
                </div>
              </div>

              {/* Real-Human 360° Turnaround Video Uploader */}
              <div className="p-4 rounded-xl bg-[#F6EDE0] dark:bg-[#23160E] border border-[#C6922E]/35 dark:border-[#E5B54F]/30 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold flex items-center gap-1.5">
                      <Film className="w-3.5 h-3.5 text-[#B45309] dark:text-[#E5B54F]" />
                      <span>360° Real-Human Spin Video (Smoothest Rotation)</span>
                    </p>
                    <p className="text-[11px] text-[#7D5B3F] dark:text-[#B99A74] mt-0.5">
                      Upload a short 5–10s MP4/WebM video of a real model turning 360°. Shoppers can drag frame-by-frame to rotate smoothly.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#3B2314] dark:bg-[#E0AD42] text-[#FFF8EC] dark:text-[#1B1009] text-xs font-semibold hover:opacity-92 cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{uploadingVideo ? 'Saving...' : 'Upload Video'}</span>
                      <input
                        type="file"
                        accept="video/mp4,video/webm,video/quicktime,video/*"
                        disabled={uploadingVideo}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => {
                          void handleUpload360Video(e.target.files?.[0]);
                          e.target.value = '';
                        }}
                        className="sr-only"
                      />
                    </label>
                    {videoPreviewUrl && (
                      <button
                        type="button"
                        onClick={() => void handleRemove360Video()}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-500/30 text-red-700 dark:text-red-300 text-xs font-medium hover:bg-red-500/10 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>
                </div>

                {videoPreviewUrl && (
                  <div className="rounded-lg overflow-hidden bg-black/90 border border-[#C6922E]/30 max-h-[200px] flex justify-center">
                    <video
                      src={videoPreviewUrl}
                      controls
                      muted
                      loop
                      playsInline
                      className="max-h-[200px] w-auto object-contain"
                    />
                  </div>
                )}

                <input
                  type="text"
                  placeholder="Or paste direct 360° video URL (.mp4 / .webm)..."
                  value={form.showroomVideoUrl || ''}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      showroomVideoUrl: e.target.value || undefined,
                    }))
                  }
                  className="w-full px-3 py-1.5 text-[11px] font-mono rounded-lg border border-[#7D5B3F]/30 dark:border-[#D4A243]/28 bg-[#FFFBF4] dark:bg-[#1B110B]"
                />
              </div>

              {/* Per-Slot Photo Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {(
                  [
                    {
                      slot: 'productImage' as const,
                      label: 'Catalog / Flat-Lay Photo',
                      value: form.productImage,
                    },
                    {
                      slot: 'front' as const,
                      label: 'Showroom Front (0°)',
                      value: form.showroomViews.front,
                    },
                    {
                      slot: 'right' as const,
                      label: 'Showroom Right (90°)',
                      value: form.showroomViews.right,
                    },
                    {
                      slot: 'back' as const,
                      label: 'Showroom Back (180°)',
                      value: form.showroomViews.back,
                    },
                    {
                      slot: 'left' as const,
                      label: 'Showroom Left (270°)',
                      value: form.showroomViews.left,
                    },
                  ] as const
                ).map(({ slot, label, value }) => {
                  const isUploadedDataUrl = value.startsWith('data:image/');
                  return (
                    <div
                      key={slot}
                      className="p-3 rounded-xl border border-[#3B2314]/[0.12] dark:border-[#D4A243]/[0.2] bg-[#FFFBF4] dark:bg-[#22150D] space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-[#2A1810] dark:text-[#F7EFE2]">
                          {label}
                        </span>
                        <label className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-[#C6922E]/40 dark:border-[#D4A243]/35 text-[11px] font-medium hover:bg-[#C6922E]/12 cursor-pointer shrink-0">
                          <Upload className="w-3 h-3 text-[#B45309] dark:text-[#E5B54F]" />
                          <span>Upload</span>
                          <input
                            type="file"
                            accept="image/*"
                            disabled={uploadingPhoto}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => {
                              void handleUploadSingleSlot(
                                slot,
                                e.target.files?.[0],
                              );
                              e.target.value = '';
                            }}
                            className="sr-only"
                          />
                        </label>
                      </div>

                      <div className="aspect-[16/10] rounded-lg overflow-hidden bg-[#F3E7D3] dark:bg-[#2B1B11] border border-[#C6922E]/20">
                        <ResilientImage
                          src={value}
                          alt={label}
                          fallbackTitle={label}
                          className="w-full h-full object-contain"
                        />
                      </div>

                      {isUploadedDataUrl ? (
                        <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-[#F6EDE0] dark:bg-[#1B110B] border border-[#C6922E]/25 text-[11px]">
                          <span className="text-emerald-700 dark:text-emerald-400 font-medium truncate">
                            Uploaded photo attached
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const fallback =
                                slot === 'productImage'
                                  ? PRESET_GALLERY_ASSETS[0].productImage
                                  : PRESET_GALLERY_ASSETS[0].showroomViews[slot];
                              setForm((prev) =>
                                slot === 'productImage'
                                  ? { ...prev, productImage: fallback }
                                  : {
                                      ...prev,
                                      showroomImage:
                                        slot === 'front'
                                          ? fallback
                                          : prev.showroomImage,
                                      showroomViews: {
                                        ...prev.showroomViews,
                                        [slot]: fallback,
                                      },
                                    },
                              );
                            }}
                            className="text-[#9A4A0A] dark:text-[#E5B54F] underline shrink-0 cursor-pointer"
                          >
                            Reset
                          </button>
                        </div>
                      ) : (
                        <input
                          type="text"
                          required
                          placeholder="Or paste image URL..."
                          value={value}
                          onChange={(e) => {
                            const val = e.target.value;
                            setForm((prev) =>
                              slot === 'productImage'
                                ? { ...prev, productImage: val }
                                : {
                                    ...prev,
                                    showroomImage:
                                      slot === 'front'
                                        ? val
                                        : prev.showroomImage,
                                    showroomViews: {
                                      ...prev.showroomViews,
                                      [slot]: val,
                                    },
                                  },
                            );
                          }}
                          className="w-full px-2.5 py-1.5 text-[11px] font-mono rounded-lg border border-[#7D5B3F]/30 dark:border-[#D4A243]/28 bg-[#FFFBF4] dark:bg-[#1B110B]"
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Optional 45° Diagonal Angles for 8-Angle Ultra-Smooth Photo Turntable */}
              <div className="pt-3 border-t border-[#3B2314]/[0.12] dark:border-[#D4A243]/[0.18] space-y-2.5">
                <div>
                  <p className="text-xs font-semibold text-[#2A1810] dark:text-[#F7EFE2]">
                    Optional 45° Diagonal Angles (8-Angle Smooth Turnaround)
                  </p>
                  <p className="text-[11px] text-[#7D5B3F] dark:text-[#B99A74]">
                    Add diagonal real-human photos to double rotation smoothness without needing video.
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {(
                    [
                      { slot: 'frontRight' as const, label: 'Front-Right (45°)' },
                      { slot: 'backRight' as const, label: 'Back-Right (135°)' },
                      { slot: 'backLeft' as const, label: 'Back-Left (225°)' },
                      { slot: 'frontLeft' as const, label: 'Front-Left (315°)' },
                    ] as const
                  ).map(({ slot, label }) => {
                    const val = form.showroomViews[slot] || '';
                    return (
                      <div
                        key={slot}
                        className="p-2 rounded-xl border border-[#3B2314]/[0.12] dark:border-[#D4A243]/[0.2] bg-[#FFFBF4] dark:bg-[#22150D] space-y-1.5"
                      >
                        <p className="text-[10px] font-medium truncate">{label}</p>
                        <div className="aspect-[3/4] rounded-md overflow-hidden bg-[#F3E7D3] dark:bg-[#2B1B11] flex items-center justify-center">
                          {val ? (
                            <ResilientImage
                              src={val}
                              alt={label}
                              fallbackTitle={label}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-[10px] text-[#8E6C4D]">Optional</span>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-1">
                          <label className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-[#C6922E]/40 text-[10px] font-medium hover:bg-[#C6922E]/12 cursor-pointer">
                            <Upload className="w-2.5 h-2.5 text-[#B45309] dark:text-[#E5B54F]" />
                            <span>{val ? 'Replace' : 'Add'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              disabled={uploadingPhoto}
                              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                void handleUploadSingleSlot(slot, e.target.files?.[0]);
                                e.target.value = '';
                              }}
                              className="sr-only"
                            />
                          </label>
                          {val && (
                            <button
                              type="button"
                              onClick={() =>
                                setForm((prev) => ({
                                  ...prev,
                                  showroomViews: {
                                    ...prev.showroomViews,
                                    [slot]: undefined,
                                  },
                                }))
                              }
                              className="text-[10px] text-[#9A4A0A] dark:text-[#E5B54F] underline cursor-pointer"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Studio Presets */}
              <div className="pt-3 border-t border-[#3B2314]/[0.12] dark:border-[#D4A243]/[0.18]">
                <p className="text-xs font-medium text-[#5E402A] dark:text-[#D4BEA1] mb-2">
                  Or Apply a Jhonty Hub Studio Preset
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
                            ? 'border-[#C6922E] dark:border-[#E5B54F] bg-[#F6EDE0] dark:bg-[#261911]'
                            : 'border-[#3B2314]/[0.12] dark:border-[#D4A243]/[0.18] hover:border-[#C6922E]/60'
                        }`}
                      >
                        <div className="aspect-[16/10] rounded overflow-hidden bg-[#F3E7D3] dark:bg-[#2B1B11] mb-1.5">
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
                    <label className="block text-xs font-medium text-[#5E402A] dark:text-[#D4BEA1] mb-1">
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
                      className="w-full px-3 py-2 text-xs rounded-lg border border-[#7D5B3F]/30 dark:border-[#D4A243]/28 bg-[#FFFBF4] dark:bg-[#24170F]"
                    />
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-[#3B2314]/[0.12] dark:border-[#D4A243]/[0.18]">
                <p className="text-xs font-medium text-[#5E402A] dark:text-[#D4BEA1] mb-2.5">
                  Size Guide Measurements (cm)
                </p>
                <div className="overflow-x-auto border border-[#3B2314]/[0.12] dark:border-[#D4A243]/[0.2] rounded-lg">
                  <table className="w-full text-xs">
                    <thead className="bg-[#F6EDE0] dark:bg-[#23160E] text-[#7D5B3F] dark:text-[#C4A67E]">
                      <tr>
                        <th className="py-2 px-3 text-left font-medium">Size</th>
                        <th className="py-2 px-2 text-right font-medium">Chest</th>
                        <th className="py-2 px-2 text-right font-medium">Length</th>
                        <th className="py-2 px-2 text-right font-medium">Shoulder</th>
                        <th className="py-2 px-2 text-right font-medium">Sleeve</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#3B2314]/[0.08] dark:divide-[#D4A243]/[0.14]">
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
                                  className="w-16 text-right px-1.5 py-1 font-mono tabular-nums rounded border border-[#7D5B3F]/30 dark:border-[#D4A243]/28 bg-[#FFFBF4] dark:bg-[#1B110B]"
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
        <div className="px-6 py-4 border-t border-[#3B2314]/[0.12] dark:border-[#D4A243]/[0.18] flex items-center justify-end gap-3 bg-[#F6EDE0] dark:bg-[#23160E]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-lg border border-[#3B2314]/22 dark:border-[#D4A243]/30 hover:bg-[#3B2314]/[0.06] dark:hover:bg-[#D4A243]/12 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 text-xs font-semibold rounded-lg bg-gradient-to-r from-[#9A4A0A] via-[#B45309] to-[#C6922E] dark:from-[#D49B35] dark:to-[#E5B54F] text-[#FFFDF9] dark:text-[#1B1009] hover:opacity-95 disabled:opacity-50 cursor-pointer"
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
