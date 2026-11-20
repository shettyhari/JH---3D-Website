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
      return 'text-[#9A4A0A] dark:text-[#E5B54F]';
    case 'pending':
      return 'text-[#B45309] dark:text-amber-400';
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
            <Search className="w-4 h-4 text-[#7D5B3F] dark:text-[#B99A74] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search order #, customer, email, tracking..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[#7D5B3F]/30 dark:border-[#D4A243]/28 bg-[#FFFBF4] dark:bg-[#1B110B] text-[#2A1810] dark:text-[#F7EFE2] placeholder:text-[#7D5B3F]/75 dark:placeholder:text-[#A98C6D]/75 focus:outline-none focus:border-[#B45309] dark:focus:border-[#E5B54F]"
            />
          </div>

          <div className="inline-flex items-center p-1 rounded-lg bg-[#3B2314]/[0.07] dark:bg-[#D4A243]/[0.1] overflow-x-auto max-w-full">
            {(['all', ...ORDER_STATUSES] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md capitalize transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  statusFilter === st
                    ? 'bg-[#3B2314] dark:bg-[#E0AD42] text-[#F8E2A8] dark:text-[#1B1009] shadow-xs'
                    : 'text-[#5E402A] dark:text-[#D4BEA1] hover:text-[#2A1810] dark:hover:text-[#F7EFE2]'
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
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#9A4A0A] via-[#B45309] to-[#C6922E] dark:from-[#D49B35] dark:to-[#E5B54F] text-[#FFFDF9] dark:text-[#1B1009] text-xs font-semibold hover:opacity-95 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <PackagePlus className="w-3.5 h-3.5" />
          <span>Log Studio Order</span>
        </button>
      </div>

      {/* Orders Table */}
      <div className="rounded-xl bg-[#FFFBF4] dark:bg-[#1B110B] border border-[#3B2314]/[0.12] dark:border-[#D4A243]/[0.2] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#3B2314]/[0.12] dark:border-[#D4A243]/[0.18] bg-[#F6EDE0] dark:bg-[#23160E] text-[11px] font-medium text-[#7D5B3F] dark:text-[#B99A74]">
                <th className="py-3 px-4">Order</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-3">Items</th>
                <th className="py-3 px-3 text-right">Total</th>
                <th className="py-3 px-3">Fulfillment</th>
                <th className="py-3 px-3">Tracking</th>
                <th className="py-3 px-4 text-right">Placed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#3B2314]/[0.08] dark:divide-[#D4A243]/[0.14]">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-12 px-4 text-center text-[#7D5B3F] dark:text-[#B99A74]"
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
                      className="hover:bg-[#C6922E]/[0.05] dark:hover:bg-[#D4A243]/[0.06] transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4 font-mono font-semibold whitespace-nowrap text-[#2A1810] dark:text-[#F7EFE2]">
                        {order.orderNumber}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-[#2A1810] dark:text-[#F7EFE2]">
                          {order.shippingName}
                        </p>
                        <p className="text-[11px] text-[#7D5B3F] dark:text-[#A98C6D]">
                          {order.email}
                        </p>
                      </td>
                      <td className="py-3 px-3 text-[#5E402A] dark:text-[#D4BEA1]">
                        {pieceCount} {pieceCount === 1 ? 'piece' : 'pieces'} ·{' '}
                        {order.items[0]?.name}
                        {order.items.length > 1
                          ? ` +${order.items.length - 1}`
                          : ''}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-semibold tabular-nums whitespace-nowrap text-[#9A4A0A] dark:text-[#E5B54F]">
                        {formatPrice(order.totalUsd, currency, cadRate)}
                      </td>
                      <td className="py-3 px-3 capitalize font-medium whitespace-nowrap">
                        <span className={getStatusColorClass(order.status)}>
                          {order.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-[#7D5B3F] dark:text-[#A98C6D]">
                        {order.trackingNumber || '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-[#7D5B3F] dark:text-[#A98C6D] whitespace-nowrap">
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
            className="fixed inset-0 bg-[#1A0E07]/52 backdrop-blur-[2px]"
          />
          <form
            onSubmit={handleSaveOrder}
            className="relative z-10 w-full max-w-md h-full bg-[#FFFBF4] dark:bg-[#1B110B] border-l border-[#C6922E]/30 dark:border-[#D4A243]/25 flex flex-col shadow-2xl"
          >
            <div className="px-6 py-4 border-b border-[#3B2314]/[0.12] dark:border-[#D4A243]/[0.18] flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold font-mono text-[#2A1810] dark:text-[#F7EFE2]">
                  {selectedOrder.orderNumber}
                </h3>
                <p className="text-xs text-[#7D5B3F] dark:text-[#B99A74]">
                  {selectedOrder.shippingName} · {selectedOrder.email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 text-[#7D5B3F] dark:text-[#B99A74] hover:text-[#2A1810] dark:hover:text-[#F7EFE2] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 text-xs">
              <div className="p-4 rounded-xl bg-[#F6EDE0] dark:bg-[#23160E] border border-[#C6922E]/25 dark:border-[#D4A243]/[0.18] space-y-2.5">
                <p className="font-medium text-[#2A1810] dark:text-[#F7EFE2]">
                  Destination
                </p>
                <p className="text-[#5E402A] dark:text-[#D4BEA1]">
                  {selectedOrder.shippingAddress}
                </p>
                <div className="border-t border-[#3B2314]/[0.12] dark:border-[#D4A243]/[0.16] pt-2.5 space-y-1.5">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between gap-2 text-[#2A1810] dark:text-[#F7EFE2]">
                      <span>
                        {item.quantity} × {item.name} ({item.size})
                      </span>
                      <span className="font-mono tabular-nums text-[#5E402A] dark:text-[#D4BEA1]">
                        {formatPrice(
                          item.unitPriceUsd * item.quantity,
                          currency,
                          cadRate,
                        )}
                      </span>
                    </div>
                  ))}
                  <div className="border-t border-[#3B2314]/[0.12] dark:border-[#D4A243]/[0.16] pt-2 flex justify-between font-semibold">
                    <span className="text-[#2A1810] dark:text-[#F7EFE2]">Total</span>
                    <span className="font-mono tabular-nums text-[#9A4A0A] dark:text-[#E5B54F]">
                      {formatPrice(selectedOrder.totalUsd, currency, cadRate)}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-medium text-[#5E402A] dark:text-[#D4BEA1] mb-1.5">
                  Fulfillment Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as OrderStatus)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#7D5B3F]/30 dark:border-[#D4A243]/28 bg-[#F6EDE0]/60 dark:bg-[#24170F] text-[#2A1810] dark:text-[#F7EFE2] capitalize focus:outline-none focus:border-[#B45309] dark:focus:border-[#E5B54F]"
                >
                  {ORDER_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-[#5E402A] dark:text-[#D4BEA1] mb-1.5">
                  Courier Tracking Number
                </label>
                <input
                  type="text"
                  maxLength={80}
                  value={editTracking}
                  onChange={(e) => setEditTracking(e.target.value)}
                  placeholder="DHL-9048219920"
                  className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-[#7D5B3F]/30 dark:border-[#D4A243]/28 bg-[#F6EDE0]/60 dark:bg-[#24170F] text-[#2A1810] dark:text-[#F7EFE2] placeholder:text-[#7D5B3F]/75 dark:placeholder:text-[#A98C6D]/75 focus:outline-none focus:border-[#B45309] dark:focus:border-[#E5B54F]"
                />
              </div>

              <div>
                <label className="block font-medium text-[#5E402A] dark:text-[#D4BEA1] mb-1.5">
                  Fulfillment Notes
                </label>
                <textarea
                  rows={3}
                  maxLength={500}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Garment steamed, packed in cotton dust bag..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#7D5B3F]/30 dark:border-[#D4A243]/28 bg-[#F6EDE0]/60 dark:bg-[#24170F] text-[#2A1810] dark:text-[#F7EFE2] placeholder:text-[#7D5B3F]/75 dark:placeholder:text-[#A98C6D]/75 focus:outline-none focus:border-[#B45309] dark:focus:border-[#E5B54F]"
                />
              </div>

              <div className="pt-3 border-t border-[#3B2314]/[0.12] dark:border-[#D4A243]/[0.18]">
                {confirmDeleteId === selectedOrder.id ? (
                  <div className="flex items-center justify-between gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <span className="text-red-700 dark:text-red-300 font-medium">
                      Permanently delete this order?
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2.5 py-1 rounded border border-[#3B2314]/22 dark:border-[#D4A243]/28 cursor-pointer"
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

            <div className="px-6 py-4 border-t border-[#3B2314]/[0.12] dark:border-[#D4A243]/[0.18] flex justify-end gap-2 bg-[#F6EDE0] dark:bg-[#23160E]">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 text-xs font-medium rounded-lg border border-[#3B2314]/22 dark:border-[#D4A243]/28 text-[#5E402A] dark:text-[#D4BEA1] hover:bg-[#3B2314]/[0.06] dark:hover:bg-[#D4A243]/[0.08] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingOrder}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-gradient-to-r from-[#9A4A0A] via-[#B45309] to-[#C6922E] dark:from-[#D49B35] dark:to-[#E5B54F] text-[#FFFDF9] dark:text-[#1B1009] hover:opacity-95 disabled:opacity-50 cursor-pointer"
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
            className="fixed inset-0 bg-[#1A0E07]/52 backdrop-blur-[2px]"
          />
          <form
            onSubmit={handleCreateManualOrder}
            className="relative z-10 w-full max-w-md rounded-xl bg-[#FFFBF4] dark:bg-[#1B110B] border border-[#C6922E]/30 dark:border-[#D4A243]/28 p-5 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#2A1810] dark:text-[#F7EFE2]">
                Log Studio / Client Order
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-[#7D5B3F] dark:text-[#B99A74] hover:text-[#2A1810] dark:hover:text-[#F7EFE2] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-[#5E402A] dark:text-[#D4BEA1] mb-1">
                  Client Name *
                </label>
                <input
                  type="text"
                  required
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="Soren Lindholm"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#7D5B3F]/30 dark:border-[#D4A243]/28 bg-[#F6EDE0]/60 dark:bg-[#24170F] text-[#2A1810] dark:text-[#F7EFE2] placeholder:text-[#7D5B3F]/75 dark:placeholder:text-[#A98C6D]/75 focus:outline-none focus:border-[#B45309] dark:focus:border-[#E5B54F]"
                />
              </div>
              <div>
                <label className="block font-medium text-[#5E402A] dark:text-[#D4BEA1] mb-1">
                  Client Email *
                </label>
                <input
                  type="email"
                  required
                  value={newCustomerEmail}
                  onChange={(e) => setNewCustomerEmail(e.target.value)}
                  placeholder="soren@studio.dk"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#7D5B3F]/30 dark:border-[#D4A243]/28 bg-[#F6EDE0]/60 dark:bg-[#24170F] text-[#2A1810] dark:text-[#F7EFE2] placeholder:text-[#7D5B3F]/75 dark:placeholder:text-[#A98C6D]/75 focus:outline-none focus:border-[#B45309] dark:focus:border-[#E5B54F]"
                />
              </div>
              <div>
                <label className="block font-medium text-[#5E402A] dark:text-[#D4BEA1] mb-1">
                  Shipping / Pickup Address
                </label>
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="Bredgade 42, Copenhagen"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#7D5B3F]/30 dark:border-[#D4A243]/28 bg-[#F6EDE0]/60 dark:bg-[#24170F] text-[#2A1810] dark:text-[#F7EFE2] placeholder:text-[#7D5B3F]/75 dark:placeholder:text-[#A98C6D]/75 focus:outline-none focus:border-[#B45309] dark:focus:border-[#E5B54F]"
                />
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                <div className="col-span-2">
                  <label className="block font-medium text-[#5E402A] dark:text-[#D4BEA1] mb-1">
                    Garment
                  </label>
                  <select
                    value={newProductId}
                    onChange={(e) => setNewProductId(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs rounded-lg border border-[#7D5B3F]/30 dark:border-[#D4A243]/28 bg-[#F6EDE0]/60 dark:bg-[#24170F] text-[#2A1810] dark:text-[#F7EFE2] focus:outline-none focus:border-[#B45309] dark:focus:border-[#E5B54F]"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({formatPrice(p.priceUsd, currency, cadRate)})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-[#5E402A] dark:text-[#D4BEA1] mb-1">
                    Size
                  </label>
                  <select
                    value={newSize}
                    onChange={(e) => setNewSize(e.target.value as Size)}
                    className="w-full px-2.5 py-2 text-xs rounded-lg border border-[#7D5B3F]/30 dark:border-[#D4A243]/28 bg-[#F6EDE0]/60 dark:bg-[#24170F] text-[#2A1810] dark:text-[#F7EFE2] focus:outline-none focus:border-[#B45309] dark:focus:border-[#E5B54F]"
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
                  <label className="block font-medium text-[#5E402A] dark:text-[#D4BEA1] mb-1">
                    Qty
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={newQty}
                    onChange={(e) =>
                      setNewQty(Math.max(1, Math.round(Number(e.target.value) || 1)))
                    }
                    className="w-full px-2.5 py-2 text-xs font-mono rounded-lg border border-[#7D5B3F]/30 dark:border-[#D4A243]/28 bg-[#F6EDE0]/60 dark:bg-[#24170F] text-[#2A1810] dark:text-[#F7EFE2] focus:outline-none focus:border-[#B45309] dark:focus:border-[#E5B54F]"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block font-medium text-[#5E402A] dark:text-[#D4BEA1] mb-1">
                    Notes
                  </label>
                  <input
                    type="text"
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder="In-store client styling order"
                    className="w-full px-2.5 py-2 text-xs rounded-lg border border-[#7D5B3F]/30 dark:border-[#D4A243]/28 bg-[#F6EDE0]/60 dark:bg-[#24170F] text-[#2A1810] dark:text-[#F7EFE2] placeholder:text-[#7D5B3F]/75 dark:placeholder:text-[#A98C6D]/75 focus:outline-none focus:border-[#B45309] dark:focus:border-[#E5B54F]"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-3.5 py-2 text-xs font-medium rounded-lg border border-[#3B2314]/22 dark:border-[#D4A243]/28 text-[#5E402A] dark:text-[#D4BEA1] hover:bg-[#3B2314]/[0.06] dark:hover:bg-[#D4A243]/[0.08] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-gradient-to-r from-[#9A4A0A] via-[#B45309] to-[#C6922E] dark:from-[#D49B35] dark:to-[#E5B54F] text-[#FFFDF9] dark:text-[#1B1009] hover:opacity-95 disabled:opacity-50 cursor-pointer"
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
