mod commands;
mod db;
mod hosts;
mod process;
mod session;
mod tray;

use tauri::Emitter;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let handle = app.handle().clone();
            session::init(handle.clone());
            db::init(&handle);

            // Check for stale hosts entries from a crashed session
            if let Ok(cleaned) = session::cleanup_on_startup() {
                if cleaned {
                    let _ = handle.emit("stale-hosts-cleaned", ());
                }
            }

            // Build system tray
            if let Err(e) = tray::build_tray(&handle) {
                eprintln!("Failed to build tray: {e}");
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                // Prevent default close - hide to tray instead
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::list_processes,
            commands::kill_process,
            commands::start_session,
            commands::stop_session,
            commands::get_session_state,
            commands::check_stale_hosts,
            commands::save_session,
            commands::list_sessions,
            commands::get_session,
            commands::delete_session,
            commands::update_session,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
