use std::process::Command;

fn applescript_escape(s: &str) -> String {
    s.replace('\\', "\\\\").replace('"', "\\\"")
}

#[tauri::command]
pub fn execute_command(command: String) -> Result<(), String> {
    if command.trim().is_empty() {
        return Err("Command is empty.".into());
    }

    // Window selection logic:
    //   - No windows yet (cold launch): reuse the window `activate` created,
    //     so we don't end up with two windows.
    //   - Front tab is busy (something already running): open a NEW window,
    //     otherwise `do script ... in front window` would queue behind the
    //     running process and never execute.
    //   - Front tab is idle: reuse it.
    let escaped = applescript_escape(&command);
    let script = format!(
        "tell application \"Terminal\"\n\
           activate\n\
           if (count of windows) is 0 then\n\
             do script \"{0}\"\n\
           else if busy of selected tab of front window then\n\
             do script \"{0}\"\n\
           else\n\
             do script \"{0}\" in front window\n\
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
