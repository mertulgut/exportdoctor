import type { FieldCheck as _FieldCheck } from './rules/evaluate';
export type { FieldCheck, PerfectResult, ExtendedMetadata } from './rules/evaluate';

export interface AnalyzeResult {
  metadata: import('./rules/evaluate').ExtendedMetadata;
  fileName: string;
  fileSize: number;
}

export interface PlatformResult {
  platformId: string;
  platformName: string;
  platformIcon: string;
  result: import('./rules/evaluate').PerfectResult;
}

export type Platform = 'ig_reels' | 'tiktok' | 'youtube' | 'yt_shorts' | 'cinema';
