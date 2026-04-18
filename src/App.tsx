import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getDb } from "@/lib/db";

type TableRow = { name: string };

function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");
  const [tables, setTables] = useState<string[]>([]);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const db = await getDb();
        const rows = await db.select<TableRow[]>(
          "SELECT name FROM sqlite_master WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%' ORDER BY name",
        );
        setTables(rows.map((r) => r.name));
      } catch (e) {
        setDbError(String(e));
      }
    })();
  }, []);

  async function greet() {
    setGreetMsg(await invoke("greet", { name }));
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-3xl font-semibold tracking-tight">Stash</h1>
      <p className="text-sm text-muted-foreground">
        Tauri + React + Tailwind + shadcn/ui — scaffold sanity check
      </p>

      <form
        className="flex gap-2 w-full max-w-sm"
        onSubmit={(e) => {
          e.preventDefault();
          greet();
        }}
      >
        <Input
          placeholder="Adınızı yazın..."
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
        />
        <Button type="submit">Greet</Button>
      </form>

      {greetMsg && (
        <p className="text-sm rounded-md bg-muted px-3 py-2">{greetMsg}</p>
      )}

      <section className="w-full max-w-sm text-sm border rounded-md p-4">
        <div className="font-medium mb-2">SQLite smoke test</div>
        {dbError ? (
          <div className="text-destructive">DB error: {dbError}</div>
        ) : tables.length === 0 ? (
          <div className="text-muted-foreground">Loading…</div>
        ) : (
          <ul className="list-disc list-inside text-muted-foreground">
            {tables.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

export default App;
