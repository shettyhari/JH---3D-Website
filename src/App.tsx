import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminPanel } from './components/admin/AdminPanel';
import { AIStylistDrawer } from './components/AIStylistDrawer';
import { BagDrawer, CheckoutPersistPayload } from './components/BagDrawer';
import { CatalogOverlay } from './components/CatalogOverlay';
import { Header } from './components/Header';
import { ShowroomStage } from './components/ShowroomStage';
import { ActiveModal, UtilityModals } from './components/UtilityModals';
import { useAuth } from './context/AuthContext';
import { PRODUCTS } from './data/products';
import {
  createOrder,
  getStoreSnapshot,
  LocalStoreState,
  subscribeStore,
} from './services/storeService';
import {
  CartItem,
  CategoryFilter,
  CurrencyCode,
  NavSection,
  Size,
  ThemeMode,
} from './types';

const STORAGE_CART_KEY = 'varde_bag_v1';
const STORAGE_WISHLIST_KEY = 'varde_wishlist_v1';
const STORAGE_THEME_KEY = 'jhonty_hub_theme_v1';

export default function App() {
  const { currentUser, member } = useAuth();

  const [activeSection, setActiveSection] = useState<NavSection>('showroom');
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('All');
  const [activeProductId, setActiveProductId] = useState<string>(PRODUCTS[0].id);
  const [selectedSize, setSelectedSize] = useState<Size>('M');
  const [currency] = useState<CurrencyCode>('INR');
  const [isBagOpen, setIsBagOpen] = useState(false);
  const [isAIStylistOpen, setIsAIStylistOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);

  // Reactive local store state (persisted in browser storage)
  const [storeState, setStoreState] = useState<LocalStoreState>(() =>
    getStoreSnapshot(),
  );

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

  useEffect(() => {
    return subscribeStore((next) => {
      setStoreState(next);
    });
  }, []);

  const allProducts = storeState.products;
  const storeSettings = storeState.settings;

  // Storefront shows active products only (falls back to all if none active)
  const storefrontProducts = useMemo(() => {
    const active = allProducts.filter((p) => p.status === 'active');
    return active.length > 0 ? active : allProducts;
  }, [allProducts]);

  // Keep activeProductId valid when catalog updates from Admin Panel
  useEffect(() => {
    if (
      storefrontProducts.length > 0 &&
      !storefrontProducts.some((p) => p.id === activeProductId)
    ) {
      setActiveProductId(storefrontProducts[0].id);
    }
  }, [storefrontProducts, activeProductId]);

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
      cat === 'All'
        ? storefrontProducts
        : storefrontProducts.filter((p) => p.category === cat);
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
    const target = allProducts.find((p) => p.id === productId);
    if (target) {
      if (activeCategory !== 'All' && target.category !== activeCategory) {
        setActiveCategory('All');
      }
      setActiveProductId(target.id);
    }
    setActiveSection('showroom');
  };

  const handlePersistOrder = useCallback(
    async (payload: CheckoutPersistPayload) => {
      await createOrder({
        orderNumber: payload.orderNumber,
        userId: currentUser?.uid || 'guest-checkout',
        email: payload.email,
        shippingName: payload.shippingName,
        shippingAddress: payload.shippingAddress,
        items: payload.items,
        subtotalUsd: payload.subtotalUsd,
        shippingUsd: payload.shippingUsd,
        currency: payload.currency,
        status: 'pending',
        notes: 'Placed via Storefront Express Checkout',
      });
    },
    [currentUser],
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#FBF6EE] dark:bg-[#120B07] text-[#2A1810] dark:text-[#F7EFE2] transition-colors duration-200">
      <Header
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        currency={currency}
        onToggleCurrency={() => {}}
        theme={theme}
        onToggleTheme={() =>
          setTheme((t) => (t === 'light' ? 'dark' : 'light'))
        }
        bagCount={bagCount}
        wishlistCount={wishlistIds.length}
        member={member}
        announcementText={storeSettings.announcementText}
        announcementEnabled={storeSettings.announcementEnabled}
        onOpenBag={() => setIsBagOpen(true)}
        onOpenSearch={() => setActiveModal('search')}
        onOpenWishlist={() => setActiveModal('wishlist')}
        onOpenAbout={() => setActiveModal('about')}
        onOpenAuth={() => setActiveModal('auth')}
        onOpenAIStylist={() => setIsAIStylistOpen(true)}
      />

      {activeSection === 'admin' ? (
        <AdminPanel
          products={allProducts}
          storeSettings={storeSettings}
          currency={currency}
          onTryInShowroom={handleTryInShowroom}
          onReturnShowroom={() => setActiveSection('showroom')}
        />
      ) : activeSection === 'showroom' ? (
        <ShowroomStage
          products={storefrontProducts}
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
          onOpenAIStylist={() => setIsAIStylistOpen(true)}
        />
      ) : (
        <CatalogOverlay
          section={activeSection}
          products={storefrontProducts}
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
        products={allProducts}
        currency={currency}
        member={member}
        freeDeliveryThresholdUsd={storeSettings.freeDeliveryThresholdUsd}
        standardShippingUsd={storeSettings.standardShippingUsd}
        cadRate={storeSettings.cadExchangeRate}
        onPersistOrder={handlePersistOrder}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onAddItem={handleAddToBag}
        onClearBag={() => setCart([])}
        onSelectProductToTry={handleTryInShowroom}
      />

      <UtilityModals
        activeModal={activeModal}
        onClose={() => setActiveModal(null)}
        products={storefrontProducts}
        currency={currency}
        cadRate={storeSettings.cadExchangeRate}
        freeDeliveryThresholdUsd={storeSettings.freeDeliveryThresholdUsd}
        wishlistIds={wishlistIds}
        member={member}
        onToggleWishlist={handleToggleWishlist}
        onTryInShowroom={handleTryInShowroom}
        onAddToBag={handleAddToBag}
        onOpenAdmin={() => setActiveSection('admin')}
      />

      {/* JH Studio AI Stylist Concierge Drawer */}
      <AIStylistDrawer
        isOpen={isAIStylistOpen}
        onClose={() => setIsAIStylistOpen(false)}
        currentProduct={
          storefrontProducts.find((p) => p.id === activeProductId) ||
          storefrontProducts[0]
        }
        allProducts={storefrontProducts}
        currency={currency}
        onSelectProduct={(pid) => {
          handleTryInShowroom(pid);
        }}
      />
    </div>
  );
}
