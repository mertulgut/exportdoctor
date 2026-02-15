import { FieldCheck } from '@/lib/rules/evaluate';

interface ComplianceChecksProps {
  checks?: FieldCheck[];
  reasons?: string[];
}

export default function ComplianceChecks({ checks, reasons }: ComplianceChecksProps) {
  const hasChecks = (checks?.length ?? 0) > 0;
  const hasReasons = !hasChecks && (reasons?.length ?? 0) > 0;
  if (!hasChecks && !hasReasons) return null;

  return (
    <div className="bg-white/[0.02] border border-white/[0.08] rounded-2xl overflow-hidden">
      {hasChecks && (
        <div className="stagger-children divide-y divide-white/[0.04]">
          {checks!.map((check, index) => (
            <div key={index} className={`px-4 py-3 flex items-start gap-3 hover:bg-white/[0.02] transition-colors ${!check.ok ? 'border-l-2 border-l-red-500/50' : 'border-l-2 border-l-emerald-500/30'}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${check.ok ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" strokeWidth="3" strokeLinecap="round" stroke={check.ok ? '#10b981' : '#ef4444'}>
                  {check.ok ? <polyline points="20 6 9 17 4 12" /> : <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>}
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 mb-1">
                  <span className="text-xs font-semibold text-white">{check.field}</span>
                  {check.reason && <span className="text-[10px] text-[#6b7280]">{check.reason}</span>}
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className={`inline-flex px-1.5 py-0.5 rounded font-mono ${check.ok ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>{String(check.value)}</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                  <span className="text-[#9ca3af] font-mono">{String(check.expected)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {hasReasons && (
        <div className="px-4 py-3 space-y-1.5">
          {reasons!.map((reason, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <span className="text-amber-400 mt-0.5 flex-shrink-0">!</span>
              <span className="text-[#d1d5db]">{reason}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
