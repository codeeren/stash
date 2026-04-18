import { createCategory } from "@/lib/categories";
import { createItem } from "@/lib/items";
import { setItemTags } from "@/lib/tags";
import { setItemVariables } from "@/lib/variables";

export async function seedSampleData(): Promise<void> {
  const devops = await createCategory({
    name: "DevOps",
    icon: "🛠",
    sortOrder: 0,
  });
  const ai = await createCategory({
    name: "AI Prompts",
    icon: "🧠",
    sortOrder: 1,
  });
  const web = await createCategory({
    name: "Web",
    icon: "🌐",
    sortOrder: 2,
  });

  const ffmpeg = await createItem({
    type: "command",
    title: "ffmpeg: MP4 → GIF",
    content:
      "ffmpeg -i {{input}} -vf 'fps=12,scale=640:-1' -c:v gif {{output}}",
    language: "bash",
    description: "Convert an MP4 to an optimized GIF at 12 fps, width 640px.",
    categoryId: devops.id,
    isFavorite: true,
  });
  await setItemTags(ffmpeg.id, ["video", "ffmpeg"]);
  await setItemVariables(ffmpeg.id, [
    { name: "input", label: "Input file", fieldType: "file" },
    {
      name: "output",
      label: "Output file",
      defaultValue: "out.gif",
      fieldType: "text",
    },
  ]);

  const rsync = await createItem({
    type: "command",
    title: "rsync: dry-run mirror",
    content:
      "rsync -avn --delete {{source}}/ {{destination}}/",
    language: "bash",
    description:
      "Preview a one-way mirror sync (dry-run). Remove -n to apply.",
    categoryId: devops.id,
  });
  await setItemTags(rsync.id, ["backup", "sync"]);
  await setItemVariables(rsync.id, [
    { name: "source", label: "Source directory", fieldType: "text" },
    { name: "destination", label: "Destination directory", fieldType: "text" },
  ]);

  const codeReview = await createItem({
    type: "prompt",
    title: "Code review: senior engineer",
    content:
      "You are a senior engineer reviewing the following {{language}} code. Focus on correctness, readability, and obvious performance issues. Respond with concrete suggestions, not platitudes.\n\n```{{language}}\n{{code}}\n```",
    language: "markdown",
    description: "Opinionated code review prompt. Pair with a capable model.",
    categoryId: ai.id,
    isFavorite: true,
  });
  await setItemTags(codeReview.id, ["review", "claude"]);
  await setItemVariables(codeReview.id, [
    {
      name: "language",
      label: "Language",
      fieldType: "select",
      options: ["python", "typescript", "rust", "go", "sql"],
      defaultValue: "typescript",
    },
    { name: "code", label: "Code", fieldType: "textarea" },
  ]);

  const flexCenter = await createItem({
    type: "snippet",
    title: "CSS: flex center",
    content: ".center {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n}",
    language: "css",
    description: "The universal flex centering snippet.",
    categoryId: web.id,
  });
  await setItemTags(flexCenter.id, ["css", "layout"]);

  await createItem({
    type: "note",
    title: "Stash roadmap",
    content:
      "v0.1 — MVP (CRUD, FTS, execute with confirmation)\nv0.2 — AI integration\nv0.3 — Sync\nv0.4 — Plugin system",
    description: "Public roadmap copied from CLAUDE.md.",
    categoryId: null,
  });
}
