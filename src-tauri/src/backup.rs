use std::fs;
use std::path::PathBuf;
use std::process::Command;

use tauri::{AppHandle, Manager};

const AUTO_BACKUP_FILE: &str = "stash-auto-backup.json";

// `~/Library/Application Support/<app>/backups`, created if missing.
fn backups_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("backups");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

// Write the automatic backup. The write is atomic: a temp file is written
// first and then renamed over the destination, so an interrupted write
// can never corrupt the previous good backup.
#[tauri::command]
pub fn write_auto_backup(app: AppHandle, json: String) -> Result<String, String> {
    let dir = backups_dir(&app)?;
    let final_path = dir.join(AUTO_BACKUP_FILE);
    let tmp_path = dir.join(format!("{AUTO_BACKUP_FILE}.tmp"));

    fs::write(&tmp_path, json).map_err(|e| e.to_string())?;
    fs::rename(&tmp_path, &final_path).map_err(|e| e.to_string())?;

    Ok(final_path.to_string_lossy().into_owned())
}

// Open the backups folder in Finder.
#[tauri::command]
pub fn reveal_backups_folder(app: AppHandle) -> Result<(), String> {
    let dir = backups_dir(&app)?;
    Command::new("open")
        .arg(&dir)
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}
