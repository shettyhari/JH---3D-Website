import { useMemo, useState } from 'react';
import { PackagePlus, Search, Trash2, X } from 'lucide-react';
import { formatPrice, SIZES } from '../../data/products';
import {
  CurrencyCode,
  OrderStatus,
  Product,
  Size,
  StoreOrder,
} from '../../types';

interface OrdersViewProps {
  orders: StoreOrder[];
  products: Product[];
  currency: CurrencyCode;
  cadRate: number;
  adminUid: string;
  onUpdateOrder: (params: {
    orderId: string;
    status: OrderStatus;
    trackingNumber: string;
    notes: string;
  }) => Promise<void>;
  onCreateOrder: (params: {
    orderNumber: string;
    userId: string;
    email: string;
    shippingName: string;
    shippingAddress: string;
    items: StoreOrder['items'];
    subtotalUsd: number;
    shippingUsd: number;
    currency: CurrencyCode;
    status: OrderStatus;
    notes: string;
  }) => Promise<void>;
  onDeleteOrder: (orderId: string) => Promise<void>;
}

const ORDER_STATUSES: OrderStatus[] = [
  'pending',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
];

function getStatusColorClass(status: OrderStatus): string {
  switch (status) {
    case 'delivered':
      return 'text-emerald-700 dark:text-emerald-400';
    case 'shipped':
    case 'processing':
      return 'text-blue-700 dark:text-blue-400';
    case 'pending':
      return 'text-amber-700 dark:text-amber-400';
    case 'cancelled':
    case 'refunded':
      return 'text-red-600 dark:text-red-400';
  }
}

export function OrdersView({
  orders,
  products,
  currency,
  cadRate,
  adminUid,
  onUpdateOrder,
  onCreateOrder,
  onDeleteOrder,
}: OrdersViewProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [selectedOrder, setSelectedOrder] = useState<StoreOrder | null>(null);
  const [editStatus, setEditStatus] = useState<OrderStatus>('pending');
  const [editTracking, setEditTracking] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [savingOrder, setSavingOrder] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Manual studio order creation modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newProductId, setNewProductId] = useState(products[0]?.id ?? '');
  const [newSize, setNewSize] = useState<Size>('M');
  const [newQty, setNewQty] = useState(1);
  const [newNotes, setNewNotes] = useState('');
  const [creating, setCreating] = useState(false);

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((order) => {
      if (statusFilter !== 'all' && order.status !== statusFilter) return false;
      if (!q) return true;
      return (
        order.orderNumber.toLowerCase().includes(q) ||
        order.shippingName.toLowerCase().includes(q) ||
        order.email.toLowerCase().includes(q) ||
        order.trackingNumber.toLowerCase().includes(q)
      );
    });
  }, [orders, search, statusFilter]);

  const openOrderDrawer = (order: StoreOrder) => {
    setSelectedOrder(order);
    setEditStatus(order.status);
    setEditTracking(order.trackingNumber);
    setEditNotes(order.notes);
    setConfirmDeleteId(null);
  };

  const handleSaveOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setSavingOrder(true);
    try {
      await onUpdateOrder({
        orderId: selectedOrder.id,
        status: editStatus,
        trackingNumber: editTracking,
        notes: editNotes,
      });
      setSelectedOrder(null);
    } finally {
      setSavingOrder(false);
    }
  };

  const handleCreateManualOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const product = products.find((p) => p.id === newProductId) || products[0];
    if (!product || !newCustomerName.trim() || !newCustomerEmail.trim()) return;
    setCreating(true);
    try {
      const subtotalUsd = product.priceUsd * newQty;
      const shippingUsd = subtotalUsd >= 100 ? 0 : 12;
      await onCreateOrder({
        orderNumber: `JH-${Math.floor(1000 + Math.random() * 9000)}`,
        userId: adminUid,
        email: newCustomerEmail.trim(),
        shippingName: newCustomerName.trim(),
        shippingAddress: newAddress.trim() || 'Copenhagen Flagship Pickup',
        items: [
          {
            productId: product.id,
            name: product.name,
            size: newSize,
            quantity: newQty,
            unitPriceUsd: product.priceUsd,
          },
        ],
        subtotalUsd,
        shippingUsd,
        currency,
        status: 'processing',
        notes: newNotes.trim() || 'Manual studio order',
      });
      setShowCreateModal(false);
      setNewCustomerName('');
      setNewCustomerEmail('');
      setNewAddress('');
      setNewQty(1);
      setNewNotes('');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="w-4 h-4 text-[#6D665E] dark:text-[#9E978F] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search order #, customer, email, tracking..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-black/[0.12] dark:border-white/[0.14] bg-white dark:bg-[#141312] focus:outline-none focus:border-[#171615] dark:focus:border-[#F4F1EC]"
            />
          </div>

          <div className="inline-flex items-center p-1 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] overflow-x-auto max-w-full">
            {(['all', ...ORDER_STATUSES] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md capitalize transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  statusFilter === st
                    ? 'bg-white dark:bg-[#1E1C1A] text-[#171615] dark:text-[#F4F1EC] shadow-xs'
                    : 'text-[#6D665E] dark:text-[#9E978F] hover:text-[#171615] dark:hover:text-[#F4F1EC]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            if (!newProductId && products[0]) setNewProductId(products[0].id);
            setShowCreateModal(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#171615] dark:bg-[#F4F1EC] text-white dark:text-[#171615] text-xs font-medium hover:opacity-90 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <PackagePlus className="w-3.5 h-3.5" />
          <span>Log Studio Order</span>
        </button>
      </div>

      {/* Orders Table */}
      <div className="rounded-xl bg-white dark:bg-[#141312] border border-black/[0.08] dark:border-white/[0.1] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-black/[0.08] dark:border-white/[0.1] bg-[#FAF9F7] dark:bg-[#191816] text-[11px] font-medium text-[#6D665E] dark:text-[#9E978F]">
                <th className="py-3 px-4">Order</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-3">Items</th>
                <th className="py-3 px-3 text-right">Total</th>
                <th className="py-3 px-3">Fulfillment</th>
                <th className="py-3 px-3">Tracking</th>
                <th className="py-3 px-4 text-right">Placed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.06] dark:divide-white/[0.08]">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-12 px-4 text-center text-[#6D665E] dark:text-[#9E978F]"
                  >
                    No orders found. Orders placed from the storefront checkout or logged here will appear in real time.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const pieceCount = order.items.reduce(
                    (s, item) => s + item.quantity,
                    0,
                  );
                  return (
                    <tr
                      key={order.id}
                      onClick={() => openOrderDrawer(order)}
                      className="hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4 font-mono font-semibold whitespace-nowrap">
                        {order.orderNumber}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-[#171615] dark:text-[#F4F1EC]">
                          {order.shippingName}
                        </p>
                        <p className="text-[11px] text-[#6D665E] dark:text-[#9E978F]">
                          {order.email}
                        </p>
                      </td>
                      <td className="py-3 px-3 text-[#45413C] dark:text-[#B5AEA6]">
                        {pieceCount} {pieceCount === 1 ? 'piece' : 'pieces'} ·{' '}
                        {order.items[0]?.name}
                        {order.items.length > 1
                          ? ` +${order.items.length - 1}`
                          : ''}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-semibold tabular-nums whitespace-nowrap">
                        {formatPrice(order.totalUsd, currency, cadRate)}
                      </td>
                      <td className="py-3 px-3 capitalize font-medium whitespace-nowrap">
                        <span className={getStatusColorClass(order.status)}>
                          {order.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-[#6D665E] dark:text-[#9E978F]">
                        {order.trackingNumber || '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-[#6D665E] dark:text-[#9E978F] whitespace-nowrap">
                        {order.createdAt
                          ? new Date(order.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : 'Just now'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Fulfillment Drawer */}
      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          role="dialog"
          aria-modal="true"
        >
          <div
            onClick={() => setSelectedOrder(null)}
            className="fixed inset-0 bg-black/45 backdrop-blur-[2px]"
          />
          <form
            onSubmit={handleSaveOrder}
            className="relative z-10 w-full max-w-md h-full bg-white dark:bg-[#141312] border-l border-black/[0.08] dark:border-white/[0.1] flex flex-col shadow-2xl"
          >
            <div className="px-6 py-4 border-b border-black/[0.08] dark:border-white/[0.1] flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold font-mono">
                  {selectedOrder.orderNumber}
                </h3>
                <p className="text-xs text-[#6D665E] dark:text-[#9E978F]">
                  {selectedOrder.shippingName} · {selectedOrder.email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 text-[#6D665E] hover:text-[#171615] dark:hover:text-[#F4F1EC] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 text-xs">
              <div className="p-4 rounded-xl bg-[#FAF9F7] dark:bg-[#191816] border border-black/[0.06] dark:border-white/[0.08] space-y-2.5">
                <p className="font-medium text-[#171615] dark:text-[#F4F1EC]">
                  Destination
                </p>
                <p className="text-[#45413C] dark:text-[#B5AEA6]">
                  {selectedOrder.shippingAddress}
                </p>
                <div className="border-t border-black/[0.07] dark:border-white/[0.08] pt-2.5 space-y-1.5">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between gap-2">
                      <span>
                        {item.quantity} × {item.name} ({item.size})
                      </span>
                      <span className="font-mono tabular-nums">
                        {formatPrice(
                          item.unitPriceUsd * item.quantity,
                          currency,
                          cadRate,
                        )}
                      </span>
                    </div>
                  ))}
                  <div className="border-t border-black/[0.07] dark:border-white/[0.08] pt-2 flex justify-between font-semibold">
                    <span>Total</span>
                    <span className="font-mono tabular-nums">
                      {formatPrice(selectedOrder.totalUsd, currency, cadRate)}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-medium mb-1.5">
                  Fulfillment Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as OrderStatus)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-black/[0.14] dark:border-white/[0.16] bg-white dark:bg-[#1A1917] capitalize"
                >
                  {ORDER_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium mb-1.5">
                  Courier Tracking Number
                </label>
                <input
                  type="text"
                  maxLength={80}
                  value={editTracking}
                  onChange={(e) => setEditTracking(e.target.value)}
                  placeholder="DHL-9048219920"
                  className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-black/[0.14] dark:border-white/[0.16] bg-white dark:bg-[#1A1917]"
                />
              </div>

              <div>
                <label className="block font-medium mb-1.5">
                  Fulfillment Notes
                </label>
                <textarea
                  rows={3}
                  maxLength={500}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Garment steamed, packed in cotton dust bag..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-black/[0.14] dark:border-white/[0.16] bg-white dark:bg-[#1A1917]"
                />
              </div>

              <div className="pt-3 border-t border-black/[0.08] dark:border-white/[0.1]">
                {confirmDeleteId === selectedOrder.id ? (
                  <div className="flex items-center justify-between gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <span className="text-red-700 dark:text-red-300 font-medium">
                      Permanently delete this order?
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2.5 py-1 rounded border border-black/[0.14] dark:border-white/[0.16] cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await onDeleteOrder(selectedOrder.id);
                          setSelectedOrder(null);
                        }}
                        className="px-2.5 py-1 rounded bg-red-600 text-white font-medium cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(selectedOrder.id)}
                    className="inline-flex items-center gap-1.5 text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete order record</span>
                  </button>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-black/[0.08] dark:border-white/[0.1] flex justify-end gap-2 bg-[#FAF9F7] dark:bg-[#191816]">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 text-xs font-medium rounded-lg border border-black/[0.14] dark:border-white/[0.16] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingOrder}
                className="px-4 py-2 text-xs font-medium rounded-lg bg-[#171615] dark:bg-[#F4F1EC] text-white dark:text-[#171615] disabled:opacity-50 cursor-pointer"
              >
                {savingOrder ? 'Saving...' : 'Update Order'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Manual Studio Order Creation Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            onClick={() => setShowCreateModal(false)}
            className="fixed inset-0 bg-black/45 backdrop-blur-[2px]"
          />
          <form
            onSubmit={handleCreateManualOrder}
            className="relative z-10 w-full max-w-md rounded-xl bg-white dark:bg-[#141312] border border-black/[0.1] dark:border-white/[0.12] p-5 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Log Studio / Client Order</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-[#6D665E] hover:text-[#171615] dark:hover:text-[#F4F1EC] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium mb-1">Client Name *</label>
                <input
                  type="text"
                  required
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="Soren Lindholm"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-black/[0.14] dark:border-white/[0.16] bg-white dark:bg-[#1A1917]"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Client Email *</label>
                <input
                  type="email"
                  required
                  value={newCustomerEmail}
                  onChange={(e) => setNewCustomerEmail(e.target.value)}
                  placeholder="soren@studio.dk"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-black/[0.14] dark:border-white/[0.16] bg-white dark:bg-[#1A1917]"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">
                  Shipping / Pickup Address
                </label>
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="Bredgade 42, Copenhagen"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-black/[0.14] dark:border-white/[0.16] bg-white dark:bg-[#1A1917]"
                />
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                <div className="col-span-2">
                  <label className="block font-medium mb-1">Garment</label>
                  <select
                    value={newProductId}
                    onChange={(e) => setNewProductId(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs rounded-lg border border-black/[0.14] dark:border-white/[0.16] bg-white dark:bg-[#1A1917]"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({formatPrice(p.priceUsd, currency, cadRate)})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1">Size</label>
                  <select
                    value={newSize}
                    onChange={(e) => setNewSize(e.target.value as Size)}
                    className="w-full px-2.5 py-2 text-xs rounded-lg border border-black/[0.14] dark:border-white/[0.16] bg-white dark:bg-[#1A1917]"
                  >
                    {SIZES.map((sz) => (
                      <option key={sz} value={sz}>
                        {sz}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block font-medium mb-1">Qty</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={newQty}
                    onChange={(e) =>
                      setNewQty(Math.max(1, Math.round(Number(e.target.value) || 1)))
                    }
                    className="w-full px-2.5 py-2 text-xs font-mono rounded-lg border border-black/[0.14] dark:border-white/[0.16] bg-white dark:bg-[#1A1917]"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block font-medium mb-1">Notes</label>
                  <input
                    type="text"
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder="In-store client styling order"
                    className="w-full px-2.5 py-2 text-xs rounded-lg border border-black/[0.14] dark:border-white/[0.16] bg-white dark:bg-[#1A1917]"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-3.5 py-2 text-xs font-medium rounded-lg border border-black/[0.14] dark:border-white/[0.16] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="px-4 py-2 text-xs font-medium rounded-lg bg-[#171615] dark:bg-[#F4F1EC] text-white dark:text-[#171615] disabled:opacity-50 cursor-pointer"
              >
                {creating ? 'Creating...' : 'Create Order'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
