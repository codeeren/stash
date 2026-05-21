use serde::Deserialize;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{
    image::Image,
    menu::{Menu, MenuItem, PredefinedMenuItem, Submenu},
    tray::TrayIconBuilder,
    AppHandle, Emitter, Manager,
};

pub const TRAY_ID: &str = "main";
pub static TRAY_VISIBLE: AtomicBool = AtomicBool::new(true);

pub fn is_tray_visible() -> bool {
    TRAY_VISIBLE.load(Ordering::Relaxed)
}

#[tauri::command]
pub fn set_tray_visible(app: AppHandle, visible: bool) -> Result<(), String> {
    if let Some(tray) = app.tray_by_id(TRAY_ID) {
        tray.set_visible(visible).map_err(|e| e.to_string())?;
    }
    TRAY_VISIBLE.store(visible, Ordering::Relaxed);
    Ok(())
}

#[derive(Deserialize)]
pub struct TrayItemPayload {
    pub id: i64,
    pub title: String,
}

#[tauri::command]
pub fn set_tray_items(
    app: AppHandle,
    favorites: Vec<TrayItemPayload>,
    recent: Vec<TrayItemPayload>,
) -> Result<(), String> {
    apply_menu(&app, &favorites, &recent).map_err(|e| e.to_string())
}

fn truncate_title(s: &str) -> String {
    const MAX: usize = 48;
    let count = s.chars().count();
    if count <= MAX {
        s.to_string()
    } else {
        let mut out: String = s.chars().take(MAX).collect();
        out.push('…');
        out
    }
}

fn apply_menu(
    app: &AppHandle,
    favorites: &[TrayItemPayload],
    recent: &[TrayItemPayload],
) -> tauri::Result<()> {
    let menu = Menu::new(app)?;

    let new_item =
        MenuItem::with_id(app, "new-item", "＋ New item", true, None::<&str>)?;
    menu.append(&new_item)?;
    menu.append(&PredefinedMenuItem::separator(app)?)?;

    if !favorites.is_empty() {
        let sub = Submenu::with_id(app, "fav-sub", "⭐ Favorites", true)?;
        for p in favorites {
            let id = format!("item:{}", p.id);
            let mi =
                MenuItem::with_id(app, &id, &truncate_title(&p.title), true, None::<&str>)?;
            sub.append(&mi)?;
        }
        menu.append(&sub)?;
    }

    if !recent.is_empty() {
        let sub = Submenu::with_id(app, "items-sub", "📋 Items", true)?;
        for p in recent {
            let id = format!("item:{}", p.id);
            let mi =
                MenuItem::with_id(app, &id, &truncate_title(&p.title), true, None::<&str>)?;
            sub.append(&mi)?;
        }
        menu.append(&sub)?;
    }

    if !favorites.is_empty() || !recent.is_empty() {
        menu.append(&PredefinedMenuItem::separator(app)?)?;
    }

    let show_item = MenuItem::with_id(app, "show", "Show Stash", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    menu.append(&show_item)?;
    menu.append(&quit_item)?;

    if let Some(tray) = app.tray_by_id(TRAY_ID) {
        tray.set_menu(Some(menu))?;
    }
    Ok(())
}

fn show_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        // Only call show()/unminimize() when actually needed. Calling show()
        // on an already-visible window causes a visible flash on macOS (the
        // window briefly disappears and reappears).
        if !window.is_visible().unwrap_or(true) {
            let _ = window.show();
        }
        if window.is_minimized().unwrap_or(false) {
            let _ = window.unminimize();
        }
        let _ = window.set_focus();
    }
}

#[tauri::command]
pub fn show_main_window(app: AppHandle) -> Result<(), String> {
    show_window(&app);
    Ok(())
}

#[tauri::command]
pub fn set_tray_title(app: AppHandle, title: String) -> Result<(), String> {
    if let Some(tray) = app.tray_by_id(TRAY_ID) {
        let effective: Option<&str> = if title.is_empty() { None } else { Some(&title) };
        tray.set_title(effective).map_err(|e| e.to_string())?;
        // Belt-and-suspenders: on macOS some paths ignore Option::None once a
        // title has been set, so also push an explicit empty string.
        if effective.is_none() {
            let _ = tray.set_title(Some(""));
        }
    }
    Ok(())
}

pub fn setup(app: &AppHandle) -> tauri::Result<()> {
    let new_item =
        MenuItem::with_id(app, "new-item", "＋ New item", true, None::<&str>)?;
    let sep = PredefinedMenuItem::separator(app)?;
    let show_item = MenuItem::with_id(app, "show", "Show Stash", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&new_item, &sep, &show_item, &quit_item])?;

    // Dedicated monochrome tray icon (black-on-transparent) so macOS can tint
    // it correctly via template mode for both light and dark menu bars.
    let icon = Image::from_bytes(include_bytes!("../icons/tray@2x.png"))?;

    TrayIconBuilder::with_id(TRAY_ID)
        .icon(icon)
        .icon_as_template(true)
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(|app, event| {
            let id = event.id.as_ref();
            match id {
                "show" => show_window(app),
                "quit" => app.exit(0),
                "new-item" => {
                    show_window(app);
                    let _ = app.emit("menu:new_item", ());
                }
                other if other.starts_with("item:") => {
                    if let Ok(n) = other[5..].parse::<i64>() {
                        // Frontend decides whether to show the window
                        // (copy-only items are handled silently with a
                        // native notification).
                        let _ = app.emit("tray:activate", n);
                    }
                }
                _ => {}
            }
        })
        .build(app)?;

    Ok(())
}
