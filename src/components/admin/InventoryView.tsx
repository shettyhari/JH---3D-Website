import { useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Minus, Plus, Search, X } from 'lucide-react';
import {
  formatPrice,
  getLowStockSizes,
  getTotalStock,
  SIZES,
} from '../../data/products';
import {
  CurrencyCode,
  InventoryLogEntry,
  InventoryLogReason,
  Product,
  Size,
} from '../../types';
import { ResilientImage } from '../ResilientImage';

interface InventoryViewProps {
  products: Product[];
  logs: InventoryLogEntry[];
  currency: CurrencyCode;
  cadRate: number;
  onAdjustStock: (params: {
    product: Product;
    size: Size;
    newQty: number;
    reason: InventoryLogReason;
    note: string;
  }) => Promise<void>;
}

type StockFilter = 'all' | 'low' | 'out';

export function InventoryView({
  products,
  logs,
  currency,
  cadRate,
  onAdjustStock,
}: InventoryViewProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<StockFilter>('all');
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [adjustTarget, setAdjustTarget] = useState<{
    product: Product;
    size: Size;
  } | null>(null);
  const [targetQty, setTargetQty] = useState<number>(0);
  const [reason, setReason] = useState<InventoryLogReason>('restock');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const metrics = useMemo(() => {
    let totalUnits = 0;
    let retailValue = 0;
    let costValue = 0;
    let lowSizeCount = 0;
    let outSizeCount = 0;

    products.forEach((p) => {
      const units = getTotalStock(p);
      totalUnits += units;
      retailValue += units * p.priceUsd;
      costValue += units * p.costUsd;
      SIZES.forEach((sz) => {
        const qty = p.stock[sz] ?? 0;
        if (qty === 0) outSizeCount += 1;
        else if (qty <= p.lowStockThreshold) lowSizeCount += 1;
      });
    });

    return { totalUnits, retailValue, costValue, lowSizeCount, outSizeCount };
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (
        q &&
        !p.name.toLowerCase().includes(q) &&
        !p.sku.toLowerCase().includes(q) &&
        !p.color.toLowerCase().includes(q)
      ) {
        return false;
      }
      if (filter === 'low') {
        return getLowStockSizes(p).length > 0;
      }
      if (filter === 'out') {
        return SIZES.some((sz) => (p.stock[sz] ?? 0) === 0);
      }
      return true;
    });
  }, [products, search, filter]);

  const openAdjustModal = (product: Product, size: Size) => {
    setAdjustTarget({ product, size });
    setTargetQty(product.stock[size] ?? 0);
    setReason('restock');
    setNote('');
  };

  const handleQuickStep = async (product: Product, size: Size, delta: number) => {
    const current = product.stock[size] ?? 0;
    const next = Math.max(0, current + delta);
    if (next === current) return;
    const key = `${product.id}-${size}`;
    setBusyKey(key);
    try {
      await onAdjustStock({
        product,
        size,
        newQty: next,
        reason: delta > 0 ? 'restock' : 'adjustment',
        note: delta > 0 ? `Quick restock (+${delta})` : `Quick decrement (${delta})`,
      });
    } finally {
      setBusyKey(null);
    }
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustTarget) return;
    setSubmitting(true);
    try {
      await onAdjustStock({
        product: adjustTarget.product,
        size: adjustTarget.size,
        newQty: targetQty,
        reason,
        note: note.trim() || `Manual ${reason}`,
      });
      setAdjustTarget(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Valuation & Stock Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-black/[0.08] dark:bg-white/[0.1] border border-black/[0.08] dark:border-white/[0.1] rounded-xl overflow-hidden">
        <div className="bg-white dark:bg-[#141312] p-4">
          <p className="text-xs text-[#6D665E] dark:text-[#9E978F]">
            Total Units On Hand
          </p>
          <p className="text-2xl font-semibold font-mono tabular-nums mt-1">
            {metrics.totalUnits.toLocaleString()}
          </p>
          <p className="text-[11px] text-[#6D665E] dark:text-[#9E978F] mt-1">
            Across {products.length} garments
          </p>
        </div>

        <div className="bg-white dark:bg-[#141312] p-4">
          <p className="text-xs text-[#6D665E] dark:text-[#9E978F]">
            Retail Inventory Value
          </p>
          <p className="text-2xl font-semibold font-mono tabular-nums mt-1">
            {formatPrice(metrics.retailValue, currency, cadRate)}
          </p>
          <p className="text-[11px] text-[#6D665E] dark:text-[#9E978F] mt-1 font-mono tabular-nums">
            Cost {formatPrice(metrics.costValue, currency, cadRate)}
          </p>
        </div>

        <div className="bg-white dark:bg-[#141312] p-4">
          <p className="text-xs text-[#6D665E] dark:text-[#9E978F]">
            Low-Stock Size Alerts
          </p>
          <p
            className={`text-2xl font-semibold font-mono tabular-nums mt-1 ${
              metrics.lowSizeCount > 0
                ? 'text-amber-600 dark:text-amber-400'
                : ''
            }`}
          >
            {metrics.lowSizeCount}
          </p>
          <p className="text-[11px] text-[#6D665E] dark:text-[#9E978F] mt-1">
            At or below SKU threshold
          </p>
        </div>

        <div className="bg-white dark:bg-[#141312] p-4">
          <p className="text-xs text-[#6D665E] dark:text-[#9E978F]">
            Out-of-Stock Sizes
          </p>
          <p
            className={`text-2xl font-semibold font-mono tabular-nums mt-1 ${
              metrics.outSizeCount > 0
                ? 'text-red-600 dark:text-red-400'
                : ''
            }`}
          >
            {metrics.outSizeCount}
          </p>
          <p className="text-[11px] text-[#6D665E] dark:text-[#9E978F] mt-1">
            Immediate replenishment needed
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-[#6D665E] dark:text-[#9E978F] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search SKU, garment, or colorway..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-black/[0.12] dark:border-white/[0.14] bg-white dark:bg-[#141312] focus:outline-none focus:border-[#171615] dark:focus:border-[#F4F1EC]"
          />
        </div>

        <div className="inline-flex items-center p-1 rounded-lg bg-black/[0.04] dark:bg-white/[0.06]">
          {(
            [
              { id: 'all', label: 'All SKUs' },
              { id: 'low', label: 'Low Stock' },
              { id: 'out', label: 'Out of Stock' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                filter === tab.id
                  ? 'bg-white dark:bg-[#1E1C1A] text-[#171615] dark:text-[#F4F1EC] shadow-xs'
                  : 'text-[#6D665E] dark:text-[#9E978F] hover:text-[#171615] dark:hover:text-[#F4F1EC]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Per-Size Stock Matrix Table */}
      <div className="rounded-xl bg-white dark:bg-[#141312] border border-black/[0.08] dark:border-white/[0.1] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-black/[0.08] dark:border-white/[0.1] bg-[#FAF9F7] dark:bg-[#191816] text-[11px] font-medium text-[#6D665E] dark:text-[#9E978F]">
                <th className="py-3 px-4">Garment / SKU</th>
                {SIZES.map((sz) => (
                  <th key={sz} className="py-3 px-2.5 text-center w-[112px]">
                    {sz}
                  </th>
                ))}
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.06] dark:divide-white/[0.08] text-xs">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="py-10 text-center text-[#6D665E] dark:text-[#9E978F]"
                  >
                    No inventory rows match your current filter.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const total = getTotalStock(product);
                  const lowSizes = getLowStockSizes(product);
                  const hasOut = SIZES.some((sz) => (product.stock[sz] ?? 0) === 0);

                  return (
                    <tr
                      key={product.id}
                      className="hover:bg-black/[0.015] dark:hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3 min-w-[210px]">
                          <div className="w-9 h-11 rounded bg-[#F4F1EC] dark:bg-[#1E1C1A] overflow-hidden shrink-0">
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
                            <p className="text-[11px] text-[#6D665E] dark:text-[#9E978F] font-mono">
                              {product.sku} · Alert ≤ {product.lowStockThreshold}
                            </p>
                          </div>
                        </div>
                      </td>

                      {SIZES.map((sz) => {
                        const qty = product.stock[sz] ?? 0;
                        const isOut = qty === 0;
                        const isLow = qty > 0 && qty <= product.lowStockThreshold;
                        const key = `${product.id}-${sz}`;
                        const isBusy = busyKey === key;

                        return (
                          <td key={sz} className="py-2.5 px-2 text-center">
                            <div className="inline-flex items-center border border-black/[0.1] dark:border-white/[0.12] rounded-md overflow-hidden bg-white dark:bg-[#191816]">
                              <button
                                type="button"
                                disabled={isBusy || qty === 0}
                                onClick={() => void handleQuickStep(product, sz, -1)}
                                aria-label={`Decrease ${product.name} size ${sz}`}
                                className="w-6 h-7 flex items-center justify-center text-[#6D665E] dark:text-[#9E978F] hover:text-[#171615] dark:hover:text-[#F4F1EC] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] disabled:opacity-30 cursor-pointer"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => openAdjustModal(product, sz)}
                                title="Click to log restock or stock adjustment"
                                className={`min-w-[34px] h-7 px-1 font-mono font-medium tabular-nums cursor-pointer hover:underline ${
                                  isOut
                                    ? 'text-red-600 dark:text-red-400'
                                    : isLow
                                      ? 'text-amber-600 dark:text-amber-400'
                                      : 'text-[#171615] dark:text-[#F4F1EC]'
                                }`}
                              >
                                {qty}
                              </button>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => void handleQuickStep(product, sz, 1)}
                                aria-label={`Increase ${product.name} size ${sz}`}
                                className="w-6 h-7 flex items-center justify-center text-[#6D665E] dark:text-[#9E978F] hover:text-[#171615] dark:hover:text-[#F4F1EC] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] disabled:opacity-30 cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                        );
                      })}

                      <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums">
                        {total}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {hasOut ? (
                          <span className="text-red-600 dark:text-red-400 font-medium">
                            Out of stock
                          </span>
                        ) : lowSizes.length > 0 ? (
                          <span className="text-amber-600 dark:text-amber-400 font-medium">
                            Low ({lowSizes.join(', ')})
                          </span>
                        ) : (
                          <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                            Healthy
                          </span>
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

      {/* Immutable Stock Movement Audit Ledger */}
      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-semibold">Stock Movement Ledger</h3>
          <span className="text-xs text-[#6D665E] dark:text-[#9E978F] tabular-nums">
            {logs.length} recorded adjustments
          </span>
        </div>

        <div className="rounded-xl bg-white dark:bg-[#141312] border border-black/[0.08] dark:border-white/[0.1] overflow-hidden">
          {logs.length === 0 ? (
            <div className="py-10 px-4 text-center text-xs text-[#6D665E] dark:text-[#9E978F]">
              No stock adjustments logged yet. Click any size count or stepper above to record a restock or audit adjustment.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-black/[0.08] dark:border-white/[0.1] bg-[#FAF9F7] dark:bg-[#191816] text-[11px] font-medium text-[#6D665E] dark:text-[#9E978F]">
                    <th className="py-2.5 px-4">Garment</th>
                    <th className="py-2.5 px-3">Size</th>
                    <th className="py-2.5 px-3 text-right">Delta</th>
                    <th className="py-2.5 px-3 text-right">Balance</th>
                    <th className="py-2.5 px-3">Reason</th>
                    <th className="py-2.5 px-3">Actor</th>
                    <th className="py-2.5 px-4 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.06] dark:divide-white/[0.08]">
                  {logs.slice(0, 20).map((entry) => (
                    <tr key={entry.id}>
                      <td className="py-2.5 px-4 font-medium">
                        {entry.productName}
                      </td>
                      <td className="py-2.5 px-3 font-mono">{entry.size}</td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                        <span
                          className={`inline-flex items-center gap-0.5 font-medium ${
                            entry.delta > 0
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {entry.delta > 0 ? (
                            <ArrowUpRight className="w-3 h-3" />
                          ) : (
                            <ArrowDownRight className="w-3 h-3" />
                          )}
                          {entry.delta > 0 ? `+${entry.delta}` : entry.delta}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[#6D665E] dark:text-[#9E978F]">
                        {entry.previousQty} → {entry.newQty}
                      </td>
                      <td className="py-2.5 px-3 capitalize">
                        <span>{entry.reason}</span>
                        {entry.note && (
                          <span className="text-[#6D665E] dark:text-[#9E978F]">
                            {' '}
                            · {entry.note}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-[#6D665E] dark:text-[#9E978F]">
                        {entry.actorName}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-[#6D665E] dark:text-[#9E978F]">
                        {entry.createdAt
                          ? new Date(entry.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Just now'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Stock Adjustment Modal */}
      {adjustTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            onClick={() => setAdjustTarget(null)}
            className="fixed inset-0 bg-black/45 backdrop-blur-[2px]"
          />
          <form
            onSubmit={handleModalSubmit}
            className="relative z-10 w-full max-w-md rounded-xl bg-white dark:bg-[#141312] border border-black/[0.1] dark:border-white/[0.12] p-5 space-y-4 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">
                  Adjust Stock · {adjustTarget.product.name} ({adjustTarget.size})
                </h3>
                <p className="text-xs text-[#6D665E] dark:text-[#9E978F] mt-0.5 font-mono tabular-nums">
                  Current stock: {adjustTarget.product.stock[adjustTarget.size]} units
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAdjustTarget(null)}
                className="p-1 text-[#6D665E] hover:text-[#171615] dark:hover:text-[#F4F1EC] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              {[5, 10, 25].map((add) => (
                <button
                  key={add}
                  type="button"
                  onClick={() =>
                    setTargetQty(
                      (adjustTarget.product.stock[adjustTarget.size] ?? 0) + add,
                    )
                  }
                  className="px-2.5 py-1 text-xs font-mono rounded-md border border-black/[0.12] dark:border-white/[0.14] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] cursor-pointer"
                >
                  +{add} restock
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">
                  New Quantity
                </label>
                <input
                  type="number"
                  min={0}
                  max={100000}
                  required
                  value={targetQty}
                  onChange={(e) =>
                    setTargetQty(Math.max(0, Math.round(Number(e.target.value) || 0)))
                  }
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-black/[0.14] dark:border-white/[0.16] bg-white dark:bg-[#1A1917]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Reason</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value as InventoryLogReason)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-black/[0.14] dark:border-white/[0.16] bg-white dark:bg-[#1A1917]"
                >
                  <option value="restock">Restock Delivery</option>
                  <option value="adjustment">Manual Cycle Count</option>
                  <option value="sale">Offline / Flagship Sale</option>
                  <option value="return">Customer Return</option>
                  <option value="damaged">Damaged / Write-off</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">
                Audit Note (Optional)
              </label>
              <input
                type="text"
                maxLength={240}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g., Porto mill shipment #42"
                className="w-full px-3 py-2 text-xs rounded-lg border border-black/[0.14] dark:border-white/[0.16] bg-white dark:bg-[#1A1917]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAdjustTarget(null)}
                className="px-3.5 py-2 text-xs font-medium rounded-lg border border-black/[0.14] dark:border-white/[0.16] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 text-xs font-medium rounded-lg bg-[#171615] dark:bg-[#F4F1EC] text-white dark:text-[#171615] disabled:opacity-50 cursor-pointer"
              >
                {submitting ? 'Logging...' : 'Save Adjustment'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
