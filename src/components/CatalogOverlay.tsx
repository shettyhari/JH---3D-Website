import { useMemo, useState } from 'react';
import { ArrowLeft, Eye, Heart, Plus } from 'lucide-react';
import { formatPrice, SIZES } from '../data/products';
import { CurrencyCode, NavSection, Product, Size } from '../types';
import { QuickViewModal } from './QuickViewModal';
import { ResilientImage } from './ResilientImage';

interface CatalogOverlayProps {
  section: Exclude<NavSection, 'showroom' | 'admin'>;
  products: Product[];
  currency: CurrencyCode;
  wishlistIds: string[];
  onToggleWishlist: (productId: string) => void;
  onTryInShowroom: (productId: string) => void;
  onAddToBag: (productId: string, size: Size) => void;
  onReturnShowroom: () => void;
}

const SECTION_META: Record<
  Exclude<NavSection, 'showroom' | 'admin'>,
  { title: string; subtitle: string }
> = {
  'shop-all': {
    title: 'The Permanent Collection',
    subtitle:
      'Architectural essentials engineered in European mills for daily rotation.',
  },
  'new-arrivals': {
    title: 'New Arrivals',
    subtitle:
      'Transitional weights in Belgian flax, yarn-dyed cotton, and Italian technical nylon.',
  },
  bestsellers: {
    title: 'Bestsellers',
    subtitle:
      'Our most-requested silhouettes, refined over seasons of wear testing.',
  },
  lookbook: {
    title: 'Autumn / Studio Lookbook',
    subtitle:
      'Captured inside our flagship travertine showroom. Select any frame to enter live try-on.',
  },
};

export function CatalogOverlay({
  section,
  products,
  currency,
  wishlistIds,
  onToggleWishlist,
  onTryInShowroom,
  onAddToBag,
  onReturnShowroom,
}: CatalogOverlayProps) {
  const [categoryTab, setCategoryTab] = useState<'All' | 'Tops' | 'Outerwear'>(
    'All',
  );
  const [cardSizes, setCardSizes] = useState<Record<string, Size>>({});
  const [quickViewProductId, setQuickViewProductId] = useState<string | null>(
    null,
  );

  const quickViewProduct = useMemo(
    () => products.find((p) => p.id === quickViewProductId) ?? null,
    [products, quickViewProductId],
  );

  const visibleProducts = useMemo(() => {
    let list = products;
    if (section === 'new-arrivals') {
      list = list.filter((p) => p.isNewArrival);
    } else if (section === 'bestsellers') {
      list = list.filter((p) => p.isBestseller);
    }
    if (categoryTab !== 'All') {
      list = list.filter((p) => p.category === categoryTab);
    }
    return list;
  }, [products, section, categoryTab]);

  const meta = SECTION_META[section];

  return (
    <main className="min-h-[calc(100vh-84px)] bg-[#FAF9F7] dark:bg-[#0E0D0C] px-4 sm:px-6 lg:px-10 py-10 transition-colors duration-200">
      <div className="max-w-[1280px] mx-auto">
        {/* Top bar inside collection view */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-black/[0.08] dark:border-white/[0.1]">
          <div>
            <button
              type="button"
              onClick={onReturnShowroom}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#59534C] dark:text-[#A8A199] hover:text-[#171615] dark:hover:text-[#F4F1EC] mb-3 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Interactive Showroom</span>
            </button>
            <h1 className="font-editorial text-4xl sm:text-5xl font-medium tracking-tight text-[#171615] dark:text-[#F4F1EC] text-balance">
              {meta.title}
            </h1>
            <p className="text-sm text-[#59534C] dark:text-[#A8A199] mt-2 max-w-xl leading-relaxed">
              {meta.subtitle}
            </p>
          </div>

          {section !== 'lookbook' && (
            <div className="inline-flex items-center gap-1 p-1 bg-black/[0.05] dark:bg-white/[0.07] rounded-lg self-start md:self-auto">
              {(['All', 'Tops', 'Outerwear'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryTab(cat)}
                  className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    categoryTab === cat
                      ? 'bg-white dark:bg-[#23211E] text-[#171615] dark:text-[#F4F1EC] shadow-sm'
                      : 'text-[#59534C] dark:text-[#A8A199] hover:text-[#171615] dark:hover:text-[#F4F1EC]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Lookbook Editorial Layout vs 3-Column Product Grid */}
        {section === 'lookbook' ? (
          <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-8">
            {products.map((product, index) => (
              <article
                key={product.id}
                className="group bg-white dark:bg-[#161513] rounded-xl overflow-hidden border border-black/[0.06] dark:border-white/[0.08] flex flex-col"
              >
                <div className="relative aspect-[16/10] bg-[#E8DFD3] dark:bg-[#1E1C1A] overflow-hidden">
                  <ResilientImage
                    src={product.showroomImage}
                    alt={`Look 0${index + 1} — ${product.name}`}
                    fallbackTitle={product.name}
                    className="w-full h-full object-cover object-[center_22%] transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                  <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent flex items-end justify-between p-5">
                    <div className="text-white">
                      <p className="text-[11px] tracking-[0.14em] uppercase opacity-80">
                        Look 0{index + 1} · {product.category}
                      </p>
                      <h2 className="font-editorial text-2xl font-medium">
                        {product.name}
                      </h2>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setQuickViewProductId(product.id)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-black/45 hover:bg-black/65 backdrop-blur-sm border border-white/25 text-white text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Quick View</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onTryInShowroom(product.id)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white text-[#171615] text-xs font-medium hover:bg-[#FAF9F7] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <span>Try On</span>
                      </button>
                    </div>
                  </div>
                </div>
                <div className="p-5 flex items-center justify-between gap-4">
                  <p className="text-xs text-[#59534C] dark:text-[#A8A199] leading-relaxed">
                    {product.tagline}
                  </p>
                  <span className="text-sm font-medium tabular-nums text-[#171615] dark:text-[#F4F1EC] shrink-0">
                    {formatPrice(product.priceUsd, currency)}
                  </span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-7 gap-y-10">
            {visibleProducts.map((product) => {
              const chosenSize = cardSizes[product.id] ?? 'M';
              const saved = wishlistIds.includes(product.id);
              return (
                <article key={product.id} className="group flex flex-col">
                  {/* Uniform 3:4 neutral studio image frame */}
                  <div className="relative aspect-[3/4] rounded-xl bg-[#F4F1EC] dark:bg-[#191816] overflow-hidden border border-black/[0.05] dark:border-white/[0.08]">
                    <ResilientImage
                      src={product.productImage}
                      alt={product.name}
                      fallbackTitle={product.name}
                      className="w-full h-full object-contain p-6 transition-transform duration-300 group-hover:-translate-y-1"
                    />

                    <button
                      type="button"
                      onClick={() => onToggleWishlist(product.id)}
                      aria-label={
                        saved
                          ? `Remove ${product.name} from saved`
                          : `Save ${product.name}`
                      }
                      className="absolute top-3.5 right-3.5 w-9 h-9 rounded-full bg-white/85 dark:bg-[#141312]/85 backdrop-blur-sm border border-black/[0.06] dark:border-white/[0.12] flex items-center justify-center text-[#171615] dark:text-[#F4F1EC] hover:bg-white dark:hover:bg-[#1F1D1A] transition-colors cursor-pointer"
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          saved ? 'fill-[#171615] dark:fill-[#F4F1EC]' : ''
                        }`}
                      />
                    </button>

                    {/* Hover quick actions */}
                    <div className="absolute inset-x-3.5 bottom-3.5 flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
                      <button
                        type="button"
                        onClick={() => onTryInShowroom(product.id)}
                        className="flex-1 py-2.5 px-3 rounded-lg bg-white/95 dark:bg-[#141312]/95 backdrop-blur-sm border border-black/[0.08] dark:border-white/[0.14] text-[#171615] dark:text-[#F4F1EC] text-xs font-medium hover:bg-white dark:hover:bg-[#1E1C1A] transition-colors whitespace-nowrap cursor-pointer"
                      >
                        Try in Showroom
                      </button>
                      <button
                        type="button"
                        onClick={() => onAddToBag(product.id, chosenSize)}
                        className="py-2.5 px-3.5 rounded-lg bg-[#171615] dark:bg-[#F4F1EC] hover:bg-[#2C2A27] dark:hover:bg-[#E4DFD8] text-white dark:text-[#171615] text-xs font-medium inline-flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add ({chosenSize})</span>
                      </button>
                    </div>
                  </div>

                  {/* Clean Metadata: Unboxed text with typographic separator */}
                  <div className="pt-4 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] text-[#78716A] dark:text-[#9E978F]">
                        {product.category} · {product.color}
                      </p>
                      <h2 className="text-base font-medium text-[#171615] dark:text-[#F4F1EC] mt-0.5">
                        {product.name}
                      </h2>
                    </div>
                    <p className="text-[15px] font-medium tabular-nums text-[#171615] dark:text-[#F4F1EC] shrink-0">
                      {formatPrice(product.priceUsd, currency)}
                    </p>
                  </div>

                  {/* Inline quick size selector + Quick View */}
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {SIZES.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() =>
                            setCardSizes((prev) => ({
                              ...prev,
                              [product.id]: s,
                            }))
                          }
                          className={`w-7 h-7 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                            chosenSize === s
                              ? 'bg-[#171615] dark:bg-[#F4F1EC] text-white dark:text-[#171615]'
                              : 'bg-black/[0.05] dark:bg-white/[0.08] text-[#45413C] dark:text-[#C4BDB4] hover:bg-black/[0.1] dark:hover:bg-white/[0.15]'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => setQuickViewProductId(product.id)}
                      className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-md border border-black/[0.1] dark:border-white/[0.14] bg-white dark:bg-[#191816] hover:bg-[#171615] dark:hover:bg-[#F4F1EC] hover:text-white dark:hover:text-[#171615] hover:border-[#171615] dark:hover:border-[#F4F1EC] text-[11px] font-medium text-[#171615] dark:text-[#F4F1EC] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 stroke-[1.7]" />
                      <span>Quick View</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <QuickViewModal
        product={quickViewProduct}
        currency={currency}
        selectedSize={
          quickViewProduct ? (cardSizes[quickViewProduct.id] ?? 'M') : 'M'
        }
        isSaved={
          quickViewProduct ? wishlistIds.includes(quickViewProduct.id) : false
        }
        onSelectSize={(size) => {
          if (!quickViewProduct) return;
          setCardSizes((prev) => ({ ...prev, [quickViewProduct.id]: size }));
        }}
        onToggleWishlist={onToggleWishlist}
        onAddToBag={onAddToBag}
        onTryInShowroom={onTryInShowroom}
        onClose={() => setQuickViewProductId(null)}
      />
    </main>
  );
}
