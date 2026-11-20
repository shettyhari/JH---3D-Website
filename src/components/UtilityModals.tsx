import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Heart, Search, Trash2, X } from 'lucide-react';
import { formatPrice } from '../data/products';
import { CurrencyCode, MemberProfile, Product, Size } from '../types';
import { BrandLogo } from './BrandLogo';
import { ResilientImage } from './ResilientImage';

export type ActiveModal = null | 'search' | 'wishlist' | 'about' | 'auth';

interface UtilityModalsProps {
  activeModal: ActiveModal;
  onClose: () => void;
  products: Product[];
  currency: CurrencyCode;
  wishlistIds: string[];
  member: MemberProfile | null;
  onToggleWishlist: (productId: string) => void;
  onTryInShowroom: (productId: string) => void;
  onAddToBag: (productId: string, size: Size) => void;
  onSignIn: (profile: MemberProfile) => void;
  onSignOut: () => void;
}

export function UtilityModals({
  activeModal,
  onClose,
  products,
  currency,
  wishlistIds,
  member,
  onToggleWishlist,
  onTryInShowroom,
  onAddToBag,
  onSignIn,
  onSignOut,
}: UtilityModalsProps) {
  const [query, setQuery] = useState('');
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.color.toLowerCase().includes(q) ||
        p.specs.fabric.toLowerCase().includes(q),
    );
  }, [products, query]);

  const savedProducts = useMemo(
    () => products.filter((p) => wishlistIds.includes(p.id)),
    [products, wishlistIds],
  );

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail.trim()) return;
    onSignIn({
      name: authName.trim() || authEmail.split('@')[0],
      email: authEmail.trim(),
      tier: 'Studio Member',
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {activeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/45 backdrop-blur-xs"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-[540px] max-h-[85vh] bg-white dark:bg-[#141312] text-[#171615] dark:text-[#F4F1EC] rounded-2xl shadow-2xl border border-black/[0.08] dark:border-white/[0.1] overflow-hidden flex flex-col"
          >
            {/* SEARCH MODAL */}
            {activeModal === 'search' && (
              <>
                <div className="px-5 py-4 border-b border-black/[0.08] dark:border-white/[0.1] flex items-center gap-3">
                  <Search className="w-4 h-4 text-[#6D665E] dark:text-[#9E978F] shrink-0" />
                  <input
                    type="text"
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search garments, fabrics, or colors..."
                    className="flex-1 text-sm text-[#171615] dark:text-[#F4F1EC] placeholder:text-[#8E877F] dark:placeholder:text-[#78716A] focus:outline-none bg-transparent"
                  />
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close search"
                    className="p-1 text-[#6D665E] dark:text-[#9E978F] hover:text-[#171615] dark:hover:text-[#F4F1EC] cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="overflow-y-auto p-4 divide-y divide-black/[0.06] dark:divide-white/[0.08]">
                  {searchResults.length === 0 ? (
                    <p className="py-10 text-center text-sm text-[#6D665E] dark:text-[#9E978F]">
                      No garments match "{query}".
                    </p>
                  ) : (
                    searchResults.map((p) => (
                      <div
                        key={p.id}
                        className="py-3 flex items-center justify-between gap-4"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            onTryInShowroom(p.id);
                            onClose();
                          }}
                          className="flex items-center gap-3.5 text-left min-w-0 flex-1 group cursor-pointer"
                        >
                          <div className="w-12 h-14 rounded-lg bg-[#F4F1EC] dark:bg-[#1E1C1A] overflow-hidden shrink-0">
                            <ResilientImage
                              src={p.productImage}
                              alt={p.name}
                              fallbackTitle={p.name}
                              className="w-full h-full object-contain p-1"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[#171615] dark:text-[#F4F1EC] group-hover:underline truncate">
                              {p.name}
                            </p>
                            <p className="text-xs text-[#6D665E] dark:text-[#9E978F] truncate">
                              {p.category} · {p.color} · {p.specs.weight}
                            </p>
                          </div>
                        </button>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-xs font-medium tabular-nums text-[#171615] dark:text-[#F4F1EC]">
                            {formatPrice(p.priceUsd, currency)}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              onTryInShowroom(p.id);
                              onClose();
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-[#171615] dark:bg-[#F4F1EC] text-white dark:text-[#171615] text-[11px] font-medium hover:bg-[#2C2A27] dark:hover:bg-[#E4DFD8] cursor-pointer"
                          >
                            <span>Try on</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

            {/* WISHLIST MODAL */}
            {activeModal === 'wishlist' && (
              <>
                <div className="px-6 py-4 border-b border-black/[0.08] dark:border-white/[0.1] flex items-center justify-between">
                  <h2 className="text-base font-medium text-[#171615] dark:text-[#F4F1EC]">
                    Saved pieces ({savedProducts.length})
                  </h2>
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close saved pieces"
                    className="p-1 text-[#6D665E] dark:text-[#9E978F] hover:text-[#171615] dark:hover:text-[#F4F1EC] cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="overflow-y-auto p-6">
                  {savedProducts.length === 0 ? (
                    <div className="py-10 text-center flex flex-col items-center">
                      <Heart className="w-7 h-7 stroke-[1.4] text-[#8E877F] mb-3" />
                      <p className="text-sm font-medium text-[#171615] dark:text-[#F4F1EC]">
                        No saved garments yet
                      </p>
                      <p className="text-xs text-[#6D665E] dark:text-[#9E978F] mt-1">
                        Use the heart icon in the showroom toolbar to bookmark favorites.
                      </p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-black/[0.07] dark:divide-white/[0.08]">
                      {savedProducts.map((p) => (
                        <li
                          key={p.id}
                          className="py-3.5 first:pt-0 flex items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-14 h-16 rounded-lg bg-[#F4F1EC] dark:bg-[#1E1C1A] overflow-hidden shrink-0">
                              <ResilientImage
                                src={p.productImage}
                                alt={p.name}
                                fallbackTitle={p.name}
                                className="w-full h-full object-contain p-1"
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-[#171615] dark:text-[#F4F1EC] truncate">
                                {p.name}
                              </p>
                              <p className="text-xs text-[#6D665E] dark:text-[#9E978F] tabular-nums mt-0.5">
                                {formatPrice(p.priceUsd, currency)} · {p.color}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                onTryInShowroom(p.id);
                                onClose();
                              }}
                              className="px-3 py-1.5 rounded-md border border-black/[0.12] dark:border-white/[0.16] text-xs font-medium text-[#171615] dark:text-[#F4F1EC] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] cursor-pointer"
                            >
                              Try on
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onAddToBag(p.id, 'M');
                                onClose();
                              }}
                              className="px-3 py-1.5 rounded-md bg-[#171615] dark:bg-[#F4F1EC] text-white dark:text-[#171615] text-xs font-medium hover:bg-[#2C2A27] dark:hover:bg-[#E4DFD8] cursor-pointer"
                            >
                              Add
                            </button>
                            <button
                              type="button"
                              onClick={() => onToggleWishlist(p.id)}
                              aria-label={`Remove ${p.name} from saved`}
                              className="p-1.5 text-[#78716A] dark:text-[#9E978F] hover:text-[#171615] dark:hover:text-[#F4F1EC] cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}

            {/* ABOUT JHONTY HUB MODAL */}
            {activeModal === 'about' && (
              <>
                <div className="px-6 py-4 border-b border-black/[0.08] dark:border-white/[0.1] flex items-center justify-between">
                  <BrandLogo iconSizeClass="w-7 h-7" textSizeClass="text-xl" />
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close about modal"
                    className="p-1 text-[#6D665E] dark:text-[#9E978F] hover:text-[#171615] dark:hover:text-[#F4F1EC] cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-6 space-y-4 text-sm text-[#45413C] dark:text-[#B5AEA6] leading-relaxed">
                  <h2 className="font-editorial text-3xl font-medium text-[#171615] dark:text-[#F4F1EC] leading-tight">
                    Quiet proportion, built for permanent wardrobes.
                  </h2>
                  <p>
                    Founded between Copenhagen and Porto, Jhonty Hub designs restrained
                    architectural menswear with single-mill traceability. Every jersey,
                    Belgian linen weave, and Italian matte nylon shell is developed
                    exclusively for our permanent collection.
                  </p>
                  <p>
                    Our interactive digital showroom bridges physical studio styling
                    and online precision—letting you evaluate drape, collar proportion,
                    and layering balance in warm gallery light before ordering.
                  </p>
                  <div className="pt-4 border-t border-black/[0.08] dark:border-white/[0.1] grid grid-cols-3 gap-4 text-xs">
                    <div>
                      <p className="text-[#78716A] dark:text-[#9E978F]">Flagship</p>
                      <p className="font-medium text-[#171615] dark:text-[#F4F1EC] mt-0.5">
                        Bredgade 42, Copenhagen
                      </p>
                    </div>
                    <div>
                      <p className="text-[#78716A] dark:text-[#9E978F]">Production</p>
                      <p className="font-medium text-[#171615] dark:text-[#F4F1EC] mt-0.5">
                        Portugal · Italy · France
                      </p>
                    </div>
                    <div>
                      <p className="text-[#78716A] dark:text-[#9E978F]">Delivery</p>
                      <p className="font-medium text-[#171615] dark:text-[#F4F1EC] mt-0.5">
                        Complimentary over $100
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* MEMBER SIGN IN MODAL */}
            {activeModal === 'auth' && (
              <>
                <div className="px-6 py-4 border-b border-black/[0.08] dark:border-white/[0.1] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <BrandLogo showName={false} iconSizeClass="w-7 h-7" />
                    <h2 className="text-base font-medium text-[#171615] dark:text-[#F4F1EC]">
                      {member ? 'Jhonty Hub Membership' : 'Sign in to Jhonty Hub'}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close sign in"
                    className="p-1 text-[#6D665E] dark:text-[#9E978F] hover:text-[#171615] dark:hover:text-[#F4F1EC] cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {member ? (
                  <div className="p-6 space-y-5">
                    <div className="p-4 rounded-xl bg-[#FAF9F7] dark:bg-[#1C1A18] border border-black/[0.07] dark:border-white/[0.08]">
                      <p className="text-xs text-[#6D665E] dark:text-[#9E978F]">
                        {member.tier}
                      </p>
                      <p className="text-lg font-medium text-[#171615] dark:text-[#F4F1EC] mt-0.5">
                        {member.name}
                      </p>
                      <p className="text-xs text-[#59534C] dark:text-[#B5AEA6] mt-0.5">
                        {member.email}
                      </p>
                      <p className="text-xs text-[#171615] dark:text-[#F4F1EC] font-medium mt-3 pt-3 border-t border-black/[0.07] dark:border-white/[0.08]">
                        Complimentary express delivery active on all orders.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onSignOut();
                        onClose();
                      }}
                      className="w-full py-2.5 rounded-lg border border-black/[0.15] dark:border-white/[0.18] text-xs font-medium tracking-wider uppercase text-[#171615] dark:text-[#F4F1EC] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] cursor-pointer"
                    >
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleAuthSubmit} className="p-6 space-y-4">
                    <p className="text-xs text-[#59534C] dark:text-[#B5AEA6] leading-relaxed">
                      Members receive complimentary express delivery on every order
                      with no minimum threshold, plus early access to seasonal releases.
                    </p>
                    <div>
                      <label
                        htmlFor="member-name"
                        className="block text-xs font-medium text-[#3F3B36] dark:text-[#D4CEC7] mb-1.5"
                      >
                        Full name
                      </label>
                      <input
                        id="member-name"
                        type="text"
                        required
                        value={authName}
                        onChange={(e) => setAuthName(e.target.value)}
                        placeholder="Henrik Sorensen"
                        className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-black/[0.15] dark:border-white/[0.16] bg-white dark:bg-[#1C1A18] text-[#171615] dark:text-[#F4F1EC] placeholder:text-[#8E877F] dark:placeholder:text-[#78716A] focus:outline-none focus:border-[#171615] dark:focus:border-[#F4F1EC]"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="member-email"
                        className="block text-xs font-medium text-[#3F3B36] dark:text-[#D4CEC7] mb-1.5"
                      >
                        Email address
                      </label>
                      <input
                        id="member-email"
                        type="email"
                        required
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        placeholder="henrik@jhontyhub.studio"
                        className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-black/[0.15] dark:border-white/[0.16] bg-white dark:bg-[#1C1A18] text-[#171615] dark:text-[#F4F1EC] placeholder:text-[#8E877F] dark:placeholder:text-[#78716A] focus:outline-none focus:border-[#171615] dark:focus:border-[#F4F1EC]"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-3 bg-[#171615] dark:bg-[#F4F1EC] hover:bg-[#2C2A27] dark:hover:bg-[#E4DFD8] text-white dark:text-[#171615] text-xs font-medium tracking-[0.14em] uppercase rounded-lg transition-colors cursor-pointer"
                    >
                      Continue as Member
                    </button>
                  </form>
                )}
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
