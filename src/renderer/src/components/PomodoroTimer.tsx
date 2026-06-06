import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { JiraTicket } from "../../../shared/ipc";

interface Props {
  activeTicket: JiraTicket | null;
  today: string;
  onSessionRecorded: () => void;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function PomodoroTimer({ activeTicket, today, onSessionRecorded }: Props): JSX.Element {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [todayTotal, setTodayTotal] = useState(0);
  const startedAtRef = useRef<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadTodayTotal = useCallback(async () => {
    const total = await window.ogar.sumTodaySeconds(today);
    setTodayTotal(total);
  }, [today]);

  useEffect(() => {
    void loadTodayTotal();
  }, [loadTodayTotal]);

  const start = useCallback(() => {
    if (!activeTicket) return;
    startedAtRef.current = new Date().toISOString();
    setElapsed(0);
    setRunning(true);
    intervalRef.current = setInterval(() => {
      setElapsed((e) => e + 1);
    }, 1000);
  }, [activeTicket]);

  const stop = useCallback(async () => {
    if (!running || !startedAtRef.current || !activeTicket) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);

    await window.ogar.recordWorkSession({
      ticketKey: activeTicket.key,
      startedAt: startedAtRef.current,
      endedAt: new Date().toISOString(),
    });

    startedAtRef.current = null;
    setElapsed(0);
    await loadTodayTotal();
    onSessionRecorded();
  }, [running, activeTicket, loadTodayTotal, onSessionRecorded]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  if (!activeTicket) {
    return (
      <div className="w-full max-w-lg rounded-md border border-border p-4 text-sm text-muted-foreground">
        Select an active ticket to start tracking time.
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg rounded-md border border-border p-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Pomodoro timer · {activeTicket.key}</span>
          {running && (
            <span className="font-mono text-2xl font-semibold tabular-nums text-primary">
              {formatDuration(elapsed)}
            </span>
          )}
          {!running && todayTotal > 0 && (
            <span className="text-xs text-muted-foreground">
              Today: {formatDuration(todayTotal)} tracked
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {!running ? (
            <Button size="sm" onClick={start}>
              Start
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => void stop()}>
              Stop
            </Button>
          )}
        </div>
      </div>
      {running && todayTotal > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          Today: {formatDuration(todayTotal)} tracked before this session
        </p>
      )}
    </div>
  );
}
