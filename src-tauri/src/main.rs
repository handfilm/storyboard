// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::path::PathBuf;

#[tauri::command]
fn dispatch_external_tool(app_name: String, file_path: String) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        let command = match app_name.as_str() {
            "photoshop" => "photoshop",
            "illustrator" => "illustrator",
            "premiere" => "Adobe Premiere Pro",
            _ => "explorer",
        };
        std::process::Command::new("cmd")
            .args(["/C", "start", command, &file_path])
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
