// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;
use notify::{RecommendedWatcher, RecursiveMode, Watcher};
use tauri::{Emitter, Manager};

static WATCHER_STARTED: AtomicBool = AtomicBool::new(false);

fn ensure_frames_watcher(app_handle: tauri::AppHandle, frames_dir: PathBuf) {
    if WATCHER_STARTED.swap(true, Ordering::SeqCst) {
        return;
    }

    std::thread::spawn(move || {
        let (tx, rx) = std::sync::mpsc::channel();
        let mut watcher: RecommendedWatcher = match Watcher::new(
            tx,
            notify::Config::default().with_poll_interval(Duration::from_millis(500)),
        ) {
            Ok(w) => w,
            Err(_) => return,
        };

        if watcher.watch(&frames_dir, RecursiveMode::NonRecursive).is_err() {
            return;
        }

        for res in rx {
            if let Ok(event) = res {
                if event.kind.is_modify() || event.kind.is_create() {
                    for path in event.paths {
                        if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
                            if ext.eq_ignore_ascii_case("png") || ext.eq_ignore_ascii_case("jpg") {
                                let payload = serde_json::json!({
                                    "filePath": path.to_string_lossy().to_string(),
                                    "timestamp": std::time::SystemTime::now()
                                        .duration_since(std::time::UNIX_EPOCH)
                                        .map(|d| d.as_millis())
                                        .unwrap_or(0)
                                });
                                let _ = app_handle.emit("cockpit:frame_modified", payload);
                            }
                        }
                    }
                }
            }
        }
    });
}

#[tauri::command]
fn dispatch_external_tool(
    app_handle: tauri::AppHandle,
    app_name: String,
    file_path: String,
    base64_frame: Option<String>,
) -> Result<String, String> {
    let frames_dir = PathBuf::from("./frames");
    if !frames_dir.exists() {
        fs::create_dir_all(&frames_dir).map_err(|e| e.to_string())?;
    }

    let resolved_path = PathBuf::from(&file_path);
    if let Some(parent) = resolved_path.parent() {
        if !parent.as_os_str().is_empty() && !parent.exists() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
    }

    // Write base64 PNG frame buffer to disk if supplied
    if let Some(data_url) = base64_frame {
        let base64_str = if let Some(idx) = data_url.find(',') {
            &data_url[idx + 1..]
        } else {
            &data_url
        };

        use base64::Engine;
        let decoded = base64::engine::general_purpose::STANDARD
            .decode(base64_str)
            .map_err(|e| format!("Base64 decode error: {}", e))?;

        fs::write(&resolved_path, decoded).map_err(|e| e.to_string())?;
    }

    // Register file-system watcher on ./frames for Ctrl+S hot-reload
    let watch_target = if resolved_path.starts_with("./frames") || Path::new(&file_path).parent() == Some(Path::new("./frames")) {
        frames_dir.clone()
    } else {
        frames_dir
    };
    ensure_frames_watcher(app_handle, watch_target);

    #[cfg(target_os = "windows")]
    {
        let command = match app_name.as_str() {
            "photoshop" => "photoshop",
            "illustrator" => "illustrator",
            "premiere" => "Adobe Premiere Pro",
            "davinci" => "Resolve",
            "capcut" => "CapCut",
            _ => "explorer",
        };
        std::process::Command::new("cmd")
            .args(["/C", "start", "", command, &file_path])
            .spawn()
            .map_err(|e| e.to_string())?;
        Ok(format!("Dispatched {} to {}", file_path, app_name))
    }

    #[cfg(target_os = "macos")]
    {
        let app_flag = match app_name.as_str() {
            "photoshop" => "Adobe Photoshop 2024",
            "illustrator" => "Adobe Illustrator",
            "premiere" => "Adobe Premiere Pro",
            "davinci" => "DaVinci Resolve",
            "capcut" => "CapCut",
            _ => "Finder",
        };
        std::process::Command::new("open")
            .args(["-a", app_flag, &file_path])
            .spawn()
            .map_err(|e| e.to_string())?;
        Ok(format!("Dispatched {} to {}", file_path, app_name))
    }

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&file_path)
            .spawn()
            .map_err(|e| e.to_string())?;
        Ok(format!("Dispatched {} via xdg-open", file_path))
    }

    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    Err("Operating system not supported for native process dispatch".into())
}

#[tauri::command]
fn save_project_frame(shot_id: String, data_url: String) -> Result<String, String> {
    let frames_dir = PathBuf::from("./frames");
    if !frames_dir.exists() {
        fs::create_dir_all(&frames_dir).map_err(|e| e.to_string())?;
    }

    let target_file = frames_dir.join(format!("shot_{}_master.png", shot_id));

    // Parse base64 header
    let base64_str = if let Some(idx) = data_url.find(",") {
        &data_url[idx + 1..]
    } else {
        &data_url
    };

    use base64::Engine;
    let decoded = base64::engine::general_purpose::STANDARD
        .decode(base64_str)
        .map_err(|e| format!("Base64 decode error: {}", e))?;

    fs::write(&target_file, decoded).map_err(|e| e.to_string())?;

    Ok(target_file.to_string_lossy().to_string())
}

#[tauri::command]
fn get_project_frames_dir() -> Result<String, String> {
    let frames_dir = PathBuf::from("./frames");
    if !frames_dir.exists() {
        fs::create_dir_all(&frames_dir).map_err(|e| e.to_string())?;
    }
    let abs_path = fs::canonicalize(&frames_dir).map_err(|e| e.to_string())?;
    Ok(abs_path.to_string_lossy().to_string())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            dispatch_external_tool,
            save_project_frame,
            get_project_frames_dir
        ])
        .run(tauri::generate_context!())
        .expect("error while running HANDFILM Cockpit native desktop application");
}
