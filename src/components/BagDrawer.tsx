import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Minus,
  Plus,
  ShoppingBag,
  X,
} from 'lucide-react';
import {
  CURRENCIES,
  formatPrice,
  FREE_DELIVERY_THRESHOLD_USD,
  SIZES,
} from '../data/products';
import {
  CartItem,
  CurrencyCode,
  MemberProfile,
  OrderLineItem,
  OrderReceipt,
  Product,
  Size,
} from '../types';
import { ResilientImage } from './ResilientImage';

export interface CheckoutPersistPayload {
  orderNumber: string;
  email: string;
  shippingName: string;
  shippingAddress: string;
  items: OrderLineItem[];
  subtotalUsd: number;
  shippingUsd: number;
  currency: CurrencyCode;
}

interface BagDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  products: Product[];
  currency: CurrencyCode;
  member: MemberProfile | null;
  freeDeliveryThresholdUsd?: number;
  standardShippingUsd?: number;
  cadRate?: number;
  onPersistOrder?: (payload: CheckoutPersistPayload) => Promise<void>;
  onUpdateQuantity: (productId: string, size: Size, delta: number) => void;
  onRemoveItem: (productId: string, size: Size) => void;
  onAddItem: (productId: string, size: Size) => void;
  onClearBag: () => void;
  onSelectProductToTry: (productId: string) => void;
}

type DrawerStep = 'bag' | 'checkout' | 'confirmed';

export function BagDrawer({
  isOpen,
  onClose,
  items,
  products,
  currency,
  member,
  freeDeliveryThresholdUsd = FREE_DELIVERY_THRESHOLD_USD,
  standardShippingUsd = 299,
  cadRate,
  onPersistOrder,
  onUpdateQuantity,
  onRemoveItem,
  onAddItem,
  onClearBag,
  onSelectProductToTry,
}: BagDrawerProps) {
  const [step, setStep] = useState<DrawerStep>('bag');
  const [pairIndex, setPairIndex] = useState(0);
  const [pairSize, setPairSize] = useState<Size>('M');

  // Checkout form fields
  const [email, setEmail] = useState(member?.email ?? '');
  const [fullName, setFullName] = useState(member?.name ?? '');
  const [address, setAddress] = useState('');
  const [cityPostal, setCityPostal] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<OrderReceipt | null>(null);

  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    products.forEach((p) => map.set(p.id, p));
    return map;
  }, [products]);

  const enrichedItems = useMemo(() => {
    return items
      .map((item) => {
        const product = productMap.get(item.productId);
        if (!product) return null;
        return { ...item, product };
      })
      .filter((x): x is CartItem & { product: Product } => x !== null);
  }, [items, productMap]);

  const subtotalUsd = useMemo(() => {
    return enrichedItems.reduce(
      (sum, item) => sum + item.product.priceUsd * item.quantity,
      0,
    );
  }, [enrichedItems]);

  const qualifiesFreeDelivery =
    Boolean(member) ||
    freeDeliveryThresholdUsd <= 0 ||
    subtotalUsd >= freeDeliveryThresholdUsd;
  const remainingForFreeUsd = Math.max(
    0,
    freeDeliveryThresholdUsd - subtotalUsd,
  );
  const progressPct = qualifiesFreeDelivery
    ? 100
    : Math.min(
        100,
        (subtotalUsd / Math.max(1, freeDeliveryThresholdUsd)) * 100,
      );

  const shippingUsd =
    enrichedItems.length === 0 || qualifiesFreeDelivery
      ? 0
      : standardShippingUsd;

  // Smart cross-sell recommendations ("Pair it with") excluding items already in bag
  const pairingCandidates = useMemo(() => {
    const inBagIds = new Set(items.map((i) => i.productId));
    const preferredOrder: string[] = [];

    enrichedItems.forEach((item) => {
      item.product.pairWithIds.forEach((id) => {
        if (!inBagIds.has(id) && !preferredOrder.includes(id)) {
          preferredOrder.push(id);
        }
      });
    });

    products.forEach((p) => {
      if (!inBagIds.has(p.id) && !preferredOrder.includes(p.id)) {
        preferredOrder.push(p.id);
      }
    });

    return preferredOrder
      .map((id) => productMap.get(id))
      .filter((p): p is Product => Boolean(p));
  }, [items, enrichedItems, products, productMap]);

  const currentPairProduct =
    pairingCandidates.length > 0
      ? pairingCandidates[pairIndex % pairingCandidates.length]
      : null;

  const handleClose = () => {
    onClose();
    window.setTimeout(() => {
      if (step === 'confirmed') setStep('bag');
    }, 300);
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !fullName.trim() || !address.trim() || submitting) return;

    setSubmitting(true);
    const orderNum = `JH-${Math.floor(1000 + Math.random() * 9000)}`;
    const fullAddress = `${address.trim()}${
      cityPostal.trim() ? `, ${cityPostal.trim()}` : ''
    }`;
    const lineItems: OrderLineItem[] = enrichedItems.map((i) => ({
      productId: i.product.id,
      name: i.product.name,
      size: i.size,
      quantity: i.quantity,
      unitPriceUsd: i.product.priceUsd,
    }));

    const newReceipt: OrderReceipt = {
      orderNumber: orderNum,
      placedAt: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      email: email.trim(),
      shippingName: fullName.trim(),
      shippingAddress: fullAddress,
      items: lineItems.map((i) => ({
        name: i.name,
        size: i.size,
        quantity: i.quantity,
        unitPriceUsd: i.unitPriceUsd,
      })),
      subtotalUsd,
      shippingUsd,
      currency,
    };

    try {
      if (onPersistOrder) {
        await onPersistOrder({
          orderNumber: orderNum,
          email: email.trim(),
          shippingName: fullName.trim(),
          shippingAddress: fullAddress,
          items: lineItems,
          subtotalUsd,
          shippingUsd,
          currency,
        });
      }
    } catch (err) {
      console.error('Order persistence skipped or failed:', err);
    } finally {
      setSubmitting(false);
    }

    setReceipt(newReceipt);
    onClearBag();
    setStep('confirmed');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-label="Shopping bag"
        >
          {/* Dimmed backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/38 backdrop-blur-[2px]"
          />

          {/* Slide-over drawer */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-[430px] bg-white dark:bg-[#141312] text-[#171615] dark:text-[#F4F1EC] h-full shadow-[-24px_0_60px_-16px_rgba(0,0,0,0.32)] border-l border-transparent dark:border-white/[0.08] flex flex-col"
          >
            {/* Drawer Header */}
            <div className="px-6 py-5 border-b border-black/[0.08] dark:border-white/[0.1] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {step === 'checkout' && (
                  <button
                    type="button"
                    onClick={() => setStep('bag')}
                    aria-label="Back to bag"
                    className="p-1 -ml-1 text-[#59534C] dark:text-[#A8A199] hover:text-[#171615] dark:hover:text-[#F4F1EC] transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                )}
                <h2 className="text-lg font-medium tracking-tight text-[#171615] dark:text-[#F4F1EC]">
                  {step === 'bag'
                    ? 'Your bag'
                    : step === 'checkout'
                      ? 'Express checkout'
                      : 'Order confirmed'}
                </h2>
              </div>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Close bag drawer"
                className="p-1.5 -mr-1.5 text-[#59534C] dark:text-[#A8A199] hover:text-[#171615] dark:hover:text-[#F4F1EC] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* STEP 1: BAG VIEW */}
            {step === 'bag' && (
              <>
                {/* Free Delivery Progress Strip */}
                <div className="px-6 py-3.5 border-b border-black/[0.06] dark:border-white/[0.08] bg-[#FAF9F7] dark:bg-[#191816]">
                  <p className="text-xs text-[#3F3B36] dark:text-[#B5AEA6] mb-2 tabular-nums">
                    {qualifiesFreeDelivery ? (
                      <span className="font-medium text-[#171615] dark:text-[#F4F1EC]">
                        {member
                          ? 'Complimentary member delivery unlocked.'
                          : 'You have unlocked free standard delivery.'}
                      </span>
                    ) : (
                      <>
                        <span className="font-semibold text-[#171615] dark:text-[#F4F1EC]">
                          {formatPrice(remainingForFreeUsd, currency, cadRate)}
                        </span>{' '}
                        away from free delivery.
                      </>
                    )}
                  </p>
                  <div className="h-1 w-full bg-black/[0.08] dark:bg-white/[0.12] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#171615] dark:bg-[#F4F1EC] transition-all duration-300 ease-out rounded-full"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>

                {/* Scrollable Cart Content + Pair It With */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                  {enrichedItems.length === 0 ? (
                    <div className="py-16 text-center flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-[#F4F1EC] dark:bg-[#1E1C1A] flex items-center justify-center mb-4 text-[#59534C] dark:text-[#A8A199]">
                        <ShoppingBag className="w-5 h-5 stroke-[1.5]" />
                      </div>
                      <p className="text-sm font-medium text-[#171615] dark:text-[#F4F1EC]">
                        Your bag is currently empty
                      </p>
                      <p className="text-xs text-[#6D665E] dark:text-[#9E978F] mt-1 max-w-[240px]">
                        Explore the interactive showroom to preview silhouettes and add pieces to your bag.
                      </p>
                      <button
                        type="button"
                        onClick={handleClose}
                        className="mt-6 px-5 py-2.5 bg-[#171615] dark:bg-[#F4F1EC] text-white dark:text-[#171615] text-xs font-medium tracking-wider uppercase rounded-md hover:bg-[#2C2A27] dark:hover:bg-[#E4DFD8] transition-colors cursor-pointer"
                      >
                        Return to Showroom
                      </button>
                    </div>
                  ) : (
                    <ul className="divide-y divide-black/[0.07] dark:divide-white/[0.08]">
                      {enrichedItems.map((item) => (
                        <li
                          key={`${item.productId}-${item.size}`}
                          className="py-4 first:pt-0 flex gap-4"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              onSelectProductToTry(item.productId);
                              onClose();
                            }}
                            className="w-[74px] h-[92px] rounded-lg bg-[#F4F1EC] dark:bg-[#1E1C1A] overflow-hidden shrink-0 border border-black/[0.05] dark:border-white/[0.08] cursor-pointer hover:opacity-90 transition-opacity"
                            title={`Preview ${item.product.name} in showroom`}
                          >
                            <ResilientImage
                              src={item.product.productImage}
                              alt={item.product.name}
                              fallbackTitle={item.product.name}
                              className="w-full h-full object-contain p-1.5"
                            />
                          </button>

                          <div className="flex-1 min-w-0 flex flex-col justify-between">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <h3 className="text-sm font-medium text-[#171615] dark:text-[#F4F1EC] truncate">
                                  {item.product.name}
                                </h3>
                                <p className="text-xs text-[#6D665E] dark:text-[#9E978F] mt-0.5">
                                  {item.product.color} · Size {item.size}
                                </p>
                              </div>
                              <p className="text-sm font-medium text-[#171615] dark:text-[#F4F1EC] tabular-nums shrink-0">
                                {formatPrice(
                                  item.product.priceUsd * item.quantity,
                                  currency,
                                  cadRate,
                                )}
                              </p>
                            </div>

                            <div className="flex items-center justify-between mt-3">
                              <div className="inline-flex items-center border border-black/[0.12] dark:border-white/[0.15] rounded-md">
                                <button
                                  type="button"
                                  onClick={() =>
                                    onUpdateQuantity(
                                      item.productId,
                                      item.size,
                                      -1,
                                    )
                                  }
                                  aria-label={`Decrease quantity of ${item.product.name}`}
                                  className="w-7 h-7 flex items-center justify-center text-[#45413C] dark:text-[#B5AEA6] hover:text-[#171615] dark:hover:text-[#F4F1EC] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="w-7 text-center text-xs font-medium tabular-nums text-[#171615] dark:text-[#F4F1EC]">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    onUpdateQuantity(
                                      item.productId,
                                      item.size,
                                      1,
                                    )
                                  }
                                  aria-label={`Increase quantity of ${item.product.name}`}
                                  className="w-7 h-7 flex items-center justify-center text-[#45413C] dark:text-[#B5AEA6] hover:text-[#171615] dark:hover:text-[#F4F1EC] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  onRemoveItem(item.productId, item.size)
                                }
                                className="text-[11px] text-[#78716A] dark:text-[#9E978F] hover:text-[#171615] dark:hover:text-[#F4F1EC] underline underline-offset-4 transition-colors cursor-pointer"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* "Pair it with" Cross-Sell Section */}
                  {currentPairProduct && (
                    <div className="pt-5 border-t border-black/[0.08] dark:border-white/[0.1]">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-medium text-[#171615] dark:text-[#F4F1EC] tracking-wide">
                          Pair it with
                        </h3>
                        {pairingCandidates.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setPairIndex(
                                (idx) => (idx + 1) % pairingCandidates.length,
                              )
                            }
                            aria-label="Next pairing suggestion"
                            className="inline-flex items-center gap-0.5 text-[11px] text-[#6D665E] dark:text-[#9E978F] hover:text-[#171615] dark:hover:text-[#F4F1EC] transition-colors cursor-pointer"
                          >
                            <span>Next</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="flex gap-3.5 p-3 rounded-xl bg-[#FAF9F7] dark:bg-[#191816] border border-black/[0.06] dark:border-white/[0.08]">
                        <button
                          type="button"
                          onClick={() => {
                            onSelectProductToTry(currentPairProduct.id);
                            onClose();
                          }}
                          className="w-[68px] h-[84px] rounded-lg bg-[#F4F1EC] dark:bg-[#22201D] overflow-hidden shrink-0 cursor-pointer"
                          title={`Try on ${currentPairProduct.name}`}
                        >
                          <ResilientImage
                            src={currentPairProduct.productImage}
                            alt={currentPairProduct.name}
                            fallbackTitle={currentPairProduct.name}
                            className="w-full h-full object-contain p-1"
                          />
                        </button>

                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <h4 className="text-xs font-medium text-[#171615] dark:text-[#F4F1EC] truncate">
                              {currentPairProduct.name}
                            </h4>
                            <p className="text-[11px] text-[#6D665E] dark:text-[#9E978F] mt-0.5">
                              {currentPairProduct.color}
                            </p>
                          </div>

                          <div className="flex items-center justify-between gap-2 mt-2.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-medium tabular-nums text-[#171615] dark:text-[#F4F1EC]">
                                {formatPrice(
                                  currentPairProduct.priceUsd,
                                  currency,
                                  cadRate,
                                )}
                              </span>
                              <select
                                aria-label={`Select size for ${currentPairProduct.name}`}
                                value={pairSize}
                                onChange={(e) =>
                                  setPairSize(e.target.value as Size)
                                }
                                className="text-[11px] bg-white dark:bg-[#141312] border border-black/[0.12] dark:border-white/[0.16] rounded px-1.5 py-1 text-[#171615] dark:text-[#F4F1EC] cursor-pointer"
                              >
                                {SIZES.map((s) => (
                                  <option key={s} value={s}>
                                    {s}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                onAddItem(currentPairProduct.id, pairSize)
                              }
                              className="px-3 py-1.5 bg-[#171615] dark:bg-[#F4F1EC] hover:bg-[#2C2A27] dark:hover:bg-[#E4DFD8] text-white dark:text-[#171615] text-[10px] font-medium tracking-[0.1em] uppercase rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              ADD TO CART
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Drawer Footer Summary */}
                {enrichedItems.length > 0 && (
                  <div className="px-6 py-5 border-t border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-[#141312] space-y-3.5">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-[#6D665E] dark:text-[#9E978F]">
                        <span>Estimated Delivery</span>
                        <span className="tabular-nums font-medium text-[#171615] dark:text-[#F4F1EC]">
                          {shippingUsd === 0
                            ? 'Complimentary'
                            : formatPrice(shippingUsd, currency, cadRate)}
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between pt-1">
                        <span className="text-sm font-medium text-[#171615] dark:text-[#F4F1EC]">
                          Estimated total
                        </span>
                        <span className="text-base font-semibold tabular-nums text-[#171615] dark:text-[#F4F1EC]">
                          {formatPrice(subtotalUsd + shippingUsd, currency, cadRate)}{' '}
                          <span className="text-xs font-normal text-[#6D665E] dark:text-[#9E978F]">
                            {CURRENCIES[currency].shortLabel}
                          </span>
                        </span>
                      </div>
                      <p className="text-[11px] text-[#78716A] dark:text-[#9E978F]">
                        Taxes, discounts and shipping calculated at checkout.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (member) {
                          if (!email) setEmail(member.email);
                          if (!fullName) setFullName(member.name);
                        }
                        setStep('checkout');
                      }}
                      className="w-full py-3.5 bg-[#171615] dark:bg-[#F4F1EC] hover:bg-[#2C2A27] dark:hover:bg-[#E4DFD8] active:scale-[0.99] text-white dark:text-[#171615] text-xs font-medium tracking-[0.16em] uppercase rounded-md transition-all cursor-pointer"
                    >
                      CHECK OUT
                    </button>
                  </div>
                )}
              </>
            )}

            {/* STEP 2: EXPRESS CHECKOUT */}
            {step === 'checkout' && (
              <form
                onSubmit={handlePlaceOrder}
                className="flex-1 flex flex-col overflow-hidden"
              >
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                  <div className="p-4 rounded-xl bg-[#FAF9F7] dark:bg-[#191816] border border-black/[0.06] dark:border-white/[0.08] space-y-2">
                    <p className="text-xs font-medium text-[#171615] dark:text-[#F4F1EC]">
                      Order summary ({enrichedItems.reduce((a, b) => a + b.quantity, 0)}{' '}
                      {enrichedItems.reduce((a, b) => a + b.quantity, 0) === 1
                        ? 'piece'
                        : 'pieces'}
                      )
                    </p>
                    <div className="space-y-1 text-xs text-[#59534C] dark:text-[#A8A199]">
                      {enrichedItems.map((i) => (
                        <div
                          key={`${i.productId}-${i.size}`}
                          className="flex justify-between gap-2"
                        >
                          <span className="truncate">
                            {i.quantity} × {i.product.name} ({i.size})
                          </span>
                          <span className="tabular-nums shrink-0 text-[#171615] dark:text-[#F4F1EC]">
                            {formatPrice(i.product.priceUsd * i.quantity, currency, cadRate)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3.5">
                    <div>
                      <label
                        htmlFor="checkout-email"
                        className="block text-xs font-medium text-[#3F3B36] dark:text-[#D4CEC7] mb-1.5"
                      >
                        Email address
                      </label>
                      <input
                        id="checkout-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="alex@domain.com"
                        className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-black/[0.15] dark:border-white/[0.16] focus:outline-none focus:border-[#171615] dark:focus:border-[#F4F1EC] bg-white dark:bg-[#1C1A18] text-[#171615] dark:text-[#F4F1EC] placeholder:text-[#8E877F] dark:placeholder:text-[#78716A]"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="checkout-name"
                        className="block text-xs font-medium text-[#3F3B36] dark:text-[#D4CEC7] mb-1.5"
                      >
                        Full name
                      </label>
                      <input
                        id="checkout-name"
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Alex Lindqvist"
                        className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-black/[0.15] dark:border-white/[0.16] focus:outline-none focus:border-[#171615] dark:focus:border-[#F4F1EC] bg-white dark:bg-[#1C1A18] text-[#171615] dark:text-[#F4F1EC] placeholder:text-[#8E877F] dark:placeholder:text-[#78716A]"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="checkout-address"
                        className="block text-xs font-medium text-[#3F3B36] dark:text-[#D4CEC7] mb-1.5"
                      >
                        Shipping address
                      </label>
                      <input
                        id="checkout-address"
                        type="text"
                        required
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="142 Mercer Street, Apt 4B"
                        className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-black/[0.15] dark:border-white/[0.16] focus:outline-none focus:border-[#171615] dark:focus:border-[#F4F1EC] bg-white dark:bg-[#1C1A18] text-[#171615] dark:text-[#F4F1EC] placeholder:text-[#8E877F] dark:placeholder:text-[#78716A]"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="checkout-city"
                        className="block text-xs font-medium text-[#3F3B36] dark:text-[#D4CEC7] mb-1.5"
                      >
                        City & Postal Code
                      </label>
                      <input
                        id="checkout-city"
                        type="text"
                        required
                        value={cityPostal}
                        onChange={(e) => setCityPostal(e.target.value)}
                        placeholder="New York, NY 10012"
                        className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-black/[0.15] dark:border-white/[0.16] focus:outline-none focus:border-[#171615] dark:focus:border-[#F4F1EC] bg-white dark:bg-[#1C1A18] text-[#171615] dark:text-[#F4F1EC] placeholder:text-[#8E877F] dark:placeholder:text-[#78716A]"
                      />
                    </div>
                  </div>
                </div>

                <div className="px-6 py-5 border-t border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-[#141312] space-y-3">
                  <div className="flex justify-between text-sm font-medium text-[#171615] dark:text-[#F4F1EC]">
                    <span>Total due</span>
                    <span className="tabular-nums">
                      {formatPrice(subtotalUsd + shippingUsd, currency, cadRate)}{' '}
                      {CURRENCIES[currency].shortLabel}
                    </span>
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3.5 bg-[#171615] dark:bg-[#F4F1EC] hover:bg-[#2C2A27] dark:hover:bg-[#E4DFD8] text-white dark:text-[#171615] text-xs font-medium tracking-[0.16em] uppercase rounded-md transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {submitting ? 'PROCESSING ORDER...' : 'COMPLETE ORDER'}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: ORDER CONFIRMATION RECEIPT */}
            {step === 'confirmed' && receipt && (
              <div className="flex-1 overflow-y-auto px-6 py-8 flex flex-col justify-between">
                <div className="space-y-6">
                  <div className="flex flex-col items-center text-center">
                    <CheckCircle2 className="w-10 h-10 text-[#171615] dark:text-[#F4F1EC] stroke-[1.5] mb-3" />
                    <p className="text-xs tracking-[0.14em] uppercase text-[#6D665E] dark:text-[#9E978F]">
                      Order #{receipt.orderNumber} Confirmed
                    </p>
                    <h3 className="font-editorial text-3xl font-medium text-[#171615] dark:text-[#F4F1EC] mt-1">
                      Preparing Shipment
                    </h3>
                    <p className="text-xs text-[#59534C] dark:text-[#A8A199] mt-2 max-w-[300px] leading-relaxed">
                      A confirmation receipt has been prepared for{' '}
                      <span className="font-medium text-[#171615] dark:text-[#F4F1EC]">
                        {receipt.email}
                      </span>
                      .
                    </p>
                  </div>

                  <div className="rounded-xl bg-[#FAF9F7] dark:bg-[#191816] border border-black/[0.07] dark:border-white/[0.08] p-4 space-y-3 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#6D665E] dark:text-[#9E978F]">
                        Recipient
                      </span>
                      <span className="font-medium text-[#171615] dark:text-[#F4F1EC]">
                        {receipt.shippingName}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-[#6D665E] dark:text-[#9E978F] shrink-0">
                        Destination
                      </span>
                      <span className="text-right text-[#171615] dark:text-[#F4F1EC]">
                        {receipt.shippingAddress}
                      </span>
                    </div>
                    <div className="border-t border-black/[0.07] dark:border-white/[0.08] pt-3 space-y-1.5">
                      {receipt.items.map((item, i) => (
                        <div key={i} className="flex justify-between">
                          <span className="text-[#45413C] dark:text-[#B5AEA6]">
                            {item.quantity} × {item.name} ({item.size})
                          </span>
                          <span className="tabular-nums font-medium text-[#171615] dark:text-[#F4F1EC]">
                            {formatPrice(
                              item.unitPriceUsd * item.quantity,
                              receipt.currency,
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-black/[0.07] dark:border-white/[0.08] pt-3 flex justify-between font-semibold text-[#171615] dark:text-[#F4F1EC]">
                      <span>Total Paid</span>
                      <span className="tabular-nums">
                        {formatPrice(
                          receipt.subtotalUsd + receipt.shippingUsd,
                          receipt.currency,
                        )}{' '}
                        {CURRENCIES[receipt.currency].shortLabel}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleClose}
                  className="mt-8 w-full py-3.5 bg-[#171615] dark:bg-[#F4F1EC] hover:bg-[#2C2A27] dark:hover:bg-[#E4DFD8] text-white dark:text-[#171615] text-xs font-medium tracking-[0.16em] uppercase rounded-md transition-colors cursor-pointer"
                >
                  CONTINUE TO SHOWROOM
                </button>
              </div>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
