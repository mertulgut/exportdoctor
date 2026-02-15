import { useState } from 'react';
import PlatformIcon from './icons/PlatformIcon';
import CategoryIcon from './icons/CategoryIcon';

export interface PresetDef {
  id: string;
  name: string;
  category: 'social' | 'broadcast' | 'cinema' | 'images';
  description: string;
  recommended?: boolean;
}

const PRESETS: PresetDef[] = [
  { id: 'ig_reels', name: 'Instagram Reels', category: 'social', description: 'Vertical 9:16, no-transcode target', recommended: true },
  { id: 'ig_post', name: 'Instagram Post', category: 'social', description: 'Square 1:1 or portrait 4:5 feed video' },
  { id: 'ig_story', name: 'Instagram Story', category: 'social', description: 'Vertical 9:16, up to 60s' },
  { id: 'tiktok', name: 'TikTok', category: 'social', description: 'Vertical short-form video' },
  { id: 'yt_shorts', name: 'YouTube Shorts', category: 'social', description: 'Vertical 9:16, up to 60s' },
  { id: 'youtube', name: 'YouTube', category: 'social', description: 'Standard horizontal video', recommended: true },
  { id: 'ig_post_image', name: 'IG Post Image', category: 'images', description: '1080x1080 or 1080x1350, JPEG/PNG', recommended: true },
  { id: 'ig_story_image', name: 'IG Story Image', category: 'images', description: '1080x1920 vertical, JPEG/PNG' },
  { id: 'ig_reels_cover', name: 'IG Reels Cover', category: 'images', description: '1080x1920 thumbnail, JPEG/PNG' },
  { id: 'fb_cover', name: 'Facebook Cover', category: 'images', description: '1200x628 or 820x312, JPEG/PNG' },
  { id: 'linkedin_banner', name: 'LinkedIn Banner', category: 'images', description: '1584x396 or 1200x627, JPEG/PNG' },
  { id: 'mxf_pal', name: 'MXF PAL', category: 'broadcast', description: 'EBU broadcast, 25fps, MXF container' },
  { id: 'mxf_ntsc', name: 'MXF NTSC', category: 'broadcast', description: 'NTSC broadcast, 29.97fps, MXF container' },
  { id: 'cinema', name: 'Cinema / Netflix', category: 'cinema', description: 'ProRes/DNxHR, 4K preferred' },
  { id: 'dcp', name: 'DCP Readiness', category: 'cinema', description: 'JPEG 2000, DCI resolution, 5.1/7.1 audio' },
];

const CATEGORIES = [
  { key: 'social' as const, label: 'Social Video' },
  { key: 'images' as const, label: 'Images' },
  { key: 'broadcast' as const, label: 'TV / Broadcast' },
  { key: 'cinema' as const, label: 'Cinema' },
];

interface PresetPickerProps {
  selected: string[];
  onSelectionChange: (ids: string[]) => void;
  onAnalyze: () => void;
}

export default function PresetPicker({ selected, onSelectionChange, onAnalyze }: PresetPickerProps) {
  const [activeTab, setActiveTab] = useState<'social' | 'images' | 'broadcast' | 'cinema'>('social');

  const filtered = PRESETS.filter((p) => p.category === activeTab);

  function toggle(id: string) {
    onSelectionChange(
      selected.includes(id)
        ? selected.filter((s) => s !== id)
        : [...selected, id]
    );
  }

  function selectAll() {
    onSelectionChange(PRESETS.map((p) => p.id));
  }

  function selectNone() {
    onSelectionChange([]);
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in-up">
      <div className="bg-white/[0.02] border border-white/[0.08] rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 pt-5 pb-3">
          <h2 className="text-sm font-semibold text-white mb-1">Choose presets to check</h2>
          <p className="text-xs text-[#6b7280]">Select which platforms and formats to validate against</p>
        </div>

        {/* Category tabs */}
        <div className="px-5 flex gap-1 mb-3">
          {CATEGORIES.map((cat) => {
            const count = PRESETS.filter((p) => p.category === cat.key && selected.includes(p.id)).length;
            const total = PRESETS.filter((p) => p.category === cat.key).length;
            return (
              <button
                key={cat.key}
                onClick={() => setActiveTab(cat.key)}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                  activeTab === cat.key
                    ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                    : 'bg-white/[0.03] text-[#6b7280] hover:bg-white/[0.06] hover:text-[#9ca3af] border border-transparent'
                }`}
              >
                <CategoryIcon category={cat.key} size={14} className="inline-block mr-1 -mt-0.5" />
                {cat.label}
                {count > 0 && (
                  <span className="ml-1.5 text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded-full">
                    {count}/{total}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Preset grid */}
        <div className="px-5 pb-3 space-y-1.5">
          {filtered.map((preset) => {
            const isSelected = selected.includes(preset.id);
            return (
              <button
                key={preset.id}
                onClick={() => toggle(preset.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all duration-200 ${
                  isSelected
                    ? 'bg-indigo-500/10 border border-indigo-500/25'
                    : 'bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.12]'
                }`}
              >
                {/* Checkbox */}
                <div className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center transition-all ${
                  isSelected
                    ? 'bg-indigo-500 border-indigo-500'
                    : 'border border-white/20 bg-white/[0.03]'
                }`}>
                  {isSelected && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>

                {/* Icon */}
                <PlatformIcon platform={preset.id} size={18} className={`flex-shrink-0 ${isSelected ? 'text-indigo-300' : 'text-[#6b7280]'}`} />

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-[#d1d5db]'}`}>
                      {preset.name}
                    </span>
                    {preset.recommended && (
                      <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded">
                        Popular
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#6b7280] truncate">{preset.description}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/[0.06] flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={selectAll}
              className="text-[11px] text-[#6b7280] hover:text-indigo-300 transition-colors"
            >
              Select all
            </button>
            <span className="text-[#6b7280]">·</span>
            <button
              onClick={selectNone}
              className="text-[11px] text-[#6b7280] hover:text-indigo-300 transition-colors"
            >
              Clear
            </button>
          </div>
          <button
            onClick={onAnalyze}
            disabled={selected.length === 0}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              selected.length > 0
                ? 'bg-indigo-500 hover:bg-indigo-400 text-white shadow-lg shadow-indigo-500/20'
                : 'bg-white/[0.04] text-[#4b5563] cursor-not-allowed'
            }`}
          >
            Analyze ({selected.length})
          </button>
        </div>
      </div>
    </div>
  );
}

export { PRESETS };
