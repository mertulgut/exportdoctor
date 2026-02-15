import { FieldCheck } from '@/lib/rules/evaluate';

interface ScoreGaugeProps {
  checks: FieldCheck[];
  size?: 'sm' | 'md';
}

export default function ScoreGauge({ checks, size = 'md' }: ScoreGaugeProps) {
  const total = checks.length;
  if (total === 0) return null;

  const passed = checks.filter((c) => c.ok).length;
  const score = Math.round((passed / total) * 100);
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score === 100 ? '#10b981' : score >= 70 ? '#f59e0b' : '#ef4444';
  const colorFaded = score === 100 ? 'rgba(16,185,129,0.15)' : score >= 70 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)';
  const dims = size === 'sm' ? 'w-20 h-20' : 'w-28 h-28';

  return (
    <div className="flex flex-col items-center gap-2">
      <svg viewBox="0 0 120 120" className={dims}>
        <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="8" />
        <circle cx="60" cy="60" r={radius} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={circumference}
          style={{
            strokeDashoffset: offset,
            transform: 'rotate(-90deg)',
            transformOrigin: 'center',
            transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
            filter: `drop-shadow(0 0 6px ${colorFaded})`,
          }}
        />
        <text x="60" y="56" textAnchor="middle" dominantBaseline="central" className="text-2xl font-bold" fill="white">{score}%</text>
        <text x="60" y="74" textAnchor="middle" dominantBaseline="central" className="text-[9px] uppercase tracking-wider" fill="#6b7280">score</text>
      </svg>
      {size === 'md' && (
        <p className="text-xs text-[#6b7280]">
          <span className="text-white font-semibold">{passed}</span> of <span className="text-white font-semibold">{total}</span> checks passed
        </p>
      )}
    </div>
  );
}
