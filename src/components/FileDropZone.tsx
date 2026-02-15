import { useEffect, useState } from 'react';
import { getCurrentWebview } from '@tauri-apps/api/webview';

interface FileDropZoneProps {
  onFilePick: () => void;
  onDrop: (path: string) => void;
}

export default function FileDropZone({ onFilePick, onDrop }: FileDropZoneProps) {
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    const unlisten = getCurrentWebview().onDragDropEvent((event) => {
      if (event.payload.type === 'enter') {
        setDragOver(true);
      } else if (event.payload.type === 'leave') {
        setDragOver(false);
      } else if (event.payload.type === 'drop') {
        setDragOver(false);
        if (event.payload.paths.length > 0) {
          onDrop(event.payload.paths[0]);
        }
      }
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [onDrop]);

  return (
    <div className="flex justify-center animate-fade-in-up" style={{ animationDelay: '100ms' }}>
      <div className="w-full max-w-md">
        <div
          onClick={onFilePick}
          className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300 ${
            dragOver
              ? 'border-indigo-500/40 bg-indigo-500/[0.06] shadow-[0_0_30px_rgba(99,102,241,0.1)]'
              : 'border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15] hover:bg-white/[0.03]'
          }`}
        >
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 border border-white/[0.06] flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <div>
              <p className="text-base font-medium text-white">Drop your file here</p>
              <p className="text-sm text-[#6b7280] mt-1">or click to browse files</p>
              <p className="text-xs text-[#4b5563] mt-3">MP4, MOV, MKV, JPG, PNG, WebP, and more</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
