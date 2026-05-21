use std::str::FromStr;

use tauri::{AppHandle, Manager};
use tauri_plugin_global_shortcut::{
    GlobalShortcutExt, Shortcut, ShortcutEvent, ShortcutState,
};

// Handler invoked for every registered global shortcut. We only register
// one (the quick-launch hotkey), so any press toggles the launcher window.
pub fn handle_shortcut(app: &AppHandle, _shortcut: &Shortcut, event: ShortcutEvent) {
    if event.state() != ShortcutState::Pressed {
        return;
    }
    if let Some(win) = app.get_webview_window("quicklaunch") {
        if win.is_visible().unwrap_or(false) {
            let _ = win.hide();
        } else {
            let _ = win.center();
            let _ = win.show();
            let _ = win.set_focus();
        }
    }
}

// Called from the frontend whenever the global-shortcut setting changes.
// Registering in Rust avoids the webview permission/event-delivery quirks
// that made JS-side registration unreliable.
#[tauri::command]
pub fn set_global_shortcut(
    app: AppHandle,
    enabled: bool,
    accelerator: String,
) -> Result<(), String> {
    let gs = app.global_shortcut();
    let _ = gs.unregister_all();

    if !enabled || accelerator.trim().is_empty() {
        return Ok(());
    }

    let shortcut = Shortcut::from_str(accelerator.trim())
        .map_err(|e| format!("Invalid shortcut: {e}"))?;
    gs.register(shortcut).map_err(|e| e.to_string())?;
    Ok(())
}
