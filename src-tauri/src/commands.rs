use serde::{Deserialize, Serialize};

use crate::process;
use crate::session;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessInfo {
    pub name: String,
    pub pid: u32,
}

#[tauri::command]
pub fn list_processes() -> Vec<ProcessInfo> {
    process::list_running_processes()
        .into_iter()
        .map(|p| ProcessInfo {
            name: p.name,
            pid: p.pid,
        })
        .collect()
}

#[tauri::command]
pub fn kill_process(name: String) -> Result<u32, String> {
    process::kill_process_by_name(&name)
}

#[tauri::command]
pub fn start_session(
    blocked_apps: Vec<String>,
    blocked_websites: Vec<String>,
    duration_secs: u64,
) -> Result<(), String> {
    session::start_session(blocked_apps, blocked_websites, duration_secs)
}

#[tauri::command]
pub fn stop_session() -> Result<(), String> {
    session::stop_session()
}

#[tauri::command]
pub fn get_session_state() -> session::SessionState {
    session::get_state()
}

#[tauri::command]
pub fn check_stale_hosts() -> Result<bool, String> {
    session::cleanup_on_startup()
}
