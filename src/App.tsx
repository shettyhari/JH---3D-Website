import { useEffect, useMemo, useState } from 'react';
import { BagDrawer } from './components/BagDrawer';
import { CatalogOverlay } from './components/CatalogOverlay';
import { Header } from './components/Header';
import { ShowroomStage } from './components/ShowroomStage';
import { ActiveModal, UtilityModals } from './components/UtilityModals';
import { PRODUCTS } from './data/products';
import {
  CartItem,
  CategoryFilter,
  CurrencyCode,
  MemberProfile,
  NavSection,
  Size,
  ThemeMode,
} from './types';

const STORAGE_CART_KEY = 'varde_bag_v1';
const STORAGE_WISHLIST_KEY = 'varde_wishlist_v1';
const STORAGE_THEME_KEY = 'jhonty_hub_theme_v1';

export default function App() {
  const [activeSection, setActiveSection] = useState<NavSection>('showroom');
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('All');
  const [activeProductId, setActiveProductId] = useState<string>(PRODUCTS[0].id);
  const [selectedSize, setSelectedSize] = useState<Size>('M');
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [isBagOpen, setIsBagOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [member, setMember] = useState<MemberProfile | null>(null);
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_THEME_KEY);
      if (saved === 'dark' || saved === 'light') return saved;
    } catch {
      // Ignore storage read errors
    }
    return 'light';
  });

  useEffect(() => {
    const isDark = theme === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
    try {
      window.localStorage.setItem(STORAGE_THEME_KEY, theme);
    } catch {
      // Ignore storage write errors
    }
  }, [theme]);

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_CART_KEY);
      if (saved) return JSON.parse(saved) as CartItem[];
    } catch {
      // Ignore storage read errors
    }
    return [];
  });

  const [wishlistIds, setWishlistIds] = useState<string[]>(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_WISHLIST_KEY);
      if (saved) return JSON.parse(saved) as string[];
    } catch {
      // Ignore storage read errors
    }
    return [];
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_CART_KEY, JSON.stringify(cart));
    } catch {
      // Ignore storage write errors
    }
  }, [cart]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_WISHLIST_KEY,
        JSON.stringify(wishlistIds),
      );
    } catch {
      // Ignore storage write errors
    }
  }, [wishlistIds]);

  const bagCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart],
  );

  const handleSelectCategory = (cat: CategoryFilter) => {
    setActiveCategory(cat);
    const matching =
      cat === 'All' ? PRODUCTS : PRODUCTS.filter((p) => p.category === cat);
    if (matching.length > 0 && !matching.some((p) => p.id === activeProductId)) {
      setActiveProductId(matching[0].id);
    }
  };

  const handleAddToBag = (productId: string, size: Size) => {
    setCart((prev) => {
      const existing = prev.find(
        (item) => item.productId === productId && item.size === size,
      );
      if (existing) {
        return prev.map((item) =>
          item.productId === productId && item.size === size
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [...prev, { productId, size, quantity: 1 }];
    });
    setIsBagOpen(true);
  };

  const handleAddMultipleToBag = (
    itemsToAdd: Array<{ productId: string; size: Size }>,
  ) => {
    setCart((prev) => {
      const next = [...prev];
      itemsToAdd.forEach(({ productId, size }) => {
        const idx = next.findIndex(
          (item) => item.productId === productId && item.size === size,
        );
        if (idx >= 0) {
          next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        } else {
          next.push({ productId, size, quantity: 1 });
        }
      });
      return next;
    });
    setIsBagOpen(true);
  };

  const handleUpdateQuantity = (
    productId: string,
    size: Size,
    delta: number,
  ) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.productId === productId && item.size === size
            ? { ...item, quantity: item.quantity + delta }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  const handleRemoveItem = (productId: string, size: Size) => {
    setCart((prev) =>
      prev.filter(
        (item) => !(item.productId === productId && item.size === size),
      ),
    );
  };

  const handleToggleWishlist = (productId: string) => {
    setWishlistIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId],
    );
  };

  const handleTryInShowroom = (productId: string) => {
    const target = PRODUCTS.find((p) => p.id === productId);
    if (target) {
      if (activeCategory !== 'All' && target.category !== activeCategory) {
        setActiveCategory('All');
      }
      setActiveProductId(target.id);
    }
    setActiveSection('showroom');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F7] dark:bg-[#0E0D0C] text-[#171615] dark:text-[#F4F1EC] transition-colors duration-200">
      <Header
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        currency={currency}
        onToggleCurrency={() =>
          setCurrency((c) => (c === 'USD' ? 'CAD' : 'USD'))
        }
        theme={theme}
        onToggleTheme={() =>
          setTheme((t) => (t === 'light' ? 'dark' : 'light'))
        }
        bagCount={bagCount}
        wishlistCount={wishlistIds.length}
        member={member}
        onOpenBag={() => setIsBagOpen(true)}
        onOpenSearch={() => setActiveModal('search')}
        onOpenWishlist={() => setActiveModal('wishlist')}
        onOpenAbout={() => setActiveModal('about')}
        onOpenAuth={() => setActiveModal('auth')}
      />

      {activeSection === 'showroom' ? (
        <ShowroomStage
          products={PRODUCTS}
          activeCategory={activeCategory}
          onSelectCategory={handleSelectCategory}
          activeProductId={activeProductId}
          onSelectProduct={handleTryInShowroom}
          selectedSize={selectedSize}
          onSelectSize={setSelectedSize}
          currency={currency}
          wishlistIds={wishlistIds}
          onToggleWishlist={handleToggleWishlist}
          onAddToBag={handleAddToBag}
          onAddMultipleToBag={handleAddMultipleToBag}
          isBagOpen={isBagOpen}
        />
      ) : (
        <CatalogOverlay
          section={activeSection}
          products={PRODUCTS}
          currency={currency}
          wishlistIds={wishlistIds}
          onToggleWishlist={handleToggleWishlist}
          onTryInShowroom={handleTryInShowroom}
          onAddToBag={handleAddToBag}
          onReturnShowroom={() => setActiveSection('showroom')}
        />
      )}

      <BagDrawer
        isOpen={isBagOpen}
        onClose={() => setIsBagOpen(false)}
        items={cart}
        products={PRODUCTS}
        currency={currency}
        member={member}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onAddItem={handleAddToBag}
        onClearBag={() => setCart([])}
        onSelectProductToTry={handleTryInShowroom}
      />

      <UtilityModals
        activeModal={activeModal}
        onClose={() => setActiveModal(null)}
        products={PRODUCTS}
        currency={currency}
        wishlistIds={wishlistIds}
        member={member}
        onToggleWishlist={handleToggleWishlist}
        onTryInShowroom={handleTryInShowroom}
        onAddToBag={handleAddToBag}
        onSignIn={setMember}
        onSignOut={() => setMember(null)}
      />
    </div>
  );
}
