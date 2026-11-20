import { useMemo, useState } from 'react';
import { Search, Trash2, UserPlus, X } from 'lucide-react';
import { formatPrice } from '../../data/products';
import {
  CurrencyCode,
  StoreOrder,
  UserProfileRecord,
  UserRole,
  UserStatus,
  UserTier,
} from '../../types';

interface UsersViewProps {
  users: UserProfileRecord[];
  orders: StoreOrder[];
  currentAdminUid: string;
  currency: CurrencyCode;
  cadRate: number;
  onUpdateUser: (params: {
    user: UserProfileRecord;
    role: UserRole;
    tier: UserTier;
    status: UserStatus;
  }) => Promise<void>;
  onCreateUser: (params: {
    name: string;
    email: string;
    role: UserRole;
    tier: UserTier;
    status: UserStatus;
  }) => Promise<void>;
  onDeleteUser: (uid: string) => Promise<void>;
}

export function UsersView({
  users,
  orders,
  currentAdminUid,
  currency,
  cadRate,
  onUpdateUser,
  onCreateUser,
  onDeleteUser,
}: UsersViewProps) {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [confirmDeleteUid, setConfirmDeleteUid] = useState<string | null>(null);

  // Add user/staff modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('customer');
  const [newTier, setNewTier] = useState<UserTier>('Studio Member');
  const [creating, setCreating] = useState(false);

  // Compute live order counts and lifetime spend per user (matched by uid or email)
  const orderStatsByKey = useMemo(() => {
    const map = new Map<string, { count: number; spentUsd: number }>();
    orders.forEach((order) => {
      if (order.status === 'cancelled' || order.status === 'refunded') return;
      const keys = [order.userId, order.email.toLowerCase()].filter(Boolean);
      keys.forEach((k) => {
        const cur = map.get(k) || { count: 0, spentUsd: 0 };
        map.set(k, {
          count: cur.count + 1,
          spentUsd: cur.spentUsd + order.totalUsd,
        });
      });
    });
    return map;
  }, [orders]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.tier.toLowerCase().includes(q)
      );
    });
  }, [users, search, roleFilter]);

  const roleCounts = useMemo(() => {
    return {
      total: users.length,
      admins: users.filter((u) => u.role === 'admin').length,
      managers: users.filter((u) => u.role === 'manager').length,
      customers: users.filter((u) => u.role === 'customer').length,
    };
  }, [users]);

  const handleFieldUpdate = async (
    user: UserProfileRecord,
    patch: Partial<{ role: UserRole; tier: UserTier; status: UserStatus }>,
  ) => {
    setBusyUid(user.uid);
    try {
      await onUpdateUser({
        user,
        role: patch.role ?? user.role,
        tier: patch.tier ?? user.tier,
        status: patch.status ?? user.status,
      });
    } finally {
      setBusyUid(null);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) return;
    setCreating(true);
    try {
      await onCreateUser({
        name: newName.trim(),
        email: newEmail.trim(),
        role: newRole,
        tier: newRole === 'customer' ? newTier : 'Staff',
        status: 'active',
      });
      setShowAddModal(false);
      setNewName('');
      setNewEmail('');
      setNewRole('customer');
      setNewTier('Studio Member');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Role Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-[#C6922E]/25 dark:bg-[#D4A243]/[0.2] border border-[#C6922E]/25 dark:border-[#D4A243]/[0.2] rounded-xl overflow-hidden">
        <div className="bg-[#FFFBF4] dark:bg-[#1B110B] p-4">
          <p className="text-xs text-[#7D5B3F] dark:text-[#B99A74]">
            Total Accounts
          </p>
          <p className="text-2xl font-semibold font-mono tabular-nums mt-1 text-[#2A1810] dark:text-[#F7EFE2]">
            {roleCounts.total}
          </p>
        </div>
        <div className="bg-[#FFFBF4] dark:bg-[#1B110B] p-4">
          <p className="text-xs text-[#7D5B3F] dark:text-[#B99A74]">
            Administrators
          </p>
          <p className="text-2xl font-semibold font-mono tabular-nums mt-1 text-[#9A4A0A] dark:text-[#E5B54F]">
            {roleCounts.admins}
          </p>
        </div>
        <div className="bg-[#FFFBF4] dark:bg-[#1B110B] p-4">
          <p className="text-xs text-[#7D5B3F] dark:text-[#B99A74]">
            Store Managers
          </p>
          <p className="text-2xl font-semibold font-mono tabular-nums mt-1 text-[#2A1810] dark:text-[#F7EFE2]">
            {roleCounts.managers}
          </p>
        </div>
        <div className="bg-[#FFFBF4] dark:bg-[#1B110B] p-4">
          <p className="text-xs text-[#7D5B3F] dark:text-[#B99A74]">
            Customers
          </p>
          <p className="text-2xl font-semibold font-mono tabular-nums mt-1 text-[#2A1810] dark:text-[#F7EFE2]">
            {roleCounts.customers}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="w-4 h-4 text-[#7D5B3F] dark:text-[#B99A74] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, or tier..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[#7D5B3F]/30 dark:border-[#D4A243]/28 bg-[#FFFBF4] dark:bg-[#1B110B] text-[#2A1810] dark:text-[#F7EFE2] placeholder:text-[#7D5B3F]/75 dark:placeholder:text-[#A98C6D]/75 focus:outline-none focus:border-[#B45309] dark:focus:border-[#E5B54F]"
            />
          </div>

          <div className="inline-flex items-center p-1 rounded-lg bg-[#3B2314]/[0.07] dark:bg-[#D4A243]/[0.1]">
            {(['all', 'admin', 'manager', 'customer'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  roleFilter === r
                    ? 'bg-[#3B2314] dark:bg-[#E0AD42] text-[#F8E2A8] dark:text-[#1B1009] shadow-xs'
                    : 'text-[#5E402A] dark:text-[#D4BEA1] hover:text-[#2A1810] dark:hover:text-[#F7EFE2]'
                }`}
              >
                {r === 'all' ? 'All Roles' : `${r}s`}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#9A4A0A] via-[#B45309] to-[#C6922E] dark:from-[#D49B35] dark:to-[#E5B54F] text-[#FFFDF9] dark:text-[#1B1009] text-xs font-semibold hover:opacity-95 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Add User</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="rounded-xl bg-[#FFFBF4] dark:bg-[#1B110B] border border-[#3B2314]/[0.12] dark:border-[#D4A243]/[0.2] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#3B2314]/[0.12] dark:border-[#D4A243]/[0.18] bg-[#F6EDE0] dark:bg-[#23160E] text-[11px] font-medium text-[#7D5B3F] dark:text-[#B99A74]">
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-3">Role (RBAC)</th>
                <th className="py-3 px-3">Tier</th>
                <th className="py-3 px-3 text-right">Orders</th>
                <th className="py-3 px-3 text-right">Lifetime Spend</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#3B2314]/[0.08] dark:divide-[#D4A243]/[0.14]">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-10 text-center text-[#7D5B3F] dark:text-[#B99A74]"
                  >
                    No user accounts match this filter.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isSelf = user.uid === currentAdminUid;
                  const isBusy = busyUid === user.uid;
                  const computedStats =
                    orderStatsByKey.get(user.uid) ||
                    orderStatsByKey.get(user.email.toLowerCase());
                  const orderCount = Math.max(
                    user.ordersCount,
                    computedStats?.count ?? 0,
                  );
                  const spentUsd = Math.max(
                    user.totalSpentUsd,
                    computedStats?.spentUsd ?? 0,
                  );

                  return (
                    <tr
                      key={user.uid}
                      className="hover:bg-[#C6922E]/[0.05] dark:hover:bg-[#D4A243]/[0.06] transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3 min-w-[200px]">
                          {user.photoURL ? (
                            <img
                              src={user.photoURL}
                              alt={user.name}
                              referrerPolicy="no-referrer"
                              className="w-8 h-8 rounded-full object-cover shrink-0 border border-[#C6922E]/35 dark:border-[#D4A243]/30"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-[#3B2314] dark:bg-[#E0AD42]/20 text-[#F8E2A8] dark:text-[#E5B54F] border border-[#C6922E]/35 flex items-center justify-center text-[11px] font-semibold shrink-0">
                              {user.name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-[#2A1810] dark:text-[#F7EFE2] truncate">
                              {user.name}
                              {isSelf && (
                                <span className="ml-1.5 text-[11px] font-normal text-[#9A4A0A] dark:text-[#E5B54F]">
                                  (You)
                                </span>
                              )}
                            </p>
                            <p className="text-[11px] text-[#7D5B3F] dark:text-[#A98C6D] truncate">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <select
                          aria-label={`Role for ${user.name}`}
                          disabled={isBusy || isSelf}
                          value={user.role}
                          onChange={(e) =>
                            void handleFieldUpdate(user, {
                              role: e.target.value as UserRole,
                            })
                          }
                          className="px-2 py-1 text-xs rounded-md border border-[#7D5B3F]/30 dark:border-[#D4A243]/28 bg-[#F6EDE0]/60 dark:bg-[#24170F] text-[#2A1810] dark:text-[#F7EFE2] disabled:opacity-60 cursor-pointer focus:outline-none focus:border-[#B45309] dark:focus:border-[#E5B54F]"
                        >
                          <option value="customer">Customer</option>
                          <option value="manager">Manager</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>

                      <td className="py-3 px-3">
                        <select
                          aria-label={`Tier for ${user.name}`}
                          disabled={isBusy}
                          value={user.tier}
                          onChange={(e) =>
                            void handleFieldUpdate(user, {
                              tier: e.target.value as UserTier,
                            })
                          }
                          className="px-2 py-1 text-xs rounded-md border border-[#7D5B3F]/30 dark:border-[#D4A243]/28 bg-[#F6EDE0]/60 dark:bg-[#24170F] text-[#2A1810] dark:text-[#F7EFE2] disabled:opacity-60 cursor-pointer focus:outline-none focus:border-[#B45309] dark:focus:border-[#E5B54F]"
                        >
                          <option value="Studio Member">Studio Member</option>
                          <option value="VIP Member">VIP Member</option>
                          <option value="Staff">Staff</option>
                        </select>
                      </td>

                      <td className="py-3 px-3 text-right font-mono tabular-nums text-[#2A1810] dark:text-[#F7EFE2]">
                        {orderCount}
                      </td>

                      <td className="py-3 px-3 text-right font-mono tabular-nums font-medium text-[#9A4A0A] dark:text-[#E5B54F]">
                        {formatPrice(spentUsd, currency, cadRate)}
                      </td>

                      <td className="py-3 px-3">
                        <button
                          type="button"
                          disabled={isBusy || isSelf}
                          onClick={() =>
                            void handleFieldUpdate(user, {
                              status:
                                user.status === 'active'
                                  ? 'suspended'
                                  : 'active',
                            })
                          }
                          className={`text-xs font-medium capitalize disabled:opacity-50 cursor-pointer hover:underline ${
                            user.status === 'active'
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {user.status}
                        </button>
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {isSelf ? (
                          <span className="text-[11px] text-[#7D5B3F] dark:text-[#A98C6D]">
                            Active session
                          </span>
                        ) : confirmDeleteUid === user.uid ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteUid(null)}
                              className="px-2 py-1 text-[11px] rounded border border-[#3B2314]/22 dark:border-[#D4A243]/28 cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                await onDeleteUser(user.uid);
                                setConfirmDeleteUid(null);
                              }}
                              className="px-2 py-1 text-[11px] rounded bg-red-600 text-white font-medium cursor-pointer"
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteUid(user.uid)}
                            aria-label={`Remove ${user.name}`}
                            className="p-1.5 text-[#7D5B3F] dark:text-[#B99A74] hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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

      {/* Add User / Staff Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            onClick={() => setShowAddModal(false)}
            className="fixed inset-0 bg-[#1A0E07]/52 backdrop-blur-[2px]"
          />
          <form
            onSubmit={handleCreateSubmit}
            className="relative z-10 w-full max-w-md rounded-xl bg-[#FFFBF4] dark:bg-[#1B110B] border border-[#C6922E]/30 dark:border-[#D4A243]/28 p-5 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#2A1810] dark:text-[#F7EFE2]">
                Add Customer or Staff Record
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 text-[#7D5B3F] dark:text-[#B99A74] hover:text-[#2A1810] dark:hover:text-[#F7EFE2] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-[#5E402A] dark:text-[#D4BEA1] mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  maxLength={120}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Freja Lind"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#7D5B3F]/30 dark:border-[#D4A243]/28 bg-[#F6EDE0]/60 dark:bg-[#24170F] text-[#2A1810] dark:text-[#F7EFE2] placeholder:text-[#7D5B3F]/75 dark:placeholder:text-[#A98C6D]/75 focus:outline-none focus:border-[#B45309] dark:focus:border-[#E5B54F]"
                />
              </div>
              <div>
                <label className="block font-medium text-[#5E402A] dark:text-[#D4BEA1] mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  maxLength={200}
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="freja@jhontyhub.studio"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#7D5B3F]/30 dark:border-[#D4A243]/28 bg-[#F6EDE0]/60 dark:bg-[#24170F] text-[#2A1810] dark:text-[#F7EFE2] placeholder:text-[#7D5B3F]/75 dark:placeholder:text-[#A98C6D]/75 focus:outline-none focus:border-[#B45309] dark:focus:border-[#E5B54F]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[#5E402A] dark:text-[#D4BEA1] mb-1">
                    Role
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#7D5B3F]/30 dark:border-[#D4A243]/28 bg-[#F6EDE0]/60 dark:bg-[#24170F] text-[#2A1810] dark:text-[#F7EFE2] focus:outline-none focus:border-[#B45309] dark:focus:border-[#E5B54F]"
                  >
                    <option value="customer">Customer</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-[#5E402A] dark:text-[#D4BEA1] mb-1">
                    Tier
                  </label>
                  <select
                    value={newRole === 'customer' ? newTier : 'Staff'}
                    disabled={newRole !== 'customer'}
                    onChange={(e) => setNewTier(e.target.value as UserTier)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#7D5B3F]/30 dark:border-[#D4A243]/28 bg-[#F6EDE0]/60 dark:bg-[#24170F] text-[#2A1810] dark:text-[#F7EFE2] disabled:opacity-60 focus:outline-none focus:border-[#B45309] dark:focus:border-[#E5B54F]"
                  >
                    <option value="Studio Member">Studio Member</option>
                    <option value="VIP Member">VIP Member</option>
                    <option value="Staff">Staff</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-3.5 py-2 text-xs font-medium rounded-lg border border-[#3B2314]/22 dark:border-[#D4A243]/28 text-[#5E402A] dark:text-[#D4BEA1] hover:bg-[#3B2314]/[0.06] dark:hover:bg-[#D4A243]/[0.08] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-gradient-to-r from-[#9A4A0A] via-[#B45309] to-[#C6922E] dark:from-[#D49B35] dark:to-[#E5B54F] text-[#FFFDF9] dark:text-[#1B1009] hover:opacity-95 disabled:opacity-50 cursor-pointer"
              >
                {creating ? 'Adding...' : 'Create Account'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
