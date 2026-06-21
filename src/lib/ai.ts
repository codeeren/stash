import { invoke } from "@tauri-apps/api/core";
import type { ItemType } from "@/types";

export type DetectedCli = {
  id: string;
  name: string;
  path: string;
  found: boolean;
  install_hint: string;
};

export async function detectClis(): Promise<DetectedCli[]> {
  return invoke<DetectedCli[]>("ai_detect");
}

// What the model is asked to produce — mirrors the item fields we fill.
export type GeneratedItem = {
  type: ItemType;
  title: string;
  content: string;
  description: string;
  tags: string[];
};

const SYSTEM = `You generate exactly one "item" for Stash, a macOS hub that stores terminal commands, AI prompts, code snippets, and notes.

Return ONLY a JSON object — no prose, no markdown, no code fences — with these keys:
- "type": one of "command", "prompt", "snippet", "note"
- "title": a short, human title (max ~6 words)
- "content": the item body itself. For a command, the shell command(s). For a prompt, the prompt text. For a snippet, the code. Use {{variable_name}} placeholders (double braces, snake_case) for any value the user must fill in — file paths, names, ports, URLs, etc. Never invent a real path or value; use a placeholder.
- "description": one short sentence describing what it does
- "tags": array of 1-4 lowercase tags

Output JUST the JSON object.`;

function buildPrompt(request: string): string {
  return `${SYSTEM}\n\nUser request:\n${request}`;
}

// Pull the JSON object out of the model's reply, tolerating stray prose or
// ```json fences some CLIs add.
function parseGenerated(raw: string): GeneratedItem {
  let text = raw.trim();
  // strip code fences if present
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
  // otherwise grab the first {...} block
  if (!text.startsWith("{")) {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      text = text.slice(start, end + 1);
    }
  }
  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(text);
  } catch {
    throw new Error("The AI reply wasn't valid JSON. Try rephrasing.");
  }

  const type = String(obj.type ?? "command") as ItemType;
  const valid: ItemType[] = ["command", "prompt", "snippet", "note"];
  return {
    type: valid.includes(type) ? type : "command",
    title: String(obj.title ?? "").trim(),
    content: String(obj.content ?? "").trim(),
    description: String(obj.description ?? "").trim(),
    tags: Array.isArray(obj.tags)
      ? obj.tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean)
      : [],
  };
}

export async function generateItem(
  provider: string,
  binPath: string,
  request: string,
): Promise<GeneratedItem> {
  const raw = await invoke<string>("ai_generate", {
    provider,
    binPath,
    prompt: buildPrompt(request),
  });
  return parseGenerated(raw);
}
