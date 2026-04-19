use std::process::Command;

fn applescript_escape(s: &str) -> String {
    s.replace('\\', "\\\\").replace('"', "\\\"")
}

#[tauri::command]
pub fn execute_command(command: String) -> Result<(), String> {
    if command.trim().is_empty() {
        return Err("Command is empty.".into());
    }

    let script = format!(
        "tell application \"Terminal\"\n\
           activate\n\
           do script \"{}\"\n\
         end tell",
        applescript_escape(&command)
    );

    let output = Command::new("osascript")
        .args(["-e", &script])
        .output()
        .map_err(|e| format!("Failed to launch Terminal: {e}"))?;

    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Terminal failed to run: {err}"));
    }

    Ok(())
}
