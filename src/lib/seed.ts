import { createCategory } from "@/lib/categories";
import { createItem } from "@/lib/items";
import { setItemTags } from "@/lib/tags";
import { setItemVariables } from "@/lib/variables";
import type { ItemType, NewVariable } from "@/types";

// Starter packs shown on first launch (empty database only). Each pack
// becomes a category. Users pick which packs to load, and can freely edit
// or delete the seeded items afterwards — nothing here is special.

type PackVariable = Omit<NewVariable, "itemId">;

type PackItem = {
  type: ItemType;
  title: string;
  content: string;
  language?: string;
  description?: string;
  isFavorite?: boolean;
  tags?: string[];
  variables?: PackVariable[];
};

export type StarterPack = {
  id: string;
  name: string;
  icon: string;
  description: string;
  items: PackItem[];
};

export const STARTER_PACKS: StarterPack[] = [
  {
    id: "git",
    name: "Git",
    icon: "git-branch",
    description: "Everyday Git commands you always half-remember.",
    items: [
      {
        type: "command",
        title: "Undo last commit (keep changes)",
        content: "git reset --soft HEAD~1",
        language: "bash",
        description: "Move HEAD back one commit; staged changes are kept.",
        tags: ["git"],
      },
      {
        type: "command",
        title: "Create and switch to branch",
        content: "git checkout -b {{branch}}",
        language: "bash",
        description: "Start a new branch from the current one.",
        tags: ["git"],
        variables: [
          { name: "branch", label: "Branch name", fieldType: "text" },
        ],
      },
      {
        type: "command",
        title: "Amend last commit message",
        content: 'git commit --amend -m "{{message}}"',
        language: "bash",
        description: "Rewrite the most recent commit message.",
        tags: ["git"],
        variables: [
          { name: "message", label: "New message", fieldType: "text" },
        ],
      },
      {
        type: "command",
        title: "Pretty commit graph",
        content: "git log --oneline --graph --decorate --all",
        language: "bash",
        description: "Compact, visual history of every branch.",
        tags: ["git"],
      },
      {
        type: "command",
        title: "Discard all local changes",
        content: "git reset --hard HEAD",
        language: "bash",
        description: "Throw away every uncommitted change. Irreversible.",
        tags: ["git"],
      },
    ],
  },
  {
    id: "docker",
    name: "Docker",
    icon: "container",
    description: "Container management without the man pages.",
    items: [
      {
        type: "command",
        title: "Stop all running containers",
        content: "docker stop $(docker ps -q)",
        language: "bash",
        description: "Stops every currently running container.",
        tags: ["docker"],
      },
      {
        type: "command",
        title: "Remove stopped containers",
        content: "docker container prune -f",
        language: "bash",
        description: "Clean up all stopped containers.",
        tags: ["docker"],
      },
      {
        type: "command",
        title: "Shell into a container",
        content: "docker exec -it {{container}} /bin/sh",
        language: "bash",
        description: "Open an interactive shell inside a container.",
        tags: ["docker"],
        variables: [
          { name: "container", label: "Container name or ID", fieldType: "text" },
        ],
      },
      {
        type: "command",
        title: "Follow container logs",
        content: "docker logs -f {{container}}",
        language: "bash",
        description: "Stream a container's logs live.",
        tags: ["docker"],
        variables: [
          { name: "container", label: "Container name or ID", fieldType: "text" },
        ],
      },
      {
        type: "command",
        title: "Free up Docker disk space",
        content: "docker system prune -a --volumes -f",
        language: "bash",
        description: "Remove unused images, containers, and volumes.",
        tags: ["docker"],
      },
    ],
  },
  {
    id: "ffmpeg",
    name: "FFmpeg",
    icon: "film",
    description: "Convert, compress, and trim media files.",
    items: [
      {
        type: "command",
        title: "MP4 to GIF",
        content:
          "ffmpeg -i {{input}} -vf 'fps=12,scale=640:-1' -c:v gif {{output}}",
        language: "bash",
        description: "Optimized GIF at 12 fps, 640px wide.",
        tags: ["ffmpeg", "video"],
        variables: [
          { name: "input", label: "Input file", fieldType: "file" },
          {
            name: "output",
            label: "Output file",
            defaultValue: "out.gif",
            fieldType: "text",
          },
        ],
      },
      {
        type: "command",
        title: "Compress a video",
        content: "ffmpeg -i {{input}} -vcodec libx264 -crf 28 {{output}}",
        language: "bash",
        description: "Shrink a video with H.264. Higher CRF = smaller file.",
        tags: ["ffmpeg", "video"],
        variables: [
          { name: "input", label: "Input file", fieldType: "file" },
          {
            name: "output",
            label: "Output file",
            defaultValue: "compressed.mp4",
            fieldType: "text",
          },
        ],
      },
      {
        type: "command",
        title: "Extract audio from video",
        content: "ffmpeg -i {{input}} -vn -acodec copy {{output}}",
        language: "bash",
        description: "Pull the audio track out without re-encoding.",
        tags: ["ffmpeg", "audio"],
        variables: [
          { name: "input", label: "Input file", fieldType: "file" },
          {
            name: "output",
            label: "Output file",
            defaultValue: "audio.m4a",
            fieldType: "text",
          },
        ],
      },
      {
        type: "command",
        title: "Trim a clip",
        content:
          "ffmpeg -i {{input}} -ss {{start}} -to {{end}} -c copy {{output}}",
        language: "bash",
        description: "Cut a section out, e.g. start 00:00:10, end 00:00:30.",
        tags: ["ffmpeg", "video"],
        variables: [
          { name: "input", label: "Input file", fieldType: "file" },
          {
            name: "start",
            label: "Start (hh:mm:ss)",
            defaultValue: "00:00:00",
            fieldType: "text",
          },
          {
            name: "end",
            label: "End (hh:mm:ss)",
            defaultValue: "00:00:10",
            fieldType: "text",
          },
          {
            name: "output",
            label: "Output file",
            defaultValue: "clip.mp4",
            fieldType: "text",
          },
        ],
      },
    ],
  },
  {
    id: "macos",
    name: "macOS",
    icon: "cpu",
    description: "Handy system tweaks and shortcuts for your Mac.",
    items: [
      {
        type: "command",
        title: "Show hidden files in Finder",
        content:
          "defaults write com.apple.finder AppleShowAllFiles -bool true && killall Finder",
        language: "bash",
        description: "Reveal dotfiles. Set false to hide them again.",
        tags: ["macos"],
      },
      {
        type: "command",
        title: "Flush DNS cache",
        content:
          "sudo dscacheutil -flushcache && sudo killall -HUP mDNSResponder",
        language: "bash",
        description: "Fixes stale DNS after network changes.",
        tags: ["macos", "network"],
      },
      {
        type: "command",
        title: "Lock the screen",
        content: "pmset displaysleepnow",
        language: "bash",
        description: "Immediately sleep the display.",
        tags: ["macos"],
      },
      {
        type: "command",
        title: "Show a saved Wi-Fi password",
        content: 'security find-generic-password -wa "{{ssid}}"',
        language: "bash",
        description: "Print the password for a known Wi-Fi network.",
        tags: ["macos", "network"],
        variables: [
          { name: "ssid", label: "Wi-Fi network name", fieldType: "text" },
        ],
      },
    ],
  },
  {
    id: "ssh",
    name: "SSH",
    icon: "server",
    description: "Connections, keys, and tunnels.",
    items: [
      {
        type: "command",
        title: "Connect to a server",
        content: "ssh {{user}}@{{host}}",
        language: "bash",
        description: "Open an SSH session.",
        tags: ["ssh"],
        variables: [
          { name: "user", label: "Username", fieldType: "text" },
          { name: "host", label: "Host or IP", fieldType: "text" },
        ],
      },
      {
        type: "command",
        title: "Generate an SSH key",
        content: 'ssh-keygen -t ed25519 -C "{{email}}"',
        language: "bash",
        description: "Create a modern ed25519 key pair.",
        tags: ["ssh"],
        variables: [
          { name: "email", label: "Your email", fieldType: "text" },
        ],
      },
      {
        type: "command",
        title: "Copy public key to a server",
        content: "ssh-copy-id {{user}}@{{host}}",
        language: "bash",
        description: "Enable passwordless login.",
        tags: ["ssh"],
        variables: [
          { name: "user", label: "Username", fieldType: "text" },
          { name: "host", label: "Host or IP", fieldType: "text" },
        ],
      },
      {
        type: "command",
        title: "Copy a file to a server",
        content: "scp {{localfile}} {{user}}@{{host}}:{{remotepath}}",
        language: "bash",
        description: "Securely copy a local file to a remote path.",
        tags: ["ssh"],
        variables: [
          { name: "localfile", label: "Local file", fieldType: "file" },
          { name: "user", label: "Username", fieldType: "text" },
          { name: "host", label: "Host or IP", fieldType: "text" },
          {
            name: "remotepath",
            label: "Remote path",
            defaultValue: "~/",
            fieldType: "text",
          },
        ],
      },
      {
        type: "command",
        title: "Local port forward (tunnel)",
        content:
          "ssh -L {{localport}}:localhost:{{remoteport}} {{user}}@{{host}}",
        language: "bash",
        description: "Forward a remote port to your machine.",
        tags: ["ssh"],
        variables: [
          {
            name: "localport",
            label: "Local port",
            defaultValue: "8080",
            fieldType: "text",
          },
          {
            name: "remoteport",
            label: "Remote port",
            defaultValue: "80",
            fieldType: "text",
          },
          { name: "user", label: "Username", fieldType: "text" },
          { name: "host", label: "Host or IP", fieldType: "text" },
        ],
      },
    ],
  },
  {
    id: "ai",
    name: "AI Prompts",
    icon: "brain",
    description: "Reusable prompts for Claude, ChatGPT, and friends.",
    items: [
      {
        type: "prompt",
        title: "Code review: senior engineer",
        content:
          "You are a senior engineer reviewing the following {{language}} code. Focus on correctness, readability, and obvious performance issues. Respond with concrete suggestions, not platitudes.\n\n```{{language}}\n{{code}}\n```",
        language: "markdown",
        description: "Opinionated code review prompt.",
        tags: ["prompt", "review"],
        variables: [
          {
            name: "language",
            label: "Language",
            fieldType: "select",
            options: ["python", "typescript", "rust", "go", "sql"],
            defaultValue: "typescript",
          },
          { name: "code", label: "Code", fieldType: "textarea" },
        ],
      },
      {
        type: "prompt",
        title: "Explain this code",
        content:
          "Explain what the following code does, step by step, for someone unfamiliar with it. Keep it plain and concise.\n\n{{code}}",
        language: "markdown",
        description: "Turn unfamiliar code into a plain explanation.",
        tags: ["prompt"],
        variables: [{ name: "code", label: "Code", fieldType: "textarea" }],
      },
      {
        type: "prompt",
        title: "Improve writing",
        content:
          "Rewrite the following text to be clearer and more concise, keeping the original meaning and tone. Return only the rewritten text.\n\n{{text}}",
        language: "markdown",
        description: "Tighten up any piece of writing.",
        tags: ["prompt", "writing"],
        variables: [{ name: "text", label: "Text", fieldType: "textarea" }],
      },
      {
        type: "prompt",
        title: "Write a commit message",
        content:
          "Write a concise Conventional Commits message for the following diff. One line, no body unless necessary.\n\n{{diff}}",
        language: "markdown",
        description: "Generate a commit message from a diff.",
        tags: ["prompt", "git"],
        variables: [{ name: "diff", label: "Diff", fieldType: "textarea" }],
      },
    ],
  },
  {
    id: "sql",
    name: "SQL Snippets",
    icon: "database",
    description: "Query patterns worth keeping around.",
    items: [
      {
        type: "snippet",
        title: "Find duplicate rows",
        content:
          "SELECT email, COUNT(*) AS n\nFROM users\nGROUP BY email\nHAVING COUNT(*) > 1;",
        language: "sql",
        description: "List values that appear more than once.",
        tags: ["sql"],
      },
      {
        type: "snippet",
        title: "Top N rows per group",
        content:
          "SELECT *\nFROM (\n  SELECT *,\n    ROW_NUMBER() OVER (\n      PARTITION BY category_id ORDER BY created_at DESC\n    ) AS rn\n  FROM items\n) t\nWHERE rn <= 3;",
        language: "sql",
        description: "Most recent 3 rows in each group, via ROW_NUMBER().",
        tags: ["sql"],
      },
      {
        type: "snippet",
        title: "Running total",
        content:
          "SELECT\n  created_at,\n  amount,\n  SUM(amount) OVER (ORDER BY created_at) AS running_total\nFROM transactions;",
        language: "sql",
        description: "Cumulative sum with a window function.",
        tags: ["sql"],
      },
      {
        type: "snippet",
        title: "Delete duplicates, keep one",
        content:
          "DELETE FROM users\nWHERE id NOT IN (\n  SELECT MIN(id)\n  FROM users\n  GROUP BY email\n);",
        language: "sql",
        description: "Keep the lowest id for each duplicate group.",
        tags: ["sql"],
      },
    ],
  },
];

// Insert the chosen starter packs. Safe to call only on an empty database.
export async function seedPacks(packIds: string[]): Promise<void> {
  let sortOrder = 0;
  for (const pack of STARTER_PACKS) {
    if (!packIds.includes(pack.id)) continue;
    const category = await createCategory({
      name: pack.name,
      icon: pack.icon,
      sortOrder: sortOrder++,
    });
    for (const item of pack.items) {
      const created = await createItem({
        type: item.type,
        title: item.title,
        content: item.content,
        language: item.language ?? null,
        description: item.description ?? null,
        categoryId: category.id,
        isFavorite: item.isFavorite ?? false,
      });
      if (item.tags && item.tags.length > 0) {
        await setItemTags(created.id, item.tags);
      }
      if (item.variables && item.variables.length > 0) {
        await setItemVariables(created.id, item.variables);
      }
    }
  }
}
