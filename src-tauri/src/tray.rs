use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager,
};

use crate::session;

pub fn build_tray(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let show_item = MenuItemBuilder::with_id("show", "Show Window").build(app)?;
    let end_item = MenuItemBuilder::with_id("end-session", "End Session").build(app)?;
    let quit_item = MenuItemBuilder::with_id("quit", "Quit").build(app)?;

    let menu = MenuBuilder::new(app)
        .item(&show_item)
        .item(&end_item)
        .separator()
        .item(&quit_item)
        .build()?;

    let icon = app.default_window_icon().cloned().unwrap();

    let _tray = TrayIconBuilder::with_id("main-tray")
        .icon(icon)
        .menu(&menu)
        .tooltip("Focus")
        .on_menu_event(move |app, event| match event.id.as_ref() {
            "show" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            "end-session" => {
                let _ = session::stop_session();
            }
            "quit" => {
                session::end_session();
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        })
        .build(app)?;

    Ok(())
}

pub fn update_tray_tooltip(app: &AppHandle, remaining_secs: u64) {
    if let Some(tray) = app.tray_by_id("main-tray") {
        let mins = remaining_secs / 60;
        let secs = remaining_secs % 60;
        let tooltip = format!("Focus - {:02}:{:02} remaining", mins, secs);
        let _ = tray.set_tooltip(Some(&tooltip));
    }
}
