export type Size = 'XS' | 'S' | 'M' | 'L' | 'XL';

export type CategoryFilter = 'All' | 'Tops' | 'Outerwear';

export type CurrencyCode = 'USD' | 'CAD';

export type NavSection =
  | 'showroom'
  | 'shop-all'
  | 'new-arrivals'
  | 'bestsellers'
  | 'lookbook'
  | 'admin';

export type LightingMode = 'daylight' | 'gallery';

export type ThemeMode = 'light' | 'dark';

export type ProductStatus = 'active' | 'draft' | 'archived';

export type UserRole = 'admin' | 'manager' | 'customer';

export type UserTier = 'Studio Member' | 'VIP Member' | 'Staff';

export type UserStatus = 'active' | 'suspended';

export type OrderStatus =
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export type InventoryLogReason =
  | 'restock'
  | 'sale'
  | 'adjustment'
  | 'return'
  | 'damaged';

export interface ProductSpecs {
  fabric: string;
  weight: string;
  origin: string;
  fit: string;
  modelNote: string;
  care: string;
}

export interface SizeMeasurement {
  chest: number;
  length: number;
  shoulder: number;
  sleeve: number;
}

export interface ShowroomTurnaround {
  front: string;
  right: string;
  back: string;
  left: string;
}

export interface OutfitPairing {
  productId: string;
  role: string;
  note: string;
}

export type StockMap = Record<Size, number>;

export interface Product {
  id: string;
  sku: string;
  name: string;
  priceUsd: number;
  costUsd: number;
  category: 'Tops' | 'Outerwear';
  color: string;
  tagline: string;
  description: string;
  status: ProductStatus;
  showroomImage: string;
  showroomViews: ShowroomTurnaround;
  productImage: string;
  sizes: Size[];
  stock: StockMap;
  lowStockThreshold: number;
  isNewArrival?: boolean;
  isBestseller?: boolean;
  pairWithIds: string[];
  outfitPairings: OutfitPairing[];
  specs: ProductSpecs;
  measurements: Record<Size, SizeMeasurement>;
  createdAt?: string;
  updatedAt?: string;
}

export interface CartItem {
  productId: string;
  size: Size;
  quantity: number;
}

export interface MemberProfile {
  uid?: string;
  name: string;
  email: string;
  photoURL?: string;
  tier: UserTier | string;
  role?: UserRole;
  status?: UserStatus;
  isAdmin?: boolean;
}

export interface UserProfileRecord {
  uid: string;
  name: string;
  email: string;
  photoURL: string;
  role: UserRole;
  tier: UserTier;
  status: UserStatus;
  ordersCount: number;
  totalSpentUsd: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrderLineItem {
  productId: string;
  name: string;
  size: Size;
  quantity: number;
  unitPriceUsd: number;
}

export interface OrderReceipt {
  orderNumber: string;
  placedAt: string;
  email: string;
  shippingName: string;
  shippingAddress: string;
  items: Array<{
    productId?: string;
    name: string;
    size: Size;
    quantity: number;
    unitPriceUsd: number;
  }>;
  subtotalUsd: number;
  shippingUsd: number;
  currency: CurrencyCode;
}

export interface StoreOrder {
  id: string;
  orderNumber: string;
  userId: string;
  email: string;
  shippingName: string;
  shippingAddress: string;
  items: OrderLineItem[];
  subtotalUsd: number;
  shippingUsd: number;
  totalUsd: number;
  currency: CurrencyCode;
  status: OrderStatus;
  trackingNumber: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryLogEntry {
  id: string;
  productId: string;
  productName: string;
  size: Size;
  previousQty: number;
  delta: number;
  newQty: number;
  reason: InventoryLogReason;
  note: string;
  actorUid: string;
  actorName: string;
  createdAt: string;
}

export interface StoreSettings {
  storeName: string;
  announcementText: string;
  announcementEnabled: boolean;
  freeDeliveryThresholdUsd: number;
  standardShippingUsd: number;
  cadExchangeRate: number;
  lowStockDefaultThreshold: number;
  supportEmail: string;
  updatedAt?: string;
}
