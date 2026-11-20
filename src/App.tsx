import { useCallback, useEffect, useMemo, useState } from 'react';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { AdminPanel } from './components/admin/AdminPanel';
import { BagDrawer, CheckoutPersistPayload } from './components/BagDrawer';
import { CatalogOverlay } from './components/CatalogOverlay';
import { Header } from './components/Header';
import { ShowroomStage } from './components/ShowroomStage';
import { ActiveModal, UtilityModals } from './components/UtilityModals';
import { useAuth } from './context/AuthContext';
import { DEFAULT_STORE_SETTINGS, PRODUCTS } from './data/products';
import { db, handleFirestoreError, OperationType } from './firebase';
import { createOrder, mapProductDoc } from './services/storeService';
import {
  CartItem,
  CategoryFilter,
  CurrencyCode,
  NavSection,
  Product,
  Size,
  StoreSettings,
  ThemeMode,
} from './types';

const STORAGE_CART_KEY = 'varde_bag_v1';
const STORAGE_WISHLIST_KEY = 'varde_wishlist_v1';
const STORAGE_THEME_KEY = 'jhonty_hub_theme_v1';

export default function App() {
  const { firebaseUser, member } = useAuth();

  const [activeSection, setActiveSection] = useState<NavSection>('showroom');
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('All');
  const [activeProductId, setActiveProductId] = useState<string>(PRODUCTS[0].id);
  const [selectedSize, setSelectedSize] = useState<Size>('M');
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [isBagOpen, setIsBagOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);

  // Live Firestore catalog & settings (with resilient default fallback before first seed)
  const [cloudProducts, setCloudProducts] = useState<Product[] | null>(null);
  const [isCatalogSynced, setIsCatalogSynced] = useState(false);
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(
    DEFAULT_STORE_SETTINGS,
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

  // Real-time public storefront catalog listener
  useEffect(() => {
    const unsubProducts = onSnapshot(
      collection(db, 'products'),
      (snap) => {
        if (snap.empty) {
          setCloudProducts(null);
          setIsCatalogSynced(false);
        } else {
          const list = snap.docs.map((d) =>
            mapProductDoc(d.data() as Record<string, unknown>, d.id),
          );
          // Preserve canonical catalog ordering for seeded items while sorting new items cleanly
          const defaultOrder = new Map(PRODUCTS.map((p, idx) => [p.id, idx]));
          list.sort((a, b) => {
            const ai = defaultOrder.has(a.id) ? defaultOrder.get(a.id)! : 999;
            const bi = defaultOrder.has(b.id) ? defaultOrder.get(b.id)! : 999;
            if (ai !== bi) return ai - bi;
            return a.name.localeCompare(b.name);
          });
          setCloudProducts(list);
          setIsCatalogSynced(true);
        }
      },
      (err) => {
        console.error('Products listener error:', err);
      },
    );

    const unsubSettings = onSnapshot(
      doc(db, 'settings', 'store'),
      (snap) => {
        if (snap.exists()) {
          const raw = snap.data() as Partial<StoreSettings>;
          setStoreSettings({
            storeName: raw.storeName || DEFAULT_STORE_SETTINGS.storeName,
            announcementText:
              raw.announcementText ?? DEFAULT_STORE_SETTINGS.announcementText,
            announcementEnabled:
              raw.announcementEnabled ??
              DEFAULT_STORE_SETTINGS.announcementEnabled,
            freeDeliveryThresholdUsd: Number(
              raw.freeDeliveryThresholdUsd ??
                DEFAULT_STORE_SETTINGS.freeDeliveryThresholdUsd,
            ),
            standardShippingUsd: Number(
              raw.standardShippingUsd ??
                DEFAULT_STORE_SETTINGS.standardShippingUsd,
            ),
            cadExchangeRate: Number(
              raw.cadExchangeRate ?? DEFAULT_STORE_SETTINGS.cadExchangeRate,
            ),
            lowStockDefaultThreshold: Number(
              raw.lowStockDefaultThreshold ??
                DEFAULT_STORE_SETTINGS.lowStockDefaultThreshold,
            ),
            supportEmail:
              raw.supportEmail || DEFAULT_STORE_SETTINGS.supportEmail,
          });
        }
      },
      (err) => {
        console.error('Store settings listener error:', err);
      },
    );

    return () => {
      unsubProducts();
      unsubSettings();
    };
  }, []);

  const allProducts = useMemo(
    () => (cloudProducts && cloudProducts.length > 0 ? cloudProducts : PRODUCTS),
    [cloudProducts],
  );

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
      if (!firebaseUser || !firebaseUser.emailVerified) {
        return;
      }
      try {
        await createOrder({
          orderNumber: payload.orderNumber,
          userId: firebaseUser.uid,
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
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'orders');
      }
    },
    [firebaseUser],
  );

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
        announcementText={storeSettings.announcementText}
        announcementEnabled={storeSettings.announcementEnabled}
        onOpenBag={() => setIsBagOpen(true)}
        onOpenSearch={() => setActiveModal('search')}
        onOpenWishlist={() => setActiveModal('wishlist')}
        onOpenAbout={() => setActiveModal('about')}
        onOpenAuth={() => setActiveModal('auth')}
      />

      {activeSection === 'admin' ? (
        <AdminPanel
          products={allProducts}
          isCatalogSynced={isCatalogSynced}
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
    </div>
  );
}
