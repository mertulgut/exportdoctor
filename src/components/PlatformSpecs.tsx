import { useState } from 'react';
import { platformSpecs } from '@/lib/rules/platformSpecs';

interface PlatformSpecsProps {
  platform: string;
}

export default function PlatformSpecs({ platform }: PlatformSpecsProps) {
  const [copied, setCopied] = useState(false);
  const spec = platformSpecs[platform];
  if (!spec) return null;

  function handleCopyAll() {
    const text = `${spec.title}\n${spec.specs.map((s) => `${s.label}: ${s.value}`).join('\n')}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="bg-white/[0.02] border border-white/[0.08] rounded-2xl overflow-hidden">
      <div className="px-4 py-2.5 border-b border-white/[0.05] flex items-center gap-2">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
        </svg>
        <h3 className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider">Target Spec</h3>
        <button onClick={handleCopyAll} className="ml-auto px-2 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-[9px] font-medium text-[#9ca3af] hover:text-white transition-all">
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <div className="p-4">
        <div className="bg-[#07070d] border border-white/[0.06] rounded-xl p-4 font-mono text-[11px] leading-relaxed">
          <div className="mb-2 text-emerald-400 font-semibold text-xs">{spec.title}</div>
          <div className="space-y-1">
            {spec.specs.map((s, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-[#6b7280] min-w-[80px]">{s.label}:</span>
                <span className="text-[#d1d5db]">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
