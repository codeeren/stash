use std::process::{Command, Stdio};
use std::thread;
use std::time::{Duration, Instant};

use serde::Serialize;

// A CLI we know how to drive in headless ("print") mode. The user picks
// one in Settings; Stash shells out to whichever they already have
// installed and authenticated — no API key ever touches Stash.
struct Provider {
    id: &'static str,
    name: &'static str,
    bin: &'static str,
    install_hint: &'static str,
}

const PROVIDERS: &[Provider] = &[
    Provider {
        id: "claude",
        name: "Claude Code",
        bin: "claude",
        install_hint: "npm i -g @anthropic-ai/claude-code",
    },
    Provider {
        id: "codex",
        name: "Codex CLI",
        bin: "codex",
        install_hint: "npm i -g @openai/codex",
    },
    Provider {
        id: "gemini",
        name: "Gemini CLI",
        bin: "gemini",
        install_hint: "npm i -g @google/gemini-cli",
    },
];

#[derive(Serialize)]
pub struct DetectedCli {
    id: String,
    name: String,
    /// Resolved absolute path to the binary, empty if not found.
    path: String,
    found: bool,
    install_hint: String,
}

// Resolve a command the way the user's terminal would. A GUI app launched
// from /Applications inherits only a minimal PATH (/usr/bin:/bin:…), so a
// naive lookup misses CLIs in ~/.local/bin, Homebrew, npm-global, etc.
// Running through the user's login shell restores their real PATH.
fn resolve_via_login_shell(bin: &str) -> Option<String> {
    let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".into());
    let out = Command::new(&shell)
        .args(["-lc", &format!("command -v {bin}")])
        .output()
        .ok()?;
    if !out.status.success() {
        return None;
    }
    let path = String::from_utf8_lossy(&out.stdout).trim().to_string();
    if path.is_empty() || !std::path::Path::new(&path).exists() {
        None
    } else {
        Some(path)
    }
}

// Known fixed install locations to probe when the login shell didn't find
// the binary (e.g. installed but not on PATH).
fn probe_known_locations(bin: &str) -> Option<String> {
    let home = std::env::var("HOME").unwrap_or_default();
    let candidates = [
        format!("{home}/.local/bin/{bin}"),
        format!("{home}/.npm-global/bin/{bin}"),
        format!("{home}/.bun/bin/{bin}"),
        format!("/opt/homebrew/bin/{bin}"),
        format!("/usr/local/bin/{bin}"),
    ];
    candidates.into_iter().find(|p| std::path::Path::new(p).exists())
}

#[tauri::command]
pub fn ai_detect() -> Vec<DetectedCli> {
    PROVIDERS
        .iter()
        .map(|p| {
            let path = resolve_via_login_shell(p.bin)
                .or_else(|| probe_known_locations(p.bin))
                .unwrap_or_default();
            DetectedCli {
                id: p.id.to_string(),
                name: p.name.to_string(),
                found: !path.is_empty(),
                path,
                install_hint: p.install_hint.to_string(),
            }
        })
        .collect()
}

// Headless invocation per provider, run *through the user's login shell*.
// A GUI app launched from /Applications has a minimal PATH, but these CLIs
// are Node scripts whose `#!/usr/bin/env node` shebang needs Node on PATH;
// the login shell restores the user's real PATH. The binary path and the
// prompt are passed as positional parameters ($1, $2), so the prompt needs
// no escaping and there's no shell-injection surface. Each CLI prints the
// model's reply to stdout.
fn build_command(provider: &str, bin_path: &str, prompt: &str) -> Command {
    let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".into());
    let inner = match provider {
        "claude" => r#"exec "$1" -p "$2""#,
        // Codex's `exec` refuses to run outside a trusted git repo unless
        // told to skip that check; we just want a one-shot completion.
        "codex" => r#"exec "$1" exec --skip-git-repo-check "$2""#,
        "gemini" => r#"exec "$1" -p "$2""#,
        _ => r#"exec "$1" "$2""#,
    };
    let mut cmd = Command::new(shell);
    cmd.args(["-lc", inner, "stash-ai", bin_path, prompt])
        // Run from the user's home so CLIs that inspect the working
        // directory (git repo / trust checks) get a sane neutral one.
        .current_dir(std::env::var("HOME").unwrap_or_else(|_| "/".into()))
        // No interactive stdin — the prompt is passed as an argument.
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    cmd
}

const AI_TIMEOUT: Duration = Duration::from_secs(120);

#[tauri::command]
pub fn ai_generate(
    provider: String,
    bin_path: String,
    prompt: String,
) -> Result<String, String> {
    if bin_path.trim().is_empty() {
        return Err("No AI CLI configured.".into());
    }
    if !std::path::Path::new(&bin_path).exists() {
        return Err(format!("CLI not found at {bin_path}."));
    }

    let mut child = build_command(&provider, &bin_path, &prompt)
        .spawn()
        .map_err(|e| format!("Failed to start the AI CLI: {e}"))?;

    let start = Instant::now();
    loop {
        match child.try_wait().map_err(|e| e.to_string())? {
            Some(status) => {
                let out = child
                    .wait_with_output()
                    .map_err(|e| e.to_string())?;
                let stdout = String::from_utf8_lossy(&out.stdout).to_string();
                if status.success() {
                    if stdout.trim().is_empty() {
                        return Err("The AI returned an empty response.".into());
                    }
                    return Ok(stdout);
                }
                let stderr = String::from_utf8_lossy(&out.stderr);
                return Err(format!(
                    "The AI CLI exited with an error:\n{}",
                    stderr.trim()
                ));
            }
            None => {
                if start.elapsed() >= AI_TIMEOUT {
                    let _ = child.kill();
                    return Err("The AI took too long and was stopped.".into());
                }
                thread::sleep(Duration::from_millis(80));
            }
        }
    }
}
