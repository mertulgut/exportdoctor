import { useState } from 'react';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { ExtendedMetadata, PerfectResult } from '@/lib/rules/evaluate';

interface PlatformResult {
  platformId: string;
  platformName: string;
  result: PerfectResult;
}

interface ExportButtonsProps {
  metadata: ExtendedMetadata;
  platformResults: PlatformResult[];
  fileName: string;
}

export default function ExportButtons({ metadata, platformResults, fileName }: ExportButtonsProps) {
  const [copied, setCopied] = useState(false);

  function buildReport() {
    return {
      fileName,
      analyzedAt: new Date().toISOString(),
      metadata,
      platforms: platformResults.map((pr) => ({
        platform: pr.platformName,
        verdict: pr.result.verdict,
        score: pr.result.checks.length > 0
          ? Math.round((pr.result.checks.filter(c => c.ok).length / pr.result.checks.length) * 100)
          : 0,
        checks: pr.result.checks,
        reasons: pr.result.reasons,
      })),
    };
  }

  function buildTextReport(): string {
    const r = buildReport();
    let txt = `EXPORT DOCTOR REPORT\n`;
    txt += `${'='.repeat(50)}\n`;
    txt += `File: ${r.fileName}\n`;
    txt += `Date: ${r.analyzedAt}\n\n`;
    txt += `--- METADATA ---\n`;
    txt += `Resolution: ${metadata.width}x${metadata.height}\n`;
    txt += `Codec: ${metadata.videoCodec}\n`;
    txt += `Container: ${metadata.container}\n`;
    txt += `FPS: ${metadata.fpsAvg}\n`;
    txt += `Duration: ${metadata.durationSec.toFixed(2)}s\n`;
    txt += `Bitrate: ${metadata.videoBitrate ? (metadata.videoBitrate / 1e6).toFixed(2) + ' Mbps' : 'N/A'}\n`;
    txt += `Audio: ${metadata.audioCodec || 'N/A'} @ ${metadata.audioSampleRate || 'N/A'} Hz\n\n`;

    for (const p of r.platforms) {
      txt += `--- ${p.platform.toUpperCase()} --- [${p.verdict}] ${p.score}%\n`;
      for (const c of p.checks) {
        txt += `  ${c.ok ? 'PASS' : 'FAIL'} ${c.field}: ${c.value} (expected: ${c.expected})\n`;
      }
      if (p.reasons && p.reasons.length > 0) {
        txt += `  Notes:\n`;
        for (const n of p.reasons) {
          txt += `    - ${n}\n`;
        }
      }
      txt += '\n';
    }
    return txt;
  }

  async function handleCopyJson() {
    try {
      await writeText(JSON.stringify(buildReport(), null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      navigator.clipboard.writeText(JSON.stringify(buildReport(), null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function handleSaveTxt() {
    const path = await save({
      filters: [{ name: 'Text', extensions: ['txt'] }],
      defaultPath: `${fileName.replace(/\.[^.]+$/, '')}-report.txt`,
    });
    if (path) {
      await writeTextFile(path, buildTextReport());
    }
  }

  async function handleSaveJson() {
    const path = await save({
      filters: [{ name: 'JSON', extensions: ['json'] }],
      defaultPath: `${fileName.replace(/\.[^.]+$/, '')}-report.json`,
    });
    if (path) {
      await writeTextFile(path, JSON.stringify(buildReport(), null, 2));
    }
  }

  return (
    <div className="flex justify-center gap-3 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
      <button onClick={handleCopyJson} className="px-4 py-2.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-xl text-xs font-medium text-[#9ca3af] hover:text-white transition-all flex items-center gap-2">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
        {copied ? 'Copied!' : 'Copy JSON'}
      </button>
      <button onClick={handleSaveTxt} className="px-4 py-2.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-xl text-xs font-medium text-[#9ca3af] hover:text-white transition-all flex items-center gap-2">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Save TXT
      </button>
      <button onClick={handleSaveJson} className="px-4 py-2.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-xl text-xs font-medium text-[#9ca3af] hover:text-white transition-all flex items-center gap-2">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Save JSON
      </button>
    </div>
  );
}
