use std::io::Read;
use std::process::{Command, Stdio};
use std::thread;
use std::time::{Duration, Instant};

use serde::Serialize;

fn applescript_escape(s: &str) -> String {
    s.replace('\\', "\\\\").replace('"', "\\\"")
}

#[derive(Serialize)]
pub struct SilentRunResult {
    pub exit_code: Option<i32>,
    pub stdout: String,
    pub stderr: String,
    // True when the command is still running past the wait window — we've
    // returned control to the UI and the process continues in the
    // background on its own.
    pub detached: bool,
}

// How long to wait for a silent command to finish before giving up on
// capturing its output. Short enough that daemon-style commands feel
// responsive ("Started in background"), long enough that ordinary
// commands wait for their output.
const SILENT_WAIT: Duration = Duration::from_millis(2000);

// Run a command silently in the background — no Terminal window. The
// dialog still confirms before this runs, so it stays as safe as the
// visible path. If the command finishes within SILENT_WAIT we return
// stdout/stderr/exit. Otherwise we detach and return immediately so the
// UI doesn't hang on long-running services; the process keeps running.
#[tauri::command]
pub fn execute_command_silent(command: String) -> Result<SilentRunResult, String> {
    if command.trim().is_empty() {
        return Err("Command is empty.".into());
    }

    // Use the user's login shell so PATH and aliases behave like Terminal.
    let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".into());

    let mut child = Command::new(&shell)
        .args(["-l", "-c", &command])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
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

    let start = Instant::now();
    loop {
        match child.try_wait().map_err(|e| e.to_string())? {
            Some(status) => {
                let mut stdout = Vec::new();
                let mut stderr = Vec::new();
                if let Some(mut s) = child.stdout.take() {
                    let _ = s.read_to_end(&mut stdout);
                }
                if let Some(mut s) = child.stderr.take() {
                    let _ = s.read_to_end(&mut stderr);
                }
                return Ok(SilentRunResult {
                    exit_code: status.code(),
                    stdout: truncate(&stdout),
                    stderr: truncate(&stderr),
                    detached: false,
                });
            }
            None => {
                if start.elapsed() >= SILENT_WAIT {
                    // Still running. Drain the pipes in background threads
                    // so the child can keep writing to stdout/stderr
                    // without SIGPIPE-ing after we lose the handles. The
                    // threads exit when the child eventually does.
                    if let Some(mut s) = child.stdout.take() {
                        thread::spawn(move || {
                            let _ = std::io::copy(&mut s, &mut std::io::sink());
                        });
                    }
                    if let Some(mut s) = child.stderr.take() {
                        thread::spawn(move || {
                            let _ = std::io::copy(&mut s, &mut std::io::sink());
                        });
                    }
                    // Dropping Child does not kill the process on Unix.
                    return Ok(SilentRunResult {
                        exit_code: None,
                        stdout: String::new(),
                        stderr: String::new(),
                        detached: true,
                    });
                }
                thread::sleep(Duration::from_millis(50));
            }
        }
    }
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
