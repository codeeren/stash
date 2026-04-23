mod menu;
mod migrations;
mod shell;
mod tray;

pub const DB_URL: &str = "sqlite:stash.db";

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(DB_URL, migrations::migrations())
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            shell::execute_command,
            tray::set_tray_visible,
            tray::set_tray_items,
            tray::set_tray_title,
            tray::show_main_window
        ])
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if tray::is_tray_visible() {
                    let _ = window.hide();
                    api.prevent_close();
                }
            }
        })
        .setup(|app| {
            menu::setup(app.handle())?;
            tray::setup(app.handle())?;
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app, event| {
            #[cfg(target_os = "macos")]
            if let tauri::RunEvent::Reopen {
                has_visible_windows,
                ..
            } = &event
            {
                if !has_visible_windows {
                    if let Some(window) = tauri::Manager::get_webview_window(app, "main") {
                        let _ = window.show();
                        let _ = window.unminimize();
                        let _ = window.set_focus();
                    }
                }
            }
            #[cfg(not(target_os = "macos"))]
            {
                let _ = (app, event);
            }
        });
}
