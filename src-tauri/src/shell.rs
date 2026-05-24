use std::process::Command;

use serde::Serialize;

fn applescript_escape(s: &str) -> String {
    s.replace('\\', "\\\\").replace('"', "\\\"")
}

#[derive(Serialize)]
pub struct SilentRunResult {
    pub exit_code: Option<i32>,
    pub stdout: String,
    pub stderr: String,
}

// Run a command silently in the background — no Terminal window. The user
// opts in per item; the dialog still confirms before this runs, so it
// stays as safe as the visible path.
#[tauri::command]
pub fn execute_command_silent(command: String) -> Result<SilentRunResult, String> {
    if command.trim().is_empty() {
        return Err("Command is empty.".into());
    }

    // Use the user's login shell so PATH and aliases behave like Terminal.
    let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".into());

    let output = Command::new(&shell)
        .args(["-l", "-c", &command])
        .output()
        .map_err(|e| format!("Failed to spawn shell: {e}"))?;

    // Truncate captured output so a runaway command can't bloat the IPC
    // payload. The full output never goes anywhere — this is just for the
    // result panel.
    const MAX: usize = 10 * 1024;
    let truncate = |bytes: &[u8]| -> String {
        let s = String::from_utf8_lossy(bytes);
        if s.len() <= MAX {
            s.into_owned()
        } else {
            format!("{}\n…(truncated)", &s[..MAX])
        }
    };

    Ok(SilentRunResult {
        exit_code: output.status.code(),
        stdout: truncate(&output.stdout),
        stderr: truncate(&output.stderr),
    })
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
