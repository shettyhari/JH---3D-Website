export type Size = 'XS' | 'S' | 'M' | 'L' | 'XL';

export type CategoryFilter = 'All' | 'Tops' | 'Outerwear';

export type CurrencyCode = 'USD' | 'CAD';

export type NavSection =
  | 'showroom'
  | 'shop-all'
  | 'new-arrivals'
  | 'bestsellers'
  | 'lookbook';

export type LightingMode = 'daylight' | 'gallery';

export type ThemeMode = 'light' | 'dark';

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

export interface Product {
  id: string;
  name: string;
  priceUsd: number;
  category: 'Tops' | 'Outerwear';
  color: string;
  tagline: string;
  description: string;
  showroomImage: string;
  showroomViews: ShowroomTurnaround;
  productImage: string;
  sizes: Size[];
  isNewArrival?: boolean;
  isBestseller?: boolean;
  pairWithIds: string[];
  outfitPairings: OutfitPairing[];
  specs: ProductSpecs;
  measurements: Record<Size, SizeMeasurement>;
}

export interface CartItem {
  productId: string;
  size: Size;
  quantity: number;
}

export interface MemberProfile {
  name: string;
  email: string;
  tier: string;
}

export interface OrderReceipt {
  orderNumber: string;
  placedAt: string;
  email: string;
  shippingName: string;
  shippingAddress: string;
  items: Array<{
    name: string;
    size: Size;
    quantity: number;
    unitPriceUsd: number;
  }>;
  subtotalUsd: number;
  shippingUsd: number;
  currency: CurrencyCode;
}
