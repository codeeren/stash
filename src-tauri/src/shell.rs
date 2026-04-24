use std::process::Command;

fn applescript_escape(s: &str) -> String {
    s.replace('\\', "\\\\").replace('"', "\\\"")
}

#[tauri::command]
pub fn execute_command(command: String) -> Result<(), String> {
    if command.trim().is_empty() {
        return Err("Command is empty.".into());
    }

    // `do script` always creates a new window; if we just `activate` first,
    // Terminal's freshly-launched empty window plus `do script`'s window
    // means two windows. So: activate, and if there is already a front
    // window (either pre-existing or launched by `activate`), reuse it.
    let escaped = applescript_escape(&command);
    let script = format!(
        "tell application \"Terminal\"\n\
           activate\n\
           if (count of windows) > 0 then\n\
             do script \"{0}\" in front window\n\
           else\n\
             do script \"{0}\"\n\
           end if\n\
         end tell",
        escaped
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
