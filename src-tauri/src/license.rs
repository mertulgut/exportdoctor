use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri_plugin_store::StoreExt;
use tauri_plugin_opener::OpenerExt;
use sha2::{Sha256, Digest};

// ── IMPORTANT: Replace with your actual Cloudflare Worker URL ──
const API_BASE: &str = "https://export-doctor-license.mertulgut-556.workers.dev";
const TRIAL_DAYS: u64 = 7;
const OFFLINE_MAX_DAYS: u64 = 30;
const STORE_FILE: &str = "license.json";
const STORE_KEY: &str = "license";

// ── Types ──

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LicenseData {
    pub license_key: Option<String>,
    pub status: String, // trial | active | expired
    pub expires_at: u64,
    pub trial_started_at: u64,
    pub last_online_check: u64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CheckoutApiResponse {
    url: String,
    license_key: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)]
struct ValidateApiResponse {
    valid: bool,
    status: String,
    expires_at: u64,
}

#[derive(Debug, Deserialize)]
struct ManageApiResponse {
    url: String,
}

// ── Helpers ──

fn now_unix() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

/// Returns (LicenseData, found_in_store). When found_in_store is false the
/// caller should persist the default so the trial start time is stable.
fn read_license(app: &tauri::AppHandle) -> (LicenseData, bool) {
    let store = app.store(STORE_FILE).unwrap_or_else(|_| {
        app.store_builder(STORE_FILE).build().expect("failed to build store")
    });

    match store.get(STORE_KEY) {
        Some(val) => {
            let data = serde_json::from_value(val).unwrap_or_else(|_| default_license());
            (data, true)
        }
        None => (default_license(), false),
    }
}

fn save_license(app: &tauri::AppHandle, data: &LicenseData) {
    let store = app.store(STORE_FILE).unwrap_or_else(|_| {
        app.store_builder(STORE_FILE).build().expect("failed to build store")
    });
    if let Ok(val) = serde_json::to_value(data) {
        store.set(STORE_KEY, val);
        let _ = store.save();
    }
}

fn default_license() -> LicenseData {
    let now = now_unix();
    LicenseData {
        license_key: None,
        status: "trial".to_string(),
        expires_at: now + (TRIAL_DAYS * 86400),
        trial_started_at: now,
        last_online_check: 0,
    }
}

fn compute_effective_status(data: &LicenseData) -> String {
    let now = now_unix();

    // No license key → trial mode
    if data.license_key.is_none() {
        return if now < data.trial_started_at + (TRIAL_DAYS * 86400) {
            "trial".to_string()
        } else {
            "expired".to_string()
        };
    }

    // Has key but never validated online
    if data.last_online_check == 0 {
        return "expired".to_string();
    }

    // Offline too long? (30 days max)
    if now > data.last_online_check + (OFFLINE_MAX_DAYS * 86400) {
        return "expired".to_string();
    }

    // Trust cached status
    if data.status == "active" && now < data.expires_at {
        return "active".to_string();
    }

    // No grace period — anything else is expired
    "expired".to_string()
}

/// Generate a stable machine identifier from hostname + username.
fn get_machine_id() -> String {
    let hostname = hostname::get()
        .map(|h| h.to_string_lossy().to_string())
        .unwrap_or_else(|_| "unknown-host".to_string());
    let username = whoami::username();
    let mut hasher = Sha256::new();
    hasher.update(format!("{}:{}", hostname, username));
    let result = hasher.finalize();
    format!("{:x}", result)
}

/// Check if the current license allows analysis. Called from analyze_video.
pub fn check_license_valid(app: &tauri::AppHandle) -> Result<(), String> {
    let (mut data, _) = read_license(app);
    data.status = compute_effective_status(&data);
    let now = now_unix();
    match data.status.as_str() {
        "trial" | "active" if data.expires_at > now => Ok(()),
        "expired" => Err("Your license has expired. Please subscribe to continue using Export Doctor.".to_string()),
        _ => Err("Invalid license. Please subscribe or enter a valid license key.".to_string()),
    }
}

// ── Tauri Commands ──

#[tauri::command]
pub async fn get_license_status(app: tauri::AppHandle) -> Result<LicenseData, String> {
    let (mut data, found_in_store) = read_license(&app);

    // First launch: persist the initial trial so trial_started_at is stable
    if !found_in_store {
        save_license(&app, &data);
    }

    // Compute effective status
    data.status = compute_effective_status(&data);
    Ok(data)
}

#[tauri::command]
pub async fn validate_license_online(app: tauri::AppHandle) -> Result<LicenseData, String> {
    let (mut data, _) = read_license(&app);

    let key = match &data.license_key {
        Some(k) => k.clone(),
        None => return Err("No license key stored".to_string()),
    };

    let machine_id = get_machine_id();
    let client = reqwest::Client::new();
    let resp = client
        .post(format!("{}/validate", API_BASE))
        .json(&serde_json::json!({ "licenseKey": key, "machineId": machine_id }))
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("Server error: {}", resp.status()));
    }

    let result: ValidateApiResponse = resp
        .json()
        .await
        .map_err(|e| format!("Parse error: {}", e))?;

    data.last_online_check = now_unix();
    data.expires_at = result.expires_at;

    if result.valid {
        data.status = "active".to_string();
    } else {
        // No grace — immediately expired
        data.status = "expired".to_string();
    }

    save_license(&app, &data);
    Ok(data)
}

#[tauri::command]
pub async fn start_checkout(app: tauri::AppHandle) -> Result<String, String> {
    let machine_id = get_machine_id();
    let client = reqwest::Client::new();
    let resp = client
        .post(format!("{}/checkout", API_BASE))
        .json(&serde_json::json!({ "machineId": machine_id }))
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("Server error: {}", resp.status()));
    }

    let result: CheckoutApiResponse = resp
        .json()
        .await
        .map_err(|e| format!("Parse error: {}", e))?;

    // Save the license key locally (status pending until webhook fires)
    let (mut data, _) = read_license(&app);
    data.license_key = Some(result.license_key.clone());
    save_license(&app, &data);

    // Open checkout URL in default browser
    app.opener().open_url(&result.url, None::<&str>)
        .map_err(|e| format!("Failed to open browser: {}", e))?;

    Ok(result.license_key)
}

#[tauri::command]
pub async fn activate_license(
    app: tauri::AppHandle,
    license_key: String,
) -> Result<LicenseData, String> {
    let (mut data, _) = read_license(&app);
    data.license_key = Some(license_key);
    save_license(&app, &data);

    // Validate online immediately
    validate_license_online(app).await
}

#[tauri::command]
pub async fn open_manage_portal(app: tauri::AppHandle) -> Result<(), String> {
    let (data, _) = read_license(&app);

    let key = match &data.license_key {
        Some(k) => k.clone(),
        None => return Err("No license key".to_string()),
    };

    let client = reqwest::Client::new();
    let resp = client
        .get(format!("{}/manage?licenseKey={}", API_BASE, key))
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("Server error: {}", resp.status()));
    }

    let result: ManageApiResponse = resp
        .json()
        .await
        .map_err(|e| format!("Parse error: {}", e))?;

    app.opener().open_url(&result.url, None::<&str>)
        .map_err(|e| format!("Failed to open browser: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn deactivate_license(app: tauri::AppHandle) -> Result<(), String> {
    let (mut data, _) = read_license(&app);
    data.license_key = None;
    data.status = "expired".to_string();
    data.last_online_check = 0;
    data.expires_at = 0;
    // Keep trial_started_at so they can't reset trial
    save_license(&app, &data);
    Ok(())
}
