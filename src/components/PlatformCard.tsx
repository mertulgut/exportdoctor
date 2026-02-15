import { useState } from 'react';
import { PerfectResult, ExtendedMetadata } from '@/lib/rules/evaluate';
import ScoreGauge from './ScoreGauge';
import ComplianceChecks from './ComplianceChecks';
import Recommendations from './Recommendations';
import PlatformSpecs from './PlatformSpecs';
import PlatformIcon from './icons/PlatformIcon';

interface PlatformCardProps {
  platformId: string;
  platformName: string;
  result: PerfectResult;
  metadata: ExtendedMetadata;
}

export default function PlatformCard({ platformId, platformName, result }: PlatformCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isPerfect = result.verdict === 'PERFECT';
  const total = result.checks.length;
  const passed = result.checks.filter((c) => c.ok).length;
  const score = total > 0 ? Math.round((passed / total) * 100) : 0;

  return (
    <div className={`bg-white/[0.02] border rounded-2xl overflow-hidden transition-all duration-200 ${
      isPerfect ? 'border-emerald-500/20' : 'border-red-500/20'
    }`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors cursor-pointer"
      >
        <PlatformIcon platform={platformId} size={22} className={isPerfect ? 'text-emerald-400' : 'text-red-400'} />
        <div className="flex-1 text-left">
          <span className="text-sm font-semibold text-white">{platformName}</span>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
          isPerfect ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
        }`}>
          {isPerfect ? 'Ready' : 'Needs fixes'}
        </span>
        <span className={`text-xs font-semibold tabular-nums ${
          score === 100 ? 'text-emerald-400' : score >= 70 ? 'text-amber-400' : 'text-red-400'
        }`}>{score}%</span>
        <svg
          className={`w-4 h-4 text-[#6b7280] transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Expandable details */}
      {expanded && (
        <div className="border-t border-white/[0.05] px-5 py-5 space-y-4 animate-fade-in">
          <div className="flex justify-center">
            <ScoreGauge checks={result.checks} size="sm" />
          </div>
          <ComplianceChecks checks={result.checks} reasons={result.reasons} />
          <Recommendations checks={result.checks} />
          <PlatformSpecs platform={platformId} />
        </div>
      )}
    </div>
  );
}
