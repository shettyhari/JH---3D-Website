import { useState } from 'react';
import {
  Heart,
  Menu,
  Moon,
  Search,
  ShoppingBag,
  Sun,
  User,
  X,
} from 'lucide-react';
import { CURRENCIES } from '../data/products';
import { CurrencyCode, MemberProfile, NavSection, ThemeMode } from '../types';
import { BrandLogo } from './BrandLogo';

interface HeaderProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  currency: CurrencyCode;
  onToggleCurrency: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  bagCount: number;
  wishlistCount: number;
  member: MemberProfile | null;
  onOpenBag: () => void;
  onOpenSearch: () => void;
  onOpenWishlist: () => void;
  onOpenAbout: () => void;
  onOpenAuth: () => void;
}

const NAV_ITEMS: Array<{ id: NavSection; label: string }> = [
  { id: 'shop-all', label: 'SHOP ALL' },
  { id: 'new-arrivals', label: 'NEW ARRIVALS' },
  { id: 'bestsellers', label: 'BESTSELLERS' },
  { id: 'lookbook', label: 'LOOKBOOK' },
];

export function Header({
  activeSection,
  onSelectSection,
  currency,
  onToggleCurrency,
  theme,
  onToggleTheme,
  bagCount,
  wishlistCount,
  member,
  onOpenBag,
  onOpenSearch,
  onOpenWishlist,
  onOpenAbout,
  onOpenAuth,
}: HeaderProps) {
  const [bannerVisible, setBannerVisible] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full bg-white dark:bg-[#080808] border-b border-black/[0.08] dark:border-white/[0.1] transition-colors duration-200">
      {/* Slim announcement strip */}
      {bannerVisible && (
        <div className="relative flex items-center justify-center bg-[#141312] dark:bg-[#191816] text-white/90 h-7 px-8 text-[10px] tracking-[0.18em] font-medium uppercase border-b border-transparent dark:border-white/[0.06]">
          <span className="truncate">
            {member
              ? `COMPLIMENTARY EXPRESS DELIVERY ACTIVE FOR ${member.name.toUpperCase()}`
              : 'FREE DELIVERY OVER $100. ALWAYS FOR MEMBERS'}
          </span>
          <button
            type="button"
            onClick={() => setBannerVisible(false)}
            aria-label="Dismiss delivery announcement"
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/60 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Main 3-zone navigation bar */}
      <div className="h-14 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 lg:gap-8">
        {/* Left Zone: Desktop Nav Links / Mobile Menu Trigger */}
        <div className="flex items-center gap-6 flex-1 min-w-0">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
            className="lg:hidden p-2 -ml-2 text-[#171615] dark:text-[#F4F1EC] hover:opacity-70 transition-opacity cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <nav
            aria-label="Primary navigation"
            className="hidden lg:flex items-center gap-6 text-[11px] font-medium tracking-[0.11em] text-[#45413C] dark:text-[#B5AEA6]"
          >
            {NAV_ITEMS.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    onSelectSection(activeSection === item.id ? 'showroom' : item.id)
                  }
                  className={`relative py-1 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    isActive
                      ? 'text-[#171615] dark:text-[#F4F1EC] after:absolute after:left-0 after:right-0 after:bottom-0 after:h-[1.5px] after:bg-[#171615] dark:after:bg-[#F4F1EC]'
                      : 'hover:text-[#171615] dark:hover:text-[#F4F1EC]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Center Zone: Theme-aware Brand Emblem & Jhonty Hub Wordmark */}
        <button
          type="button"
          onClick={() => {
            onSelectSection('showroom');
            setMobileMenuOpen(false);
          }}
          className="inline-flex items-center whitespace-nowrap shrink-0 cursor-pointer hover:opacity-85 transition-opacity"
          aria-label="Jhonty Hub Interactive Showroom Home"
        >
          <BrandLogo />
        </button>

        {/* Right Zone: Currency, About, Theme, Search, Saved, Bag, Account */}
        <div className="flex items-center justify-end gap-2.5 sm:gap-4 lg:gap-5 flex-1 min-w-0 text-[11px] font-medium tracking-[0.1em] text-[#45413C] dark:text-[#B5AEA6]">
          <button
            type="button"
            onClick={onToggleCurrency}
            title="Switch display currency"
            className="hidden xl:inline-flex items-center gap-1 hover:text-[#171615] dark:hover:text-[#F4F1EC] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {CURRENCIES[currency].label}
          </button>

          <button
            type="button"
            onClick={onOpenAbout}
            className="hidden md:inline-block hover:text-[#171615] dark:hover:text-[#F4F1EC] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            ABOUT
          </button>

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={
              theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'
            }
            title={
              theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'
            }
            className="p-1.5 hover:text-[#171615] dark:hover:text-[#F4F1EC] transition-colors shrink-0 cursor-pointer"
          >
            {theme === 'light' ? (
              <Moon className="w-[15px] h-[15px] stroke-[1.75]" />
            ) : (
              <Sun className="w-[15px] h-[15px] stroke-[1.75]" />
            )}
          </button>

          <button
            type="button"
            onClick={onOpenSearch}
            aria-label="Search garments"
            className="p-1.5 hover:text-[#171615] dark:hover:text-[#F4F1EC] transition-colors shrink-0 cursor-pointer"
          >
            <Search className="w-[15px] h-[15px] stroke-[1.75]" />
          </button>

          <button
            type="button"
            onClick={onOpenWishlist}
            aria-label={`Saved pieces (${wishlistCount})`}
            className="relative p-1.5 hover:text-[#171615] dark:hover:text-[#F4F1EC] transition-colors shrink-0 cursor-pointer hidden sm:inline-flex items-center"
          >
            <Heart
              className={`w-[15px] h-[15px] stroke-[1.75] ${
                wishlistCount > 0
                  ? 'fill-[#171615] text-[#171615] dark:fill-[#F4F1EC] dark:text-[#F4F1EC]'
                  : ''
              }`}
            />
            {wishlistCount > 0 && (
              <span className="ml-1 text-[10px] tabular-nums text-[#171615] dark:text-[#F4F1EC]">
                {wishlistCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={onOpenBag}
            aria-label={`Open shopping bag with ${bagCount} items`}
            className="inline-flex items-center gap-1.5 text-[#171615] dark:text-[#F4F1EC] hover:opacity-75 transition-opacity whitespace-nowrap shrink-0 cursor-pointer py-1"
          >
            <ShoppingBag className="w-[15px] h-[15px] stroke-[1.75]" />
            <span className="hidden sm:inline tabular-nums">BAG ({bagCount})</span>
            <span className="sm:hidden tabular-nums">{bagCount}</span>
          </button>

          <button
            type="button"
            onClick={onOpenAuth}
            className="hidden md:inline-flex items-center gap-1.5 hover:text-[#171615] dark:hover:text-[#F4F1EC] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {member ? (
              <>
                <User className="w-3.5 h-3.5 stroke-[1.75]" />
                <span className="max-w-[90px] truncate uppercase">
                  {member.name.split(' ')[0]}
                </span>
              </>
            ) : (
              'SIGN IN'
            )}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-[#080808] px-5 py-4 space-y-3">
          <div className="flex flex-col space-y-1">
            <button
              type="button"
              onClick={() => {
                onSelectSection('showroom');
                setMobileMenuOpen(false);
              }}
              className={`text-left py-2 text-xs tracking-[0.14em] font-medium cursor-pointer ${
                activeSection === 'showroom'
                  ? 'text-[#171615] dark:text-[#F4F1EC]'
                  : 'text-[#5D5852] dark:text-[#9E978F]'
              }`}
            >
              VIRTUAL SHOWROOM
            </button>
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectSection(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`text-left py-2 text-xs tracking-[0.14em] font-medium cursor-pointer ${
                  activeSection === item.id
                    ? 'text-[#171615] dark:text-[#F4F1EC]'
                    : 'text-[#5D5852] dark:text-[#9E978F]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="pt-3 border-t border-black/[0.08] dark:border-white/[0.1] flex flex-wrap items-center gap-4 text-xs tracking-[0.12em] text-[#45413C] dark:text-[#B5AEA6]">
            <button
              type="button"
              onClick={onToggleTheme}
              className="py-1 inline-flex items-center gap-1.5 cursor-pointer"
            >
              {theme === 'light' ? (
                <>
                  <Moon className="w-3.5 h-3.5" />
                  <span>DARK THEME</span>
                </>
              ) : (
                <>
                  <Sun className="w-3.5 h-3.5" />
                  <span>LIGHT THEME</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                onToggleCurrency();
              }}
              className="py-1 cursor-pointer"
            >
              {CURRENCIES[currency].label}
            </button>
            <button
              type="button"
              onClick={() => {
                onOpenWishlist();
                setMobileMenuOpen(false);
              }}
              className="py-1 cursor-pointer"
            >
              SAVED ({wishlistCount})
            </button>
            <button
              type="button"
              onClick={() => {
                onOpenAbout();
                setMobileMenuOpen(false);
              }}
              className="py-1 cursor-pointer"
            >
              ABOUT
            </button>
            <button
              type="button"
              onClick={() => {
                onOpenAuth();
                setMobileMenuOpen(false);
              }}
              className="py-1 font-medium text-[#171615] dark:text-[#F4F1EC] cursor-pointer"
            >
              {member ? member.name : 'SIGN IN'}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
