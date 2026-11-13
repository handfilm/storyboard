// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::collections::{HashMap, VecDeque};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Mutex, OnceLock};
use std::time::{Duration, UNIX_EPOCH};
use notify::{RecommendedWatcher, RecursiveMode, Watcher};
use tauri::{Emitter, Manager};

static WATCHER_STARTED: AtomicBool = AtomicBool::new(false);

const VIDEO_CACHE_CHUNK_BYTES: usize = 1024 * 1024;
const VIDEO_CACHE_MAX_BYTES: usize = 128 * 1024 * 1024;
const MAX_CACHED_RANGE_SPAN: u64 = 8 * 1024 * 1024;

struct RustVideoBlockCache {
    blocks: HashMap<String, Vec<u8>>,
    order: VecDeque<String>,
    current_bytes: usize,
}

impl RustVideoBlockCache {
    fn new() -> Self {
        Self {
            blocks: HashMap::new(),
            order: VecDeque::new(),
            current_bytes: 0,
        }
    }

    fn get(&mut self, key: &str) -> Option<Vec<u8>> {
        if let Some(data) = self.blocks.get(key) {
            let cloned = data.clone();
            if let Some(pos) = self.order.iter().position(|k| k == key) {
                self.order.remove(pos);
            }
            self.order.push_back(key.to_string());
            Some(cloned)
        } else {
            None
        }
    }

    fn insert(&mut self, key: String, data: Vec<u8>) {
        if data.is_empty() || data.len() > VIDEO_CACHE_MAX_BYTES {
            return;
        }
        if let Some(old) = self.blocks.remove(&key) {
            self.current_bytes = self.current_bytes.saturating_sub(old.len());
            if let Some(pos) = self.order.iter().position(|k| k == &key) {
                self.order.remove(pos);
            }
        }
        while self.current_bytes + data.len() > VIDEO_CACHE_MAX_BYTES {
            if let Some(oldest_key) = self.order.pop_front() {
                if let Some(removed) = self.blocks.remove(&oldest_key) {
                    self.current_bytes = self.current_bytes.saturating_sub(removed.len());
                }
            } else {
                break;
            }
        }
        self.current_bytes += data.len();
        self.order.push_back(key.clone());
        self.blocks.insert(key, data);
    }
}

fn global_video_cache() -> &'static Mutex<RustVideoBlockCache> {
    static CACHE: OnceLock<Mutex<RustVideoBlockCache>> = OnceLock::new();
    CACHE.get_or_init(|| Mutex::new(RustVideoBlockCache::new()))
}

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

fn percent_decode(input: &str) -> String {
    let bytes = input.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' && i + 2 < bytes.len() {
            if let (Some(hi), Some(lo)) = (
                (bytes[i + 1] as char).to_digit(16),
                (bytes[i + 2] as char).to_digit(16),
            ) {
                out.push(((hi << 4) | lo) as u8);
                i += 3;
                continue;
            }
        }
        out.push(bytes[i]);
        i += 1;
    }
    String::from_utf8_lossy(&out).to_string()
}

fn infer_local_mime_type(file_path: &str) -> &'static str {
    let lower = file_path.to_ascii_lowercase();
    if lower.ends_with(".mp4") || lower.ends_with(".m4v") {
        "video/mp4"
    } else if lower.ends_with(".mov") {
        "video/quicktime"
    } else if lower.ends_with(".webm") {
        "video/webm"
    } else if lower.ends_with(".mkv") {
        "video/x-matroska"
    } else if lower.ends_with(".avi") {
        "video/x-msvideo"
    } else if lower.ends_with(".ogv") {
        "video/ogg"
    } else if lower.ends_with(".png") {
        "image/png"
    } else if lower.ends_with(".jpg") || lower.ends_with(".jpeg") {
        "image/jpeg"
    } else if lower.ends_with(".webp") {
        "image/webp"
    } else if lower.ends_with(".gif") {
        "image/gif"
    } else if lower.ends_with(".wav") {
        "audio/wav"
    } else if lower.ends_with(".mp3") {
        "audio/mpeg"
    } else {
        "application/octet-stream"
    }
}

fn read_rust_cached_block(
    file: &mut fs::File,
    file_key: &str,
    file_size: u64,
    block_idx: u64,
) -> std::io::Result<Vec<u8>> {
    use std::io::{Read, Seek, SeekFrom};

    let key = format!("{file_key}#{block_idx}");
    if let Ok(mut guard) = global_video_cache().lock() {
        if let Some(hit) = guard.get(&key) {
            return Ok(hit);
        }
    }

    let block_start = block_idx * (VIDEO_CACHE_CHUNK_BYTES as u64);
    let block_end = file_size.min(block_start + (VIDEO_CACHE_CHUNK_BYTES as u64));
    let len = block_end.saturating_sub(block_start) as usize;
    if len == 0 {
        return Ok(Vec::new());
    }

    file.seek(SeekFrom::Start(block_start))?;
    let mut buf = vec![0u8; len];
    let mut offset = 0;
    while offset < len {
        match file.read(&mut buf[offset..]) {
            Ok(0) => break,
            Ok(n) => offset += n,
            Err(e) => return Err(e),
        }
    }
    buf.truncate(offset);

    if let Ok(mut guard) = global_video_cache().lock() {
        guard.insert(key, buf.clone());
    }
    Ok(buf)
}

fn handle_local_video_connection(mut stream: std::net::TcpStream) {
    use std::io::{BufRead, BufReader, Read, Seek, SeekFrom, Write};

    let _ = stream.set_nodelay(true);
    let _ = stream.set_read_timeout(Some(Duration::from_secs(15)));
    let _ = stream.set_write_timeout(Some(Duration::from_secs(30)));
    let mut reader = match stream.try_clone() {
        Ok(cloned) => BufReader::new(cloned),
        Err(_) => return,
    };

    loop {
        let mut request_line = String::new();
        if reader.read_line(&mut request_line).unwrap_or(0) == 0 {
            return;
        }
        if request_line.trim().is_empty() {
            continue;
        }

        let mut parts = request_line.split_whitespace();
        let method = parts.next().unwrap_or("").to_string();
        let target = parts.next().unwrap_or("").to_string();

        let mut range_header: Option<String> = None;
        let mut if_none_match: Option<String> = None;
        let mut if_range: Option<String> = None;
        let mut wants_close = false;
        loop {
            let mut line = String::new();
            if reader.read_line(&mut line).unwrap_or(0) == 0 {
                wants_close = true;
                break;
            }
            let trimmed = line.trim();
            if trimmed.is_empty() {
                break;
            }
            if let Some((k, v)) = trimmed.split_once(':') {
                let key = k.trim();
                let val = v.trim();
                if key.eq_ignore_ascii_case("range") {
                    range_header = Some(val.to_string());
                } else if key.eq_ignore_ascii_case("if-none-match") {
                    if_none_match = Some(val.to_string());
                } else if key.eq_ignore_ascii_case("if-range") {
                    if_range = Some(val.to_string());
                } else if key.eq_ignore_ascii_case("connection") && val.eq_ignore_ascii_case("close") {
                    wants_close = true;
                }
            }
        }

        let conn_hdr = if wants_close { "close" } else { "keep-alive" };
        let cors_headers = format!(
            "Access-Control-Allow-Origin: *\r\nAccess-Control-Allow-Methods: GET, HEAD, OPTIONS\r\nAccess-Control-Allow-Headers: Range, Content-Type, If-None-Match, If-Range\r\nAccess-Control-Expose-Headers: Content-Range, Content-Length, Accept-Ranges, ETag, Cache-Control\r\nConnection: {conn_hdr}\r\n"
        );

        if method.eq_ignore_ascii_case("OPTIONS") {
            let resp = format!("HTTP/1.1 204 No Content\r\n{cors_headers}\r\n");
            if stream.write_all(resp.as_bytes()).is_err() || wants_close {
                return;
            }
            continue;
        }

        if !method.eq_ignore_ascii_case("GET") && !method.eq_ignore_ascii_case("HEAD") {
            let resp = format!("HTTP/1.1 405 Method Not Allowed\r\n{cors_headers}Content-Length: 0\r\n\r\n");
            let _ = stream.write_all(resp.as_bytes());
            if wants_close {
                return;
            }
            continue;
        }

        let (route_path, query) = target.split_once('?').unwrap_or((&target, ""));
        if route_path != "/api/local-video" {
            let resp = format!("HTTP/1.1 404 Not Found\r\n{cors_headers}Content-Length: 0\r\n\r\n");
            let _ = stream.write_all(resp.as_bytes());
            if wants_close {
                return;
            }
            continue;
        }

        let mut file_path: Option<String> = None;
        for pair in query.split('&') {
            if let Some((k, v)) = pair.split_once('=') {
                if k == "path" {
                    file_path = Some(percent_decode(v));
                    break;
                }
            }
        }

        let raw_path = match file_path {
            Some(p) if !p.trim().is_empty() => p,
            _ => {
                let resp = format!("HTTP/1.1 400 Bad Request\r\n{cors_headers}Content-Length: 0\r\n\r\n");
                let _ = stream.write_all(resp.as_bytes());
                if wants_close {
                    return;
                }
                continue;
            }
        };

        let mut file = match fs::File::open(&raw_path) {
            Ok(f) => f,
            Err(_) => {
                let resp = format!("HTTP/1.1 404 Not Found\r\n{cors_headers}Content-Length: 0\r\n\r\n");
                let _ = stream.write_all(resp.as_bytes());
                if wants_close {
                    return;
                }
                continue;
            }
        };

        let metadata = match file.metadata() {
            Ok(m) if m.is_file() => m,
            _ => {
                let resp = format!("HTTP/1.1 404 Not Found\r\n{cors_headers}Content-Length: 0\r\n\r\n");
                let _ = stream.write_all(resp.as_bytes());
                if wants_close {
                    return;
                }
                continue;
            }
        };

        let file_size = metadata.len();
        let mtime_ms = metadata
            .modified()
            .ok()
            .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
            .map(|d| d.as_millis() as u64)
            .unwrap_or(0);
        let etag = format!("\"v1-{file_size}-{mtime_ms}\"");
        let file_key = format!("{raw_path}|{file_size}|{mtime_ms}");
        let mime = infer_local_mime_type(&raw_path);

        if let Some(inm) = if_none_match.as_deref() {
            if inm.trim() == etag {
                let resp = format!(
                    "HTTP/1.1 304 Not Modified\r\n{cors_headers}ETag: {etag}\r\nCache-Control: private, max-age=3600\r\n\r\n"
                );
                if stream.write_all(resp.as_bytes()).is_err() || wants_close {
                    return;
                }
                continue;
            }
        }

        if let Some(ir) = if_range.as_deref() {
            let trimmed_ir = ir.trim();
            if !trimmed_ir.is_empty() && trimmed_ir != etag {
                range_header = None;
            }
        }

        let (status_line, start, end, content_range_hdr) = if let Some(rh) = range_header {
            let spec = rh.trim();
            let bytes_spec = spec.strip_prefix("bytes=").or_else(|| spec.strip_prefix("BYTES="));
            let parsed = bytes_spec.and_then(|s| s.split_once('-')).and_then(|(a, b)| {
                if a.is_empty() && !b.is_empty() {
                    let suffix = b.parse::<u64>().ok()?;
                    let s = file_size.saturating_sub(suffix);
                    Some((s, file_size.saturating_sub(1)))
                } else {
                    let s = a.parse::<u64>().ok()?;
                    let e = if b.is_empty() {
                        file_size.saturating_sub(1)
                    } else {
                        b.parse::<u64>().ok()?.min(file_size.saturating_sub(1))
                    };
                    if s <= e && e < file_size {
                        Some((s, e))
                    } else {
                        None
                    }
                }
            });

            match parsed {
                Some((s, e)) => (
                    "HTTP/1.1 206 Partial Content",
                    s,
                    e,
                    format!("Content-Range: bytes {s}-{e}/{file_size}\r\n"),
                ),
                None => {
                    let resp = format!(
                        "HTTP/1.1 416 Range Not Satisfiable\r\n{cors_headers}Content-Range: bytes */{file_size}\r\nContent-Length: 0\r\n\r\n"
                    );
                    let _ = stream.write_all(resp.as_bytes());
                    if wants_close {
                        return;
                    }
                    continue;
                }
            }
        } else if file_size == 0 {
            ("HTTP/1.1 200 OK", 0, 0, String::new())
        } else {
            ("HTTP/1.1 200 OK", 0, file_size - 1, String::new())
        };

        let content_length = if file_size == 0 { 0 } else { end - start + 1 };
        let header = format!(
            "{status_line}\r\n{cors_headers}Accept-Ranges: bytes\r\nContent-Type: {mime}\r\nContent-Length: {content_length}\r\nETag: {etag}\r\nCache-Control: private, max-age=3600\r\n{content_range_hdr}\r\n"
        );

        if stream.write_all(header.as_bytes()).is_err() {
            return;
        }

        if !method.eq_ignore_ascii_case("HEAD") && content_length > 0 {
            if content_length <= MAX_CACHED_RANGE_SPAN {
                let chunk_u64 = VIDEO_CACHE_CHUNK_BYTES as u64;
                let first_block = start / chunk_u64;
                let last_block = end / chunk_u64;
                let mut write_failed = false;
                for block_idx in first_block..=last_block {
                    match read_rust_cached_block(&mut file, &file_key, file_size, block_idx) {
                        Ok(block_buf) => {
                            let block_base = block_idx * chunk_u64;
                            let slice_start = start.saturating_sub(block_base) as usize;
                            let slice_end = (end + 1).saturating_sub(block_base).min(block_buf.len() as u64) as usize;
                            if slice_end > slice_start {
                                if stream.write_all(&block_buf[slice_start..slice_end]).is_err() {
                                    write_failed = true;
                                    break;
                                }
                            }
                        }
                        Err(_) => {
                            write_failed = true;
                            break;
                        }
                    }
                }
                if write_failed {
                    return;
                }
            } else {
                if file.seek(SeekFrom::Start(start)).is_err() {
                    return;
                }
                let mut remaining = content_length;
                let mut buf = vec![0u8; VIDEO_CACHE_CHUNK_BYTES];
                while remaining > 0 {
                    let to_read = (remaining as usize).min(buf.len());
                    match file.read(&mut buf[..to_read]) {
                        Ok(0) => break,
                        Ok(n) => {
                            if stream.write_all(&buf[..n]).is_err() {
                                return;
                            }
                            remaining -= n as u64;
                        }
                        Err(_) => return,
                    }
                }
            }
        }

        if wants_close {
            return;
        }
    }
}

fn spawn_local_video_range_server() {
    std::thread::spawn(|| {
        let listener = match std::net::TcpListener::bind("127.0.0.1:5173") {
            Ok(l) => l,
            Err(_) => return, // Already bound by dev server (server.ts) on 5173
        };

        for stream in listener.incoming().flatten() {
            std::thread::spawn(move || {
                handle_local_video_connection(stream);
            });
        }
    });
}

fn main() {
    spawn_local_video_range_server();
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            dispatch_external_tool,
            save_project_frame,
            get_project_frames_dir
        ])
        .run(tauri::generate_context!())
        .expect("error while running HANDFILM Cockpit native desktop application");
}
