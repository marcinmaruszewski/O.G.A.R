import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { AppInfo } from "../../shared/ipc";

export default function App(): JSX.Element {
  const [info, setInfo] = useState<AppInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setInfo(await window.ogar.getAppInfo());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background text-foreground">
      <h1 className="text-4xl font-bold tracking-tight">{info?.name ?? "Loading…"}</h1>
      <p className="text-muted-foreground">
        {error
          ? `Error: ${error}`
          : info
            ? `Connected to local database · schema version ${info.schemaVersion}`
            : "Reading from the local database…"}
      </p>
      <Button onClick={() => void load()}>Refresh from database</Button>
    </div>
  );
}
