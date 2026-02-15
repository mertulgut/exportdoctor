import { useState } from 'react';
import type { LicenseData } from '@/lib/license';
import { daysRemaining } from '@/lib/license';

interface SubscriptionDialogProps {
  open: boolean;
  onClose: () => void;
  license: LicenseData | null;
  onManage: () => void;
  onDeactivate: () => void;
  onSubscribe: () => void;
  onActivateKey: (key: string) => Promise<unknown>;
}

export default function SubscriptionDialog({
  open,
  onClose,
  license,
  onManage,
  onDeactivate,
  onSubscribe,
  onActivateKey,
}: SubscriptionDialogProps) {
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [keyError, setKeyError] = useState('');
  const [activating, setActivating] = useState(false);

  if (!open) return null;

  const statusColor =
    license?.status === 'active'
      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
      : license?.status === 'trial'
        ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
        : 'bg-red-500/20 text-red-400 border-red-500/30';

  const statusLabel =
    license?.status === 'active'
      ? 'Active'
      : license?.status === 'trial'
        ? 'Trial'
        : 'Expired';

  const days = license ? daysRemaining(license) : 0;

  async function handleActivate() {
    if (!keyInput.trim()) return;
    setActivating(true);
    setKeyError('');
    try {
      await onActivateKey(keyInput.trim());
      setKeyInput('');
      setShowKeyInput(false);
    } catch {
      setKeyError('Invalid or expired license key');
    } finally {
      setActivating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />

      <div className="relative bg-[#0d0d15] border border-white/[0.1] rounded-2xl w-[380px] overflow-hidden animate-scale-in shadow-2xl shadow-black/50">
        <div className="h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500" />

        <div className="px-6 pt-5 pb-4">
          <h2 className="text-base font-bold text-white mb-4">Subscription</h2>

          {/* Status badge */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-[#6b7280]">Status</span>
            <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-md border ${statusColor}`}>
              {statusLabel}
            </span>
          </div>

          {/* Expiry */}
          {license && license.expiresAt > 0 && (
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-[#6b7280]">
                {license.status === 'trial' ? 'Trial ends' : 'Renews'}
              </span>
              <span className="text-xs text-[#9ca3af]">
                {days > 0 ? `${days} day${days !== 1 ? 's' : ''} left` : 'Expired'}
              </span>
            </div>
          )}

          {/* License key (masked) */}
          {license?.licenseKey && (
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-[#6b7280]">License</span>
              <span className="text-xs text-[#9ca3af] font-mono">
                {license.licenseKey.slice(0, 8)}...{license.licenseKey.slice(-4)}
              </span>
            </div>
          )}

          <div className="h-px bg-white/[0.06] my-4" />

          {/* Actions */}
          <div className="space-y-2">
            {license?.status === 'active' && (
              <button
                onClick={onManage}
                className="w-full py-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-lg text-sm text-[#9ca3af] hover:text-white transition-all"
              >
                Manage Subscription
              </button>
            )}

            {(license?.status === 'expired' || license?.status === 'trial') && (
              <button
                onClick={onSubscribe}
                className="w-full py-2 bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Subscribe — $1/month
              </button>
            )}

            {/* Enter key */}
            <button
              onClick={() => { setShowKeyInput(!showKeyInput); setKeyError(''); }}
              className="w-full py-2 text-xs text-[#6b7280] hover:text-[#9ca3af] transition-colors"
            >
              {showKeyInput ? 'Hide key input' : 'Enter license key'}
            </button>

            {showKeyInput && (
              <div className="space-y-2 animate-slide-down">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    placeholder="Paste key..."
                    className="flex-1 px-3 py-1.5 bg-white/[0.04] border border-white/[0.1] rounded-lg text-xs text-white placeholder-[#4b5563] outline-none focus:border-indigo-500/50 transition-colors"
                    onKeyDown={(e) => e.key === 'Enter' && handleActivate()}
                  />
                  <button
                    onClick={handleActivate}
                    disabled={activating || !keyInput.trim()}
                    className="px-3 py-1.5 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] rounded-lg text-xs text-white disabled:opacity-40 transition-colors"
                  >
                    {activating ? '...' : 'Activate'}
                  </button>
                </div>
                {keyError && <p className="text-[11px] text-red-400">{keyError}</p>}
              </div>
            )}

            {/* Deactivate */}
            {license?.licenseKey && (
              <button
                onClick={onDeactivate}
                className="w-full py-1 text-[11px] text-red-400/50 hover:text-red-400 transition-colors"
              >
                Deactivate license
              </button>
            )}
          </div>
        </div>

        <div className="border-t border-white/[0.06] px-6 py-3">
          <button
            onClick={onClose}
            className="w-full py-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-lg text-sm text-[#9ca3af] hover:text-white transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
