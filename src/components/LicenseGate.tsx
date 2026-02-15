import { useState } from 'react';
import { useLicense, isLicenseValid, daysRemaining } from '@/lib/license';

interface LicenseGateProps {
  children: React.ReactNode;
}

export default function LicenseGate({ children }: LicenseGateProps) {
  const { license, loading, checkingOut, startCheckout, cancelCheckout, activateKey } = useLicense();
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [keyError, setKeyError] = useState('');
  const [activating, setActivating] = useState(false);
  const [subscribeError, setSubscribeError] = useState('');

  const handleSubscribe = async () => {
    setSubscribeError('');
    console.log('[LicenseGate] Subscribe button clicked, calling startCheckout...');
    try {
      await startCheckout();
      console.log('[LicenseGate] startCheckout completed successfully');
    } catch (err) {
      console.error('[LicenseGate] startCheckout failed:', err);
      setSubscribeError(String(err));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07070d] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!license || !isLicenseValid(license)) {
    return (
      <PaywallScreen
        license={license}
        checkingOut={checkingOut}
        onSubscribe={handleSubscribe}
        onCancelCheckout={cancelCheckout}
        subscribeError={subscribeError}
        showKeyInput={showKeyInput}
        onToggleKeyInput={() => { setShowKeyInput(!showKeyInput); setKeyError(''); }}
        keyInput={keyInput}
        onKeyInputChange={setKeyInput}
        keyError={keyError}
        activating={activating}
        onActivateKey={async () => {
          if (!keyInput.trim()) return;
          setActivating(true);
          setKeyError('');
          try {
            await activateKey(keyInput.trim());
          } catch {
            setKeyError('Invalid or expired license key');
          } finally {
            setActivating(false);
          }
        }}
      />
    );
  }

  const days = daysRemaining(license);

  return (
    <>
      {/* Trial banner */}
      {license.status === 'trial' && (
        <TrialBanner daysLeft={days} checkingOut={checkingOut} onSubscribe={handleSubscribe} onCancelCheckout={cancelCheckout} subscribeError={subscribeError} />
      )}

      {children}
    </>
  );
}

// ── Paywall Screen ──

function PaywallScreen({
  license,
  checkingOut,
  onSubscribe,
  onCancelCheckout,
  subscribeError,
  showKeyInput,
  onToggleKeyInput,
  keyInput,
  onKeyInputChange,
  keyError,
  activating,
  onActivateKey,
}: {
  license: { status: string } | null;
  checkingOut: boolean;
  onSubscribe: () => void;
  onCancelCheckout: () => void;
  subscribeError: string;
  showKeyInput: boolean;
  onToggleKeyInput: () => void;
  keyInput: string;
  onKeyInputChange: (v: string) => void;
  keyError: string;
  activating: boolean;
  onActivateKey: () => void;
}) {
  return (
    <div className="min-h-screen bg-[#07070d] text-[#e5e7eb] antialiased flex items-center justify-center selection:bg-indigo-500/20">
      {/* Background blurs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-500/[0.07] blur-[150px]" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[500px] h-[500px] rounded-full bg-violet-500/[0.05] blur-[130px]" />
      </div>

      <div className="relative z-10 max-w-sm w-full px-6 animate-fade-in-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-white/[0.08] flex items-center justify-center mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="1.5" strokeLinecap="round">
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Export Doctor</h1>
          <p className="text-sm text-[#6b7280]">
            {checkingOut
              ? 'Waiting for payment confirmation...'
              : license?.status === 'expired'
                ? 'Your trial has expired'
                : 'Subscribe to get started'
            }
          </p>
        </div>

        {/* Waiting spinner */}
        {checkingOut && (
          <div className="text-center mb-6">
            <div className="mx-auto w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-3" />
            <p className="text-xs text-[#6b7280] mb-3">Complete payment in your browser, then return here</p>
            <button
              onClick={onCancelCheckout}
              className="text-xs text-[#6b7280] hover:text-[#9ca3af] transition-colors underline underline-offset-2"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Subscribe button */}
        {!checkingOut && (
          <div className="space-y-4">
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5 text-center">
              <p className="text-sm text-[#9ca3af] mb-1">Professional video analysis</p>
              <div className="flex items-baseline justify-center gap-1 mb-4">
                <span className="text-3xl font-bold text-white">$1</span>
                <span className="text-sm text-[#6b7280]">/month</span>
              </div>
              <ul className="text-xs text-[#9ca3af] space-y-1.5 mb-5 text-left">
                <li className="flex items-center gap-2">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                  10 platform presets
                </li>
                <li className="flex items-center gap-2">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                  Unlimited video analysis
                </li>
                <li className="flex items-center gap-2">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                  Export compliance reports
                </li>
                <li className="flex items-center gap-2">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                  Auto-updates
                </li>
              </ul>
              <button
                onClick={onSubscribe}
                className="w-full py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                Subscribe — $1/month
              </button>
              {subscribeError && (
                <p className="text-xs text-red-400 mt-3">{subscribeError}</p>
              )}
            </div>

            {/* License key toggle */}
            <div className="text-center">
              <button
                onClick={onToggleKeyInput}
                className="text-xs text-[#6b7280] hover:text-[#9ca3af] transition-colors underline underline-offset-2"
              >
                {showKeyInput ? 'Hide' : 'Already have a license key?'}
              </button>
            </div>

            {/* License key input */}
            {showKeyInput && (
              <div className="space-y-2 animate-slide-down">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={keyInput}
                    onChange={(e) => onKeyInputChange(e.target.value)}
                    placeholder="Enter license key..."
                    className="flex-1 px-3 py-2 bg-white/[0.04] border border-white/[0.1] rounded-lg text-sm text-white placeholder-[#4b5563] outline-none focus:border-indigo-500/50 transition-colors"
                    onKeyDown={(e) => e.key === 'Enter' && onActivateKey()}
                  />
                  <button
                    onClick={onActivateKey}
                    disabled={activating || !keyInput.trim()}
                    className="px-4 py-2 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] rounded-lg text-sm text-white disabled:opacity-40 transition-colors"
                  >
                    {activating ? '...' : 'Activate'}
                  </button>
                </div>
                {keyError && (
                  <p className="text-xs text-red-400">{keyError}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Trial Banner ──

function TrialBanner({
  daysLeft,
  checkingOut,
  onSubscribe,
  onCancelCheckout,
  subscribeError,
}: {
  daysLeft: number;
  checkingOut: boolean;
  onSubscribe: () => void;
  onCancelCheckout: () => void;
  subscribeError: string;
}) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 animate-slide-down">
      <div className="max-w-4xl mx-auto px-4 pt-2">
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2.5 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-md bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <p className="flex-1 text-xs text-amber-200">
              Free trial — <span className="font-semibold text-amber-100">{daysLeft} day{daysLeft !== 1 ? 's' : ''}</span> remaining
            </p>
            {checkingOut ? (
              <button
                onClick={onCancelCheckout}
                className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-200 text-[11px] font-semibold rounded-md transition-colors"
              >
                Cancel
              </button>
            ) : (
              <button
                onClick={onSubscribe}
                className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-[11px] font-semibold rounded-md transition-colors"
              >
                Subscribe $1/mo
              </button>
            )}
            <button
              onClick={() => setDismissed(true)}
              className="text-amber-500/40 hover:text-amber-400 transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          {subscribeError && (
            <p className="text-xs text-red-400 mt-2 px-9">{subscribeError}</p>
          )}
        </div>
      </div>
    </div>
  );
}
