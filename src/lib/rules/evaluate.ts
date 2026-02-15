export type FieldCheck = {
    field: string;
    value: string;
    expected: string;
    ok: boolean;
    reason: string;
};

export type PerfectResult = {
    verdict: "PERFECT" | "FLAWED" | "PASS" | "FAIL";
    checks: FieldCheck[];
    reasons?: string[];
};

export type ExtendedMetadata = {
    width: number;
    height: number;
    fps: number;
    fpsAvg: number;
    fpsR: number;
    videoCodec: string;
    container: string;
    durationSec: number;
    audioCodec?: string;
    audioSampleRate?: number;
    videoBitrate?: number;
    formatBitrate?: number;
    profile?: string;
    level?: number;
    pixFmt?: string;
    fieldOrder?: string;
    colorSpace?: string;
    colorTransfer?: string;
    colorPrimaries?: string;
    colorRange?: string;
    audioBitrate?: number;
    hasBFrames?: number;
    refs?: number;
    nbFrames?: string;
    codecTimeBase?: string;
    audioChannels?: number;
    audioChannelLayout?: string;
    bitsPerRawSample?: string;
};

// ── Instagram Reels — "NO TRANSCODE" strict target ──

export function evaluateIgReelsPerfect(meta: ExtendedMetadata): PerfectResult {
    const checks: FieldCheck[] = [];
    const fail = (field: string, value: string, expected: string, reason: string) =>
        checks.push({ field, value, expected, ok: false, reason });
    const pass = (field: string, value: string, expected: string, reason: string) =>
        checks.push({ field, value, expected, ok: true, reason });

    const lc = (s: any) => String(s ?? "").toLowerCase().trim();
    const codec = normalizeCodec(lc(meta.videoCodec));
    const container = normalizeContainer(lc(meta.container));
    const pix = lc(meta.pixFmt);
    const w = Number(meta.width ?? 0);
    const h = Number(meta.height ?? 0);
    const dur = Number(meta.durationSec ?? 0);
    const fpsAvg = Number(meta.fpsAvg ?? meta.fps ?? 0);
    const bps = Number(meta.videoBitrate ?? 0) || Number(meta.formatBitrate ?? 0);
    const mbps = bps > 0 ? bps / 1_000_000 : 0;

    if (container === "mp4") pass("Container", meta.container ?? "", "MP4", "Must be MP4");
    else fail("Container", meta.container ?? "", "MP4", "Non-MP4 increases re-mux/transcode risk");

    if (codec === "h264") pass("Video Codec", meta.videoCodec ?? "", "H.264", "Must be H.264");
    else fail("Video Codec", meta.videoCodec ?? "", "H.264", "HEVC/H265 typically triggers IG transcode");

    const prof = lc(meta.profile);
    if (prof.includes("high")) pass("Profile", meta.profile ?? "", "High", "High profile");
    else fail("Profile", meta.profile ?? "", "High", "Non-High profile increases encode likelihood");

    const lvl = Number(meta.level ?? 0);
    if (lvl === 42) pass("Level", String(meta.level ?? ""), "4.2 (42)", "Level 4.2");
    else fail("Level", String(meta.level ?? ""), "4.2 (42)", "Non-4.2 level may trigger re-encode");

    if (pix === "yuv420p") pass("Pixel Format", meta.pixFmt ?? "", "yuv420p (8-bit 4:2:0)", "8-bit 4:2:0");
    else fail("Pixel Format", meta.pixFmt ?? "", "yuv420p (8-bit 4:2:0)", "Non-420p/10-bit = forced transcode");

    if (w === 1080 && h === 1920) pass("Resolution", `${w}x${h}`, "1080x1920", "Reels target resolution");
    else fail("Resolution", `${w}x${h}`, "1080x1920", "Different resolution will be re-processed by IG");

    const ratio = h ? w / h : 0;
    const ratioOk = Math.abs(ratio - 9 / 16) <= 0.01;
    if (ratioOk) pass("Aspect", ratio.toFixed(4), "9:16", "9:16 vertical");
    else fail("Aspect", ratio.toFixed(4), "9:16", "Non-9:16 will cause transcode or cropping");

    const fieldOrder = lc(meta.fieldOrder);
    if (!fieldOrder || fieldOrder === "progressive") pass("Scan", meta.fieldOrder ?? "progressive", "Progressive", "No interlacing");
    else fail("Scan", meta.fieldOrder ?? "", "Progressive", "Interlaced video will be re-processed");

    const transfer = lc(meta.colorTransfer);
    const hdrFlag = transfer.includes("smpte2084") || transfer.includes("arib-std-b67") || transfer.includes("hlg");
    if (hdrFlag) fail("Color", meta.colorTransfer ?? "", "Rec.709 (SDR)", "HDR triggers IG transcode");
    else pass("Color", `${meta.colorPrimaries || "-"} / ${meta.colorTransfer || "-"}`, "Rec.709 (SDR)", "SDR OK");

    const fpsOk = fpsAvg >= 29.9 && fpsAvg <= 30.1;
    if (fpsOk) pass("FPS", `${fpsAvg.toFixed(2)}`, "~30 FPS", "30 FPS constant");
    else fail("FPS", `${fpsAvg.toFixed(2)}`, "~30 FPS", "VFR or non-30fps increases encode risk");

    if (dur > 0 && dur <= 180) pass("Duration", `${dur.toFixed(2)}s`, "<= 180s", "Within limit");
    else fail("Duration", `${dur.toFixed(2)}s`, "<= 180s", "Exceeds duration limit");

    const { minMbps, maxMbps } = reelsBitrateWindow(dur);
    if (mbps >= minMbps && mbps <= maxMbps) {
        pass("Bitrate", `${mbps.toFixed(2)} Mbps`, `${minMbps}-${maxMbps} Mbps`, "No-transcode sweet spot");
    } else {
        fail("Bitrate", mbps ? `${mbps.toFixed(2)} Mbps` : "unknown", `${minMbps}-${maxMbps} Mbps`,
            mbps > maxMbps ? "Too high — IG will transcode" : "Too low — quality loss likely");
    }

    const aCodec = lc(meta.audioCodec);
    if (aCodec === "aac") pass("Audio Codec", meta.audioCodec ?? "none", "AAC", "AAC required");
    else fail("Audio Codec", meta.audioCodec ?? "none", "AAC", "Non-AAC will be converted");

    const aHz = Number(meta.audioSampleRate ?? 0);
    if (aHz >= 44100) pass("Audio Hz", String(aHz || 0), ">= 44100", "Sample rate OK");
    else fail("Audio Hz", String(aHz || 0), ">= 44100", "Below 44.1kHz minimum");

    const verdict: "PERFECT" | "FLAWED" = checks.some((c) => !c.ok) ? "FLAWED" : "PERFECT";
    return { verdict, checks };
}

// ── TikTok — more flexible ──

export function evaluateTikTok(meta: ExtendedMetadata): PerfectResult {
    const checks: FieldCheck[] = [];
    const reasons: string[] = [];
    const fail = (field: string, value: string, expected: string, reason: string) =>
        checks.push({ field, value, expected, ok: false, reason });
    const pass = (field: string, value: string, expected: string, reason: string) =>
        checks.push({ field, value, expected, ok: true, reason });

    const lc = (s: any) => String(s ?? "").toLowerCase().trim();
    const codec = normalizeCodec(lc(meta.videoCodec));
    const container = normalizeContainer(lc(meta.container));
    const w = Number(meta.width ?? 0);
    const h = Number(meta.height ?? 0);
    const dur = Number(meta.durationSec ?? 0);
    const fpsAvg = Number(meta.fpsAvg ?? meta.fps ?? 0);

    if (container === "mp4") pass("Container", meta.container ?? "", "MP4", "MP4");
    else { fail("Container", meta.container ?? "", "MP4", "Must be MP4"); reasons.push("TikTok requires MP4 container"); }

    if (codec === "h264" || codec === "hevc") {
        pass("Codec", meta.videoCodec ?? "", "H.264/HEVC", codec.toUpperCase());
    } else { fail("Codec", meta.videoCodec ?? "", "H.264/HEVC", "Unsupported codec"); reasons.push(`Codec ${meta.videoCodec} may cause issues on TikTok`); }

    if (w >= 720 && h >= 1280) { pass("Resolution", `${w}x${h}`, ">= 720x1280", "OK"); }
    else { fail("Resolution", `${w}x${h}`, ">= 720x1280", "Resolution too low"); reasons.push("Resolution is below 720p"); }

    const ratio = h ? w / h : 0;
    const isVertical = Math.abs(ratio - 9 / 16) < 0.1;
    const isHorizontal = Math.abs(ratio - 16 / 9) < 0.1;
    if (isVertical) pass("Aspect", ratio.toFixed(4), "9:16", "Vertical video");
    else if (isHorizontal) { pass("Aspect", ratio.toFixed(4), "16:9", "Horizontal video"); reasons.push("Horizontal video gets less visibility on TikTok"); }
    else { fail("Aspect", ratio.toFixed(4), "9:16 or 16:9", "Non-standard aspect ratio"); reasons.push("TikTok is optimized for vertical video"); }

    if (dur <= 180) pass("Duration", `${dur.toFixed(2)}s`, "<= 3 min", "Short format");
    else if (dur <= 600) { pass("Duration", `${dur.toFixed(2)}s`, "<= 10 min", "Long format"); reasons.push("Longer videos may get lower engagement"); }
    else { fail("Duration", `${dur.toFixed(2)}s`, "<= 10 min", "Too long"); reasons.push(`Duration ${(dur / 60).toFixed(1)} min — exceeds limit`); }

    if (fpsAvg >= 24 && fpsAvg <= 60) { pass("FPS", `${fpsAvg.toFixed(2)}`, "24-60 FPS", "OK"); }
    else { fail("FPS", `${fpsAvg.toFixed(2)}`, "24-60 FPS", "Unusual frame rate"); reasons.push("FPS is outside normal range"); }

    const aCodec = lc(meta.audioCodec);
    if (aCodec === "aac") pass("Audio Codec", meta.audioCodec ?? "none", "AAC", "AAC");
    else if (aCodec === "mp3") { pass("Audio Codec", meta.audioCodec ?? "none", "AAC/MP3", "MP3 accepted"); }
    else { fail("Audio Codec", meta.audioCodec ?? "none", "AAC", "Unsupported audio codec"); reasons.push(`Audio codec ${meta.audioCodec} may cause issues`); }

    const verdict = checks.some((c) => !c.ok) ? "FLAWED" : "PERFECT";
    return { verdict, checks, reasons };
}

// ── YouTube ──

export function evaluateYouTube(meta: ExtendedMetadata): PerfectResult {
    const checks: FieldCheck[] = [];
    const reasons: string[] = [];
    const fail = (field: string, value: string, expected: string, reason: string) =>
        checks.push({ field, value, expected, ok: false, reason });
    const pass = (field: string, value: string, expected: string, reason: string) =>
        checks.push({ field, value, expected, ok: true, reason });

    const lc = (s: any) => String(s ?? "").toLowerCase().trim();
    const codec = normalizeCodec(lc(meta.videoCodec));
    const container = normalizeContainer(lc(meta.container));
    const w = Number(meta.width ?? 0);
    const h = Number(meta.height ?? 0);
    const dur = Number(meta.durationSec ?? 0);
    const fpsAvg = Number(meta.fpsAvg ?? meta.fps ?? 0);

    const supportedContainers = ["mp4", "mov", "avi", "wmv", "flv", "mkv", "webm"];
    if (supportedContainers.includes(container)) { pass("Container", meta.container ?? "", "MP4/MOV/AVI/WMV/FLV/MKV/WebM", container.toUpperCase()); }
    else { fail("Container", meta.container ?? "", "MP4/MOV/...", "Unsupported container"); reasons.push(`Container ${meta.container} may cause issues on YouTube`); }

    const supportedCodecs = ["h264", "hevc", "vp9", "av1"];
    if (supportedCodecs.includes(codec)) { pass("Codec", meta.videoCodec ?? "", "H.264/HEVC/VP9/AV1", codec.toUpperCase()); }
    else { fail("Codec", meta.videoCodec ?? "", "H.264/HEVC/VP9/AV1", "Non-standard codec"); reasons.push(`Codec ${meta.videoCodec} may require transcoding`); }

    if (w >= 360 && h >= 640) { pass("Resolution", `${w}x${h}`, ">= 360p", "OK"); }
    else { fail("Resolution", `${w}x${h}`, ">= 360p", "Resolution too low"); reasons.push("Resolution is below 360p"); }

    const ratio = h ? w / h : 0;
    const is16by9 = Math.abs(ratio - 16 / 9) < 0.05;
    if (is16by9) pass("Aspect", ratio.toFixed(4), "16:9", "Standard YouTube");
    else pass("Aspect", ratio.toFixed(4), "Any", "Non-standard aspect ratio");

    if (dur <= 43200) { pass("Duration", `${dur.toFixed(2)}s`, "<= 12 hours", "Within limit"); }
    else { fail("Duration", `${dur.toFixed(2)}s`, "<= 12 hours", "Exceeds limit"); reasons.push("Duration exceeds the limit"); }

    if (fpsAvg >= 24 && fpsAvg <= 60) { pass("FPS", `${fpsAvg.toFixed(2)}`, "24-60 FPS", "OK"); }
    else if (fpsAvg > 60 && fpsAvg <= 120) { pass("FPS", `${fpsAvg.toFixed(2)}`, "up to 120 FPS", "High frame rate"); }
    else { fail("FPS", `${fpsAvg.toFixed(2)}`, "24-120 FPS", "Unusual frame rate"); }

    const aCodec = lc(meta.audioCodec);
    const supportedAudio = ["aac", "mp3", "wav", "flac", "opus"];
    if (supportedAudio.includes(aCodec)) { pass("Audio Codec", meta.audioCodec ?? "", "AAC/MP3/WAV/FLAC/OPUS", aCodec.toUpperCase()); }
    else { fail("Audio Codec", meta.audioCodec ?? "", "AAC/MP3/WAV/FLAC/OPUS", "Non-standard codec"); reasons.push(`Audio codec ${meta.audioCodec} may cause issues`); }

    const verdict = checks.some((c) => !c.ok) ? "FLAWED" : "PERFECT";
    return { verdict, checks, reasons };
}

// ── YouTube Shorts ──

export function evaluateYouTubeShorts(meta: ExtendedMetadata): PerfectResult {
    const checks: FieldCheck[] = [];
    const reasons: string[] = [];
    const fail = (field: string, value: string, expected: string, reason: string) =>
        checks.push({ field, value, expected, ok: false, reason });
    const pass = (field: string, value: string, expected: string, reason: string) =>
        checks.push({ field, value, expected, ok: true, reason });

    const lc = (s: any) => String(s ?? "").toLowerCase().trim();
    const codec = normalizeCodec(lc(meta.videoCodec));
    const container = normalizeContainer(lc(meta.container));
    const w = Number(meta.width ?? 0);
    const h = Number(meta.height ?? 0);
    const dur = Number(meta.durationSec ?? 0);
    const fpsAvg = Number(meta.fpsAvg ?? meta.fps ?? 0);

    const supportedContainers = ["mp4", "mov", "webm"];
    if (supportedContainers.includes(container)) { pass("Container", meta.container ?? "", "MP4/MOV/WebM", container.toUpperCase()); }
    else { fail("Container", meta.container ?? "", "MP4/MOV/WebM", "Unsupported container for Shorts"); reasons.push("Use MP4 for best Shorts compatibility"); }

    const supportedCodecs = ["h264", "hevc", "vp9", "av1"];
    if (supportedCodecs.includes(codec)) { pass("Codec", meta.videoCodec ?? "", "H.264/HEVC/VP9/AV1", codec.toUpperCase()); }
    else { fail("Codec", meta.videoCodec ?? "", "H.264/HEVC/VP9/AV1", "Non-standard codec"); reasons.push(`Codec ${meta.videoCodec} may require transcoding`); }

    if (w >= 1080 && h >= 1920) { pass("Resolution", `${w}x${h}`, ">= 1080x1920", "Full HD vertical"); }
    else if (w >= 720 && h >= 1280) { pass("Resolution", `${w}x${h}`, ">= 720x1280", "HD vertical"); reasons.push("1080x1920 recommended for best quality"); }
    else { fail("Resolution", `${w}x${h}`, ">= 1080x1920", "Resolution too low for Shorts"); reasons.push("Shorts need at least 720p vertical"); }

    const ratio = h ? w / h : 0;
    const isVertical = Math.abs(ratio - 9 / 16) < 0.1;
    if (isVertical) pass("Aspect", ratio.toFixed(4), "9:16", "Vertical — ideal for Shorts");
    else { fail("Aspect", ratio.toFixed(4), "9:16", "Must be vertical 9:16"); reasons.push("YouTube Shorts require vertical 9:16 aspect ratio"); }

    if (dur > 0 && dur <= 60) { pass("Duration", `${dur.toFixed(2)}s`, "<= 60s", "Within Shorts limit"); }
    else if (dur <= 180) { fail("Duration", `${dur.toFixed(2)}s`, "<= 60s", "Too long for Shorts"); reasons.push("Shorts must be 60 seconds or less"); }
    else { fail("Duration", `${dur.toFixed(2)}s`, "<= 60s", "Far exceeds Shorts limit"); reasons.push("Shorts limit is 60 seconds"); }

    if (fpsAvg >= 24 && fpsAvg <= 60) { pass("FPS", `${fpsAvg.toFixed(2)}`, "24-60 FPS", "OK"); }
    else { fail("FPS", `${fpsAvg.toFixed(2)}`, "24-60 FPS", "Unusual frame rate"); }

    const aCodec = lc(meta.audioCodec);
    const supportedAudio = ["aac", "mp3", "wav", "flac", "opus"];
    if (supportedAudio.includes(aCodec)) { pass("Audio Codec", meta.audioCodec ?? "", "AAC/MP3/WAV/FLAC/OPUS", aCodec.toUpperCase()); }
    else { fail("Audio Codec", meta.audioCodec ?? "", "AAC/MP3/WAV/FLAC/OPUS", "Non-standard codec"); }

    const verdict = checks.some((c) => !c.ok) ? "FLAWED" : "PERFECT";
    return { verdict, checks, reasons };
}

// ── Cinema / Netflix ──

export function evaluateCinema(meta: ExtendedMetadata): PerfectResult {
    const checks: FieldCheck[] = [];
    const reasons: string[] = [];
    const fail = (field: string, value: string, expected: string, reason: string) =>
        checks.push({ field, value, expected, ok: false, reason });
    const pass = (field: string, value: string, expected: string, reason: string) =>
        checks.push({ field, value, expected, ok: true, reason });

    const lc = (s: any) => String(s ?? "").toLowerCase().trim();
    const codec = normalizeCodec(lc(meta.videoCodec));
    const container = normalizeContainer(lc(meta.container));
    const pix = lc(meta.pixFmt);
    const w = Number(meta.width ?? 0);
    const h = Number(meta.height ?? 0);
    const dur = Number(meta.durationSec ?? 0);
    const fpsAvg = Number(meta.fpsAvg ?? meta.fps ?? 0);
    const bps = Number(meta.videoBitrate ?? 0) || Number(meta.formatBitrate ?? 0);
    const mbps = bps > 0 ? bps / 1_000_000 : 0;

    // Container: MOV or MXF preferred, MP4 acceptable
    const proContainers = ["mp4", "mov"];
    if (proContainers.includes(container)) { pass("Container", meta.container ?? "", "MOV/MP4", container.toUpperCase()); }
    else { fail("Container", meta.container ?? "", "MOV/MP4", "Professional delivery requires MOV or MP4"); reasons.push("Use MOV (ProRes) or MP4 (H.264) for cinema delivery"); }

    // Codec: ProRes, DNxHR, H.264 High, HEVC accepted
    const proCodecs = ["h264", "hevc", "prores", "dnxhd", "dnxhr"];
    if (proCodecs.includes(codec)) { pass("Codec", meta.videoCodec ?? "", "ProRes/DNxHR/H.264/HEVC", codec.toUpperCase()); }
    else { fail("Codec", meta.videoCodec ?? "", "ProRes/DNxHR/H.264/HEVC", "Use a professional delivery codec"); reasons.push("Cinema requires ProRes, DNxHR, H.264 High, or HEVC"); }

    // Resolution: minimum 1920x1080, prefer 4K
    if (w >= 3840 && h >= 2160) { pass("Resolution", `${w}x${h}`, ">= 3840x2160", "4K UHD"); }
    else if (w >= 1920 && h >= 1080) { pass("Resolution", `${w}x${h}`, ">= 1920x1080", "Full HD"); reasons.push("4K (3840x2160) preferred for cinema delivery"); }
    else { fail("Resolution", `${w}x${h}`, ">= 1920x1080", "Below Full HD minimum"); reasons.push("Cinema delivery requires at least 1920x1080"); }

    // Aspect: 16:9 or cinema scopes
    const ratio = h > 0 ? w / h : 0;
    const is16by9 = Math.abs(ratio - 16 / 9) < 0.05;
    const is239 = Math.abs(ratio - 2.39) < 0.1;
    const is185 = Math.abs(ratio - 1.85) < 0.05;
    if (is16by9) pass("Aspect", ratio.toFixed(4), "16:9 / 2.39:1 / 1.85:1", "Standard 16:9");
    else if (is239) pass("Aspect", ratio.toFixed(4), "16:9 / 2.39:1 / 1.85:1", "Anamorphic scope 2.39:1");
    else if (is185) pass("Aspect", ratio.toFixed(4), "16:9 / 2.39:1 / 1.85:1", "Flat 1.85:1");
    else { pass("Aspect", ratio.toFixed(4), "Any cinema ratio", "Non-standard ratio"); reasons.push("Standard cinema ratios: 16:9, 1.85:1, or 2.39:1"); }

    // FPS: strict cinema frame rates
    const cinemaFps = [23.976, 24.0, 25.0, 29.97, 30.0];
    const fpsMatch = cinemaFps.some(f => Math.abs(fpsAvg - f) < 0.05);
    if (fpsMatch) { pass("FPS", `${fpsAvg.toFixed(3)}`, "23.976/24/25/29.97/30", "Cinema standard"); }
    else { fail("FPS", `${fpsAvg.toFixed(3)}`, "23.976/24/25/29.97/30", "Non-standard cinema frame rate"); reasons.push("Use 23.976, 24, 25, 29.97, or 30 fps for cinema"); }

    // Bitrate: minimum 20 Mbps for H.264, 50+ for ProRes
    if (codec === "prores" || codec === "dnxhd" || codec === "dnxhr") {
        if (mbps >= 50) pass("Bitrate", `${mbps.toFixed(2)} Mbps`, ">= 50 Mbps", "Professional bitrate");
        else { fail("Bitrate", `${mbps.toFixed(2)} Mbps`, ">= 50 Mbps", "Bitrate too low for ProRes/DNxHR"); reasons.push("ProRes/DNxHR should be at least 50 Mbps"); }
    } else {
        if (mbps >= 20) pass("Bitrate", `${mbps.toFixed(2)} Mbps`, ">= 20 Mbps", "Good delivery bitrate");
        else if (mbps > 0) { fail("Bitrate", `${mbps.toFixed(2)} Mbps`, ">= 20 Mbps", "Bitrate too low for cinema"); reasons.push("Cinema delivery should be at least 20 Mbps for H.264/HEVC"); }
        else { fail("Bitrate", "unknown", ">= 20 Mbps", "Cannot determine bitrate"); }
    }

    // Color: Rec.709 or Rec.2020
    const transfer = lc(meta.colorTransfer);
    const primaries = lc(meta.colorPrimaries);
    const isRec2020 = primaries.includes("bt2020") || primaries.includes("2020");
    const isRec709 = primaries.includes("bt709") || primaries.includes("709");
    if (isRec2020 || isRec709) { pass("Color", `${meta.colorPrimaries || "-"} / ${meta.colorTransfer || "-"}`, "Rec.709 or Rec.2020", isRec2020 ? "Rec.2020" : "Rec.709"); }
    else { pass("Color", `${meta.colorPrimaries || "-"} / ${meta.colorTransfer || "-"}`, "Rec.709 or Rec.2020", "Color space not specified"); reasons.push("Specify Rec.709 (HD) or Rec.2020 (UHD) color space"); }

    // Audio: AAC or PCM preferred
    const aCodec = lc(meta.audioCodec);
    const proAudio = ["aac", "pcm_s16le", "pcm_s24le", "pcm_s32le", "pcm_f32le", "wav", "flac"];
    if (proAudio.some(a => aCodec.includes(a))) { pass("Audio Codec", meta.audioCodec ?? "", "AAC/PCM/WAV/FLAC", aCodec.toUpperCase()); }
    else if (aCodec === "mp3") { pass("Audio Codec", meta.audioCodec ?? "", "AAC/PCM", "MP3 — acceptable but not ideal"); reasons.push("Use AAC or PCM for cinema delivery"); }
    else { fail("Audio Codec", meta.audioCodec ?? "none", "AAC/PCM/WAV", "Non-professional audio codec"); }

    const aHz = Number(meta.audioSampleRate ?? 0);
    if (aHz >= 48000) pass("Audio Hz", String(aHz || 0), ">= 48000", "Professional sample rate");
    else if (aHz >= 44100) { pass("Audio Hz", String(aHz || 0), ">= 44100", "Acceptable"); reasons.push("48kHz recommended for cinema/broadcast"); }
    else { fail("Audio Hz", String(aHz || 0), ">= 48000", "Below professional minimum"); }

    const verdict = checks.some((c) => !c.ok) ? "FLAWED" : "PERFECT";
    return { verdict, checks, reasons };
}

// ── Helpers ──

function reelsBitrateWindow(durationSec: number) {
    if (durationSec <= 30) return { minMbps: 8.5, maxMbps: 10.0 };
    if (durationSec <= 60) return { minMbps: 8.0, maxMbps: 9.0 };
    if (durationSec <= 90) return { minMbps: 7.0, maxMbps: 8.0 };
    return { minMbps: 6.5, maxMbps: 7.5 };
}

function normalizeContainer(c: string) {
    if (c.includes("mp4")) return "mp4";
    if (c.includes("mov") || c.includes("quicktime")) return "mov";
    if (c.includes("mxf")) return "mxf";
    if (c.includes("mkv") || c.includes("matroska")) return "mkv";
    if (c.includes("webm")) return "webm";
    if (c.includes("avi")) return "avi";
    if (c.includes("wmv")) return "wmv";
    if (c.includes("flv")) return "flv";
    return c;
}

function normalizeCodec(c: string) {
    if (c.includes("avc") || c === "avc1") return "h264";
    if (c.includes("h264")) return "h264";
    if (c.includes("hevc") || c.includes("h265") || c === "hvc1" || c === "hev1") return "hevc";
    if (c.includes("vp9")) return "vp9";
    if (c.includes("av01") || c.includes("av1")) return "av1";
    if (c.includes("prores")) return "prores";
    if (c.includes("dnxh")) return "dnxhd";
    if (c.includes("jpeg2000") || c.includes("j2k")) return "jpeg2000";
    if (c.includes("mpeg2")) return "mpeg2";
    return c;
}

// ── Instagram Post (Feed) ──

export function evaluateIgPost(meta: ExtendedMetadata): PerfectResult {
    const checks: FieldCheck[] = [];
    const reasons: string[] = [];
    const fail = (field: string, value: string, expected: string, reason: string) =>
        checks.push({ field, value, expected, ok: false, reason });
    const pass = (field: string, value: string, expected: string, reason: string) =>
        checks.push({ field, value, expected, ok: true, reason });

    const lc = (s: any) => String(s ?? "").toLowerCase().trim();
    const codec = normalizeCodec(lc(meta.videoCodec));
    const container = normalizeContainer(lc(meta.container));
    const w = Number(meta.width ?? 0);
    const h = Number(meta.height ?? 0);
    const dur = Number(meta.durationSec ?? 0);
    const fpsAvg = Number(meta.fpsAvg ?? meta.fps ?? 0);
    const bps = Number(meta.videoBitrate ?? 0) || Number(meta.formatBitrate ?? 0);
    const mbps = bps > 0 ? bps / 1_000_000 : 0;

    if (container === "mp4") pass("Container", meta.container ?? "", "MP4", "Must be MP4");
    else fail("Container", meta.container ?? "", "MP4", "Non-MP4 will be re-processed");

    if (codec === "h264") pass("Codec", meta.videoCodec ?? "", "H.264", "H.264 required");
    else fail("Codec", meta.videoCodec ?? "", "H.264", "H.264 is the safest codec for IG feed");

    // Resolution: 1080x1080 (square) or 1080x1350 (portrait 4:5)
    const isSquare = w === 1080 && h === 1080;
    const isPortrait = w === 1080 && h === 1350;
    const isLandscape = w === 1080 && h === 608; // 1.91:1
    if (isSquare) pass("Resolution", `${w}x${h}`, "1080x1080 or 1080x1350", "Square 1:1");
    else if (isPortrait) pass("Resolution", `${w}x${h}`, "1080x1080 or 1080x1350", "Portrait 4:5");
    else if (isLandscape) { pass("Resolution", `${w}x${h}`, "1080x1080 or 1080x1350", "Landscape 1.91:1"); reasons.push("Portrait 4:5 (1080x1350) gets more screen space in feed"); }
    else { fail("Resolution", `${w}x${h}`, "1080x1080 or 1080x1350", "Non-standard feed resolution"); reasons.push("Use 1080x1080 (square) or 1080x1350 (portrait 4:5)"); }

    // Duration: max 60s for feed video
    if (dur > 0 && dur <= 60) pass("Duration", `${dur.toFixed(2)}s`, "<= 60s", "Within feed limit");
    else if (dur <= 120) { fail("Duration", `${dur.toFixed(2)}s`, "<= 60s", "May exceed feed limit"); reasons.push("Feed videos should be 60 seconds or less"); }
    else { fail("Duration", `${dur.toFixed(2)}s`, "<= 60s", "Too long for feed"); reasons.push("Feed video limit is 60 seconds"); }

    // FPS
    if (fpsAvg >= 29.9 && fpsAvg <= 30.1) pass("FPS", `${fpsAvg.toFixed(2)}`, "30 FPS", "30 FPS");
    else if (fpsAvg >= 24 && fpsAvg <= 60) { pass("FPS", `${fpsAvg.toFixed(2)}`, "24-60 FPS", "Acceptable"); reasons.push("30 FPS recommended for Instagram feed"); }
    else fail("FPS", `${fpsAvg.toFixed(2)}`, "24-60 FPS", "Unusual frame rate");

    // Bitrate: 3.5-6 Mbps for feed
    if (mbps >= 3.5 && mbps <= 6) pass("Bitrate", `${mbps.toFixed(2)} Mbps`, "3.5-6 Mbps", "Feed sweet spot");
    else if (mbps > 0) { fail("Bitrate", `${mbps.toFixed(2)} Mbps`, "3.5-6 Mbps", mbps > 6 ? "Too high, IG will re-compress" : "Too low, quality loss"); }
    else fail("Bitrate", "unknown", "3.5-6 Mbps", "Cannot determine bitrate");

    // Audio
    const aCodec = lc(meta.audioCodec);
    if (aCodec === "aac") pass("Audio", meta.audioCodec ?? "none", "AAC", "AAC required");
    else fail("Audio", meta.audioCodec ?? "none", "AAC", "Non-AAC will be converted");

    const verdict = checks.some((c) => !c.ok) ? "FLAWED" : "PERFECT";
    return { verdict, checks, reasons };
}

// ── Instagram Story ──

export function evaluateIgStory(meta: ExtendedMetadata): PerfectResult {
    const checks: FieldCheck[] = [];
    const reasons: string[] = [];
    const fail = (field: string, value: string, expected: string, reason: string) =>
        checks.push({ field, value, expected, ok: false, reason });
    const pass = (field: string, value: string, expected: string, reason: string) =>
        checks.push({ field, value, expected, ok: true, reason });

    const lc = (s: any) => String(s ?? "").toLowerCase().trim();
    const codec = normalizeCodec(lc(meta.videoCodec));
    const container = normalizeContainer(lc(meta.container));
    const w = Number(meta.width ?? 0);
    const h = Number(meta.height ?? 0);
    const dur = Number(meta.durationSec ?? 0);
    const fpsAvg = Number(meta.fpsAvg ?? meta.fps ?? 0);

    if (container === "mp4") pass("Container", meta.container ?? "", "MP4", "Must be MP4");
    else fail("Container", meta.container ?? "", "MP4", "Non-MP4 will be re-processed");

    if (codec === "h264") pass("Codec", meta.videoCodec ?? "", "H.264", "H.264 required");
    else fail("Codec", meta.videoCodec ?? "", "H.264", "Use H.264 for best compatibility");

    // Resolution: 1080x1920 (9:16 vertical)
    if (w === 1080 && h === 1920) pass("Resolution", `${w}x${h}`, "1080x1920", "Full HD vertical");
    else if (w >= 720 && h >= 1280) { pass("Resolution", `${w}x${h}`, "1080x1920", "Acceptable resolution"); reasons.push("1080x1920 recommended for best quality"); }
    else fail("Resolution", `${w}x${h}`, "1080x1920", "Resolution too low for stories");

    // Aspect 9:16
    const ratio = h ? w / h : 0;
    if (Math.abs(ratio - 9 / 16) < 0.01) pass("Aspect", ratio.toFixed(4), "9:16", "Vertical story");
    else { fail("Aspect", ratio.toFixed(4), "9:16", "Must be 9:16 vertical"); reasons.push("Stories require 9:16 vertical aspect ratio"); }

    // Duration: max 15s per story segment (60s for single story)
    if (dur > 0 && dur <= 15) pass("Duration", `${dur.toFixed(2)}s`, "<= 15s", "Single story segment");
    else if (dur <= 60) { pass("Duration", `${dur.toFixed(2)}s`, "<= 60s", "Multi-segment story"); reasons.push("Instagram will split into 15-second segments"); }
    else { fail("Duration", `${dur.toFixed(2)}s`, "<= 60s", "Too long for stories"); reasons.push("Stories max 60 seconds (split into 15s segments)"); }

    // FPS: 30 recommended
    if (fpsAvg >= 29.9 && fpsAvg <= 30.1) pass("FPS", `${fpsAvg.toFixed(2)}`, "30 FPS", "30 FPS");
    else if (fpsAvg >= 24 && fpsAvg <= 60) { pass("FPS", `${fpsAvg.toFixed(2)}`, "24-60 FPS", "Acceptable"); }
    else fail("FPS", `${fpsAvg.toFixed(2)}`, "24-60 FPS", "Unusual frame rate");

    // Audio
    const aCodec = lc(meta.audioCodec);
    if (aCodec === "aac") pass("Audio", meta.audioCodec ?? "none", "AAC", "AAC required");
    else fail("Audio", meta.audioCodec ?? "none", "AAC", "Non-AAC will be converted");

    const verdict = checks.some((c) => !c.ok) ? "FLAWED" : "PERFECT";
    return { verdict, checks, reasons };
}

// ── MXF PAL (EBU Broadcast) ──

export function evaluateMxfPal(meta: ExtendedMetadata): PerfectResult {
    const checks: FieldCheck[] = [];
    const reasons: string[] = [];
    const fail = (field: string, value: string, expected: string, reason: string) =>
        checks.push({ field, value, expected, ok: false, reason });
    const pass = (field: string, value: string, expected: string, reason: string) =>
        checks.push({ field, value, expected, ok: true, reason });

    const lc = (s: any) => String(s ?? "").toLowerCase().trim();
    const codec = normalizeCodec(lc(meta.videoCodec));
    const container = normalizeContainer(lc(meta.container));
    const w = Number(meta.width ?? 0);
    const h = Number(meta.height ?? 0);
    const fpsAvg = Number(meta.fpsAvg ?? meta.fps ?? 0);
    const bps = Number(meta.videoBitrate ?? 0) || Number(meta.formatBitrate ?? 0);
    const mbps = bps > 0 ? bps / 1_000_000 : 0;

    // Container: MXF
    if (container === "mxf") pass("Container", meta.container ?? "", "MXF", "MXF required for broadcast");
    else fail("Container", meta.container ?? "", "MXF", "Broadcast delivery requires MXF container");

    // Codec: MPEG-2, DNxHD, ProRes, AVC-Intra accepted
    const broadcastCodecs = ["mpeg2", "mpeg2video", "dnxhd", "prores", "h264"];
    if (broadcastCodecs.includes(codec)) pass("Codec", meta.videoCodec ?? "", "MPEG-2/DNxHD/ProRes/AVC-I", codec.toUpperCase());
    else fail("Codec", meta.videoCodec ?? "", "MPEG-2/DNxHD/ProRes/AVC-I", "Use a broadcast-standard codec");

    // Resolution: 1920x1080
    if (w === 1920 && h === 1080) pass("Resolution", `${w}x${h}`, "1920x1080", "Full HD");
    else if (w === 720 && h === 576) { pass("Resolution", `${w}x${h}`, "720x576 or 1920x1080", "SD PAL"); reasons.push("HD 1920x1080 preferred for modern broadcast"); }
    else fail("Resolution", `${w}x${h}`, "1920x1080", "Non-standard broadcast resolution");

    // FPS: 25fps (PAL)
    if (Math.abs(fpsAvg - 25.0) < 0.1) pass("FPS", `${fpsAvg.toFixed(3)}`, "25 FPS (PAL)", "PAL standard");
    else if (Math.abs(fpsAvg - 50.0) < 0.1) pass("FPS", `${fpsAvg.toFixed(3)}`, "25/50 FPS", "50i/50p accepted");
    else fail("FPS", `${fpsAvg.toFixed(3)}`, "25 FPS (PAL)", "PAL requires 25fps or 50i");

    // Bitrate: >= 50 Mbps
    if (mbps >= 50) pass("Bitrate", `${mbps.toFixed(2)} Mbps`, ">= 50 Mbps", "Broadcast quality");
    else if (mbps >= 25) { pass("Bitrate", `${mbps.toFixed(2)} Mbps`, ">= 50 Mbps", "Acceptable"); reasons.push("50+ Mbps recommended for broadcast"); }
    else if (mbps > 0) fail("Bitrate", `${mbps.toFixed(2)} Mbps`, ">= 50 Mbps", "Too low for broadcast");
    else fail("Bitrate", "unknown", ">= 50 Mbps", "Cannot determine bitrate");

    // Audio: PCM 48kHz
    const aCodec = lc(meta.audioCodec);
    const isPcm = aCodec.includes("pcm");
    if (isPcm) pass("Audio Codec", meta.audioCodec ?? "", "PCM (uncompressed)", "Broadcast standard");
    else fail("Audio Codec", meta.audioCodec ?? "none", "PCM (uncompressed)", "Broadcast requires PCM audio");

    const aHz = Number(meta.audioSampleRate ?? 0);
    if (aHz === 48000) pass("Audio Hz", String(aHz), "48000 Hz", "Standard broadcast");
    else if (aHz > 0) fail("Audio Hz", String(aHz), "48000 Hz", "Broadcast requires 48kHz");
    else fail("Audio Hz", "unknown", "48000 Hz", "Cannot determine sample rate");

    // Scan type
    const fieldOrder = lc(meta.fieldOrder);
    if (!fieldOrder || fieldOrder === "progressive" || fieldOrder === "tt" || fieldOrder === "bb") {
        pass("Scan", meta.fieldOrder ?? "progressive", "Progressive or Interlaced", "OK");
    } else {
        pass("Scan", meta.fieldOrder ?? "unknown", "Progressive or Interlaced", "Field order detected");
    }

    const verdict = checks.some((c) => !c.ok) ? "FLAWED" : "PERFECT";
    return { verdict, checks, reasons };
}

// ── MXF NTSC ──

export function evaluateMxfNtsc(meta: ExtendedMetadata): PerfectResult {
    const checks: FieldCheck[] = [];
    const reasons: string[] = [];
    const fail = (field: string, value: string, expected: string, reason: string) =>
        checks.push({ field, value, expected, ok: false, reason });
    const pass = (field: string, value: string, expected: string, reason: string) =>
        checks.push({ field, value, expected, ok: true, reason });

    const lc = (s: any) => String(s ?? "").toLowerCase().trim();
    const codec = normalizeCodec(lc(meta.videoCodec));
    const container = normalizeContainer(lc(meta.container));
    const w = Number(meta.width ?? 0);
    const h = Number(meta.height ?? 0);
    const fpsAvg = Number(meta.fpsAvg ?? meta.fps ?? 0);
    const bps = Number(meta.videoBitrate ?? 0) || Number(meta.formatBitrate ?? 0);
    const mbps = bps > 0 ? bps / 1_000_000 : 0;

    // Container: MXF
    if (container === "mxf") pass("Container", meta.container ?? "", "MXF", "MXF required for broadcast");
    else fail("Container", meta.container ?? "", "MXF", "Broadcast delivery requires MXF container");

    // Codec
    const broadcastCodecs = ["mpeg2", "mpeg2video", "dnxhd", "prores", "h264"];
    if (broadcastCodecs.includes(codec)) pass("Codec", meta.videoCodec ?? "", "MPEG-2/DNxHD/ProRes/AVC-I", codec.toUpperCase());
    else fail("Codec", meta.videoCodec ?? "", "MPEG-2/DNxHD/ProRes/AVC-I", "Use a broadcast-standard codec");

    // Resolution: 1920x1080
    if (w === 1920 && h === 1080) pass("Resolution", `${w}x${h}`, "1920x1080", "Full HD");
    else if (w === 720 && h === 480) { pass("Resolution", `${w}x${h}`, "720x480 or 1920x1080", "SD NTSC"); reasons.push("HD 1920x1080 preferred for modern broadcast"); }
    else fail("Resolution", `${w}x${h}`, "1920x1080", "Non-standard broadcast resolution");

    // FPS: 29.97fps (NTSC)
    if (Math.abs(fpsAvg - 29.97) < 0.05) pass("FPS", `${fpsAvg.toFixed(3)}`, "29.97 FPS (NTSC)", "NTSC standard");
    else if (Math.abs(fpsAvg - 59.94) < 0.1) pass("FPS", `${fpsAvg.toFixed(3)}`, "29.97/59.94 FPS", "59.94i/p accepted");
    else if (Math.abs(fpsAvg - 23.976) < 0.05) { pass("FPS", `${fpsAvg.toFixed(3)}`, "23.976/29.97 FPS", "23.976 pulldown"); reasons.push("29.97fps is the standard NTSC rate"); }
    else fail("FPS", `${fpsAvg.toFixed(3)}`, "29.97 FPS (NTSC)", "NTSC requires 29.97fps or 59.94i");

    // Bitrate: >= 50 Mbps
    if (mbps >= 50) pass("Bitrate", `${mbps.toFixed(2)} Mbps`, ">= 50 Mbps", "Broadcast quality");
    else if (mbps >= 25) { pass("Bitrate", `${mbps.toFixed(2)} Mbps`, ">= 50 Mbps", "Acceptable"); reasons.push("50+ Mbps recommended for broadcast"); }
    else if (mbps > 0) fail("Bitrate", `${mbps.toFixed(2)} Mbps`, ">= 50 Mbps", "Too low for broadcast");
    else fail("Bitrate", "unknown", ">= 50 Mbps", "Cannot determine bitrate");

    // Audio: PCM 48kHz
    const aCodec = lc(meta.audioCodec);
    const isPcm = aCodec.includes("pcm");
    if (isPcm) pass("Audio Codec", meta.audioCodec ?? "", "PCM (uncompressed)", "Broadcast standard");
    else fail("Audio Codec", meta.audioCodec ?? "none", "PCM (uncompressed)", "Broadcast requires PCM audio");

    const aHz = Number(meta.audioSampleRate ?? 0);
    if (aHz === 48000) pass("Audio Hz", String(aHz), "48000 Hz", "Standard broadcast");
    else if (aHz > 0) fail("Audio Hz", String(aHz), "48000 Hz", "Broadcast requires 48kHz");
    else fail("Audio Hz", "unknown", "48000 Hz", "Cannot determine sample rate");

    const verdict = checks.some((c) => !c.ok) ? "FLAWED" : "PERFECT";
    return { verdict, checks, reasons };
}

// ── DCP Readiness Check ──

export function evaluateDcp(meta: ExtendedMetadata): PerfectResult {
    const checks: FieldCheck[] = [];
    const reasons: string[] = [];
    const fail = (field: string, value: string, expected: string, reason: string) =>
        checks.push({ field, value, expected, ok: false, reason });
    const pass = (field: string, value: string, expected: string, reason: string) =>
        checks.push({ field, value, expected, ok: true, reason });

    const lc = (s: any) => String(s ?? "").toLowerCase().trim();
    const codec = normalizeCodec(lc(meta.videoCodec));
    const container = normalizeContainer(lc(meta.container));
    const w = Number(meta.width ?? 0);
    const h = Number(meta.height ?? 0);
    const fpsAvg = Number(meta.fpsAvg ?? meta.fps ?? 0);
    const bps = Number(meta.videoBitrate ?? 0) || Number(meta.formatBitrate ?? 0);
    const mbps = bps > 0 ? bps / 1_000_000 : 0;

    // Container: MXF preferred for DCP
    if (container === "mxf") pass("Container", meta.container ?? "", "MXF", "DCP standard container");
    else { fail("Container", meta.container ?? "", "MXF", "DCP requires MXF wrapping"); reasons.push("DCP packages use MXF containers"); }

    // Codec: JPEG 2000 ideal, but check readiness with other codecs
    if (codec === "jpeg2000") pass("Codec", meta.videoCodec ?? "", "JPEG 2000", "DCP native codec");
    else { fail("Codec", meta.videoCodec ?? "", "JPEG 2000", `${meta.videoCodec} is not DCP-native`); reasons.push("DCP requires JPEG 2000 — your file will need conversion"); }

    // Resolution: DCI 2K (2048x1080) or DCI 4K (4096x2160)
    const is2K = w === 2048 && h === 1080;
    const is4K = w === 4096 && h === 2160;
    const isFlat2K = w === 1998 && h === 1080;
    const isScope2K = w === 2048 && h === 858;
    const isFlat4K = w === 3996 && h === 2160;
    const isScope4K = w === 4096 && h === 1716;
    if (is2K || is4K) pass("Resolution", `${w}x${h}`, "2048x1080 or 4096x2160", is4K ? "DCI 4K" : "DCI 2K");
    else if (isFlat2K || isFlat4K) pass("Resolution", `${w}x${h}`, "DCI Flat", "DCI Flat format");
    else if (isScope2K || isScope4K) pass("Resolution", `${w}x${h}`, "DCI Scope", "DCI Scope format");
    else { fail("Resolution", `${w}x${h}`, "2048x1080 (2K) or 4096x2160 (4K)", "Non-DCI resolution"); reasons.push("DCP requires DCI 2K or 4K resolution"); }

    // FPS: 24fps standard, 25/30/48/60 also valid
    const dcpFps = [24.0, 25.0, 30.0, 48.0, 60.0];
    const fpsMatch = dcpFps.some(f => Math.abs(fpsAvg - f) < 0.05);
    if (fpsMatch) pass("FPS", `${fpsAvg.toFixed(3)}`, "24/25/30/48/60 FPS", "DCP standard");
    else { fail("FPS", `${fpsAvg.toFixed(3)}`, "24/25/30/48/60 FPS", "Non-standard DCP frame rate"); reasons.push("DCP commonly uses 24fps"); }

    // Bitrate: >= 100 Mbps for JPEG 2000
    if (mbps >= 100) pass("Bitrate", `${mbps.toFixed(2)} Mbps`, ">= 100 Mbps", "DCP quality bitrate");
    else if (mbps >= 50) { pass("Bitrate", `${mbps.toFixed(2)} Mbps`, ">= 100 Mbps", "Acceptable"); reasons.push("DCP typically requires 100+ Mbps"); }
    else if (mbps > 0) { fail("Bitrate", `${mbps.toFixed(2)} Mbps`, ">= 100 Mbps", "Too low for DCP"); }
    else { fail("Bitrate", "unknown", ">= 100 Mbps", "Cannot determine bitrate"); }

    // Color: DCI-P3 (XYZ)
    const primaries = lc(meta.colorPrimaries);
    const colorSpace = lc(meta.colorSpace);
    const isDciP3 = primaries.includes("dci") || primaries.includes("p3") || colorSpace.includes("xyz");
    if (isDciP3) pass("Color", `${meta.colorPrimaries || "-"} / ${meta.colorSpace || "-"}`, "DCI-P3 / XYZ", "DCP color space");
    else { fail("Color", `${meta.colorPrimaries || "-"} / ${meta.colorSpace || "-"}`, "DCI-P3 / XYZ", "DCP requires DCI-P3 (XYZ) color"); reasons.push("DCP uses DCI-P3 color gamut with XYZ encoding"); }

    // Audio: 5.1 or 7.1 channels, PCM 48kHz 24-bit
    const channels = Number(meta.audioChannels ?? 0);
    if (channels >= 6) pass("Audio Channels", String(channels), ">= 6 (5.1/7.1)", channels >= 8 ? "7.1 surround" : "5.1 surround");
    else if (channels === 2) { fail("Audio Channels", String(channels), ">= 6 (5.1/7.1)", "Stereo — DCP requires 5.1 or 7.1"); reasons.push("DCP needs multichannel audio (5.1 or 7.1)"); }
    else if (channels > 0) { fail("Audio Channels", String(channels), ">= 6 (5.1/7.1)", "Non-standard channel count"); }
    else { fail("Audio Channels", "unknown", ">= 6 (5.1/7.1)", "Cannot determine audio channels"); }

    const aCodec = lc(meta.audioCodec);
    const isPcm = aCodec.includes("pcm");
    if (isPcm) pass("Audio Codec", meta.audioCodec ?? "", "PCM 24-bit", "DCP standard");
    else fail("Audio Codec", meta.audioCodec ?? "none", "PCM 24-bit", "DCP requires PCM audio");

    const aHz = Number(meta.audioSampleRate ?? 0);
    if (aHz === 48000) pass("Audio Hz", String(aHz), "48000 Hz", "DCP standard");
    else if (aHz === 96000) pass("Audio Hz", String(aHz), "48000/96000 Hz", "High-res accepted");
    else if (aHz > 0) fail("Audio Hz", String(aHz), "48000 Hz", "DCP requires 48kHz audio");
    else fail("Audio Hz", "unknown", "48000 Hz", "Cannot determine sample rate");

    // Bit depth
    const bitDepth = meta.bitsPerRawSample;
    if (bitDepth === "12" || bitDepth === "16") pass("Bit Depth", bitDepth, "12-bit", "DCP standard");
    else if (bitDepth) { pass("Bit Depth", bitDepth, "12-bit", "Non-standard but noted"); reasons.push("DCP JPEG 2000 is typically 12-bit"); }
    else pass("Bit Depth", "unknown", "12-bit", "Cannot determine");

    const verdict = checks.some((c) => !c.ok) ? "FLAWED" : "PERFECT";
    return { verdict, checks, reasons };
}

// ── Image Helpers ──

function normalizeImageCodec(c: string): string {
    if (c === "mjpeg" || c === "jpeg" || c === "jpg") return "jpeg";
    if (c === "png") return "png";
    if (c === "webp") return "webp";
    if (c === "bmp") return "bmp";
    if (c === "tiff") return "tiff";
    return c;
}

// ── Instagram Post Image ──

export function evaluateIgPostImage(meta: ExtendedMetadata): PerfectResult {
    const checks: FieldCheck[] = [];
    const reasons: string[] = [];
    const fail = (field: string, value: string, expected: string, reason: string) =>
        checks.push({ field, value, expected, ok: false, reason });
    const pass = (field: string, value: string, expected: string, reason: string) =>
        checks.push({ field, value, expected, ok: true, reason });

    const lc = (s: any) => String(s ?? "").toLowerCase().trim();
    const codec = normalizeImageCodec(lc(meta.videoCodec));
    const w = Number(meta.width ?? 0);
    const h = Number(meta.height ?? 0);
    const pix = lc(meta.pixFmt);

    // Format
    if (codec === "jpeg" || codec === "png") pass("Format", codec.toUpperCase(), "JPEG/PNG", "Supported format");
    else if (codec === "webp") { pass("Format", "WebP", "JPEG/PNG", "WebP accepted but JPEG/PNG recommended"); reasons.push("Use JPEG or PNG for best IG compatibility"); }
    else fail("Format", meta.videoCodec ?? "", "JPEG/PNG", "Instagram requires JPEG or PNG");

    // Resolution
    const isSquare = w === 1080 && h === 1080;
    const isPortrait = w === 1080 && h === 1350;
    const isLandscape = w === 1080 && h === 566;
    if (isSquare) pass("Resolution", `${w}x${h}`, "1080x1080 or 1080x1350", "Square 1:1 — ideal");
    else if (isPortrait) pass("Resolution", `${w}x${h}`, "1080x1080 or 1080x1350", "Portrait 4:5 — max feed space");
    else if (isLandscape) { pass("Resolution", `${w}x${h}`, "1080x1080 or 1080x1350", "Landscape 1.91:1"); reasons.push("Portrait 4:5 (1080x1350) gets more screen space"); }
    else if (w >= 1080) { pass("Resolution", `${w}x${h}`, "1080x1080 or 1080x1350", "Width OK but non-standard height"); reasons.push("Use 1080x1080 (square) or 1080x1350 (portrait 4:5)"); }
    else fail("Resolution", `${w}x${h}`, "1080x1080 or 1080x1350", "Width must be at least 1080px");

    // Aspect ratio
    const ratio = h > 0 ? w / h : 0;
    const isSquareRatio = Math.abs(ratio - 1.0) < 0.02;
    const is4by5 = Math.abs(ratio - 4 / 5) < 0.02;
    const is191 = Math.abs(ratio - 1.91) < 0.05;
    if (isSquareRatio) pass("Aspect", "1:1", "1:1 or 4:5", "Square");
    else if (is4by5) pass("Aspect", "4:5", "1:1 or 4:5", "Portrait");
    else if (is191) pass("Aspect", "1.91:1", "1.91:1 to 4:5", "Landscape");
    else { fail("Aspect", ratio.toFixed(4), "1:1 or 4:5", "Non-standard aspect ratio"); reasons.push("IG supports 1.91:1 to 4:5 range"); }

    // Color space
    const isSrgb = pix.includes("rgb") || pix.includes("yuv") || pix === "yuvj420p" || pix === "yuvj444p";
    if (isSrgb || !pix) pass("Color", pix || "sRGB", "sRGB", "Standard color space");
    else { fail("Color", pix, "sRGB", "Non-sRGB may display differently on IG"); reasons.push("Export in sRGB color space"); }

    const verdict = checks.some((c) => !c.ok) ? "FLAWED" : "PERFECT";
    return { verdict, checks, reasons };
}

// ── Instagram Story Image ──

export function evaluateIgStoryImage(meta: ExtendedMetadata): PerfectResult {
    const checks: FieldCheck[] = [];
    const reasons: string[] = [];
    const fail = (field: string, value: string, expected: string, reason: string) =>
        checks.push({ field, value, expected, ok: false, reason });
    const pass = (field: string, value: string, expected: string, reason: string) =>
        checks.push({ field, value, expected, ok: true, reason });

    const lc = (s: any) => String(s ?? "").toLowerCase().trim();
    const codec = normalizeImageCodec(lc(meta.videoCodec));
    const w = Number(meta.width ?? 0);
    const h = Number(meta.height ?? 0);
    const pix = lc(meta.pixFmt);

    if (codec === "jpeg" || codec === "png") pass("Format", codec.toUpperCase(), "JPEG/PNG", "Supported format");
    else fail("Format", meta.videoCodec ?? "", "JPEG/PNG", "Use JPEG or PNG for stories");

    if (w === 1080 && h === 1920) pass("Resolution", `${w}x${h}`, "1080x1920", "Full HD vertical — ideal");
    else if (w >= 1080 && h >= 1920) pass("Resolution", `${w}x${h}`, ">= 1080x1920", "High resolution");
    else if (w >= 720 && h >= 1280) { pass("Resolution", `${w}x${h}`, "1080x1920", "Acceptable"); reasons.push("1080x1920 recommended for best quality"); }
    else fail("Resolution", `${w}x${h}`, "1080x1920", "Resolution too low for stories");

    const ratio = h > 0 ? w / h : 0;
    if (Math.abs(ratio - 9 / 16) < 0.02) pass("Aspect", "9:16", "9:16", "Vertical story");
    else { fail("Aspect", ratio.toFixed(4), "9:16", "Must be 9:16 vertical"); reasons.push("Stories require 9:16 vertical aspect ratio"); }

    const isSrgb = pix.includes("rgb") || pix.includes("yuv") || pix === "yuvj420p" || pix === "yuvj444p";
    if (isSrgb || !pix) pass("Color", pix || "sRGB", "sRGB", "Standard color space");
    else fail("Color", pix, "sRGB", "Non-sRGB may display differently");

    const verdict = checks.some((c) => !c.ok) ? "FLAWED" : "PERFECT";
    return { verdict, checks, reasons };
}

// ── Instagram Reels Cover Image ──

export function evaluateIgReelsCover(meta: ExtendedMetadata): PerfectResult {
    const checks: FieldCheck[] = [];
    const reasons: string[] = [];
    const fail = (field: string, value: string, expected: string, reason: string) =>
        checks.push({ field, value, expected, ok: false, reason });
    const pass = (field: string, value: string, expected: string, reason: string) =>
        checks.push({ field, value, expected, ok: true, reason });

    const lc = (s: any) => String(s ?? "").toLowerCase().trim();
    const codec = normalizeImageCodec(lc(meta.videoCodec));
    const w = Number(meta.width ?? 0);
    const h = Number(meta.height ?? 0);
    const pix = lc(meta.pixFmt);

    if (codec === "jpeg" || codec === "png") pass("Format", codec.toUpperCase(), "JPEG/PNG", "Supported format");
    else fail("Format", meta.videoCodec ?? "", "JPEG/PNG", "Use JPEG or PNG for Reels cover");

    if (w === 1080 && h === 1920) pass("Resolution", `${w}x${h}`, "1080x1920", "Reels cover — ideal");
    else if (w >= 1080 && h >= 1920) pass("Resolution", `${w}x${h}`, ">= 1080x1920", "High resolution");
    else if (w >= 420 && h >= 654) { pass("Resolution", `${w}x${h}`, "1080x1920", "Minimum met"); reasons.push("1080x1920 recommended for sharp cover image"); }
    else fail("Resolution", `${w}x${h}`, "1080x1920", "Resolution too low for Reels cover");

    const ratio = h > 0 ? w / h : 0;
    if (Math.abs(ratio - 9 / 16) < 0.02) pass("Aspect", "9:16", "9:16", "Vertical Reels cover");
    else { fail("Aspect", ratio.toFixed(4), "9:16", "Must be 9:16 vertical"); reasons.push("Reels covers display as 9:16 in the feed"); }

    const isSrgb = pix.includes("rgb") || pix.includes("yuv") || pix === "yuvj420p" || pix === "yuvj444p";
    if (isSrgb || !pix) pass("Color", pix || "sRGB", "sRGB", "Standard color space");
    else fail("Color", pix, "sRGB", "Non-sRGB may display differently");

    const verdict = checks.some((c) => !c.ok) ? "FLAWED" : "PERFECT";
    return { verdict, checks, reasons };
}

// ── Facebook Cover Image ──

export function evaluateFacebookCover(meta: ExtendedMetadata): PerfectResult {
    const checks: FieldCheck[] = [];
    const reasons: string[] = [];
    const fail = (field: string, value: string, expected: string, reason: string) =>
        checks.push({ field, value, expected, ok: false, reason });
    const pass = (field: string, value: string, expected: string, reason: string) =>
        checks.push({ field, value, expected, ok: true, reason });

    const lc = (s: any) => String(s ?? "").toLowerCase().trim();
    const codec = normalizeImageCodec(lc(meta.videoCodec));
    const w = Number(meta.width ?? 0);
    const h = Number(meta.height ?? 0);
    const pix = lc(meta.pixFmt);

    if (codec === "jpeg" || codec === "png") pass("Format", codec.toUpperCase(), "JPEG/PNG", "Supported format");
    else fail("Format", meta.videoCodec ?? "", "JPEG/PNG", "Use JPEG or PNG for Facebook cover");

    if (w === 1200 && h === 628) pass("Resolution", `${w}x${h}`, "1200x628", "Recommended upload size");
    else if (w === 820 && h === 312) pass("Resolution", `${w}x${h}`, "820x312", "Desktop display size");
    else if (w >= 820 && h >= 312) { pass("Resolution", `${w}x${h}`, "1200x628", "Acceptable"); reasons.push("1200x628 is the recommended Facebook cover size"); }
    else fail("Resolution", `${w}x${h}`, "1200x628 or 820x312", "Resolution too small for Facebook cover");

    const ratio = h > 0 ? w / h : 0;
    if (Math.abs(ratio - 1.91) < 0.1) pass("Aspect", ratio.toFixed(2) + ":1", "~1.91:1", "Standard Facebook cover ratio");
    else if (Math.abs(ratio - 2.63) < 0.1) pass("Aspect", ratio.toFixed(2) + ":1", "~2.63:1", "Desktop cover ratio");
    else if (ratio >= 1.5 && ratio <= 3.0) { pass("Aspect", ratio.toFixed(2) + ":1", "1.91:1", "Acceptable landscape"); reasons.push("Facebook will crop to fit cover area"); }
    else fail("Aspect", ratio.toFixed(2) + ":1", "~1.91:1", "Cover images must be landscape");

    const isSrgb = pix.includes("rgb") || pix.includes("yuv") || pix === "yuvj420p" || pix === "yuvj444p";
    if (isSrgb || !pix) pass("Color", pix || "sRGB", "sRGB", "Standard color space");
    else fail("Color", pix, "sRGB", "Non-sRGB may display differently");

    const verdict = checks.some((c) => !c.ok) ? "FLAWED" : "PERFECT";
    return { verdict, checks, reasons };
}

// ── LinkedIn Banner Image ──

export function evaluateLinkedInBanner(meta: ExtendedMetadata): PerfectResult {
    const checks: FieldCheck[] = [];
    const reasons: string[] = [];
    const fail = (field: string, value: string, expected: string, reason: string) =>
        checks.push({ field, value, expected, ok: false, reason });
    const pass = (field: string, value: string, expected: string, reason: string) =>
        checks.push({ field, value, expected, ok: true, reason });

    const lc = (s: any) => String(s ?? "").toLowerCase().trim();
    const codec = normalizeImageCodec(lc(meta.videoCodec));
    const w = Number(meta.width ?? 0);
    const h = Number(meta.height ?? 0);
    const pix = lc(meta.pixFmt);

    if (codec === "jpeg" || codec === "png") pass("Format", codec.toUpperCase(), "JPEG/PNG", "Supported format");
    else fail("Format", meta.videoCodec ?? "", "JPEG/PNG", "Use JPEG or PNG for LinkedIn banner");

    if (w === 1584 && h === 396) pass("Resolution", `${w}x${h}`, "1584x396", "LinkedIn recommended size");
    else if (w === 1200 && h === 627) pass("Resolution", `${w}x${h}`, "1200x627", "Alternative banner size");
    else if (w >= 1584 && h >= 396) pass("Resolution", `${w}x${h}`, ">= 1584x396", "High resolution — will be cropped");
    else if (w >= 1200) { pass("Resolution", `${w}x${h}`, "1584x396", "Acceptable width"); reasons.push("1584x396 recommended for LinkedIn banner"); }
    else fail("Resolution", `${w}x${h}`, "1584x396 or 1200x627", "Resolution too small for LinkedIn banner");

    const ratio = h > 0 ? w / h : 0;
    if (Math.abs(ratio - 4.0) < 0.2) pass("Aspect", ratio.toFixed(2) + ":1", "4:1", "LinkedIn banner ratio");
    else if (Math.abs(ratio - 1.91) < 0.1) pass("Aspect", ratio.toFixed(2) + ":1", "~1.91:1", "Alternative banner ratio");
    else if (ratio >= 1.5) { pass("Aspect", ratio.toFixed(2) + ":1", "4:1", "Landscape — will be cropped"); reasons.push("LinkedIn banners are 4:1 (1584x396)"); }
    else fail("Aspect", ratio.toFixed(2) + ":1", "4:1", "Banner must be landscape");

    const isSrgb = pix.includes("rgb") || pix.includes("yuv") || pix === "yuvj420p" || pix === "yuvj444p";
    if (isSrgb || !pix) pass("Color", pix || "sRGB", "sRGB", "Standard color space");
    else fail("Color", pix, "sRGB", "Non-sRGB may display differently");

    const verdict = checks.some((c) => !c.ok) ? "FLAWED" : "PERFECT";
    return { verdict, checks, reasons };
}
