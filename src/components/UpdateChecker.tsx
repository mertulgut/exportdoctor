import { useState, useEffect } from 'react';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

type UpdateState = 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'error';

export default function UpdateChecker() {
  const [state, setState] = useState<UpdateState>('idle');
  const [version, setVersion] = useState<string>('');
  const [releaseNotes, setReleaseNotes] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [showNotes, setShowNotes] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      checkForUpdate();
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  async function checkForUpdate() {
    try {
      setState('checking');
      const update = await check();

      if (update) {
        setVersion(update.version);
        // Tauri updater provides body from GitHub release notes
        if (update.body) {
          setReleaseNotes(update.body);
        }
        setState('available');
        (window as unknown as Record<string, unknown>).__tauriUpdate = update;
      } else {
        setState('idle');
      }
    } catch (err) {
      console.error('[UpdateChecker] check failed:', err);
      setState('idle');
    }
  }

  async function downloadAndInstall() {
    try {
      setState('downloading');
      setShowNotes(false);
      const update = (window as unknown as Record<string, unknown>).__tauriUpdate as Awaited<ReturnType<typeof check>>;

      if (!update) {
        setState('error');
        setErrorMsg('Update object lost. Please restart the app.');
        return;
      }

      let downloaded = 0;
      let contentLength = 0;

      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            contentLength = event.data.contentLength ?? 0;
            setProgress(0);
            break;
          case 'Progress':
            downloaded += event.data.chunkLength;
            if (contentLength > 0) {
              setProgress(Math.round((downloaded / contentLength) * 100));
            }
            break;
          case 'Finished':
            setProgress(100);
            break;
        }
      });

      setState('ready');
    } catch (err) {
      console.error('[UpdateChecker] download failed:', err);
      setState('error');
      setErrorMsg(String(err));
    }
  }

  async function handleRelaunch() {
    await relaunch();
  }

  function dismiss() {
    setState('idle');
    setShowNotes(false);
  }

  if (state === 'idle' || state === 'checking') {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 animate-slide-down">
      <div className="max-w-4xl mx-auto px-4 pt-2">
        <div className="bg-indigo-500/10 border border-indigo-500/25 rounded-xl backdrop-blur-sm overflow-hidden">
          {/* Main bar */}
          <div className="px-4 py-3 flex items-center gap-3">
            {/* Icon */}
            <div className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
              {state === 'ready' ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              )}
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              {state === 'available' && (
                <p className="text-sm text-indigo-200">
                  <span className="font-semibold text-white">v{version}</span> is available
                  {releaseNotes && (
                    <button
                      onClick={() => setShowNotes(!showNotes)}
                      className="ml-2 text-[11px] text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors"
                    >
                      {showNotes ? 'Hide' : "What's new?"}
                    </button>
                  )}
                </p>
              )}
              {state === 'downloading' && (
                <div className="flex items-center gap-3">
                  <p className="text-sm text-indigo-200">Downloading v{version}...</p>
                  <div className="flex-1 max-w-[120px] h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-400 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-xs text-indigo-300 tabular-nums">{progress}%</span>
                </div>
              )}
              {state === 'ready' && (
                <p className="text-sm text-emerald-300">
                  v{version} is ready. Restart to apply.
                </p>
              )}
              {state === 'error' && (
                <p className="text-sm text-red-300">Update failed: {errorMsg}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {state === 'available' && (
                <>
                  <button
                    onClick={downloadAndInstall}
                    className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-semibold rounded-lg transition-colors"
                  >
                    Update
                  </button>
                  <button
                    onClick={dismiss}
                    className="text-indigo-400/60 hover:text-indigo-300 transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </>
              )}
              {state === 'ready' && (
                <button
                  onClick={handleRelaunch}
                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M23 4v6h-6" /><path d="M1 20v-6h6" /><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                  </svg>
                  Restart Now
                </button>
              )}
              {state === 'error' && (
                <button
                  onClick={dismiss}
                  className="text-red-400/60 hover:text-red-300 transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Release notes dropdown */}
          {showNotes && releaseNotes && (
            <div className="border-t border-indigo-500/15 px-4 py-3 animate-fade-in">
              <h4 className="text-[11px] font-semibold text-indigo-300 uppercase tracking-wider mb-2">
                What's new in v{version}
              </h4>
              <div className="text-xs text-[#9ca3af] leading-relaxed whitespace-pre-line max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                {releaseNotes}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
