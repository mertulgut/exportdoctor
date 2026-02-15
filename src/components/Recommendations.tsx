import { useState } from 'react';
import { FieldCheck } from '@/lib/rules/evaluate';

interface RecommendationsProps {
  checks: FieldCheck[];
}

const RECOMMENDATIONS: Record<string, string> = {
  'Container': 'Re-export your video as MP4. In your NLE, choose "H.264" or "MP4" as the export format.',
  'Video Codec': 'Use H.264 (AVC) codec. In Premiere Pro: Export > H.264. In DaVinci: Deliver > MP4 (H.264).',
  'Codec': 'Use H.264 (AVC) codec. In Premiere Pro: Export > H.264. In DaVinci: Deliver > MP4 (H.264).',
  'Profile': 'Set the H.264 profile to "High" in the advanced codec settings of your export dialog.',
  'Level': 'Set the H.264 level to 4.2. In Premiere: Encoding Settings > Level > 4.2.',
  'Pixel Format': 'Export with 8-bit color depth (yuv420p). Avoid 10-bit or HDR exports for this platform.',
  'Resolution': 'Match the target resolution. For vertical: 1080x1920, for horizontal: 1920x1080.',
  'Aspect': 'Adjust your sequence aspect ratio to match the target (e.g. 9:16 for vertical).',
  'Scan': 'Enable "Progressive" scan. Disable any interlacing or field order settings.',
  'Color': 'Export in SDR (Rec.709). Disable HDR/HLG/PQ output in your color management settings.',
  'FPS': 'Set your timeline and export to the target frame rate (constant frame rate).',
  'Duration': 'Trim your video to fit the platform\'s duration limit.',
  'Bitrate': 'Adjust your target bitrate to the recommended range.',
  'Audio Codec': 'Use AAC audio codec. Most NLEs default to this for MP4 exports.',
  'Audio Hz': 'Set audio sample rate to 44.1 kHz or 48 kHz in your export settings.',
};

export default function Recommendations({ checks }: RecommendationsProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const failedChecks = checks.filter((c) => !c.ok);
  if (failedChecks.length === 0) return null;

  function handleCopy(field: string, expected: string) {
    navigator.clipboard.writeText(expected);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }

  return (
    <div className="bg-white/[0.02] border border-white/[0.08] rounded-2xl overflow-hidden">
      <div className="px-4 py-2.5 border-b border-white/[0.05] flex items-center gap-2">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round">
          <path d="M12 9v4M12 17h.01" />
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
        <h3 className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider">Recommendations</h3>
        <span className="ml-auto text-[10px] font-medium text-amber-400/80 bg-amber-500/10 px-2 py-0.5 rounded-full">{failedChecks.length}</span>
      </div>
      <div className="divide-y divide-white/[0.04]">
        {failedChecks.map((check, i) => {
          const rec = RECOMMENDATIONS[check.field] || `Adjust "${check.field}" to match ${check.expected}.`;
          return (
            <div key={i} className="px-4 py-3 hover:bg-white/[0.02] transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-white">{check.field}</span>
                    <span className="text-[9px] font-mono text-red-400/60 bg-red-500/10 px-1 py-0.5 rounded">{String(check.value)}</span>
                  </div>
                  <p className="text-[10px] text-[#9ca3af] leading-relaxed">{rec}</p>
                </div>
                <button
                  onClick={() => handleCopy(check.field, String(check.expected))}
                  className="flex-shrink-0 px-2 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-[9px] font-medium text-[#9ca3af] hover:text-white transition-all"
                >
                  {copiedField === check.field ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
