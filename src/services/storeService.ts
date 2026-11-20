import { DEFAULT_STORE_SETTINGS, PRODUCTS, SIZES } from '../data/products';
import {
  CurrencyCode,
  InventoryLogEntry,
  InventoryLogReason,
  OrderLineItem,
  OrderStatus,
  Product,
  ProductStatus,
  Size,
  StockMap,
  StoreOrder,
  StoreSettings,
  UserProfileRecord,
  UserRole,
  UserStatus,
  UserTier,
} from '../types';

export const DEFAULT_ADMIN_EMAIL = 'shettyharikrishna1@gmail.com';
const STORAGE_DB_KEY = 'jhonty_hub_local_db_v2_inr';

export interface LocalStoreState {
  products: Product[];
  users: UserProfileRecord[];
  orders: StoreOrder[];
  inventoryLogs: InventoryLogEntry[];
  settings: StoreSettings;
}

type StoreListener = (state: LocalStoreState) => void;
const listeners = new Set<StoreListener>();

function clampString(value: string, maxLen: number): string {
  return value.trim().slice(0, maxLen);
}

export function slugifyId(input: string, maxLen = 64): string {
  const cleaned = input
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLen);
  return cleaned || `item-${Date.now()}`;
}

export function sanitizeSku(input: string): string {
  const cleaned = input
    .toUpperCase()
    .replace(/[^A-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
  return cleaned.length >= 2 ? cleaned : `JH-${Date.now().toString().slice(-5)}`;
}

function normalizeStock(stock?: Partial<StockMap>): StockMap {
  return {
    XS: Math.max(0, Math.min(100000, Math.round(Number(stock?.XS ?? 0)))),
    S: Math.max(0, Math.min(100000, Math.round(Number(stock?.S ?? 0)))),
    M: Math.max(0, Math.min(100000, Math.round(Number(stock?.M ?? 0)))),
    L: Math.max(0, Math.min(100000, Math.round(Number(stock?.L ?? 0)))),
    XL: Math.max(0, Math.min(100000, Math.round(Number(stock?.XL ?? 0)))),
  };
}

function createInitialState(): LocalStoreState {
  const now = new Date();
  const daysAgo = (days: number) =>
    new Date(now.getTime() - days * 86_400_000).toISOString();

  const initialUsers: UserProfileRecord[] = [
    {
      uid: 'usr-admin-primary',
      name: 'Studio Admin',
      email: DEFAULT_ADMIN_EMAIL,
      photoURL: '',
      role: 'admin',
      tier: 'Staff',
      status: 'active',
      ordersCount: 0,
      totalSpentUsd: 0,
      createdAt: daysAgo(30),
      updatedAt: daysAgo(1),
    },
    {
      uid: 'usr-manager-clara',
      name: 'Clara Holm',
      email: 'clara.holm@jhontyhub.studio',
      photoURL: '',
      role: 'manager',
      tier: 'Staff',
      status: 'active',
      ordersCount: 1,
      totalSpentUsd: 13999,
      createdAt: daysAgo(24),
      updatedAt: daysAgo(2),
    },
    {
      uid: 'usr-customer-henrik',
      name: 'Henrik Sorensen',
      email: 'henrik.sorensen@nordic.dk',
      photoURL: '',
      role: 'customer',
      tier: 'VIP Member',
      status: 'active',
      ordersCount: 2,
      totalSpentUsd: 21397,
      createdAt: daysAgo(18),
      updatedAt: daysAgo(1),
    },
    {
      uid: 'usr-customer-maya',
      name: 'Maya Chen',
      email: 'maya.chen@atelier.co',
      photoURL: '',
      role: 'customer',
      tier: 'Studio Member',
      status: 'active',
      ordersCount: 1,
      totalSpentUsd: 7499,
      createdAt: daysAgo(10),
      updatedAt: daysAgo(3),
    },
  ];

  const initialOrders: StoreOrder[] = [
    {
      id: 'ord-seed-4823',
      orderNumber: 'JH-4823',
      userId: 'usr-customer-henrik',
      email: 'henrik.sorensen@nordic.dk',
      shippingName: 'Henrik Sorensen',
      shippingAddress: 'Bredgade 18, 1260 Copenhagen, Denmark',
      items: [
        {
          productId: PRODUCTS[3].id,
          name: PRODUCTS[3].name,
          size: 'L',
          quantity: 1,
          unitPriceUsd: PRODUCTS[3].priceUsd,
        },
        {
          productId: PRODUCTS[0].id,
          name: PRODUCTS[0].name,
          size: 'L',
          quantity: 1,
          unitPriceUsd: PRODUCTS[0].priceUsd,
        },
      ],
      subtotalUsd: PRODUCTS[3].priceUsd + PRODUCTS[0].priceUsd,
      shippingUsd: 0,
      totalUsd: PRODUCTS[3].priceUsd + PRODUCTS[0].priceUsd,
      currency: 'INR',
      status: 'processing',
      trackingNumber: '',
      notes: 'Priority garment bag requested.',
      createdAt: daysAgo(1),
      updatedAt: daysAgo(1),
    },
    {
      id: 'ord-seed-4822',
      orderNumber: 'JH-4822',
      userId: 'usr-customer-maya',
      email: 'maya.chen@atelier.co',
      shippingName: 'Maya Chen',
      shippingAddress: '142 Indiranagar 100ft Rd, Bengaluru 560038',
      items: [
        {
          productId: PRODUCTS[2].id,
          name: PRODUCTS[2].name,
          size: 'M',
          quantity: 1,
          unitPriceUsd: PRODUCTS[2].priceUsd,
        },
      ],
      subtotalUsd: PRODUCTS[2].priceUsd,
      shippingUsd: 0,
      totalUsd: PRODUCTS[2].priceUsd,
      currency: 'INR',
      status: 'shipped',
      trackingNumber: 'BLUEDART-884120934',
      notes: 'Dispatched from Mumbai studio.',
      createdAt: daysAgo(3),
      updatedAt: daysAgo(2),
    },
    {
      id: 'ord-seed-4821',
      orderNumber: 'JH-4821',
      userId: 'usr-customer-henrik',
      email: 'henrik.sorensen@nordic.dk',
      shippingName: 'Henrik Sorensen',
      shippingAddress: 'Bredgade 18, 1260 Copenhagen, Denmark',
      items: [
        {
          productId: PRODUCTS[4].id,
          name: PRODUCTS[4].name,
          size: 'M',
          quantity: 1,
          unitPriceUsd: PRODUCTS[4].priceUsd,
        },
      ],
      subtotalUsd: PRODUCTS[4].priceUsd,
      shippingUsd: 0,
      totalUsd: PRODUCTS[4].priceUsd,
      currency: 'INR',
      status: 'delivered',
      trackingNumber: 'DHL-884019281',
      notes: 'Signed on delivery.',
      createdAt: daysAgo(9),
      updatedAt: daysAgo(6),
    },
  ];

  const initialLogs: InventoryLogEntry[] = [
    {
      id: 'log-seed-1',
      productId: PRODUCTS[3].id,
      productName: PRODUCTS[3].name,
      size: 'L',
      previousQty: 11,
      delta: -1,
      newQty: 10,
      reason: 'sale',
      note: 'Reserved for order JH-4823',
      actorUid: 'usr-admin-primary',
      actorName: 'Studio Admin',
      createdAt: daysAgo(1),
    },
    {
      id: 'log-seed-2',
      productId: PRODUCTS[1].id,
      productName: PRODUCTS[1].name,
      size: 'M',
      previousQty: 12,
      delta: 10,
      newQty: 22,
      reason: 'restock',
      note: 'Porto mill shipment #P-204 received',
      actorUid: 'usr-manager-clara',
      actorName: 'Clara Holm',
      createdAt: daysAgo(4),
    },
    {
      id: 'log-seed-3',
      productId: PRODUCTS[4].id,
      productName: PRODUCTS[4].name,
      size: 'XS',
      previousQty: 5,
      delta: -2,
      newQty: 3,
      reason: 'adjustment',
      note: 'Transferred 2 samples to flagship display',
      actorUid: 'usr-admin-primary',
      actorName: 'Studio Admin',
      createdAt: daysAgo(7),
    },
  ];

  return {
    products: PRODUCTS.map((p) => ({
      ...p,
      stock: { ...p.stock },
      createdAt: daysAgo(20),
      updatedAt: daysAgo(1),
    })),
    users: initialUsers,
    orders: initialOrders,
    inventoryLogs: initialLogs,
    settings: { ...DEFAULT_STORE_SETTINGS },
  };
}

function loadStateFromStorage(): LocalStoreState {
  try {
    const raw = window.localStorage.getItem(STORAGE_DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<LocalStoreState>;
      if (
        Array.isArray(parsed.products) &&
        Array.isArray(parsed.users) &&
        Array.isArray(parsed.orders) &&
        Array.isArray(parsed.inventoryLogs) &&
        parsed.settings
      ) {
        return {
          products: parsed.products,
          users: parsed.users,
          orders: parsed.orders,
          inventoryLogs: parsed.inventoryLogs,
          settings: {
            ...DEFAULT_STORE_SETTINGS,
            ...parsed.settings,
          },
        };
      }
    }
  } catch {
    // Fallback to clean seeded state
  }
  const initial = createInitialState();
  saveStateToStorage(initial);
  return initial;
}

function saveStateToStorage(state: LocalStoreState) {
  try {
    window.localStorage.setItem(STORAGE_DB_KEY, JSON.stringify(state));
  } catch {
    // Ignore quota errors
  }
}

let currentState: LocalStoreState = loadStateFromStorage();

function commitState(updater: (prev: LocalStoreState) => LocalStoreState) {
  currentState = updater(currentState);
  saveStateToStorage(currentState);
  listeners.forEach((listener) => listener(currentState));
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_DB_KEY) {
      currentState = loadStateFromStorage();
      listeners.forEach((listener) => listener(currentState));
    }
  });
}

export function getStoreSnapshot(): LocalStoreState {
  return currentState;
}

export function subscribeStore(listener: StoreListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function resetStoreToDefaults(): Promise<void> {
  commitState(() => createInitialState());
}

function sanitizeProduct(product: Product): Product {
  const id = slugifyId(product.id, 64);
  const validSizes = (product.sizes.length > 0 ? product.sizes : SIZES).filter(
    (s): s is Size => SIZES.includes(s),
  );
  const now = new Date().toISOString();

  return {
    ...product,
    id,
    sku: sanitizeSku(product.sku),
    name: clampString(product.name, 120) || 'Untitled Garment',
    priceUsd: Math.max(0, Math.min(10000000, Number(product.priceUsd) || 0)),
    costUsd: Math.max(0, Math.min(10000000, Number(product.costUsd) || 0)),
    category: product.category === 'Outerwear' ? 'Outerwear' : 'Tops',
    color: clampString(product.color, 80) || 'Neutral',
    tagline: clampString(product.tagline, 240) || 'Architectural menswear piece.',
    description:
      clampString(product.description, 1200) ||
      'Crafted for the Jhonty Hub permanent wardrobe.',
    status: (['active', 'draft', 'archived'].includes(product.status)
      ? product.status
      : 'active') as ProductStatus,
    showroomImage: clampString(
      product.showroomImage || product.showroomViews.front,
      500,
    ),
    showroomViews: {
      front: clampString(product.showroomViews.front || product.showroomImage, 500),
      right: clampString(product.showroomViews.right || product.showroomImage, 500),
      back: clampString(product.showroomViews.back || product.showroomImage, 500),
      left: clampString(product.showroomViews.left || product.showroomImage, 500),
    },
    productImage: clampString(
      product.productImage || product.showroomImage,
      500,
    ),
    sizes: validSizes.length > 0 ? validSizes : [...SIZES],
    stock: normalizeStock(product.stock),
    lowStockThreshold: Math.max(
      0,
      Math.min(500, Math.round(Number(product.lowStockThreshold) || 6)),
    ),
    isNewArrival: Boolean(product.isNewArrival),
    isBestseller: Boolean(product.isBestseller),
    pairWithIds: (product.pairWithIds || []).slice(0, 10),
    outfitPairings: (product.outfitPairings || []).slice(0, 10),
    createdAt: product.createdAt || now,
    updatedAt: now,
  };
}

export async function createProduct(product: Product): Promise<void> {
  const clean = sanitizeProduct(product);
  commitState((prev) => {
    const exists = prev.products.some((p) => p.id === clean.id);
    const finalProduct = exists
      ? { ...clean, id: `${clean.id}-${Date.now().toString().slice(-4)}` }
      : clean;
    return {
      ...prev,
      products: [finalProduct, ...prev.products],
    };
  });
}

export async function updateProduct(product: Product): Promise<void> {
  const clean = sanitizeProduct(product);
  commitState((prev) => ({
    ...prev,
    products: prev.products.map((p) =>
      p.id === clean.id ? { ...clean, createdAt: p.createdAt || clean.createdAt } : p,
    ),
  }));
}

export async function deleteProduct(productId: string): Promise<void> {
  commitState((prev) => ({
    ...prev,
    products: prev.products.filter((p) => p.id !== productId),
  }));
}

export async function adjustProductStock(params: {
  product: Product;
  size: Size;
  newQty: number;
  reason: InventoryLogReason;
  note: string;
  actorUid?: string;
  actorName?: string;
}): Promise<void> {
  const clampedNewQty = Math.max(0, Math.min(100000, Math.round(params.newQty)));
  const prevQty = params.product.stock[params.size] ?? 0;
  const delta = clampedNewQty - prevQty;
  if (delta === 0) return;

  const now = new Date().toISOString();
  const logEntry: InventoryLogEntry = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    productId: params.product.id,
    productName: clampString(params.product.name, 120),
    size: params.size,
    previousQty: prevQty,
    delta,
    newQty: clampedNewQty,
    reason: params.reason,
    note: clampString(params.note, 300),
    actorUid: params.actorUid || 'usr-admin-primary',
    actorName: clampString(params.actorName || 'Studio Admin', 120),
    createdAt: now,
  };

  commitState((prev) => ({
    ...prev,
    products: prev.products.map((p) =>
      p.id === params.product.id
        ? {
            ...p,
            stock: { ...p.stock, [params.size]: clampedNewQty },
            updatedAt: now,
          }
        : p,
    ),
    inventoryLogs: [logEntry, ...prev.inventoryLogs],
  }));
}

export function upsertSignedInUser(params: {
  name: string;
  email: string;
  role?: UserRole;
}): UserProfileRecord {
  const emailLower = params.email.trim().toLowerCase();
  const existing = currentState.users.find(
    (u) => u.email.toLowerCase() === emailLower,
  );
  if (existing) {
    return existing;
  }

  const now = new Date().toISOString();
  const isDefaultAdmin = emailLower === DEFAULT_ADMIN_EMAIL.toLowerCase();
  const role: UserRole = params.role ?? (isDefaultAdmin ? 'admin' : 'customer');
  const tier: UserTier = role === 'admin' || role === 'manager' ? 'Staff' : 'Studio Member';

  const newUser: UserProfileRecord = {
    uid: `usr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: clampString(params.name, 120) || emailLower.split('@')[0] || 'Member',
    email: clampString(params.email, 200),
    photoURL: '',
    role,
    tier,
    status: 'active',
    ordersCount: 0,
    totalSpentUsd: 0,
    createdAt: now,
    updatedAt: now,
  };

  commitState((prev) => ({
    ...prev,
    users: [newUser, ...prev.users],
  }));

  return newUser;
}

export async function updateUserByAdmin(params: {
  user: UserProfileRecord;
  name?: string;
  role: UserRole;
  tier: UserTier;
  status: UserStatus;
}): Promise<void> {
  const now = new Date().toISOString();
  commitState((prev) => ({
    ...prev,
    users: prev.users.map((u) =>
      u.uid === params.user.uid
        ? {
            ...u,
            name: params.name ? clampString(params.name, 120) || u.name : u.name,
            role: params.role,
            tier: params.tier,
            status: params.status,
            updatedAt: now,
          }
        : u,
    ),
  }));
}

export async function createAdminManagedUser(params: {
  name: string;
  email: string;
  role: UserRole;
  tier: UserTier;
  status: UserStatus;
}): Promise<void> {
  const now = new Date().toISOString();
  const newUser: UserProfileRecord = {
    uid: `usr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: clampString(params.name, 120),
    email: clampString(params.email, 200),
    photoURL: '',
    role: params.role,
    tier: params.tier,
    status: params.status,
    ordersCount: 0,
    totalSpentUsd: 0,
    createdAt: now,
    updatedAt: now,
  };

  commitState((prev) => ({
    ...prev,
    users: [newUser, ...prev.users],
  }));
}

export async function deleteUserByAdmin(uid: string): Promise<void> {
  commitState((prev) => ({
    ...prev,
    users: prev.users.filter((u) => u.uid !== uid),
  }));
}

export async function createOrder(params: {
  orderNumber: string;
  userId: string;
  email: string;
  shippingName: string;
  shippingAddress: string;
  items: OrderLineItem[];
  subtotalUsd: number;
  shippingUsd: number;
  currency: CurrencyCode;
  status?: OrderStatus;
  notes?: string;
}): Promise<string> {
  const orderId = `ord-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const now = new Date().toISOString();

  const cleanItems = params.items.slice(0, 25).map((item) => ({
    productId: slugifyId(item.productId, 64),
    name: clampString(item.name, 120),
    size: item.size,
    quantity: Math.max(1, Math.min(999, Math.round(item.quantity))),
    unitPriceUsd: Math.max(0, Number(item.unitPriceUsd) || 0),
  }));

  const subtotalUsd = Math.max(0, Number(params.subtotalUsd) || 0);
  const shippingUsd = Math.max(0, Number(params.shippingUsd) || 0);
  const cleanOrderNum = params.orderNumber
    .toUpperCase()
    .replace(/[^A-Z0-9-]+/g, '')
    .slice(0, 32);

  const newOrder: StoreOrder = {
    id: orderId,
    orderNumber:
      cleanOrderNum || `JH-${Math.floor(1000 + Math.random() * 9000)}`,
    userId: slugifyId(params.userId || 'guest', 128),
    email: clampString(params.email, 200),
    shippingName: clampString(params.shippingName, 120),
    shippingAddress: clampString(params.shippingAddress, 300),
    items: cleanItems,
    subtotalUsd,
    shippingUsd,
    totalUsd: subtotalUsd + shippingUsd,
    currency: params.currency,
    status: params.status || 'pending',
    trackingNumber: '',
    notes: clampString(params.notes || '', 500),
    createdAt: now,
    updatedAt: now,
  };

  commitState((prev) => {
    // Also decrement stock for ordered items and write audit log entries
    const nextLogs: InventoryLogEntry[] = [];
    const nextProducts = prev.products.map((product) => {
      const matchingItems = cleanItems.filter((i) => i.productId === product.id);
      if (matchingItems.length === 0) return product;
      const nextStock = { ...product.stock };
      matchingItems.forEach((item) => {
        const before = nextStock[item.size] ?? 0;
        const after = Math.max(0, before - item.quantity);
        if (after !== before) {
          nextStock[item.size] = after;
          nextLogs.push({
            id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            productId: product.id,
            productName: product.name,
            size: item.size,
            previousQty: before,
            delta: after - before,
            newQty: after,
            reason: 'sale',
            note: `Order ${newOrder.orderNumber} (${newOrder.shippingName})`,
            actorUid: newOrder.userId,
            actorName: newOrder.shippingName || 'Checkout',
            createdAt: now,
          });
        }
      });
      return { ...product, stock: nextStock, updatedAt: now };
    });

    return {
      ...prev,
      products: nextProducts,
      orders: [newOrder, ...prev.orders],
      inventoryLogs: [...nextLogs, ...prev.inventoryLogs],
    };
  });

  return orderId;
}

export async function updateOrderFulfillment(params: {
  orderId: string;
  status: OrderStatus;
  trackingNumber: string;
  notes: string;
}): Promise<void> {
  const now = new Date().toISOString();
  commitState((prev) => ({
    ...prev,
    orders: prev.orders.map((o) =>
      o.id === params.orderId
        ? {
            ...o,
            status: params.status,
            trackingNumber: clampString(params.trackingNumber, 80),
            notes: clampString(params.notes, 500),
            updatedAt: now,
          }
        : o,
    ),
  }));
}

export async function deleteOrderByAdmin(orderId: string): Promise<void> {
  commitState((prev) => ({
    ...prev,
    orders: prev.orders.filter((o) => o.id !== orderId),
  }));
}

export async function saveStoreSettings(settings: StoreSettings): Promise<void> {
  commitState((prev) => ({
    ...prev,
    settings: {
      storeName: clampString(settings.storeName, 80) || 'Jhonty Hub',
      announcementText: clampString(settings.announcementText, 200),
      announcementEnabled: Boolean(settings.announcementEnabled),
      freeDeliveryThresholdUsd: Math.max(
        0,
        Math.min(500000, Number(settings.freeDeliveryThresholdUsd) || 0),
      ),
      standardShippingUsd: Math.max(
        0,
        Math.min(50000, Number(settings.standardShippingUsd) || 0),
      ),
      cadExchangeRate: 1,
      lowStockDefaultThreshold: Math.max(
        0,
        Math.min(500, Math.round(Number(settings.lowStockDefaultThreshold) || 6)),
      ),
      supportEmail:
        clampString(settings.supportEmail, 200) || 'concierge@jhontyhub.studio',
    },
  }));
}
