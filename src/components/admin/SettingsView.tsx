import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { StoreSettings } from '../../types';

interface SettingsViewProps {
  settings: StoreSettings;
  onSave: (settings: StoreSettings) => Promise<void>;
}

export function SettingsView({ settings, onSave }: SettingsViewProps) {
  const [form, setForm] = useState<StoreSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedNotice(false);
    try {
      await onSave(form);
      setSavedNotice(true);
      window.setTimeout(() => setSavedNotice(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <div className="rounded-xl bg-white dark:bg-[#141312] border border-black/[0.08] dark:border-white/[0.1] p-6 space-y-5">
        <div>
          <h3 className="text-sm font-semibold">Storefront Merchandising</h3>
          <p className="text-xs text-[#6D665E] dark:text-[#9E978F] mt-0.5">
            Changes sync immediately to the live Jhonty Hub showroom header and checkout drawer.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-medium mb-1.5">Store Name</label>
            <input
              type="text"
              required
              maxLength={80}
              value={form.storeName}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, storeName: e.target.value }))
              }
              className="w-full px-3 py-2 text-sm rounded-lg border border-black/[0.14] dark:border-white/[0.16] bg-white dark:bg-[#1A1917]"
            />
          </div>

          <div>
            <label className="block font-medium mb-1.5">Concierge Support Email</label>
            <input
              type="email"
              required
              maxLength={200}
              value={form.supportEmail}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, supportEmail: e.target.value }))
              }
              className="w-full px-3 py-2 text-sm rounded-lg border border-black/[0.14] dark:border-white/[0.16] bg-white dark:bg-[#1A1917]"
            />
          </div>
        </div>

        <div className="space-y-3 pt-2 border-t border-black/[0.06] dark:border-white/[0.08]">
          <label className="inline-flex items-center gap-2.5 text-xs font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={form.announcementEnabled}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  announcementEnabled: e.target.checked,
                }))
              }
              className="w-4 h-4 accent-[#171615] dark:accent-[#F4F1EC]"
            />
            <span>Display top announcement bar on storefront</span>
          </label>

          <div>
            <label className="block text-xs font-medium mb-1.5">
              Announcement Copy
            </label>
            <input
              type="text"
              maxLength={200}
              value={form.announcementText}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  announcementText: e.target.value,
                }))
              }
              className="w-full px-3 py-2 text-sm rounded-lg border border-black/[0.14] dark:border-white/[0.16] bg-white dark:bg-[#1A1917]"
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-white dark:bg-[#141312] border border-black/[0.08] dark:border-white/[0.1] p-6 space-y-5">
        <div>
          <h3 className="text-sm font-semibold">
            Shipping & Inventory Rules (INR)
          </h3>
          <p className="text-xs text-[#6D665E] dark:text-[#9E978F] mt-0.5">
            Controls checkout shipping thresholds in Indian Rupees (₹) and default low-stock alerts.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-medium mb-1.5">
              Free Delivery Threshold (INR ₹)
            </label>
            <input
              type="number"
              min={0}
              max={500000}
              step="100"
              value={form.freeDeliveryThresholdUsd}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  freeDeliveryThresholdUsd: Math.max(0, Number(e.target.value) || 0),
                }))
              }
              className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-black/[0.14] dark:border-white/[0.16] bg-white dark:bg-[#1A1917]"
            />
          </div>

          <div>
            <label className="block font-medium mb-1.5">
              Standard Shipping Rate (INR ₹)
            </label>
            <input
              type="number"
              min={0}
              max={50000}
              step="10"
              value={form.standardShippingUsd}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  standardShippingUsd: Math.max(0, Number(e.target.value) || 0),
                }))
              }
              className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-black/[0.14] dark:border-white/[0.16] bg-white dark:bg-[#1A1917]"
            />
          </div>

          <div>
            <label className="block font-medium mb-1.5">
              Default Low-Stock Threshold (Units)
            </label>
            <input
              type="number"
              min={0}
              max={500}
              step="1"
              value={form.lowStockDefaultThreshold}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  lowStockDefaultThreshold: Math.max(
                    0,
                    Math.round(Number(e.target.value) || 6),
                  ),
                }))
              }
              className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-black/[0.14] dark:border-white/[0.16] bg-white dark:bg-[#1A1917]"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="text-xs text-emerald-700 dark:text-emerald-400">
          {savedNotice && (
            <span className="inline-flex items-center gap-1.5 font-medium">
              <Check className="w-3.5 h-3.5" />
              Storefront settings saved and applied live.
            </span>
          )}
        </div>
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 rounded-lg bg-[#171615] dark:bg-[#F4F1EC] text-white dark:text-[#171615] text-xs font-medium hover:opacity-90 disabled:opacity-50 cursor-pointer"
        >
          {saving ? 'Saving...' : 'Save Store Settings'}
        </button>
      </div>
    </form>
  );
}
