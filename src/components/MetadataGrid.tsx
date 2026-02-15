import { ExtendedMetadata } from '@/lib/rules/evaluate';

interface MetadataGridProps {
  metadata: ExtendedMetadata;
  fileName: string;
  fileSize: number;
}

function formatDuration(sec: number): string {
  if (sec < 60) return `${sec.toFixed(1)}s`;
  const m = Math.floor(sec / 60);
  const s = (sec % 60).toFixed(0);
  return `${m}m ${s}s`;
}

function formatBitrate(bps?: number): string | null {
  if (!bps) return null;
  return `${(bps / 1_000_000).toFixed(2)} Mbps`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default function MetadataGrid({ metadata, fileName, fileSize }: MetadataGridProps) {
  const isImage = metadata.durationSec === 0 && metadata.fps === 0;

  const items = [
    { label: 'File', value: fileName },
    { label: 'Size', value: formatSize(fileSize) },
    { label: 'Type', value: isImage ? 'Image' : 'Video' },
    { label: 'Resolution', value: `${metadata.width} x ${metadata.height}` },
    ...(!isImage ? [{ label: 'Frame Rate', value: `${metadata.fps} FPS` }] : []),
    { label: isImage ? 'Format' : 'Video Codec', value: metadata.videoCodec.toUpperCase() },
    ...(!isImage ? [{ label: 'Container', value: metadata.container.toUpperCase() }] : []),
    ...(!isImage ? [{ label: 'Duration', value: formatDuration(metadata.durationSec) }] : []),
    ...(!isImage && metadata.audioCodec ? [{ label: 'Audio', value: metadata.audioCodec.toUpperCase() }] : []),
    ...(formatBitrate(metadata.videoBitrate || metadata.formatBitrate) ? [{ label: 'Bitrate', value: formatBitrate(metadata.videoBitrate || metadata.formatBitrate)! }] : []),
    ...(metadata.profile ? [{ label: 'Profile', value: metadata.profile }] : []),
    ...(metadata.pixFmt ? [{ label: 'Pixel Fmt', value: metadata.pixFmt }] : []),
  ];

  return (
    <div className="animate-fade-in-up bg-white/[0.02] border border-white/[0.08] rounded-2xl overflow-hidden" style={{ animationDelay: '200ms' }}>
      <div className="px-5 py-3 border-b border-white/[0.05] flex items-center gap-2.5">
        <div className="w-5 h-5 rounded-md bg-violet-500/10 flex items-center justify-center">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2.5" strokeLinecap="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18M9 21V9" />
          </svg>
        </div>
        <h3 className="text-xs font-semibold text-[#9ca3af] uppercase tracking-wider">Technical Metadata</h3>
      </div>
      <div className="p-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
        {items.map((item, i) => (
          <div key={i} className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-3 hover:bg-white/[0.04] transition-colors">
            <div className="text-[9px] uppercase tracking-wider text-[#6b7280] mb-0.5">{item.label}</div>
            <div className="text-xs font-semibold text-white truncate">{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
