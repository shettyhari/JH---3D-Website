import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  Boxes,
  Copy,
  Eye,
  LayoutDashboard,
  Lock,
  LogOut,
  Package,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Settings,
  ShoppingCart,
  Trash2,
  Users,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  formatPrice,
  getLowStockSizes,
  getTotalStock,
  SIZES,
} from '../../data/products';
import {
  adjustProductStock,
  createAdminManagedUser,
  createOrder,
  createProduct,
  deleteOrderByAdmin,
  deleteProduct,
  deleteUserByAdmin,
  getStoreSnapshot,
  resetStoreToDefaults,
  saveStoreSettings,
  slugifyId,
  subscribeStore,
  updateOrderFulfillment,
  updateProduct,
  updateUserByAdmin,
} from '../../services/storeService';
import {
  CurrencyCode,
  InventoryLogEntry,
  Product,
  ProductStatus,
  Size,
  StoreOrder,
  StoreSettings,
  UserProfileRecord,
} from '../../types';
import { ResilientImage } from '../ResilientImage';
import { InventoryView } from './InventoryView';
import { OrdersView } from './OrdersView';
import { ProductEditorModal } from './ProductEditorModal';
import { SettingsView } from './SettingsView';
import { UsersView } from './UsersView';

type AdminTab =
  | 'overview'
  | 'products'
  | 'inventory'
  | 'orders'
  | 'users'
  | 'settings';

interface AdminPanelProps {
  products: Product[];
  storeSettings: StoreSettings;
  currency: CurrencyCode;
  onTryInShowroom: (productId: string) => void;
  onReturnShowroom: () => void;
}

const NAV_TABS: Array<{
  id: AdminTab;
  label: string;
  icon: typeof LayoutDashboard;
}> = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'inventory', label: 'Inventory', icon: Boxes },
  { id: 'orders', label: 'Orders', icon: ShoppingCart },
  { id: 'users', label: 'Users & Roles', icon: Users },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function AdminPanel({
  products,
  storeSettings,
  currency,
  onTryInShowroom,
  onReturnShowroom,
}: AdminPanelProps) {
  const { currentUser, member, isAdmin, signInAsAdmin, signOut } = useAuth();

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [users, setUsers] = useState<UserProfileRecord[]>(
    () => getStoreSnapshot().users,
  );
  const [orders, setOrders] = useState<StoreOrder[]>(
    () => getStoreSnapshot().orders,
  );
  const [inventoryLogs, setInventoryLogs] = useState<InventoryLogEntry[]>(
    () => getStoreSnapshot().inventoryLogs,
  );
  const dataLoading = false;
  const [confirmReset, setConfirmReset] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Products tab state
  const [productSearch, setProductSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'All' | 'Tops' | 'Outerwear'>('All');
  const [statusFilter, setStatusFilter] = useState<'all' | ProductStatus>('all');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [confirmDeleteProductId, setConfirmDeleteProductId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3200);
  };

  useEffect(() => {
    return subscribeStore((state) => {
      setUsers(state.users);
      setOrders(state.orders);
      setInventoryLogs(state.inventoryLogs);
    });
  }, []);

  // Overview computed metrics
  const overviewMetrics = useMemo(() => {
    const validOrders = orders.filter(
      (o) => o.status !== 'cancelled' && o.status !== 'refunded',
    );
    const grossRevenueUsd = validOrders.reduce((sum, o) => sum + o.totalUsd, 0);
    const openOrdersCount = orders.filter(
      (o) => o.status === 'pending' || o.status === 'processing',
    ).length;

    let totalUnits = 0;
    let retailInventoryUsd = 0;
    let topsUnits = 0;
    let outerwearUnits = 0;
    const lowStockQueue: Array<{ product: Product; size: Size; qty: number }> = [];

    products.forEach((p) => {
      const units = getTotalStock(p);
      totalUnits += units;
      retailInventoryUsd += units * p.priceUsd;
      if (p.category === 'Outerwear') outerwearUnits += units;
      else topsUnits += units;

      SIZES.forEach((sz) => {
        const qty = p.stock[sz] ?? 0;
        if (qty <= p.lowStockThreshold) {
          lowStockQueue.push({ product: p, size: sz, qty });
        }
      });
    });

    lowStockQueue.sort((a, b) => a.qty - b.qty);

    return {
      grossRevenueUsd,
      totalOrdersCount: orders.length,
      openOrdersCount,
      totalUnits,
      retailInventoryUsd,
      topsUnits,
      outerwearUnits,
      lowStockQueue,
    };
  }, [orders, products]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    return products.filter((p) => {
      if (categoryFilter !== 'All' && p.category !== categoryFilter) return false;
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.color.toLowerCase().includes(q)
      );
    });
  }, [products, productSearch, categoryFilter, statusFilter]);

  // AUTH LOADING STATE
  // SIGNED OUT GATE
  if (!currentUser) {
    return (
      <main className="flex-1 flex items-center justify-center p-6 bg-[#FAF9F7] dark:bg-[#0E0D0C]">
        <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#141312] border border-black/[0.08] dark:border-white/[0.1] p-8 space-y-6">
          <div className="space-y-2">
            <p className="text-[11px] font-medium tracking-[0.14em] uppercase text-[#6D665E] dark:text-[#9E978F]">
              Jhonty Hub Operations
            </p>
            <h1 className="font-editorial text-3xl font-medium tracking-tight">
              Admin Console Sign-In
            </h1>
            <p className="text-xs text-[#59534C] dark:text-[#A8A199] leading-relaxed">
              Enter the studio console to manage products, per-size inventory,
              customer orders, staff roles, and storefront settings.
            </p>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={signInAsAdmin}
              className="w-full py-3 px-4 rounded-lg bg-[#171615] dark:bg-[#F4F1EC] text-white dark:text-[#171615] text-xs font-medium tracking-[0.1em] uppercase hover:opacity-90 transition-opacity cursor-pointer"
            >
              Sign In as Studio Admin
            </button>

            <button
              type="button"
              onClick={onReturnShowroom}
              className="w-full py-2.5 px-4 rounded-lg border border-black/[0.12] dark:border-white/[0.15] text-xs font-medium text-[#45413C] dark:text-[#B5AEA6] hover:text-[#171615] dark:hover:text-[#F4F1EC] transition-colors cursor-pointer"
            >
              Return to Showroom
            </button>
          </div>
        </div>
      </main>
    );
  }

  // NON-ADMIN ACCESS RESTRICTED GATE
  if (!isAdmin) {
    return (
      <main className="flex-1 flex items-center justify-center p-6 bg-[#FAF9F7] dark:bg-[#0E0D0C]">
        <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#141312] border border-black/[0.08] dark:border-white/[0.1] p-8 space-y-5">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-lg font-semibold">Admin Access Required</h1>
            <p className="text-xs text-[#59534C] dark:text-[#A8A199] leading-relaxed">
              You are currently signed in as{' '}
              <span className="font-medium text-[#171615] dark:text-[#F4F1EC]">
                {currentUser.email}
              </span>{' '}
              with a <span className="font-medium capitalize">{member?.role || 'customer'}</span> role. Switch to the Studio Admin account to open operations.
            </p>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={signInAsAdmin}
              className="flex-1 py-2.5 px-4 rounded-lg bg-[#171615] dark:bg-[#F4F1EC] text-white dark:text-[#171615] text-xs font-medium cursor-pointer"
            >
              Switch to Admin
            </button>
            <button
              type="button"
              onClick={onReturnShowroom}
              className="py-2.5 px-4 rounded-lg border border-black/[0.14] dark:border-white/[0.16] text-xs font-medium cursor-pointer"
            >
              Showroom
            </button>
          </div>
        </div>
      </main>
    );
  }

  const handleSaveProduct = async (product: Product, isNew: boolean) => {
    if (isNew) {
      await createProduct(product);
      showToast(`Created ${product.name} (${product.sku}).`);
    } else {
      await updateProduct(product);
      showToast(`Updated ${product.name}.`);
    }
  };

  const handleDuplicateProduct = async (product: Product) => {
    const suffix = Date.now().toString().slice(-4);
    const copy: Product = {
      ...JSON.parse(JSON.stringify(product)),
      id: slugifyId(`${product.id}-copy-${suffix}`, 64),
      sku: `${product.sku}-C${suffix.slice(-2)}`,
      name: `${product.name} (Edition)`,
      status: 'draft',
    };
    await createProduct(copy);
    showToast(`Duplicated "${product.name}" as draft.`);
  };

  const handleQuickStatusChange = async (
    product: Product,
    status: ProductStatus,
  ) => {
    await updateProduct({ ...product, status });
    showToast(`${product.name} marked ${status}.`);
  };

  const handleDeleteProduct = async (productId: string, name: string) => {
    await deleteProduct(productId);
    setConfirmDeleteProductId(null);
    showToast(`Deleted ${name} from catalog.`);
  };

  const currentTabMeta = NAV_TABS.find((t) => t.id === activeTab) || NAV_TABS[0];

  return (
    <div className="flex-1 flex flex-col lg:flex-row bg-[#F7F6F3] dark:bg-[#0D0C0B] text-[#171615] dark:text-[#F4F1EC]">
      {/* Desktop Sidebar (256px) */}
      <aside className="hidden lg:flex lg:w-[252px] lg:shrink-0 flex-col justify-between bg-white dark:bg-[#121110] border-r border-black/[0.08] dark:border-white/[0.1]">
        <div className="p-4 space-y-6">
          <div className="px-2 pt-1">
            <p className="text-[11px] font-medium tracking-[0.12em] uppercase text-[#6D665E] dark:text-[#9E978F]">
              Jhonty Hub
            </p>
            <h2 className="text-sm font-semibold mt-0.5">Operations Console</h2>
          </div>

          <nav className="space-y-1" aria-label="Admin navigation">
            {NAV_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const countHint =
                tab.id === 'products'
                  ? products.length
                  : tab.id === 'orders'
                    ? overviewMetrics.openOrdersCount || undefined
                    : tab.id === 'inventory'
                      ? overviewMetrics.lowStockQueue.length || undefined
                      : tab.id === 'users'
                        ? users.length
                        : undefined;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[#171615] dark:bg-[#F4F1EC] text-white dark:text-[#171615]'
                      : 'text-[#45413C] dark:text-[#B5AEA6] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:text-[#171615] dark:hover:text-[#F4F1EC]'
                  }`}
                >
                  <span className="inline-flex items-center gap-2.5 whitespace-nowrap">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{tab.label}</span>
                  </span>
                  {typeof countHint === 'number' && (
                    <span
                      className={`font-mono text-[11px] tabular-nums ${
                        isActive
                          ? 'text-white/75 dark:text-[#171615]/75'
                          : 'text-[#6D665E] dark:text-[#9E978F]'
                      }`}
                    >
                      {countHint}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-black/[0.08] dark:border-white/[0.1] space-y-3">
          <div className="px-2">
            <p className="text-xs font-medium truncate">
              {member?.name || currentUser.name}
            </p>
            <p className="text-[11px] text-[#6D665E] dark:text-[#9E978F] truncate">
              {currentUser.email}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onReturnShowroom}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg border border-black/[0.12] dark:border-white/[0.14] text-xs font-medium hover:bg-black/[0.04] dark:hover:bg-white/[0.06] whitespace-nowrap cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Storefront</span>
            </button>
            <button
              type="button"
              onClick={signOut}
              aria-label="Sign out"
              title="Sign out"
              className="p-2 rounded-lg border border-black/[0.12] dark:border-white/[0.14] text-[#6D665E] dark:text-[#9E978F] hover:text-[#171615] dark:hover:text-[#F4F1EC] cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Horizontal Sub-Navigation */}
      <div className="lg:hidden bg-white dark:bg-[#121110] border-b border-black/[0.08] dark:border-white/[0.1] px-4 py-2 overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-max">
          {NAV_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-[#171615] dark:bg-[#F4F1EC] text-white dark:text-[#171615]'
                    : 'text-[#45413C] dark:text-[#B5AEA6]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Workspace Top Bar (Breadcrumbs + Primary Action) */}
        <div className="px-5 sm:px-8 py-4 bg-white dark:bg-[#121110] border-b border-black/[0.08] dark:border-white/[0.1] flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] text-[#6D665E] dark:text-[#9E978F]">
              <span>Admin</span>
              <span aria-hidden="true">/</span>
              <span className="text-[#171615] dark:text-[#F4F1EC] font-medium">
                {currentTabMeta.label}
              </span>
            </div>
            <h1 className="text-lg font-semibold tracking-tight mt-0.5">
              {activeTab === 'overview' && 'Storefront Operations Overview'}
              {activeTab === 'products' && 'Product Catalog Management'}
              {activeTab === 'inventory' && 'Inventory & Per-Size Stock'}
              {activeTab === 'orders' && 'Orders & Fulfillment'}
              {activeTab === 'users' && 'Users & Access Control'}
              {activeTab === 'settings' && 'Storefront Settings'}
            </h1>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {confirmReset ? (
              <div className="inline-flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={async () => {
                    await resetStoreToDefaults();
                    setConfirmReset(false);
                    showToast('Restored default Jhonty Hub catalog, orders, and inventory.');
                  }}
                  className="px-3 py-2 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 whitespace-nowrap cursor-pointer"
                >
                  Confirm Reset
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="px-2.5 py-2 rounded-lg border border-black/[0.14] dark:border-white/[0.16] text-xs font-medium whitespace-nowrap cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-black/[0.14] dark:border-white/[0.16] text-xs font-medium hover:bg-black/[0.04] dark:hover:bg-white/[0.06] whitespace-nowrap cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Data</span>
              </button>
            )}

            {(activeTab === 'overview' || activeTab === 'products') && (
              <button
                type="button"
                onClick={() => {
                  setEditingProduct(null);
                  setEditorOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#171615] dark:bg-[#F4F1EC] text-white dark:text-[#171615] text-xs font-medium hover:opacity-90 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Product</span>
              </button>
            )}
          </div>
        </div>

        {/* Toast Feedback */}
        {toast && (
          <div className="px-5 sm:px-8 pt-4">
            <div className="px-4 py-2.5 rounded-lg bg-[#171615] dark:bg-[#F4F1EC] text-white dark:text-[#171615] text-xs font-medium flex items-center justify-between">
              <span>{toast}</span>
              <button
                type="button"
                onClick={() => setToast(null)}
                className="opacity-70 hover:opacity-100 text-[11px] cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Active Workspace Content */}
        <div className="p-5 sm:p-8 flex-1 space-y-6">
          {/* 1. OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* 4-Column KPI Strip */}
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-px bg-black/[0.08] dark:bg-white/[0.1] border border-black/[0.08] dark:border-white/[0.1] rounded-xl overflow-hidden">
                <div className="bg-white dark:bg-[#141312] p-5">
                  <p className="text-xs text-[#6D665E] dark:text-[#9E978F]">
                    Gross Order Revenue
                  </p>
                  <p className="text-2xl font-semibold font-mono tabular-nums mt-1.5">
                    {formatPrice(
                      overviewMetrics.grossRevenueUsd,
                      currency,
                      storeSettings.cadExchangeRate,
                    )}
                  </p>
                  <p className="text-[11px] text-[#6D665E] dark:text-[#9E978F] mt-1">
                    {overviewMetrics.totalOrdersCount} recorded orders ·{' '}
                    {overviewMetrics.openOrdersCount} open
                  </p>
                </div>

                <div className="bg-white dark:bg-[#141312] p-5">
                  <p className="text-xs text-[#6D665E] dark:text-[#9E978F]">
                    Inventory Valuation
                  </p>
                  <p className="text-2xl font-semibold font-mono tabular-nums mt-1.5">
                    {formatPrice(
                      overviewMetrics.retailInventoryUsd,
                      currency,
                      storeSettings.cadExchangeRate,
                    )}
                  </p>
                  <p className="text-[11px] text-[#6D665E] dark:text-[#9E978F] mt-1 font-mono tabular-nums">
                    {overviewMetrics.totalUnits.toLocaleString()} units across{' '}
                    {products.length} SKUs
                  </p>
                </div>

                <div className="bg-white dark:bg-[#141312] p-5">
                  <p className="text-xs text-[#6D665E] dark:text-[#9E978F]">
                    Low-Stock Size Alerts
                  </p>
                  <p
                    className={`text-2xl font-semibold font-mono tabular-nums mt-1.5 ${
                      overviewMetrics.lowStockQueue.length > 0
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-emerald-700 dark:text-emerald-400'
                    }`}
                  >
                    {overviewMetrics.lowStockQueue.length}
                  </p>
                  <p className="text-[11px] text-[#6D665E] dark:text-[#9E978F] mt-1">
                    Sizes at or below threshold
                  </p>
                </div>

                <div className="bg-white dark:bg-[#141312] p-5">
                  <p className="text-xs text-[#6D665E] dark:text-[#9E978F]">
                    Registered Accounts
                  </p>
                  <p className="text-2xl font-semibold font-mono tabular-nums mt-1.5">
                    {dataLoading ? '—' : users.length}
                  </p>
                  <p className="text-[11px] text-[#6D665E] dark:text-[#9E978F] mt-1">
                    {users.filter((u) => u.role === 'admin').length} admins ·{' '}
                    {users.filter((u) => u.role === 'customer').length} customers
                  </p>
                </div>
              </div>

              {/* 2-Column Operations Split */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                {/* Left 7 cols: Low-Stock Action Queue */}
                <div className="xl:col-span-7 rounded-xl bg-white dark:bg-[#141312] border border-black/[0.08] dark:border-white/[0.1] flex flex-col">
                  <div className="px-5 py-4 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold">
                        Replenishment Queue
                      </h3>
                      <p className="text-xs text-[#6D665E] dark:text-[#9E978F]">
                        Sizes needing immediate studio restock
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('inventory')}
                      className="inline-flex items-center gap-1 text-xs font-medium text-[#45413C] dark:text-[#B5AEA6] hover:text-[#171615] dark:hover:text-[#F4F1EC] cursor-pointer"
                    >
                      <span>Open matrix</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {overviewMetrics.lowStockQueue.length === 0 ? (
                    <div className="p-8 text-center text-xs text-[#6D665E] dark:text-[#9E978F]">
                      All sizes across every garment are comfortably above threshold.
                    </div>
                  ) : (
                    <div className="divide-y divide-black/[0.06] dark:divide-white/[0.08]">
                      {overviewMetrics.lowStockQueue.slice(0, 6).map((item) => (
                        <div
                          key={`${item.product.id}-${item.size}`}
                          className="px-5 py-3 flex items-center justify-between gap-4 text-xs"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-10 rounded bg-[#F4F1EC] dark:bg-[#1E1C1A] overflow-hidden shrink-0">
                              <ResilientImage
                                src={item.product.productImage}
                                alt={item.product.name}
                                fallbackTitle={item.product.name}
                                className="w-full h-full object-contain p-0.5"
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium truncate">
                                {item.product.name} · Size {item.size}
                              </p>
                              <p className="text-[11px] text-[#6D665E] dark:text-[#9E978F] font-mono">
                                {item.product.sku} ·{' '}
                                <span
                                  className={
                                    item.qty === 0
                                      ? 'text-red-600 dark:text-red-400 font-medium'
                                      : 'text-amber-600 dark:text-amber-400 font-medium'
                                  }
                                >
                                  {item.qty === 0
                                    ? 'Out of stock'
                                    : `${item.qty} remaining`}
                                </span>
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={async () => {
                              await adjustProductStock({
                                product: item.product,
                                size: item.size,
                                newQty: item.qty + 10,
                                reason: 'restock',
                                note: 'Quick +10 replenishment from Overview',
                              });
                              showToast(
                                `Restocked ${item.product.name} (${item.size}) by +10 units.`,
                              );
                            }}
                            className="px-3 py-1.5 rounded-md border border-black/[0.14] dark:border-white/[0.16] text-xs font-medium hover:bg-[#171615] hover:text-white dark:hover:bg-[#F4F1EC] dark:hover:text-[#171615] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            Restock +10
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right 5 cols: Stock Distribution + Recent Orders */}
                <div className="xl:col-span-5 space-y-6">
                  <div className="rounded-xl bg-white dark:bg-[#141312] border border-black/[0.08] dark:border-white/[0.1] p-5 space-y-4">
                    <h3 className="text-sm font-semibold">
                      Stock Distribution by Category
                    </h3>
                    <div className="space-y-3 text-xs">
                      {[
                        {
                          label: 'Tops',
                          units: overviewMetrics.topsUnits,
                          pct:
                            overviewMetrics.totalUnits > 0
                              ? Math.round(
                                  (overviewMetrics.topsUnits /
                                    overviewMetrics.totalUnits) *
                                    100,
                                )
                              : 0,
                        },
                        {
                          label: 'Outerwear',
                          units: overviewMetrics.outerwearUnits,
                          pct:
                            overviewMetrics.totalUnits > 0
                              ? Math.round(
                                  (overviewMetrics.outerwearUnits /
                                    overviewMetrics.totalUnits) *
                                    100,
                                )
                              : 0,
                        },
                      ].map((row) => (
                        <div key={row.label} className="space-y-1.5">
                          <div className="flex justify-between">
                            <span className="font-medium">{row.label}</span>
                            <span className="font-mono tabular-nums text-[#6D665E] dark:text-[#9E978F]">
                              {row.units} units ({row.pct}%)
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-black/[0.06] dark:bg-white/[0.08] overflow-hidden">
                            <div
                              className="h-full bg-[#171615] dark:bg-[#F4F1EC] rounded-full transition-all duration-300"
                              style={{ width: `${row.pct}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl bg-white dark:bg-[#141312] border border-black/[0.08] dark:border-white/[0.1]">
                    <div className="px-5 py-4 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between">
                      <h3 className="text-sm font-semibold">Recent Orders</h3>
                      <button
                        type="button"
                        onClick={() => setActiveTab('orders')}
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#45413C] dark:text-[#B5AEA6] hover:text-[#171615] dark:hover:text-[#F4F1EC] cursor-pointer"
                      >
                        <span>View all</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {orders.length === 0 ? (
                      <div className="p-6 text-center text-xs text-[#6D665E] dark:text-[#9E978F]">
                        No orders placed yet. Complete a storefront checkout or log a studio order.
                      </div>
                    ) : (
                      <div className="divide-y divide-black/[0.06] dark:divide-white/[0.08]">
                        {orders.slice(0, 4).map((o) => (
                          <button
                            key={o.id}
                            type="button"
                            onClick={() => setActiveTab('orders')}
                            className="w-full px-5 py-3 flex items-center justify-between text-left text-xs hover:bg-black/[0.02] dark:hover:bg-white/[0.02] cursor-pointer"
                          >
                            <div className="min-w-0">
                              <p className="font-mono font-medium">
                                {o.orderNumber} ·{' '}
                                <span className="font-sans">{o.shippingName}</span>
                              </p>
                              <p className="text-[11px] text-[#6D665E] dark:text-[#9E978F] capitalize">
                                {o.status}
                              </p>
                            </div>
                            <span className="font-mono font-semibold tabular-nums shrink-0">
                              {formatPrice(
                                o.totalUsd,
                                currency,
                                storeSettings.cadExchangeRate,
                              )}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. PRODUCTS TAB */}
          {activeTab === 'products' && (
            <div className="space-y-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 text-[#6D665E] dark:text-[#9E978F] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Search garment name, SKU, color..."
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-black/[0.12] dark:border-white/[0.14] bg-white dark:bg-[#141312] focus:outline-none focus:border-[#171615] dark:focus:border-[#F4F1EC]"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center p-1 rounded-lg bg-black/[0.04] dark:bg-white/[0.06]">
                    {(['All', 'Tops', 'Outerwear'] as const).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategoryFilter(cat)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          categoryFilter === cat
                            ? 'bg-white dark:bg-[#1E1C1A] text-[#171615] dark:text-[#F4F1EC] shadow-xs'
                            : 'text-[#6D665E] dark:text-[#9E978F]'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  <select
                    aria-label="Filter by product status"
                    value={statusFilter}
                    onChange={(e) =>
                      setStatusFilter(e.target.value as 'all' | ProductStatus)
                    }
                    className="px-3 py-2 text-xs rounded-lg border border-black/[0.12] dark:border-white/[0.14] bg-white dark:bg-[#141312] cursor-pointer"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              <div className="rounded-xl bg-white dark:bg-[#141312] border border-black/[0.08] dark:border-white/[0.1] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-black/[0.08] dark:border-white/[0.1] bg-[#FAF9F7] dark:bg-[#191816] text-[11px] font-medium text-[#6D665E] dark:text-[#9E978F]">
                        <th className="py-3 px-4">Garment</th>
                        <th className="py-3 px-3">Category</th>
                        <th className="py-3 px-3 text-right">Retail / Cost</th>
                        <th className="py-3 px-3 text-right">Margin</th>
                        <th className="py-3 px-3 text-right">Stock</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/[0.06] dark:divide-white/[0.08]">
                      {filteredProducts.length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="py-10 text-center text-[#6D665E] dark:text-[#9E978F]"
                          >
                            No garments match your current search or filters.
                          </td>
                        </tr>
                      ) : (
                        filteredProducts.map((product) => {
                          const totalStock = getTotalStock(product);
                          const lowSizes = getLowStockSizes(product);
                          const marginPct =
                            product.priceUsd > 0
                              ? Math.round(
                                  ((product.priceUsd - product.costUsd) /
                                    product.priceUsd) *
                                    100,
                                )
                              : 0;

                          return (
                            <tr
                              key={product.id}
                              className="hover:bg-black/[0.015] dark:hover:bg-white/[0.02] transition-colors"
                            >
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-3 min-w-[230px]">
                                  <div className="w-10 h-12 rounded bg-[#F4F1EC] dark:bg-[#1E1C1A] overflow-hidden shrink-0">
                                    <ResilientImage
                                      src={product.productImage}
                                      alt={product.name}
                                      fallbackTitle={product.name}
                                      className="w-full h-full object-contain p-0.5"
                                    />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-medium text-[#171615] dark:text-[#F4F1EC] truncate">
                                      {product.name}
                                    </p>
                                    <p className="text-[11px] text-[#6D665E] dark:text-[#9E978F] truncate">
                                      <span className="font-mono">{product.sku}</span> ·{' '}
                                      {product.color}
                                      {product.isNewArrival ? ' · New' : ''}
                                      {product.isBestseller ? ' · Bestseller' : ''}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              <td className="py-3 px-3 text-[#45413C] dark:text-[#B5AEA6]">
                                {product.category}
                              </td>

                              <td className="py-3 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                                <p className="font-medium">
                                  {formatPrice(
                                    product.priceUsd,
                                    currency,
                                    storeSettings.cadExchangeRate,
                                  )}
                                </p>
                                <p className="text-[11px] text-[#6D665E] dark:text-[#9E978F]">
                                  Cost{' '}
                                  {formatPrice(
                                    product.costUsd,
                                    currency,
                                    storeSettings.cadExchangeRate,
                                  )}
                                </p>
                              </td>

                              <td className="py-3 px-3 text-right font-mono tabular-nums">
                                <span
                                  className={
                                    marginPct >= 50
                                      ? 'text-emerald-700 dark:text-emerald-400 font-medium'
                                      : 'text-amber-600 dark:text-amber-400 font-medium'
                                  }
                                >
                                  {marginPct}%
                                </span>
                              </td>

                              <td className="py-3 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                                <p className="font-medium">{totalStock} pcs</p>
                                {lowSizes.length > 0 && (
                                  <p className="text-[11px] text-amber-600 dark:text-amber-400">
                                    Low: {lowSizes.join(', ')}
                                  </p>
                                )}
                              </td>

                              <td className="py-3 px-3">
                                <select
                                  aria-label={`Status for ${product.name}`}
                                  value={product.status}
                                  onChange={(e) =>
                                    void handleQuickStatusChange(
                                      product,
                                      e.target.value as ProductStatus,
                                    )
                                  }
                                  className="px-2 py-1 text-xs rounded-md border border-black/[0.12] dark:border-white/[0.14] bg-white dark:bg-[#191816] capitalize cursor-pointer"
                                >
                                  <option value="active">Active</option>
                                  <option value="draft">Draft</option>
                                  <option value="archived">Archived</option>
                                </select>
                              </td>

                              <td className="py-3 px-4 text-right whitespace-nowrap">
                                {confirmDeleteProductId === product.id ? (
                                  <div className="inline-flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteProductId(null)}
                                      className="px-2 py-1 text-[11px] rounded border border-black/[0.14] dark:border-white/[0.16] cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void handleDeleteProduct(
                                          product.id,
                                          product.name,
                                        )
                                      }
                                      className="px-2 py-1 text-[11px] rounded bg-red-600 text-white font-medium cursor-pointer"
                                    >
                                      Confirm
                                    </button>
                                  </div>
                                ) : (
                                  <div className="inline-flex items-center gap-1">
                                    <button
                                      type="button"
                                      title="Preview in Virtual Showroom"
                                      onClick={() => onTryInShowroom(product.id)}
                                      className="p-1.5 text-[#6D665E] dark:text-[#9E978F] hover:text-[#171615] dark:hover:text-[#F4F1EC] cursor-pointer"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      title="Edit garment"
                                      onClick={() => {
                                        setEditingProduct(product);
                                        setEditorOpen(true);
                                      }}
                                      className="p-1.5 text-[#6D665E] dark:text-[#9E978F] hover:text-[#171615] dark:hover:text-[#F4F1EC] cursor-pointer"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      title="Duplicate garment as draft"
                                      onClick={() =>
                                        void handleDuplicateProduct(product)
                                      }
                                      className="p-1.5 text-[#6D665E] dark:text-[#9E978F] hover:text-[#171615] dark:hover:text-[#F4F1EC] cursor-pointer"
                                    >
                                      <Copy className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      title="Delete garment"
                                      onClick={() =>
                                        setConfirmDeleteProductId(product.id)
                                      }
                                      className="p-1.5 text-[#6D665E] dark:text-[#9E978F] hover:text-red-600 dark:hover:text-red-400 cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 3. INVENTORY TAB */}
          {activeTab === 'inventory' && (
            <InventoryView
              products={products}
              logs={inventoryLogs}
              currency={currency}
              cadRate={storeSettings.cadExchangeRate}
              onAdjustStock={async (params) => {
                await adjustProductStock({
                  ...params,
                  actorUid: currentUser.uid,
                  actorName: currentUser.name,
                });
                showToast(
                  `Updated ${params.product.name} (${params.size}) stock to ${params.newQty}.`,
                );
              }}
            />
          )}

          {/* 4. ORDERS TAB */}
          {activeTab === 'orders' && (
            <OrdersView
              orders={orders}
              products={products}
              currency={currency}
              cadRate={storeSettings.cadExchangeRate}
              adminUid={currentUser.uid}
              onUpdateOrder={async (params) => {
                await updateOrderFulfillment(params);
                showToast(`Order status updated to ${params.status}.`);
              }}
              onCreateOrder={async (params) => {
                await createOrder(params);
                showToast(`Logged order ${params.orderNumber}.`);
              }}
              onDeleteOrder={async (orderId) => {
                await deleteOrderByAdmin(orderId);
                showToast('Deleted order record.');
              }}
            />
          )}

          {/* 5. USERS & ROLES TAB */}
          {activeTab === 'users' && (
            <UsersView
              users={users}
              orders={orders}
              currentAdminUid={currentUser.uid}
              currency={currency}
              cadRate={storeSettings.cadExchangeRate}
              onUpdateUser={async (params) => {
                await updateUserByAdmin(params);
                showToast(`Updated ${params.user.name} (${params.role}).`);
              }}
              onCreateUser={async (params) => {
                await createAdminManagedUser(params);
                showToast(`Added ${params.name} to directory.`);
              }}
              onDeleteUser={async (uid) => {
                await deleteUserByAdmin(uid);
                showToast('Removed user record.');
              }}
            />
          )}

          {/* 6. STORE SETTINGS TAB */}
          {activeTab === 'settings' && (
            <SettingsView
              settings={storeSettings}
              onSave={async (nextSettings) => {
                await saveStoreSettings(nextSettings);
                showToast('Storefront settings saved.');
              }}
            />
          )}
        </div>
      </main>

      {/* Product Create/Edit Slide-Over */}
      <ProductEditorModal
        isOpen={editorOpen}
        editingProduct={editingProduct}
        existingIds={products.map((p) => p.id)}
        onClose={() => setEditorOpen(false)}
        onSave={handleSaveProduct}
      />
    </div>
  );
}
