import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { DEFAULT_STORE_SETTINGS, PRODUCTS, SIZES } from '../data/products';
import {
  auth,
  BOOTSTRAPPED_ADMIN_EMAIL,
  db,
  handleFirestoreError,
  OperationType,
} from '../firebase';
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

export function formatTimestamp(value: unknown): string {
  if (!value) return '';
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof (value as { toDate: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof value === 'string') return value;
  return '';
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

function buildProductPayload(product: Product) {
  const id = slugifyId(product.id, 64);
  const validSizes = (product.sizes.length > 0 ? product.sizes : SIZES).filter(
    (s): s is Size => SIZES.includes(s),
  );

  return {
    id,
    sku: sanitizeSku(product.sku),
    name: clampString(product.name, 120) || 'Untitled Garment',
    priceUsd: Math.max(0, Math.min(100000, Number(product.priceUsd) || 0)),
    costUsd: Math.max(0, Math.min(100000, Number(product.costUsd) || 0)),
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
      Math.min(1000, Math.round(Number(product.lowStockThreshold ?? 6))),
    ),
    isNewArrival: Boolean(product.isNewArrival),
    isBestseller: Boolean(product.isBestseller),
    pairWithIds: (product.pairWithIds || []).slice(0, 6).map((pid) => slugifyId(pid, 64)),
    outfitPairings: (product.outfitPairings || []).slice(0, 6).map((op) => ({
      productId: slugifyId(op.productId, 64),
      role: clampString(op.role, 60) || 'Pairing',
      note: clampString(op.note, 220) || 'Curated studio pairing.',
    })),
    specs: {
      fabric: clampString(product.specs.fabric, 160) || '100% Organic Cotton',
      weight: clampString(product.specs.weight, 120) || '260 GSM',
      origin: clampString(product.specs.origin, 160) || 'Porto, Portugal',
      fit: clampString(product.specs.fit, 160) || 'Regular architectural fit',
      modelNote:
        clampString(product.specs.modelNote, 160) ||
        'Model is 6\'1" (185 cm) wearing size M',
      care: clampString(product.specs.care, 200) || 'Machine wash cold gentle',
    },
    measurements: {
      XS: {
        chest: Math.max(40, Math.min(250, Number(product.measurements.XS.chest) || 100)),
        length: Math.max(30, Math.min(200, Number(product.measurements.XS.length) || 66)),
        shoulder: Math.max(25, Math.min(120, Number(product.measurements.XS.shoulder) || 44)),
        sleeve: Math.max(10, Math.min(120, Number(product.measurements.XS.sleeve) || 60)),
      },
      S: {
        chest: Math.max(40, Math.min(250, Number(product.measurements.S.chest) || 106)),
        length: Math.max(30, Math.min(200, Number(product.measurements.S.length) || 68)),
        shoulder: Math.max(25, Math.min(120, Number(product.measurements.S.shoulder) || 46)),
        sleeve: Math.max(10, Math.min(120, Number(product.measurements.S.sleeve) || 61.5)),
      },
      M: {
        chest: Math.max(40, Math.min(250, Number(product.measurements.M.chest) || 112)),
        length: Math.max(30, Math.min(200, Number(product.measurements.M.length) || 70)),
        shoulder: Math.max(25, Math.min(120, Number(product.measurements.M.shoulder) || 48)),
        sleeve: Math.max(10, Math.min(120, Number(product.measurements.M.sleeve) || 63)),
      },
      L: {
        chest: Math.max(40, Math.min(250, Number(product.measurements.L.chest) || 118)),
        length: Math.max(30, Math.min(200, Number(product.measurements.L.length) || 72)),
        shoulder: Math.max(25, Math.min(120, Number(product.measurements.L.shoulder) || 50)),
        sleeve: Math.max(10, Math.min(120, Number(product.measurements.L.sleeve) || 64.5)),
      },
      XL: {
        chest: Math.max(40, Math.min(250, Number(product.measurements.XL.chest) || 124)),
        length: Math.max(30, Math.min(200, Number(product.measurements.XL.length) || 74)),
        shoulder: Math.max(25, Math.min(120, Number(product.measurements.XL.shoulder) || 52)),
        sleeve: Math.max(10, Math.min(120, Number(product.measurements.XL.sleeve) || 66)),
      },
    },
  };
}

export function mapProductDoc(raw: Record<string, unknown>, docId: string): Product {
  return {
    id: String(raw.id || docId),
    sku: String(raw.sku || `JH-${docId.slice(0, 4).toUpperCase()}`),
    name: String(raw.name || 'Untitled'),
    priceUsd: Number(raw.priceUsd ?? 0),
    costUsd: Number(raw.costUsd ?? 0),
    category: raw.category === 'Outerwear' ? 'Outerwear' : 'Tops',
    color: String(raw.color || ''),
    tagline: String(raw.tagline || ''),
    description: String(raw.description || ''),
    status: (['active', 'draft', 'archived'].includes(String(raw.status))
      ? raw.status
      : 'active') as ProductStatus,
    showroomImage: String(raw.showroomImage || ''),
    showroomViews: (raw.showroomViews as Product['showroomViews']) || {
      front: String(raw.showroomImage || ''),
      right: String(raw.showroomImage || ''),
      back: String(raw.showroomImage || ''),
      left: String(raw.showroomImage || ''),
    },
    productImage: String(raw.productImage || ''),
    sizes: (Array.isArray(raw.sizes) && raw.sizes.length > 0
      ? raw.sizes
      : SIZES) as Size[],
    stock: normalizeStock(raw.stock as Partial<StockMap>),
    lowStockThreshold: Number(raw.lowStockThreshold ?? 6),
    isNewArrival: Boolean(raw.isNewArrival),
    isBestseller: Boolean(raw.isBestseller),
    pairWithIds: Array.isArray(raw.pairWithIds) ? (raw.pairWithIds as string[]) : [],
    outfitPairings: Array.isArray(raw.outfitPairings)
      ? (raw.outfitPairings as Product['outfitPairings'])
      : [],
    specs: raw.specs as Product['specs'],
    measurements: raw.measurements as Product['measurements'],
    createdAt: formatTimestamp(raw.createdAt),
    updatedAt: formatTimestamp(raw.updatedAt),
  };
}

export async function seedInitialCatalogIfEmpty(): Promise<boolean> {
  try {
    const existingSnap = await getDocs(collection(db, 'products'));
    if (!existingSnap.empty) return false;

    const batch = writeBatch(db);
    for (const product of PRODUCTS) {
      const ref = doc(db, 'products', product.id);
      batch.set(ref, {
        ...buildProductPayload(product),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    const settingsRef = doc(db, 'settings', 'store');
    const settingsSnap = await getDoc(settingsRef);
    if (!settingsSnap.exists()) {
      batch.set(settingsRef, {
        ...DEFAULT_STORE_SETTINGS,
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'products');
  }
}

export async function createProduct(product: Product): Promise<void> {
  const payload = buildProductPayload(product);
  const path = `products/${payload.id}`;
  try {
    await setDoc(doc(db, 'products', payload.id), {
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateProduct(product: Product): Promise<void> {
  const payload = buildProductPayload(product);
  const path = `products/${payload.id}`;
  try {
    const { id: _id, ...updatableFields } = payload;
    await updateDoc(doc(db, 'products', payload.id), {
      ...updatableFields,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteProduct(productId: string): Promise<void> {
  const path = `products/${productId}`;
  try {
    await deleteDoc(doc(db, 'products', productId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function adjustProductStock(params: {
  product: Product;
  size: Size;
  newQty: number;
  reason: InventoryLogReason;
  note: string;
}): Promise<void> {
  const { product, size, reason, note } = params;
  const clampedQty = Math.max(0, Math.min(100000, Math.round(params.newQty)));
  const previousQty = Math.round(product.stock[size] ?? 0);
  const delta = clampedQty - previousQty;
  if (delta === 0) return;

  const actorUid = auth.currentUser?.uid || 'admin';
  const actorName = clampString(
    auth.currentUser?.displayName || auth.currentUser?.email || 'Admin',
    120,
  );
  const nextStock: StockMap = {
    ...normalizeStock(product.stock),
    [size]: clampedQty,
  };

  const logId = `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'products', product.id), {
      stock: nextStock,
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'inventoryLogs', logId), {
      productId: product.id,
      productName: clampString(product.name, 120),
      size,
      previousQty,
      delta,
      newQty: clampedQty,
      reason,
      note: clampString(note, 240),
      actorUid,
      actorName,
      createdAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `products/${product.id}`);
  }
}

export async function ensureUserProfile(params: {
  uid: string;
  name: string;
  email: string;
  photoURL: string;
  emailVerified: boolean;
}): Promise<{ profile: UserProfileRecord; isAdmin: boolean }> {
  const { uid, name, email, photoURL, emailVerified } = params;
  const userPath = `users/${uid}`;
  const isBootstrapped =
    emailVerified && email.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase();

  try {
    let hasAdminDoc = false;
    try {
      const adminSnap = await getDoc(doc(db, 'admins', uid));
      hasAdminDoc = adminSnap.exists();
    } catch {
      hasAdminDoc = false;
    }

    const isAdmin = Boolean(isBootstrapped || (emailVerified && hasAdminDoc));

    // Ensure bootstrapped owner also has an /admins/{uid} record
    if (isBootstrapped && !hasAdminDoc) {
      try {
        await setDoc(doc(db, 'admins', uid), {
          uid,
          email: clampString(email, 200),
          grantedBy: uid,
          createdAt: serverTimestamp(),
        });
      } catch {
        // Bootstrapped email already satisfies isAdmin() in rules
      }
    }

    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
      const initialRole: UserRole = isAdmin ? 'admin' : 'customer';
      const initialTier: UserTier = isAdmin ? 'Staff' : 'Studio Member';
      await setDoc(userRef, {
        uid,
        name: clampString(name || email.split('@')[0], 120),
        email: clampString(email, 200),
        photoURL: clampString(photoURL || '', 500),
        role: initialRole,
        tier: initialTier,
        status: 'active',
        ordersCount: 0,
        totalSpentUsd: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      const nowIso = new Date().toISOString();
      return {
        profile: {
          uid,
          name: clampString(name || email.split('@')[0], 120),
          email: clampString(email, 200),
          photoURL: clampString(photoURL || '', 500),
          role: initialRole,
          tier: initialTier,
          status: 'active',
          ordersCount: 0,
          totalSpentUsd: 0,
          createdAt: nowIso,
          updatedAt: nowIso,
        },
        isAdmin,
      };
    }

    const data = snap.data();
    const record: UserProfileRecord = {
      uid: String(data.uid || uid),
      name: String(data.name || name),
      email: String(data.email || email),
      photoURL: String(data.photoURL || photoURL || ''),
      role: (data.role as UserRole) || (isAdmin ? 'admin' : 'customer'),
      tier: (data.tier as UserTier) || 'Studio Member',
      status: (data.status as UserStatus) || 'active',
      ordersCount: Number(data.ordersCount ?? 0),
      totalSpentUsd: Number(data.totalSpentUsd ?? 0),
      createdAt: formatTimestamp(data.createdAt),
      updatedAt: formatTimestamp(data.updatedAt),
    };

    // Sync bootstrapped admin's role field in /users if needed
    if (isBootstrapped && record.role !== 'admin') {
      await updateDoc(userRef, {
        role: 'admin',
        tier: 'Staff',
        updatedAt: serverTimestamp(),
      });
      record.role = 'admin';
      record.tier = 'Staff';
    }

    return { profile: record, isAdmin: isAdmin || record.role === 'admin' };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }
}

export async function updateUserByAdmin(params: {
  user: UserProfileRecord;
  role: UserRole;
  tier: UserTier;
  status: UserStatus;
  name?: string;
}): Promise<void> {
  const { user, role, tier, status, name } = params;
  const currentUid = auth.currentUser?.uid || '';
  const path = `users/${user.uid}`;

  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'users', user.uid), {
      name: clampString(name ?? user.name, 120),
      role,
      tier,
      status,
      updatedAt: serverTimestamp(),
    });

    const adminRef = doc(db, 'admins', user.uid);
    if (role === 'admin') {
      const existingAdmin = await getDoc(adminRef);
      if (!existingAdmin.exists()) {
        batch.set(adminRef, {
          uid: user.uid,
          email: clampString(user.email, 200),
          grantedBy: currentUid,
          createdAt: serverTimestamp(),
        });
      }
    } else if (user.uid !== currentUid) {
      const existingAdmin = await getDoc(adminRef);
      if (existingAdmin.exists()) {
        batch.delete(adminRef);
      }
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function createAdminManagedUser(params: {
  name: string;
  email: string;
  role: UserRole;
  tier: UserTier;
  status: UserStatus;
}): Promise<void> {
  const uid = `usr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const path = `users/${uid}`;
  const currentUid = auth.currentUser?.uid || uid;

  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'users', uid), {
      uid,
      name: clampString(params.name, 120),
      email: clampString(params.email, 200),
      photoURL: '',
      role: params.role,
      tier: params.tier,
      status: params.status,
      ordersCount: 0,
      totalSpentUsd: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    if (params.role === 'admin') {
      batch.set(doc(db, 'admins', uid), {
        uid,
        email: clampString(params.email, 200),
        grantedBy: currentUid,
        createdAt: serverTimestamp(),
      });
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteUserByAdmin(uid: string): Promise<void> {
  const path = `users/${uid}`;
  try {
    const batch = writeBatch(db);
    batch.delete(doc(db, 'users', uid));
    const adminSnap = await getDoc(doc(db, 'admins', uid));
    if (adminSnap.exists()) {
      batch.delete(doc(db, 'admins', uid));
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
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
  const path = `orders/${orderId}`;

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

  try {
    await setDoc(doc(db, 'orders', orderId), {
      orderNumber: cleanOrderNum || `JH-${Math.floor(1000 + Math.random() * 9000)}`,
      userId: slugifyId(params.userId, 128),
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
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return orderId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateOrderFulfillment(params: {
  orderId: string;
  status: OrderStatus;
  trackingNumber: string;
  notes: string;
}): Promise<void> {
  const path = `orders/${params.orderId}`;
  try {
    await updateDoc(doc(db, 'orders', params.orderId), {
      status: params.status,
      trackingNumber: clampString(params.trackingNumber, 80),
      notes: clampString(params.notes, 500),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteOrderByAdmin(orderId: string): Promise<void> {
  const path = `orders/${orderId}`;
  try {
    await deleteDoc(doc(db, 'orders', orderId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveStoreSettings(settings: StoreSettings): Promise<void> {
  const path = 'settings/store';
  try {
    await setDoc(doc(db, 'settings', 'store'), {
      storeName: clampString(settings.storeName, 80) || 'Jhonty Hub',
      announcementText: clampString(settings.announcementText, 200),
      announcementEnabled: Boolean(settings.announcementEnabled),
      freeDeliveryThresholdUsd: Math.max(
        0,
        Math.min(10000, Number(settings.freeDeliveryThresholdUsd) || 0),
      ),
      standardShippingUsd: Math.max(
        0,
        Math.min(500, Number(settings.standardShippingUsd) || 0),
      ),
      cadExchangeRate: Math.max(
        0.1,
        Math.min(10, Number(settings.cadExchangeRate) || 1.36),
      ),
      lowStockDefaultThreshold: Math.max(
        0,
        Math.min(500, Math.round(Number(settings.lowStockDefaultThreshold) || 6)),
      ),
      supportEmail:
        clampString(settings.supportEmail, 200) || 'concierge@jhontyhub.studio',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function mapUserDoc(
  raw: Record<string, unknown>,
  docId: string,
): UserProfileRecord {
  return {
    uid: String(raw.uid || docId),
    name: String(raw.name || 'Member'),
    email: String(raw.email || ''),
    photoURL: String(raw.photoURL || ''),
    role: (raw.role as UserRole) || 'customer',
    tier: (raw.tier as UserTier) || 'Studio Member',
    status: (raw.status as UserStatus) || 'active',
    ordersCount: Number(raw.ordersCount ?? 0),
    totalSpentUsd: Number(raw.totalSpentUsd ?? 0),
    createdAt: formatTimestamp(raw.createdAt),
    updatedAt: formatTimestamp(raw.updatedAt),
  };
}

export function mapOrderDoc(
  raw: Record<string, unknown>,
  docId: string,
): StoreOrder {
  return {
    id: docId,
    orderNumber: String(raw.orderNumber || docId),
    userId: String(raw.userId || ''),
    email: String(raw.email || ''),
    shippingName: String(raw.shippingName || ''),
    shippingAddress: String(raw.shippingAddress || ''),
    items: Array.isArray(raw.items) ? (raw.items as OrderLineItem[]) : [],
    subtotalUsd: Number(raw.subtotalUsd ?? 0),
    shippingUsd: Number(raw.shippingUsd ?? 0),
    totalUsd: Number(raw.totalUsd ?? 0),
    currency: (raw.currency as CurrencyCode) || 'USD',
    status: (raw.status as OrderStatus) || 'pending',
    trackingNumber: String(raw.trackingNumber || ''),
    notes: String(raw.notes || ''),
    createdAt: formatTimestamp(raw.createdAt),
    updatedAt: formatTimestamp(raw.updatedAt),
  };
}

export function mapInventoryLogDoc(
  raw: Record<string, unknown>,
  docId: string,
): InventoryLogEntry {
  return {
    id: docId,
    productId: String(raw.productId || ''),
    productName: String(raw.productName || ''),
    size: (raw.size as Size) || 'M',
    previousQty: Number(raw.previousQty ?? 0),
    delta: Number(raw.delta ?? 0),
    newQty: Number(raw.newQty ?? 0),
    reason: (raw.reason as InventoryLogReason) || 'adjustment',
    note: String(raw.note || ''),
    actorUid: String(raw.actorUid || ''),
    actorName: String(raw.actorName || 'Admin'),
    createdAt: formatTimestamp(raw.createdAt),
  };
}
