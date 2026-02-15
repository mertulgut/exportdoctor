import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import type { ExtendedMetadata, PerfectResult } from '@/lib/rules/evaluate';
import {
  evaluateIgReelsPerfect,
  evaluateTikTok,
  evaluateYouTube,
  evaluateYouTubeShorts,
  evaluateCinema,
  evaluateIgPost,
  evaluateIgStory,
  evaluateMxfPal,
  evaluateMxfNtsc,
  evaluateDcp,
  evaluateIgPostImage,
  evaluateIgStoryImage,
  evaluateIgReelsCover,
  evaluateFacebookCover,
  evaluateLinkedInBanner,
} from '@/lib/rules/evaluate';
import { useLicense } from '@/lib/license';
import FileDropZone from '@/components/FileDropZone';
import AnalysisProgress from '@/components/AnalysisProgress';
import PlatformCard from '@/components/PlatformCard';
import ExportButtons from '@/components/ExportButtons';
import MetadataGrid from '@/components/MetadataGrid';
import FfprobeStatus from '@/components/FfprobeStatus';
import PresetPicker from '@/components/PresetPicker';
import UpdateChecker from '@/components/UpdateChecker';
import AboutDialog from '@/components/AboutDialog';
import SubscriptionDialog from '@/components/SubscriptionDialog';

interface AnalyzeResult {
  metadata: ExtendedMetadata;
  fileName: string;
  fileSize: number;
}

interface PlatformResult {
  platformId: string;
  platformName: string;
  result: PerfectResult;
}

const EVALUATORS: Record<string, {
  name: string;
  fn: (meta: ExtendedMetadata) => PerfectResult;
}> = {
  ig_reels: { name: 'Instagram Reels', fn: evaluateIgReelsPerfect },
  ig_post: { name: 'Instagram Post', fn: evaluateIgPost },
  ig_story: { name: 'Instagram Story', fn: evaluateIgStory },
  tiktok: { name: 'TikTok', fn: evaluateTikTok },
  yt_shorts: { name: 'YouTube Shorts', fn: evaluateYouTubeShorts },
  youtube: { name: 'YouTube', fn: evaluateYouTube },
  mxf_pal: { name: 'MXF PAL', fn: evaluateMxfPal },
  mxf_ntsc: { name: 'MXF NTSC', fn: evaluateMxfNtsc },
  cinema: { name: 'Cinema / Netflix', fn: evaluateCinema },
  dcp: { name: 'DCP Readiness', fn: evaluateDcp },
  ig_post_image: { name: 'IG Post Image', fn: evaluateIgPostImage },
  ig_story_image: { name: 'IG Story Image', fn: evaluateIgStoryImage },
  ig_reels_cover: { name: 'IG Reels Cover', fn: evaluateIgReelsCover },
  fb_cover: { name: 'Facebook Cover', fn: evaluateFacebookCover },
  linkedin_banner: { name: 'LinkedIn Banner', fn: evaluateLinkedInBanner },
};

type AppPhase = 'upload' | 'pick' | 'loading' | 'results';

export default function App() {
  const [ffprobeOk, setFfprobeOk] = useState<boolean | null>(null);
  const [phase, setPhase] = useState<AppPhase>('upload');
  const [error, setError] = useState<string | null>(null);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResult | null>(null);
  const [platformResults, setPlatformResults] = useState<PlatformResult[]>([]);
  const [selectedPresets, setSelectedPresets] = useState<string[]>([
    'ig_reels', 'tiktok', 'yt_shorts', 'youtube', 'cinema',
  ]);
  const [showAbout, setShowAbout] = useState(false);
  const [showSubscription, setShowSubscription] = useState(false);
  const { license, startCheckout, activateKey, manage, deactivate } = useLicense();

  useEffect(() => {
    invoke<{ available: boolean }>('check_ffprobe')
      .then((status) => setFfprobeOk(status.available))
      .catch(() => setFfprobeOk(false));
  }, []);

  const handleFileSelected = useCallback((path: string) => {
    setFilePath(path);
    setError(null);
    setAnalyzeResult(null);
    setPlatformResults([]);
    setPhase('pick');
  }, []);

  const runAnalysis = useCallback(async () => {
    if (!filePath) return;
    setPhase('loading');
    setError(null);

    try {
      const result = await invoke<AnalyzeResult>('analyze_video', { path: filePath });
      setAnalyzeResult(result);

      const results: PlatformResult[] = selectedPresets
        .filter((id) => EVALUATORS[id])
        .map((id) => {
          const ev = EVALUATORS[id];
          return {
            platformId: id,
            platformName: ev.name,
            result: ev.fn(result.metadata),
          };
        });
      setPlatformResults(results);
      setPhase('results');
    } catch (err) {
      setError(String(err));
      setPhase('pick');
    }
  }, [filePath, selectedPresets]);

  async function handleFilePick() {
    const selected = await open({
      multiple: false,
      directory: false,
      filters: [
        {
          name: 'Media Files',
          extensions: ['mp4', 'mov', 'mkv', 'avi', 'wmv', 'flv', 'webm', 'mts', 'm2ts', 'mxf', 'ts',
                       'jpg', 'jpeg', 'png', 'webp', 'tiff', 'bmp'],
        },
      ],
    });
    if (selected) {
      handleFileSelected(selected);
    }
  }

  function handleReset() {
    setPhase('upload');
    setFilePath(null);
    setAnalyzeResult(null);
    setPlatformResults([]);
    setError(null);
  }

  function handleChangePresets() {
    setPhase('pick');
    setPlatformResults([]);
  }

  const passCount = platformResults.filter(p => p.result.verdict === 'PERFECT').length;
  const totalPlatforms = platformResults.length;

  return (
    <div className="min-h-screen bg-[#07070d] text-[#e5e7eb] antialiased selection:bg-indigo-500/20">
      {/* Auto-updater banner */}
      <UpdateChecker />

      {/* Background blurs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-500/[0.07] blur-[150px]" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[500px] h-[500px] rounded-full bg-violet-500/[0.05] blur-[130px]" />
        <div className="absolute top-[40%] right-[20%] w-[300px] h-[300px] rounded-full bg-emerald-500/[0.03] blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Header */}
        <header className="mb-10 text-center animate-fade-in-up relative">
          {/* About button — top right */}
          <button
            onClick={() => setShowAbout(true)}
            className="absolute right-0 top-1 p-2 text-[#4b5563] hover:text-[#9ca3af] transition-colors rounded-lg hover:bg-white/[0.04]"
            title="About Export Doctor"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </button>

          <div className="inline-flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-white/[0.08] flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round">
                <polygon points="23 7 16 12 23 17 23 7" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Export Doctor</h1>
          </div>
          <p className="text-sm text-[#6b7280]">Check if your media is ready for any platform</p>
        </header>

        {/* ffprobe warning */}
        {ffprobeOk === false && <FfprobeStatus />}

        {/* Phase: Upload */}
        {phase === 'upload' && (
          <FileDropZone onFilePick={handleFilePick} onDrop={handleFileSelected} />
        )}

        {/* Phase: Preset Picker */}
        {phase === 'pick' && filePath && (
          <div className="space-y-4">
            {/* File info pill */}
            <div className="text-center animate-fade-in-up">
              <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-white/[0.03] border border-white/[0.08] rounded-full">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round">
                  <polygon points="23 7 16 12 23 17 23 7" />
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </svg>
                <span className="text-xs text-[#9ca3af] max-w-[300px] truncate">
                  {filePath.split('/').pop() || filePath}
                </span>
                <button onClick={handleReset} className="text-[#6b7280] hover:text-red-400 transition-colors">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="max-w-md mx-auto animate-slide-down">
                <div className="bg-red-500/[0.06] border border-red-500/20 rounded-2xl px-5 py-4">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                    </div>
                    <p className="text-sm text-red-300">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <PresetPicker
              selected={selectedPresets}
              onSelectionChange={setSelectedPresets}
              onAnalyze={runAnalysis}
            />
          </div>
        )}

        {/* Phase: Loading */}
        {phase === 'loading' && <AnalysisProgress />}

        {/* Phase: Results */}
        {phase === 'results' && platformResults.length > 0 && analyzeResult && (
          <div className="space-y-5 animate-fade-in">
            {/* Summary bar */}
            <div className="text-center animate-fade-in-up">
              <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-white/[0.02] border border-white/[0.08] rounded-full">
                <span className="text-xs text-[#6b7280]">{analyzeResult.fileName}</span>
                <span className="w-px h-3 bg-white/[0.1]" />
                <span className="text-xs text-[#6b7280]">{(analyzeResult.fileSize / (1024 * 1024)).toFixed(1)} MB</span>
                <span className="w-px h-3 bg-white/[0.1]" />
                <span className={`text-xs font-semibold ${passCount === totalPlatforms ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {passCount}/{totalPlatforms} ready
                </span>
              </div>
            </div>

            {/* Metadata */}
            <MetadataGrid metadata={analyzeResult.metadata} fileName={analyzeResult.fileName} fileSize={analyzeResult.fileSize} />

            {/* Platform cards */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider">Platform Compliance</h2>
                <button
                  onClick={handleChangePresets}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Change presets
                </button>
              </div>
              <div className="stagger-children space-y-2">
                {platformResults.map((pr) => (
                  <PlatformCard
                    key={pr.platformId}
                    platformId={pr.platformId}
                    platformName={pr.platformName}
                    result={pr.result}
                    metadata={analyzeResult.metadata}
                  />
                ))}
              </div>
            </div>

            {/* Export buttons */}
            <ExportButtons
              metadata={analyzeResult.metadata}
              platformResults={platformResults}
              fileName={analyzeResult.fileName}
            />

            {/* Reset */}
            <div className="flex justify-center pt-2 animate-fade-in-up" style={{ animationDelay: '500ms' }}>
              <button
                onClick={handleReset}
                className="group px-6 py-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.15] rounded-xl text-sm font-medium text-[#9ca3af] hover:text-white transition-all duration-200 flex items-center gap-2"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="group-hover:rotate-[-45deg] transition-transform duration-300">
                  <path d="M23 4v6h-6" /><path d="M1 20v-6h6" /><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                </svg>
                Analyze Another File
              </button>
            </div>
          </div>
        )}
      </div>

      {/* About dialog */}
      <AboutDialog
        open={showAbout}
        onClose={() => setShowAbout(false)}
        license={license}
        onManageSubscription={() => { setShowAbout(false); setShowSubscription(true); }}
      />

      {/* Subscription dialog */}
      <SubscriptionDialog
        open={showSubscription}
        onClose={() => setShowSubscription(false)}
        license={license}
        onManage={manage}
        onDeactivate={deactivate}
        onSubscribe={startCheckout}
        onActivateKey={activateKey}
      />
    </div>
  );
}
