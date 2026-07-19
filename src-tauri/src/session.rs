use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex, OnceLock};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};

use crate::hosts;
use crate::process;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum SessionStatus {
    Idle,
    Active,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionState {
    pub status: SessionStatus,
    pub blocked_apps: Vec<String>,
    pub blocked_websites: Vec<String>,
    pub duration_secs: u64,
    pub remaining_secs: u64,
    pub hosts_backup: Option<String>,
}

impl SessionState {
    pub fn new() -> Self {
        Self {
            status: SessionStatus::Idle,
            blocked_apps: Vec::new(),
            blocked_websites: Vec::new(),
            duration_secs: 0,
            remaining_secs: 0,
            hosts_backup: None,
        }
    }
}

static SESSION_STATE: OnceLock<Arc<Mutex<SessionState>>> = OnceLock::new();
static STOP_TX: OnceLock<Mutex<Option<std::sync::mpsc::Sender<()>>>> = OnceLock::new();
static APP_HANDLE: OnceLock<Mutex<Option<AppHandle>>> = OnceLock::new();

fn state() -> &'static Arc<Mutex<SessionState>> {
    SESSION_STATE.get_or_init(|| Arc::new(Mutex::new(SessionState::new())))
}

fn stop_sender() -> &'static Mutex<Option<std::sync::mpsc::Sender<()>>> {
    STOP_TX.get_or_init(|| Mutex::new(None))
}

fn app_handle() -> &'static Mutex<Option<AppHandle>> {
    APP_HANDLE.get_or_init(|| Mutex::new(None))
}

pub fn init(app: AppHandle) {
    *app_handle().lock().unwrap() = Some(app);
}

#[allow(dead_code)]
pub fn get_status() -> SessionStatus {
    state().lock().unwrap().status.clone()
}

pub fn get_state() -> SessionState {
    state().lock().unwrap().clone()
}

pub fn start_session(
    blocked_apps: Vec<String>,
    blocked_websites: Vec<String>,
    duration_secs: u64,
) -> Result<(), String> {
    {
        let s = state().lock().unwrap();
        if s.status == SessionStatus::Active {
            return Err("A session is already active".to_string());
        }
    }

    // Kill already-running blocked processes immediately
    if !blocked_apps.is_empty() {
        process::kill_blocked_processes(&blocked_apps);
    }

    // Apply hosts file changes
    let backup = if !blocked_websites.is_empty() {
        match hosts::apply_hosts(&blocked_websites) {
            Ok(b) => Some(b),
            Err(direct_err) => {
                // Try elevated write
                hosts::elevated_write(&blocked_websites).map_err(|e| {
                    format!("Failed to modify hosts file.\nDirect: {direct_err}\nElevated: {e}")
                })?;
                Some(hosts::backup_hosts().unwrap_or_default())
            }
        }
    } else {
        None
    };

    {
        let mut s = state().lock().unwrap();
        s.status = SessionStatus::Active;
        s.blocked_apps = blocked_apps;
        s.blocked_websites = blocked_websites;
        s.duration_secs = duration_secs;
        s.remaining_secs = duration_secs;
        s.hosts_backup = backup;
    }

    let (stop_tx, stop_rx) = std::sync::mpsc::channel::<()>();
    *stop_sender().lock().unwrap() = Some(stop_tx);

    let state_ref = state().clone();
    let app = app_handle().lock().unwrap().clone().unwrap();

    // Set initial tray tooltip
    crate::tray::update_tray_tooltip(&app, duration_secs);
    let _ = app.emit("session-started", ());

    std::thread::spawn(move || {
        let start = Instant::now();

        loop {
            if stop_rx.try_recv().is_ok() {
                break;
            }

            let elapsed = start.elapsed().as_secs();
            let remaining;
            {
                let mut s = state_ref.lock().unwrap();
                if s.duration_secs <= elapsed {
                    s.remaining_secs = 0;
                    remaining = 0;
                } else {
                    s.remaining_secs = s.duration_secs - elapsed;
                    remaining = s.remaining_secs;
                }
            }

            let _ = app.emit("session-tick", remaining);
            crate::tray::update_tray_tooltip(&app, remaining);

            if remaining == 0 {
                break;
            }

            // Poll and kill blocked processes
            {
                let s = state_ref.lock().unwrap();
                if !s.blocked_apps.is_empty() {
                    let killed = process::kill_blocked_processes(&s.blocked_apps);
                    for name in killed {
                        let _ = app.emit("process-killed", name);
                    }
                }
            }

            std::thread::sleep(Duration::from_secs(1));
        }

        // Session ended naturally (timer expired)
        end_session();
    });

    Ok(())
}

pub fn stop_session() -> Result<(), String> {
    if let Some(tx) = stop_sender().lock().unwrap().take() {
        let _ = tx.send(());
    }
    Ok(())
}

pub fn end_session() {
    let backup;
    {
        let mut s = state().lock().unwrap();
        if s.status == SessionStatus::Idle {
            return;
        }
        backup = s.hosts_backup.take();
        s.status = SessionStatus::Idle;
        s.blocked_apps.clear();
        s.blocked_websites.clear();
        s.duration_secs = 0;
        s.remaining_secs = 0;
    }

    // Restore hosts file
    if let Some(ref backup_content) = backup {
        if let Err(e) = hosts::restore_from_backup(backup_content) {
            // Try elevated restore
            let _ = hosts::elevated_restore(backup_content);
            eprintln!("Hosts restore error: {e}, tried elevated restore");
        }
    }

    let app = app_handle().lock().unwrap().clone();
    if let Some(app) = app {
        let _ = app.emit("session-ended", ());
        let _ = app.emit("tray-update", false);
        let _ = app.tray_by_id("main-tray").map(|tray| {
            let _ = tray.set_tooltip(Some("Focus"));
        });
    }
}

pub fn cleanup_on_startup() -> Result<bool, String> {
    if hosts::marker_present() {
        // Try direct cleanup first
        if hosts::cleanup_stale_entries().unwrap_or(false) {
            return Ok(true);
        }
        // Fall back to elevated cleanup
        hosts::elevated_cleanup()?;
        return Ok(true);
    }
    Ok(false)
}
