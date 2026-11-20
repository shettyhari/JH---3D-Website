import { CurrencyCode, Product, Size } from '../types';

export const SIZES: Size[] = ['XS', 'S', 'M', 'L', 'XL'];

export const FREE_DELIVERY_THRESHOLD_USD = 100;

export const CURRENCIES: Record<
  CurrencyCode,
  { label: string; shortLabel: string; symbol: string; rate: number }
> = {
  USD: {
    label: 'US (USD)',
    shortLabel: 'USD',
    symbol: '$',
    rate: 1,
  },
  CAD: {
    label: 'CA (CAD)',
    shortLabel: 'CAD',
    symbol: '$',
    rate: 1.36,
  },
};

export function formatPrice(amountUsd: number, currency: CurrencyCode): string {
  const cfg = CURRENCIES[currency];
  const converted = amountUsd * cfg.rate;
  return `${cfg.symbol}${converted.toFixed(2)}`;
}

export const PRODUCTS: Product[] = [
  {
    id: 'ringer-tee',
    name: 'Ringer Tee',
    priceUsd: 38.0,
    category: 'Tops',
    color: 'Chalk / Deep Navy',
    tagline: 'Heavyweight combed organic jersey with contrast rib binding.',
    description:
      'Cut in a clean boxy block from 260 GSM Portuguese combed cotton jersey. Finished with dense navy ribbed neckline and cuff trims that retain structure wash after wash.',
    showroomImage: '/src/assets/images/jh_ringer_front_1795173047482.jpg',
    showroomViews: {
      front: '/src/assets/images/jh_ringer_front_1795173047482.jpg',
      right: '/src/assets/images/jh_ringer_right_1795173047252.jpg',
      back: '/src/assets/images/jh_ringer_back_1795173047187.jpg',
      left: '/src/assets/images/jh_ringer_left_1795173047478.jpg',
    },
    productImage: '/src/assets/images/garment_ringer_tee_1795163913006.jpg',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    isBestseller: true,
    pairWithIds: ['canvas-chore-jacket', 'nylon-bomber', 'loop-hoodie'],
    outfitPairings: [
      {
        productId: 'canvas-chore-jacket',
        role: 'Outer Layer',
        note: 'Field olive duck canvas frames the chalk jersey and dark navy collar trim.',
      },
      {
        productId: 'nylon-bomber',
        role: 'Evening Shell',
        note: 'Echoes the ringer navy binding with crisp matte technical nylon structure.',
      },
      {
        productId: 'loop-hoodie',
        role: 'Relaxed Layer',
        note: 'Adds 460 GSM tonal warmth while letting the ringer neckline peek through.',
      },
    ],
    specs: {
      fabric: '100% Organic Combed Cotton',
      weight: '260 GSM Heavy Jersey',
      origin: 'Knitted & sewn in Porto, Portugal',
      fit: 'Regular boxy silhouette, true to size',
      modelNote: 'Model is 6\'1" (185 cm) wearing size M',
      care: 'Machine wash cold gentle, dry flat',
    },
    measurements: {
      XS: { chest: 100, length: 66, shoulder: 44.5, sleeve: 21.5 },
      S: { chest: 106, length: 68, shoulder: 46.5, sleeve: 22.5 },
      M: { chest: 112, length: 70, shoulder: 48.5, sleeve: 23.5 },
      L: { chest: 118, length: 72, shoulder: 50.5, sleeve: 24.5 },
      XL: { chest: 124, length: 74, shoulder: 52.5, sleeve: 25.5 },
    },
  },
  {
    id: 'linen-shirt',
    name: 'Linen Shirt',
    priceUsd: 78.0,
    category: 'Tops',
    color: 'Sky Chambray',
    tagline: 'Airy Belgian flax linen washed for immediate softness.',
    description:
      'Tailored from long-staple European flax with natural thermoregulating weave. Features mother-of-pearl buttons, single chest pocket, and a gently curved hem designed to wear untucked.',
    showroomImage: '/src/assets/images/jh_linen_front_1795173047315.jpg',
    showroomViews: {
      front: '/src/assets/images/jh_linen_front_1795173047315.jpg',
      right: '/src/assets/images/jh_linen_right_1795173048066.jpg',
      back: '/src/assets/images/jh_linen_back_1795173048092.jpg',
      left: '/src/assets/images/jh_linen_left_1795173048223.jpg',
    },
    productImage: '/src/assets/images/garment_linen_shirt_1795163913327.jpg',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    isNewArrival: true,
    pairWithIds: ['nylon-bomber', 'canvas-chore-jacket', 'ringer-tee'],
    outfitPairings: [
      {
        productId: 'nylon-bomber',
        role: 'Outer Shell',
        note: 'Deep midnight navy anchors the airy sky-blue Belgian flax weave.',
      },
      {
        productId: 'canvas-chore-jacket',
        role: 'Utility Layer',
        note: 'Pairs rugged olive canvas texture against crisp buttoned linen.',
      },
      {
        productId: 'ringer-tee',
        role: 'Base Layer',
        note: 'Wear the linen shirt open as a light overshirt over the heavyweight tee.',
      },
    ],
    specs: {
      fabric: '100% Belgian Long-Staple Linen',
      weight: '165 GSM Breathable Plain Weave',
      origin: 'Woven in Flanders, tailored in Portugal',
      fit: 'Relaxed tailored drape with ease through chest',
      modelNote: 'Model is 6\'1" (185 cm) wearing size M',
      care: 'Machine wash cold, steam lightly while damp',
    },
    measurements: {
      XS: { chest: 104, length: 72, shoulder: 44, sleeve: 62 },
      S: { chest: 110, length: 74, shoulder: 46, sleeve: 63.5 },
      M: { chest: 116, length: 76, shoulder: 48, sleeve: 65 },
      L: { chest: 122, length: 78, shoulder: 50, sleeve: 66.5 },
      XL: { chest: 128, length: 80, shoulder: 52, sleeve: 68 },
    },
  },
  {
    id: 'loop-hoodie',
    name: 'Loop Hoodie',
    priceUsd: 88.0,
    category: 'Tops',
    color: 'Heather Ash',
    tagline: 'Structured 460 GSM diagonal loopback French terry.',
    description:
      'Engineered with a double-layered self-standing hood, brushed metal aglets, and side rib gussets for clean architectural drape without bulk.',
    showroomImage: '/src/assets/images/jh_hoodie_front_1795173047250.jpg',
    showroomViews: {
      front: '/src/assets/images/jh_hoodie_front_1795173047250.jpg',
      right: '/src/assets/images/jh_hoodie_right_1795173048191.jpg',
      back: '/src/assets/images/jh_hoodie_back_1795173047811.jpg',
      left: '/src/assets/images/jh_hoodie_left_1795173048658.jpg',
    },
    productImage: '/src/assets/images/garment_loop_hoodie_1795163913762.jpg',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    isBestseller: true,
    pairWithIds: ['nylon-bomber', 'canvas-chore-jacket', 'ringer-tee'],
    outfitPairings: [
      {
        productId: 'nylon-bomber',
        role: 'Outer Layer',
        note: 'Classic cropped flight silhouette lets the structured heather hood sit cleanly over the collar.',
      },
      {
        productId: 'canvas-chore-jacket',
        role: 'Workwear Layer',
        note: 'Boxy 12oz olive canvas layers effortlessly over heavy French terry.',
      },
      {
        productId: 'ringer-tee',
        role: 'Under Layer',
        note: 'Provides a clean chalk hem edge beneath the ribbed waist of the hoodie.',
      },
    ],
    specs: {
      fabric: '100% Ring-Spun Loopback Cotton',
      weight: '460 GSM Heavy French Terry',
      origin: 'Milled & crafted in Braga, Portugal',
      fit: 'Structured relaxed fit with dropped shoulder',
      modelNote: 'Model is 6\'1" (185 cm) wearing size M',
      care: 'Machine wash cold inside out, lay flat to dry',
    },
    measurements: {
      XS: { chest: 112, length: 65, shoulder: 51, sleeve: 59 },
      S: { chest: 118, length: 67, shoulder: 53, sleeve: 60.5 },
      M: { chest: 124, length: 69, shoulder: 55, sleeve: 62 },
      L: { chest: 130, length: 71, shoulder: 57, sleeve: 63.5 },
      XL: { chest: 136, length: 73, shoulder: 59, sleeve: 65 },
    },
  },
  {
    id: 'breton-long-sleeve',
    name: 'Breton Long Sleeve',
    priceUsd: 68.0,
    category: 'Tops',
    color: 'Ecru / Maritime Navy',
    tagline: 'Yarn-dyed horizontal stripe knit in dense interlock cotton.',
    description:
      'Inspired by archival coastal workwear and refined for modern layering. Yarn-dyed stripes ensure crisp definition and zero fade over years of wear.',
    showroomImage: '/src/assets/images/jh_breton_front_1795173166048.jpg',
    showroomViews: {
      front: '/src/assets/images/jh_breton_front_1795173166048.jpg',
      right: '/src/assets/images/jh_breton_right_1795173200001.jpg',
      back: '/src/assets/images/jh_breton_back_1795173168034.jpg',
      left: '/src/assets/images/jh_breton_left_1795173200002.jpg',
    },
    productImage: '/src/assets/images/garment_breton_stripe_1795163913613.jpg',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    isNewArrival: true,
    isBestseller: true,
    pairWithIds: ['canvas-chore-jacket', 'nylon-bomber', 'linen-shirt'],
    outfitPairings: [
      {
        productId: 'canvas-chore-jacket',
        role: 'Signature Pairing',
        note: 'Earthy olive workwear grounds the maritime ecru-and-navy stripes.',
      },
      {
        productId: 'nylon-bomber',
        role: 'Tonal Shell',
        note: 'Ties directly into the yarn-dyed navy stripe for a sharp coastal palette.',
      },
      {
        productId: 'linen-shirt',
        role: 'Light Overshirt',
        note: 'Worn unbuttoned for relaxed warm-weather tonal layering.',
      },
    ],
    specs: {
      fabric: '100% Yarn-Dyed Heavy Cotton',
      weight: '290 GSM Structured Interlock',
      origin: 'Knitted in Normandy, France',
      fit: 'Classic straight cut with ribbed cuffs',
      modelNote: 'Model is 6\'1" (185 cm) wearing size M',
      care: 'Machine wash 30°C, reshape while damp',
    },
    measurements: {
      XS: { chest: 102, length: 67, shoulder: 44, sleeve: 61 },
      S: { chest: 108, length: 69, shoulder: 46, sleeve: 62.5 },
      M: { chest: 114, length: 71, shoulder: 48, sleeve: 64 },
      L: { chest: 120, length: 73, shoulder: 50, sleeve: 65.5 },
      XL: { chest: 126, length: 75, shoulder: 52, sleeve: 67 },
    },
  },
  {
    id: 'canvas-chore-jacket',
    name: 'Canvas Chore Jacket',
    priceUsd: 148.0,
    category: 'Outerwear',
    color: 'Field Olive',
    tagline: 'Garment-dyed 12oz duck canvas utility jacket with corozo buttons.',
    description:
      'Our signature transitional layer. Built from tightly woven organic cotton duck canvas that breaks in gracefully to the wearer. Detailed with four reinforced patch pockets and an interior chest pocket.',
    showroomImage: '/src/assets/images/jh_chore_front_1795173166215.jpg',
    showroomViews: {
      front: '/src/assets/images/jh_chore_front_1795173166215.jpg',
      right: '/src/assets/images/jh_chore_right_1795173200005.jpg',
      back: '/src/assets/images/jh_chore_back_1795173200006.jpg',
      left: '/src/assets/images/jh_chore_left_1795173200007.jpg',
    },
    productImage: '/src/assets/images/garment_chore_jacket_1795163914249.jpg',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    isNewArrival: true,
    isBestseller: true,
    pairWithIds: ['breton-long-sleeve', 'ringer-tee', 'loop-hoodie'],
    outfitPairings: [
      {
        productId: 'breton-long-sleeve',
        role: 'Base Knit',
        note: 'Crisp maritime striping brings graphic contrast beneath field olive canvas.',
      },
      {
        productId: 'ringer-tee',
        role: 'Essential Base',
        note: 'Clean chalk jersey mirrors the studio styling under the open workwear collar.',
      },
      {
        productId: 'loop-hoodie',
        role: 'Cold-Weather Mid',
        note: 'Heather ash fleece softens the structured canvas for colder mornings.',
      },
    ],
    specs: {
      fabric: '100% Organic Cotton Duck Canvas',
      weight: '410 GSM (12 oz) Garment-Dyed',
      origin: 'Cut & sewn in Guimarães, Portugal',
      fit: 'Boxy layering fit — take your normal size',
      modelNote: 'Model is 6\'1" (185 cm) wearing size M',
      care: 'Spot clean or cold gentle wash, hang dry',
    },
    measurements: {
      XS: { chest: 110, length: 70, shoulder: 46, sleeve: 61.5 },
      S: { chest: 116, length: 72, shoulder: 48, sleeve: 63 },
      M: { chest: 122, length: 74, shoulder: 50, sleeve: 64.5 },
      L: { chest: 128, length: 76, shoulder: 52, sleeve: 66 },
      XL: { chest: 134, length: 78, shoulder: 54, sleeve: 67.5 },
    },
  },
  {
    id: 'nylon-bomber',
    name: 'Nylon Bomber',
    priceUsd: 168.0,
    category: 'Outerwear',
    color: 'Midnight Navy',
    tagline: 'Water-repellent Italian matte technical nylon with minimal hardware.',
    description:
      'Precision-cut flight silhouette crafted from tightly woven matte Italian nylon with light recycled insulation. Equipped with a brushed gunmetal two-way zipper, snap welt pockets, and fine-gauge rib knit trims.',
    showroomImage: '/src/assets/images/jh_bomber_front_1795173165416.jpg',
    showroomViews: {
      front: '/src/assets/images/jh_bomber_front_1795173165416.jpg',
      right: '/src/assets/images/jh_bomber_right_1795173200003.jpg',
      back: '/src/assets/images/jh_bomber_back_1795173200004.jpg',
      left: '/src/assets/images/jh_bomber_left_1795173168438.jpg',
    },
    productImage: '/src/assets/images/garment_nylon_bomber_1795163913724.jpg',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    isNewArrival: true,
    isBestseller: true,
    pairWithIds: ['breton-long-sleeve', 'ringer-tee', 'linen-shirt'],
    outfitPairings: [
      {
        productId: 'breton-long-sleeve',
        role: 'Graphic Base',
        note: 'Yarn-dyed navy stripes lock seamlessly into the midnight bomber palette.',
      },
      {
        productId: 'ringer-tee',
        role: 'Clean Base',
        note: 'Minimal chalk cotton brightens the matte navy collar and gunmetal zip.',
      },
      {
        productId: 'linen-shirt',
        role: 'Tailored Mid',
        note: 'Sky chambray adds crisp shirting refinement under the cropped flight waist.',
      },
    ],
    specs: {
      fabric: '100% Recycled Italian Matte Nylon (DWR)',
      weight: '220 GSM Shell + 60g Thermal Fill',
      origin: 'Fabric from Como, Italy; assembled in Portugal',
      fit: 'Clean cropped waist with structured shoulders',
      modelNote: 'Model is 6\'1" (185 cm) wearing size M',
      care: 'Gentle machine wash cold, do not tumble dry',
    },
    measurements: {
      XS: { chest: 112, length: 63.5, shoulder: 46.5, sleeve: 62.5 },
      S: { chest: 118, length: 65.5, shoulder: 48.5, sleeve: 64 },
      M: { chest: 124, length: 67.5, shoulder: 50.5, sleeve: 65.5 },
      L: { chest: 130, length: 69.5, shoulder: 52.5, sleeve: 67 },
      XL: { chest: 136, length: 71.5, shoulder: 54.5, sleeve: 68.5 },
    },
  },
];
