export type DangerWarning = {
  pattern: string;
  message: string;
};

const RULES: { regex: RegExp; pattern: string; message: string }[] = [
  {
    regex: /\brm\s+(-[a-z]*r[a-z]*f|-[a-z]*f[a-z]*r)\b/i,
    pattern: "rm -rf",
    message: "Recursive force delete.",
  },
  {
    regex: /\bsudo\b/,
    pattern: "sudo",
    message: "Runs with elevated privileges.",
  },
  {
    regex: /\bcurl\b[^|]*\|\s*(sh|bash|zsh)\b/i,
    pattern: "curl | sh",
    message: "Pipes remote script directly to a shell.",
  },
  {
    regex: /\bwget\b[^|]*\|\s*(sh|bash|zsh)\b/i,
    pattern: "wget | sh",
    message: "Pipes remote script directly to a shell.",
  },
  {
    regex: /\bdd\s+if=/,
    pattern: "dd",
    message: "Low-level disk write.",
  },
  {
    regex: /\bmkfs\b/,
    pattern: "mkfs",
    message: "Formats a filesystem.",
  },
  {
    regex: />\s*\/dev\/(sd|disk|nvme)/i,
    pattern: "> /dev/…",
    message: "Writes directly to a block device.",
  },
  {
    regex: /:\(\)\s*\{\s*:\|\s*:&\s*\}\s*;:/,
    pattern: "fork bomb",
    message: "Classic fork bomb pattern.",
  },
  {
    regex: /\bchmod\s+-R\s+777\b/,
    pattern: "chmod -R 777",
    message: "Grants world-writable permissions recursively.",
  },
];

export function detectDanger(command: string): DangerWarning[] {
  const warnings: DangerWarning[] = [];
  for (const rule of RULES) {
    if (rule.regex.test(command)) {
      warnings.push({ pattern: rule.pattern, message: rule.message });
    }
  }
  return warnings;
}
