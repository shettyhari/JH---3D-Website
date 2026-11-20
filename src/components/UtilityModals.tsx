import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  Heart,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
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
  cadRate?: number;
  freeDeliveryThresholdUsd?: number;
  wishlistIds: string[];
  member: MemberProfile | null;
  onToggleWishlist: (productId: string) => void;
  onTryInShowroom: (productId: string) => void;
  onAddToBag: (productId: string, size: Size) => void;
  onOpenAdmin: () => void;
}

export function UtilityModals({
  activeModal,
  onClose,
  products,
  currency,
  cadRate,
  freeDeliveryThresholdUsd = 8000,
  wishlistIds,
  member,
  onToggleWishlist,
  onTryInShowroom,
  onAddToBag,
  onOpenAdmin,
}: UtilityModalsProps) {
  const [query, setQuery] = useState('');
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const { isAdmin, signIn, signInAsAdmin, signOut } = useAuth();

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
            className="fixed inset-0 bg-[#1A0E07]/52 backdrop-blur-xs"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-[540px] max-h-[85vh] bg-[#FFFBF4] dark:bg-[#1B110B] text-[#2A1810] dark:text-[#F7EFE2] rounded-2xl shadow-2xl border border-[#C6922E]/30 dark:border-[#D4A243]/28 overflow-hidden flex flex-col"
          >
            {/* SEARCH MODAL */}
            {activeModal === 'search' && (
              <>
                <div className="px-5 py-4 border-b border-[#3B2314]/[0.12] dark:border-[#D4A243]/[0.18] flex items-center gap-3">
                  <Search className="w-4 h-4 text-[#B45309] dark:text-[#E5B54F] shrink-0" />
                  <input
                    type="text"
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search garments, fabrics, or colors..."
                    className="flex-1 text-sm text-[#2A1810] dark:text-[#F7EFE2] placeholder:text-[#9C7D5E] dark:placeholder:text-[#8A6E52] focus:outline-none bg-transparent"
                  />
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close search"
                    className="p-1 text-[#7D5B3F] dark:text-[#A98C6D] hover:text-[#2A1810] dark:hover:text-[#F7EFE2] cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="overflow-y-auto p-4 divide-y divide-[#3B2314]/[0.09] dark:divide-[#D4A243]/[0.14]">
                  {searchResults.length === 0 ? (
                    <p className="py-10 text-center text-sm text-[#7D5B3F] dark:text-[#A98C6D]">
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
                          <div className="w-12 h-14 rounded-lg bg-[#F3E7D3] dark:bg-[#261911] border border-[#C6922E]/20 overflow-hidden shrink-0">
                            <ResilientImage
                              src={p.productImage}
                              alt={p.name}
                              fallbackTitle={p.name}
                              className="w-full h-full object-contain p-1"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[#2A1810] dark:text-[#F7EFE2] group-hover:text-[#9A4A0A] dark:group-hover:text-[#E5B54F] transition-colors truncate">
                              {p.name}
                            </p>
                            <p className="text-xs text-[#7D5B3F] dark:text-[#B99A74] truncate">
                              {p.category} · {p.color} · {p.specs.weight}
                            </p>
                          </div>
                        </button>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-xs font-semibold tabular-nums text-[#9A4A0A] dark:text-[#E5B54F]">
                            {formatPrice(p.priceUsd, currency, cadRate)}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              onTryInShowroom(p.id);
                              onClose();
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-[#3B2314] dark:bg-[#E0AD42] text-[#F8E2A8] dark:text-[#1B1009] text-[11px] font-medium hover:bg-[#52311C] dark:hover:bg-[#EBC05E] cursor-pointer"
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
                <div className="px-6 py-4 border-b border-[#3B2314]/[0.12] dark:border-[#D4A243]/[0.18] flex items-center justify-between">
                  <h2 className="text-base font-medium text-[#2A1810] dark:text-[#F7EFE2]">
                    Saved pieces ({savedProducts.length})
                  </h2>
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close saved pieces"
                    className="p-1 text-[#7D5B3F] dark:text-[#A98C6D] hover:text-[#2A1810] dark:hover:text-[#F7EFE2] cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="overflow-y-auto p-6">
                  {savedProducts.length === 0 ? (
                    <div className="py-10 text-center flex flex-col items-center">
                      <Heart className="w-7 h-7 stroke-[1.4] text-[#C6922E] mb-3" />
                      <p className="text-sm font-medium text-[#2A1810] dark:text-[#F7EFE2]">
                        No saved garments yet
                      </p>
                      <p className="text-xs text-[#7D5B3F] dark:text-[#B99A74] mt-1">
                        Use the heart icon in the showroom toolbar to bookmark favorites.
                      </p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-[#3B2314]/[0.09] dark:divide-[#D4A243]/[0.14]">
                      {savedProducts.map((p) => (
                        <li
                          key={p.id}
                          className="py-3.5 first:pt-0 flex items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-14 h-16 rounded-lg bg-[#F3E7D3] dark:bg-[#261911] border border-[#C6922E]/20 overflow-hidden shrink-0">
                              <ResilientImage
                                src={p.productImage}
                                alt={p.name}
                                fallbackTitle={p.name}
                                className="w-full h-full object-contain p-1"
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-[#2A1810] dark:text-[#F7EFE2] truncate">
                                {p.name}
                              </p>
                              <p className="text-xs text-[#9A4A0A] dark:text-[#E5B54F] tabular-nums mt-0.5 font-medium">
                                {formatPrice(p.priceUsd, currency, cadRate)}{' '}
                                <span className="text-[#7D5B3F] dark:text-[#B99A74] font-normal">
                                  · {p.color}
                                </span>
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
                              className="px-3 py-1.5 rounded-md border border-[#3B2314]/20 dark:border-[#D4A243]/30 text-xs font-medium text-[#2A1810] dark:text-[#F7EFE2] hover:bg-[#3B2314]/[0.06] dark:hover:bg-[#D4A243]/12 cursor-pointer"
                            >
                              Try on
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onAddToBag(p.id, 'M');
                                onClose();
                              }}
                              className="px-3 py-1.5 rounded-md bg-gradient-to-r from-[#9A4A0A] to-[#C6922E] dark:from-[#D49B35] dark:to-[#E5B54F] text-[#FFFDF9] dark:text-[#1B1009] text-xs font-semibold hover:opacity-95 cursor-pointer"
                            >
                              Add
                            </button>
                            <button
                              type="button"
                              onClick={() => onToggleWishlist(p.id)}
                              aria-label={`Remove ${p.name} from saved`}
                              className="p-1.5 text-[#7D5B3F] dark:text-[#A98C6D] hover:text-[#9A4A0A] dark:hover:text-[#E5B54F] cursor-pointer"
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
                <div className="px-6 py-4 border-b border-[#3B2314]/[0.12] dark:border-[#D4A243]/[0.18] flex items-center justify-between">
                  <BrandLogo iconSizeClass="w-7 h-7" textSizeClass="text-xl" />
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close about modal"
                    className="p-1 text-[#7D5B3F] dark:text-[#A98C6D] hover:text-[#2A1810] dark:hover:text-[#F7EFE2] cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-6 space-y-4 text-sm text-[#5E402A] dark:text-[#D4BEA1] leading-relaxed">
                  <h2 className="font-editorial text-3xl font-medium text-[#2A1810] dark:text-[#F7EFE2] leading-tight">
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
                  <div className="pt-4 border-t border-[#3B2314]/[0.12] dark:border-[#D4A243]/[0.18] grid grid-cols-3 gap-4 text-xs">
                    <div>
                      <p className="text-[#9A4A0A] dark:text-[#E5B54F] font-medium">Flagship</p>
                      <p className="font-medium text-[#2A1810] dark:text-[#F7EFE2] mt-0.5">
                        Bredgade 42, Copenhagen
                      </p>
                    </div>
                    <div>
                      <p className="text-[#9A4A0A] dark:text-[#E5B54F] font-medium">Production</p>
                      <p className="font-medium text-[#2A1810] dark:text-[#F7EFE2] mt-0.5">
                        Portugal · Italy · France
                      </p>
                    </div>
                    <div>
                      <p className="text-[#9A4A0A] dark:text-[#E5B54F] font-medium">Delivery</p>
                      <p className="font-medium text-[#2A1810] dark:text-[#F7EFE2] mt-0.5">
                        Complimentary over{' '}
                        {formatPrice(freeDeliveryThresholdUsd, currency)}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* MEMBER SIGN IN MODAL */}
            {activeModal === 'auth' && (
              <>
                <div className="px-6 py-4 border-b border-[#3B2314]/[0.12] dark:border-[#D4A243]/[0.18] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <BrandLogo showName={false} iconSizeClass="w-7 h-7" />
                    <h2 className="text-base font-medium text-[#2A1810] dark:text-[#F7EFE2]">
                      {member ? 'Jhonty Hub Membership' : 'Sign in to Jhonty Hub'}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close sign in"
                    className="p-1 text-[#7D5B3F] dark:text-[#A98C6D] hover:text-[#2A1810] dark:hover:text-[#F7EFE2] cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {member ? (
                  <div className="p-6 space-y-5">
                    <div className="p-4 rounded-xl bg-[#F6EDE0] dark:bg-[#23160E] border border-[#C6922E]/25 dark:border-[#D4A243]/22">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {member.photoURL ? (
                            <img
                              src={member.photoURL}
                              alt={member.name}
                              referrerPolicy="no-referrer"
                              className="w-10 h-10 rounded-full object-cover border border-[#C6922E]/35 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-[#3B2314] dark:bg-[#E0AD42] text-[#F8E2A8] dark:text-[#1B1009] text-sm font-semibold flex items-center justify-center shrink-0">
                              {member.name.slice(0, 1).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-xs text-[#9A4A0A] dark:text-[#E5B54F] font-medium">
                              {member.tier}
                            </p>
                            <p className="text-base font-medium text-[#2A1810] dark:text-[#F7EFE2] truncate">
                              {member.name}
                            </p>
                          </div>
                        </div>
                        {isAdmin && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#3B2314] dark:bg-[#E0AD42] text-[#F8E2A8] dark:text-[#1B1009] text-[10px] font-medium uppercase tracking-wider shrink-0">
                            <ShieldCheck className="w-3 h-3" />
                            Admin
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#5E402A] dark:text-[#D4BEA1] mt-2">
                        {member.email}
                      </p>
                      <p className="text-xs text-[#2A1810] dark:text-[#F7EFE2] font-medium mt-3 pt-3 border-t border-[#3B2314]/[0.1] dark:border-[#D4A243]/[0.16]">
                        Complimentary express delivery active on all orders.
                      </p>
                    </div>

                    <div className="space-y-2.5">
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            onOpenAdmin();
                            onClose();
                          }}
                          className="w-full py-2.5 rounded-lg bg-gradient-to-r from-[#9A4A0A] via-[#B45309] to-[#C6922E] dark:from-[#D49B35] dark:to-[#E5B54F] text-[#FFFDF9] dark:text-[#1B1009] text-xs font-semibold tracking-[0.14em] uppercase hover:opacity-95 inline-flex items-center justify-center gap-2 transition-opacity cursor-pointer"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          Open Admin Console
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          signOut();
                          onClose();
                        }}
                        className="w-full py-2.5 rounded-lg border border-[#3B2314]/22 dark:border-[#D4A243]/30 text-xs font-medium tracking-wider uppercase text-[#2A1810] dark:text-[#F7EFE2] hover:bg-[#3B2314]/[0.06] dark:hover:bg-[#D4A243]/12 cursor-pointer"
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!authEmail.trim()) return;
                      signIn({
                        name: authName.trim() || authEmail.split('@')[0],
                        email: authEmail.trim(),
                      });
                      setAuthName('');
                      setAuthEmail('');
                      onClose();
                    }}
                    className="p-6 space-y-4"
                  >
                    <p className="text-xs text-[#5E402A] dark:text-[#D4BEA1] leading-relaxed">
                      Sign in as a member for complimentary express delivery on
                      every order, or enter directly as Studio Admin to access
                      the operations console.
                    </p>
                    <div>
                      <label
                        htmlFor="member-name"
                        className="block text-xs font-medium text-[#4E3320] dark:text-[#E2CCA9] mb-1.5"
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
                        className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#7D5B3F]/30 dark:border-[#D4A243]/28 bg-[#FFFBF4] dark:bg-[#24170F] text-[#2A1810] dark:text-[#F7EFE2] placeholder:text-[#9C7D5E] dark:placeholder:text-[#8A6E52] focus:outline-none focus:border-[#B45309] dark:focus:border-[#E5B54F]"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="member-email"
                        className="block text-xs font-medium text-[#4E3320] dark:text-[#E2CCA9] mb-1.5"
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
                        className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#7D5B3F]/30 dark:border-[#D4A243]/28 bg-[#FFFBF4] dark:bg-[#24170F] text-[#2A1810] dark:text-[#F7EFE2] placeholder:text-[#9C7D5E] dark:placeholder:text-[#8A6E52] focus:outline-none focus:border-[#B45309] dark:focus:border-[#E5B54F]"
                      />
                    </div>
                    <div className="space-y-2.5 pt-1">
                      <button
                        type="submit"
                        className="w-full py-3 bg-gradient-to-r from-[#9A4A0A] via-[#B45309] to-[#C6922E] hover:from-[#7C3A08] hover:to-[#B45309] dark:from-[#D49B35] dark:via-[#E0AD42] dark:to-[#ECC25C] text-[#FFFDF9] dark:text-[#1B1009] text-xs font-semibold tracking-[0.14em] uppercase rounded-lg transition-colors cursor-pointer"
                      >
                        Continue as Member
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          signInAsAdmin();
                          onOpenAdmin();
                          onClose();
                        }}
                        className="w-full py-2.5 rounded-lg border border-[#3B2314]/22 dark:border-[#D4A243]/30 text-xs font-medium tracking-wider uppercase text-[#2A1810] dark:text-[#F7EFE2] hover:bg-[#3B2314]/[0.06] dark:hover:bg-[#D4A243]/12 inline-flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-[#B45309] dark:text-[#E5B54F]" />
                        <span>Sign In as Studio Admin</span>
                      </button>
                    </div>
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
