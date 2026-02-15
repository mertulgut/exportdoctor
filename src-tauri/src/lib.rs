use serde::{Deserialize, Serialize};
use tauri_plugin_shell::ShellExt;
use std::process::Command as StdCommand;

mod license;

// ── Structs ──

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ExtendedMetadata {
    pub width: u32,
    pub height: u32,
    pub fps: f64,
    pub fps_avg: f64,
    pub fps_r: f64,
    pub video_codec: String,
    pub container: String,
    pub duration_sec: f64,
    pub audio_codec: Option<String>,
    pub audio_sample_rate: Option<u32>,
    pub video_bitrate: Option<u64>,
    pub format_bitrate: Option<u64>,
    pub profile: Option<String>,
    pub level: Option<i32>,
    pub pix_fmt: Option<String>,
    pub field_order: Option<String>,
    pub color_space: Option<String>,
    pub color_transfer: Option<String>,
    pub color_primaries: Option<String>,
    pub color_range: Option<String>,
    pub audio_bitrate: Option<u64>,
    pub has_b_frames: Option<i32>,
    pub refs: Option<i32>,
    pub nb_frames: Option<String>,
    pub codec_time_base: Option<String>,
    pub audio_channels: Option<u32>,
    pub audio_channel_layout: Option<String>,
    pub bits_per_raw_sample: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AnalyzeResult {
    pub metadata: ExtendedMetadata,
    pub file_name: String,
    pub file_size: u64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FfprobeStatus {
    pub available: bool,
    pub source: String,
    pub version: Option<String>,
}

// ── Commands ──

#[tauri::command]
async fn analyze_video(
    app: tauri::AppHandle,
    path: String,
) -> Result<AnalyzeResult, String> {
    // Check license before analyzing
    license::check_license_valid(&app)?;

    // Get file info
    let file_meta = std::fs::metadata(&path)
        .map_err(|e| format!("Cannot access file: {}", e))?;
    let file_name = std::path::Path::new(&path)
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "unknown".to_string());

    // Run ffprobe
    let output = run_ffprobe(&app, &path).await?;

    // Parse JSON
    let probe_data: serde_json::Value = serde_json::from_str(&output)
        .map_err(|e| format!("Failed to parse ffprobe output: {}", e))?;

    let metadata = extract_metadata(&probe_data)?;

    Ok(AnalyzeResult {
        metadata,
        file_name,
        file_size: file_meta.len(),
    })
}

#[tauri::command]
async fn check_ffprobe(app: tauri::AppHandle) -> Result<FfprobeStatus, String> {
    // Try sidecar first (Tauri plugin-shell)
    match app.shell().sidecar("ffprobe") {
        Ok(cmd) => {
            match cmd.args(["-version"]).output().await {
                Ok(output) => {
                    if output.status.success() {
                        let version_str = String::from_utf8_lossy(&output.stdout);
                        let version = version_str.lines().next().map(|s| s.to_string());
                        return Ok(FfprobeStatus {
                            available: true,
                            source: "sidecar".to_string(),
                            version,
                        });
                    } else {
                        eprintln!("[export-doctor] sidecar ffprobe exited with error: status={:?}, stderr={}", output.status, String::from_utf8_lossy(&output.stderr));
                    }
                }
                Err(e) => {
                    eprintln!("[export-doctor] sidecar ffprobe output() failed: {}", e);
                }
            }
        }
        Err(e) => {
            eprintln!("[export-doctor] sidecar(\"ffprobe\") failed: {}", e);
        }
    }

    // Try direct binary path (fallback for bundled app)
    if let Some(status) = try_direct_ffprobe() {
        return Ok(status);
    }

    // Try system PATH
    match app.shell().command("ffprobe").args(["-version"]).output().await {
        Ok(output) => {
            if output.status.success() {
                let version_str = String::from_utf8_lossy(&output.stdout);
                let version = version_str.lines().next().map(|s| s.to_string());
                return Ok(FfprobeStatus {
                    available: true,
                    source: "system".to_string(),
                    version,
                });
            } else {
                eprintln!("[export-doctor] system ffprobe exited with error: status={:?}", output.status);
            }
        }
        Err(e) => {
            eprintln!("[export-doctor] system ffprobe command failed: {}", e);
        }
    }

    Ok(FfprobeStatus {
        available: false,
        source: "none".to_string(),
        version: None,
    })
}

// ── Helpers ──

/// Resolve the path to the ffprobe binary next to the current executable.
/// In a bundled .app, both live under Contents/MacOS/.
fn resolve_ffprobe_path() -> Option<std::path::PathBuf> {
    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            // Try plain "ffprobe" (bundled app) or "ffprobe.exe" (Windows)
            let plain_name = if cfg!(windows) { "ffprobe.exe" } else { "ffprobe" };
            let candidate = dir.join(plain_name);
            eprintln!("[export-doctor] checking direct path: {:?} exists={}", candidate, candidate.exists());
            if candidate.exists() {
                return Some(candidate);
            }
            // Try with target triple suffix (dev mode)
            let triple = if cfg!(target_os = "macos") {
                if cfg!(target_arch = "aarch64") { "aarch64-apple-darwin" }
                else { "x86_64-apple-darwin" }
            } else if cfg!(target_os = "windows") {
                "x86_64-pc-windows-msvc.exe"
            } else {
                "x86_64-unknown-linux-gnu"
            };
            let candidate_triple = dir.join(format!("ffprobe-{}", triple));
            eprintln!("[export-doctor] checking triple path: {:?} exists={}", candidate_triple, candidate_triple.exists());
            if candidate_triple.exists() {
                return Some(candidate_triple);
            }
        }
    }
    None
}

/// Try running ffprobe directly via std::process::Command (bypasses Tauri shell plugin).
fn try_direct_ffprobe() -> Option<FfprobeStatus> {
    if let Some(ffprobe_path) = resolve_ffprobe_path() {
        eprintln!("[export-doctor] trying direct ffprobe at: {:?}", ffprobe_path);
        match StdCommand::new(&ffprobe_path).arg("-version").output() {
            Ok(output) => {
                if output.status.success() {
                    let version_str = String::from_utf8_lossy(&output.stdout);
                    let version = version_str.lines().next().map(|s| s.to_string());
                    eprintln!("[export-doctor] direct ffprobe works: {:?}", version);
                    return Some(FfprobeStatus {
                        available: true,
                        source: "direct".to_string(),
                        version,
                    });
                } else {
                    eprintln!("[export-doctor] direct ffprobe exited with error: {:?}", output.status);
                }
            }
            Err(e) => {
                eprintln!("[export-doctor] direct ffprobe execution failed: {}", e);
            }
        }
    }
    None
}

/// Run ffprobe directly with args and return stdout.
fn run_ffprobe_direct(path: &str) -> Option<String> {
    if let Some(ffprobe_path) = resolve_ffprobe_path() {
        let result = StdCommand::new(&ffprobe_path)
            .args(["-v", "quiet", "-print_format", "json", "-show_format", "-show_streams", path])
            .output();
        match result {
            Ok(output) => {
                if output.status.success() {
                    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
                    if !stdout.trim().is_empty() {
                        return Some(stdout);
                    }
                }
            }
            Err(e) => {
                eprintln!("[export-doctor] direct ffprobe run failed: {}", e);
            }
        }
    }
    None
}

async fn run_ffprobe(app: &tauri::AppHandle, path: &str) -> Result<String, String> {
    let args = [
        "-v", "quiet",
        "-print_format", "json",
        "-show_format",
        "-show_streams",
        path,
    ];

    // Try sidecar first (Tauri plugin-shell)
    if let Ok(cmd) = app.shell().sidecar("ffprobe") {
        if let Ok(output) = cmd.args(&args).output().await {
            if output.status.success() {
                let stdout = String::from_utf8_lossy(&output.stdout).to_string();
                if !stdout.trim().is_empty() {
                    return Ok(stdout);
                }
            }
        }
    }

    // Fallback: direct binary execution (bypasses Tauri shell plugin)
    if let Some(stdout) = run_ffprobe_direct(path) {
        return Ok(stdout);
    }

    // Fallback: system ffprobe from PATH
    let output = app
        .shell()
        .command("ffprobe")
        .args(&args)
        .output()
        .await
        .map_err(|e| {
            format!(
                "ffprobe not found. Please reinstall the application. Error: {}",
                e
            )
        })?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("ffprobe failed: {}", stderr));
    }

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    if stdout.trim().is_empty() {
        return Err("ffprobe returned empty output. The file may not be a valid media file.".to_string());
    }

    Ok(stdout)
}

fn extract_metadata(probe_data: &serde_json::Value) -> Result<ExtendedMetadata, String> {
    let streams = probe_data["streams"]
        .as_array()
        .ok_or("No streams found in ffprobe output")?;
    let format = &probe_data["format"];

    let video_stream = streams
        .iter()
        .find(|s| s["codec_type"].as_str() == Some("video"))
        .ok_or("No video stream found")?;
    let audio_stream = streams
        .iter()
        .find(|s| s["codec_type"].as_str() == Some("audio"));

    // Parse FPS
    let (fps_r, _) = parse_frame_rate(video_stream["r_frame_rate"].as_str().unwrap_or("0/1"));
    let (fps_avg, _) = parse_frame_rate(video_stream["avg_frame_rate"].as_str().unwrap_or("0/1"));
    let fps = if fps_avg > 0.0 { fps_avg } else { fps_r };

    // Container
    let container = format["format_name"]
        .as_str()
        .unwrap_or("unknown")
        .split(',')
        .next()
        .unwrap_or("unknown")
        .to_string();

    // Video codec
    let raw_codec = video_stream["codec_name"].as_str().unwrap_or("unknown");
    let codec_tag = video_stream["codec_tag_string"].as_str().unwrap_or("");
    let video_codec = if raw_codec == "avc" || codec_tag == "avc1" {
        "h264".to_string()
    } else {
        raw_codec.to_string()
    };

    Ok(ExtendedMetadata {
        width: video_stream["width"].as_u64().unwrap_or(0) as u32,
        height: video_stream["height"].as_u64().unwrap_or(0) as u32,
        fps,
        fps_avg,
        fps_r,
        duration_sec: format["duration"]
            .as_str()
            .and_then(|s| s.parse::<f64>().ok())
            .unwrap_or(0.0),
        container,
        video_codec,
        video_bitrate: parse_optional_u64(&video_stream["bit_rate"]),
        format_bitrate: parse_optional_u64(&format["bit_rate"]),
        profile: video_stream["profile"].as_str().map(|s| s.to_string()),
        level: video_stream["level"].as_i64().map(|v| v as i32),
        pix_fmt: video_stream["pix_fmt"].as_str().map(|s| s.to_string()),
        field_order: video_stream["field_order"].as_str().map(|s| s.to_string()),
        color_space: video_stream["color_space"].as_str().map(|s| s.to_string()),
        color_transfer: video_stream["color_transfer"].as_str().map(|s| s.to_string()),
        color_primaries: video_stream["color_primaries"].as_str().map(|s| s.to_string()),
        color_range: video_stream["color_range"].as_str().map(|s| s.to_string()),
        audio_codec: audio_stream
            .and_then(|s| s["codec_name"].as_str())
            .map(|s| s.to_string()),
        audio_sample_rate: audio_stream
            .and_then(|s| s["sample_rate"].as_str())
            .and_then(|s| s.parse::<u32>().ok()),
        audio_bitrate: audio_stream.and_then(|s| parse_optional_u64(&s["bit_rate"])),
        has_b_frames: video_stream
            .get("has_b_frames")
            .and_then(|v| v.as_i64())
            .map(|v| v as i32),
        refs: video_stream
            .get("refs")
            .and_then(|v| v.as_i64())
            .map(|v| v as i32),
        nb_frames: video_stream["nb_frames"].as_str().map(|s| s.to_string()),
        codec_time_base: video_stream
            .get("codec_time_base")
            .or(video_stream.get("time_base"))
            .and_then(|v| v.as_str())
            .map(|s| s.to_string()),
        audio_channels: audio_stream
            .and_then(|s| s["channels"].as_u64())
            .map(|v| v as u32),
        audio_channel_layout: audio_stream
            .and_then(|s| s.get("channel_layout").or(s.get("channel_layout_name")))
            .and_then(|v| v.as_str())
            .map(|s| s.to_string()),
        bits_per_raw_sample: video_stream
            .get("bits_per_raw_sample")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string()),
    })
}

fn parse_frame_rate(rate_str: &str) -> (f64, f64) {
    let parts: Vec<&str> = rate_str.split('/').collect();
    if parts.len() == 2 {
        let num: f64 = parts[0].parse().unwrap_or(0.0);
        let den: f64 = parts[1].parse().unwrap_or(1.0);
        if den > 0.0 {
            let val = (num / den * 1000.0).round() / 1000.0;
            return (val, val);
        }
    }
    (0.0, 0.0)
}

fn parse_optional_u64(val: &serde_json::Value) -> Option<u64> {
    val.as_str()
        .filter(|s| *s != "N/A" && !s.is_empty())
        .and_then(|s| s.parse::<u64>().ok())
        .or_else(|| val.as_u64())
}

// ── App entry ──

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            analyze_video,
            check_ffprobe,
            license::get_license_status,
            license::validate_license_online,
            license::start_checkout,
            license::activate_license,
            license::open_manage_portal,
            license::deactivate_license,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
