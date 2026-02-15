import { useState, useEffect } from 'react';
import { getVersion } from '@tauri-apps/api/app';
import type { LicenseData } from '@/lib/license';
import { daysRemaining } from '@/lib/license';

interface AboutDialogProps {
  open: boolean;
  onClose: () => void;
  license?: LicenseData | null;
  onManageSubscription?: () => void;
}

export default function AboutDialog({ open, onClose, license, onManageSubscription }: AboutDialogProps) {
  const [appVersion, setAppVersion] = useState<string>('');

  useEffect(() => {
    getVersion().then(setAppVersion).catch(() => setAppVersion('1.0.0'));
  }, []);

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

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative bg-[#0d0d15] border border-white/[0.1] rounded-2xl w-[360px] overflow-hidden animate-scale-in shadow-2xl shadow-black/50">
        {/* Gradient accent */}
        <div className="h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500" />

        <div className="px-6 pt-6 pb-5 text-center">
          {/* Logo */}
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-white/[0.08] flex items-center justify-center mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="1.5" strokeLinecap="round">
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
          </div>

          {/* App name & version */}
          <h2 className="text-lg font-bold text-white mb-1">Export Doctor</h2>
          <p className="text-xs text-[#6b7280] mb-4">
            Version {appVersion || '1.0.0'}
          </p>

          {/* Description */}
          <p className="text-sm text-[#9ca3af] leading-relaxed mb-5">
            Professional video export compliance analyzer. Check if your video meets the requirements for any platform or broadcast standard.
          </p>

          {/* Divider */}
          <div className="h-px bg-white/[0.06] mb-4" />

          {/* License status section */}
          {license && (
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[11px] text-[#6b7280] uppercase tracking-wider">Subscription</span>
                <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-md border ${statusColor}`}>
                  {statusLabel}
                </span>
              </div>

              {license.expiresAt > 0 && (
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[11px] text-[#6b7280]">
                    {license.status === 'trial' ? 'Trial ends' : 'Renews'}
                  </span>
                  <span className="text-[11px] text-[#9ca3af]">
                    {days > 0 ? `${days} day${days !== 1 ? 's' : ''} left` : 'Expired'}
                  </span>
                </div>
              )}

              {onManageSubscription && (
                <button
                  onClick={onManageSubscription}
                  className="w-full mt-2 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-lg text-[11px] text-[#9ca3af] hover:text-white transition-all"
                >
                  Manage Subscription
                </button>
              )}

              <div className="h-px bg-white/[0.06] mt-4 mb-4" />
            </div>
          )}

          {/* Creator */}
          <div className="mb-5">
            <p className="text-[11px] text-[#6b7280] uppercase tracking-wider mb-2">Created by</p>
            <p className="text-sm font-semibold text-white">Mert Ulgut</p>
          </div>

          {/* Tech stack */}
          <div className="flex items-center justify-center gap-2 mb-5">
            <span className="px-2 py-1 bg-white/[0.04] border border-white/[0.08] rounded-md text-[10px] text-[#6b7280]">
              Tauri v2
            </span>
            <span className="px-2 py-1 bg-white/[0.04] border border-white/[0.08] rounded-md text-[10px] text-[#6b7280]">
              React
            </span>
            <span className="px-2 py-1 bg-white/[0.04] border border-white/[0.08] rounded-md text-[10px] text-[#6b7280]">
              ffprobe
            </span>
          </div>

          {/* Copyright */}
          <p className="text-[10px] text-[#4b5563]">
            &copy; {new Date().getFullYear()} Mert Ulgut. All rights reserved.
          </p>
        </div>

        {/* Close button */}
        <div className="border-t border-white/[0.06] px-6 py-3">
          <button
            onClick={onClose}
            className="w-full py-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.15] rounded-lg text-sm font-medium text-[#9ca3af] hover:text-white transition-all duration-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
