export default function FfprobeStatus() {
  return (
    <div className="max-w-md mx-auto mb-8 animate-slide-down">
      <div className="bg-amber-500/[0.06] border border-amber-500/20 rounded-2xl px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5">
              <path d="M12 9v4M12 17h.01" />
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-amber-300">ffprobe not found</p>
            <p className="text-xs text-[#9ca3af] mt-1.5 leading-relaxed">
              Export Doctor needs ffprobe to analyze video files. Install it:
            </p>
            <ul className="text-xs text-[#9ca3af] mt-2 space-y-1.5">
              <li><span className="text-[#6b7280]">macOS:</span> <code className="text-[#d1d5db] bg-white/[0.04] px-1.5 py-0.5 rounded">brew install ffmpeg</code></li>
              <li><span className="text-[#6b7280]">Windows:</span> Download from <span className="text-indigo-400">ffmpeg.org</span> and add to PATH</li>
              <li><span className="text-[#6b7280]">Or:</span> Place the ffprobe binary in the app&apos;s <code className="text-[#d1d5db] bg-white/[0.04] px-1.5 py-0.5 rounded">binaries/</code> folder</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
