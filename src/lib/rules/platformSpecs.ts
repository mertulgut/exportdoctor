export interface SpecItem {
  label: string;
  value: string;
}

export interface PlatformSpec {
  title: string;
  specs: SpecItem[];
}

export const platformSpecs: Record<string, PlatformSpec> = {
  ig_reels: {
    title: 'Instagram Reels — No Transcode Export',
    specs: [
      { label: 'Container', value: 'MP4' },
      { label: 'Codec', value: 'H.264 / AVC' },
      { label: 'Profile', value: 'High' },
      { label: 'Level', value: '4.2' },
      { label: 'Pixel Format', value: 'yuv420p' },
      { label: 'Resolution', value: '1080x1920' },
      { label: 'Aspect Ratio', value: '9:16' },
      { label: 'Scan', value: 'Progressive' },
      { label: 'Color', value: 'Rec.709 SDR' },
      { label: 'Frame Rate', value: '30.000 CFR' },
      { label: 'Duration', value: 'up to 180s' },
      { label: 'Bitrate', value: '6.5-10 Mbps (duration-dependent)' },
      { label: 'Audio', value: 'AAC, min 44.1kHz' },
    ],
  },
  tiktok: {
    title: 'TikTok — Optimal Export',
    specs: [
      { label: 'Container', value: 'MP4' },
      { label: 'Codec', value: 'H.264 (preferred) or HEVC' },
      { label: 'Resolution', value: '1080x1920' },
      { label: 'Aspect Ratio', value: '9:16' },
      { label: 'Frame Rate', value: '30 FPS' },
      { label: 'Duration', value: 'up to 180s (short) / 600s (long)' },
      { label: 'Audio', value: 'AAC' },
    ],
  },
  youtube: {
    title: 'YouTube — Recommended Export',
    specs: [
      { label: 'Container', value: 'MP4' },
      { label: 'Codec', value: 'H.264 (universal) or VP9' },
      { label: 'Resolution', value: '1920x1080 or higher' },
      { label: 'Aspect Ratio', value: '16:9' },
      { label: 'Frame Rate', value: '24-60 FPS' },
      { label: 'Duration', value: 'up to 12 hours' },
      { label: 'Audio', value: 'AAC, 48kHz' },
    ],
  },
  yt_shorts: {
    title: 'YouTube Shorts — Optimal Export',
    specs: [
      { label: 'Container', value: 'MP4' },
      { label: 'Codec', value: 'H.264 or VP9' },
      { label: 'Resolution', value: '1080x1920' },
      { label: 'Aspect Ratio', value: '9:16' },
      { label: 'Frame Rate', value: '30 FPS' },
      { label: 'Duration', value: 'up to 60s' },
      { label: 'Audio', value: 'AAC, 48kHz' },
    ],
  },
  cinema: {
    title: 'Cinema / Netflix — Professional Delivery',
    specs: [
      { label: 'Container', value: 'MOV (ProRes) or MP4' },
      { label: 'Codec', value: 'ProRes 422 HQ / DNxHR / H.264 High' },
      { label: 'Resolution', value: '3840x2160 (4K preferred) / min 1920x1080' },
      { label: 'Aspect Ratio', value: '16:9, 2.39:1, or 1.85:1' },
      { label: 'Frame Rate', value: '23.976 / 24 / 25 CFR' },
      { label: 'Bitrate', value: '>= 50 Mbps (ProRes) / >= 20 Mbps (H.264)' },
      { label: 'Color', value: 'Rec.709 (HD) or Rec.2020 (UHD)' },
      { label: 'Audio', value: 'PCM WAV 48kHz 24-bit or AAC' },
    ],
  },
  ig_post: {
    title: 'Instagram Post (Feed)',
    specs: [
      { label: 'Container', value: 'MP4' },
      { label: 'Codec', value: 'H.264' },
      { label: 'Resolution', value: '1080x1080 (square) or 1080x1350 (4:5)' },
      { label: 'Aspect Ratio', value: '1:1 or 4:5' },
      { label: 'Frame Rate', value: '30 FPS' },
      { label: 'Duration', value: 'up to 60s' },
      { label: 'Bitrate', value: '3.5-6 Mbps' },
      { label: 'Audio', value: 'AAC' },
    ],
  },
  ig_story: {
    title: 'Instagram Story',
    specs: [
      { label: 'Container', value: 'MP4' },
      { label: 'Codec', value: 'H.264' },
      { label: 'Resolution', value: '1080x1920' },
      { label: 'Aspect Ratio', value: '9:16' },
      { label: 'Frame Rate', value: '30 FPS' },
      { label: 'Duration', value: 'up to 15s per segment (60s total)' },
      { label: 'Audio', value: 'AAC' },
    ],
  },
  ig_post_image: {
    title: 'Instagram Post Image',
    specs: [
      { label: 'Format', value: 'JPEG or PNG' },
      { label: 'Resolution', value: '1080x1080 (square) or 1080x1350 (portrait 4:5)' },
      { label: 'Aspect Ratio', value: '1:1 or 4:5' },
      { label: 'Color Space', value: 'sRGB' },
      { label: 'Max File Size', value: '8 MB recommended' },
    ],
  },
  ig_story_image: {
    title: 'Instagram Story Image',
    specs: [
      { label: 'Format', value: 'JPEG or PNG' },
      { label: 'Resolution', value: '1080x1920' },
      { label: 'Aspect Ratio', value: '9:16' },
      { label: 'Color Space', value: 'sRGB' },
    ],
  },
  ig_reels_cover: {
    title: 'Instagram Reels Cover Image',
    specs: [
      { label: 'Format', value: 'JPEG or PNG' },
      { label: 'Resolution', value: '1080x1920' },
      { label: 'Aspect Ratio', value: '9:16' },
      { label: 'Color Space', value: 'sRGB' },
    ],
  },
  fb_cover: {
    title: 'Facebook Cover Photo',
    specs: [
      { label: 'Format', value: 'JPEG or PNG' },
      { label: 'Resolution', value: '1200x628 (recommended) or 820x312 (desktop)' },
      { label: 'Aspect Ratio', value: '~1.91:1' },
      { label: 'Color Space', value: 'sRGB' },
    ],
  },
  linkedin_banner: {
    title: 'LinkedIn Banner Image',
    specs: [
      { label: 'Format', value: 'JPEG or PNG' },
      { label: 'Resolution', value: '1584x396 (recommended) or 1200x627' },
      { label: 'Aspect Ratio', value: '4:1' },
      { label: 'Color Space', value: 'sRGB' },
    ],
  },
  mxf_pal: {
    title: 'MXF PAL (EBU Broadcast)',
    specs: [
      { label: 'Container', value: 'MXF' },
      { label: 'Codec', value: 'MPEG-2 / DNxHD / ProRes / AVC-Intra' },
      { label: 'Resolution', value: '1920x1080' },
      { label: 'Frame Rate', value: '25 FPS (PAL)' },
      { label: 'Bitrate', value: '>= 50 Mbps' },
      { label: 'Audio', value: 'PCM uncompressed, 48kHz' },
      { label: 'Scan', value: 'Progressive or Interlaced' },
    ],
  },
  mxf_ntsc: {
    title: 'MXF NTSC (Broadcast)',
    specs: [
      { label: 'Container', value: 'MXF' },
      { label: 'Codec', value: 'MPEG-2 / DNxHD / ProRes / AVC-Intra' },
      { label: 'Resolution', value: '1920x1080' },
      { label: 'Frame Rate', value: '29.97 FPS (NTSC)' },
      { label: 'Bitrate', value: '>= 50 Mbps' },
      { label: 'Audio', value: 'PCM uncompressed, 48kHz' },
    ],
  },
  dcp: {
    title: 'DCP Readiness Check',
    specs: [
      { label: 'Container', value: 'MXF' },
      { label: 'Codec', value: 'JPEG 2000' },
      { label: 'Resolution', value: '2048x1080 (2K) or 4096x2160 (4K)' },
      { label: 'Frame Rate', value: '24 FPS (standard)' },
      { label: 'Bitrate', value: '>= 100 Mbps' },
      { label: 'Color', value: 'DCI-P3 / XYZ' },
      { label: 'Audio', value: 'PCM 24-bit, 48kHz, 5.1 or 7.1' },
      { label: 'Bit Depth', value: '12-bit' },
    ],
  },
};
