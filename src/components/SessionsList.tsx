import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Plus, Clock, Trash, Play } from "@phosphor-icons/react";
import { NameModal } from "./NameModal";
import type { SessionPreset } from "../types";

interface Props {
  onOpenSession: (preset: SessionPreset) => void;
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts * 1000);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (sameDay) return `Today, ${time}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday, ${time}`;
  return `${d.toLocaleDateString([], { month: "short", day: "numeric" })}, ${time}`;
}

function formatDuration(secs: number): string {
  const m = Math.round(secs / 60);
  return `${m}m`;
}

export function SessionsList({ onOpenSession }: Props) {
  const [sessions, setSessions] = useState<SessionPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const refresh = async () => {
    try {
      const list = await invoke<SessionPreset[]>("list_sessions");
      setSessions(list);
    } catch (e) {
      console.error("Failed to load sessions:", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleDelete = async (id: number) => {
    try {
      await invoke("delete_session", { id });
      refresh();
    } catch (e) {
      console.error("Failed to delete session:", e);
    }
  };

  const handleCreate = async (name: string) => {
    try {
      const id = await invoke<number>("save_session", {
        name,
        blockedApps: [],
        blockedWebsites: [],
        durationSecs: 25 * 60,
      });
      setModalOpen(false);
      onOpenSession({
        id,
        name,
        blocked_apps: [],
        blocked_websites: [],
        duration_secs: 25 * 60,
        created_at: 0,
      });
    } catch (e) {
      console.error("Failed to create session:", e);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-10 -mx-5 px-5 pt-4 pb-3 bg-canvas flex items-center justify-between">
        <h1 className="text-[28px] font-bold tracking-[-0.022em] text-ink leading-none">Focus</h1>
        <button
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-accent text-white text-sm font-semibold rounded-full border-0 cursor-pointer transition-colors duration-150 hover:bg-accent-hover active:bg-accent-pressed"
          onClick={() => setModalOpen(true)}
        >
          <Plus size={15} weight="bold" />
          New
        </button>
      </header>

      <div className="flex-1 overflow-y-auto">
        <span className="block text-[11px] font-semibold text-ink-muted uppercase tracking-[0.06em] mb-3 px-1">
          Saved Sessions
        </span>

        {loading && (
          <div className="text-center text-ink-muted text-sm py-8">Loading…</div>
        )}

        {!loading && sessions.length === 0 && (
          <div className="text-center py-16">
            <p className="text-ink-muted text-sm mb-1">No saved sessions yet</p>
            <p className="text-ink-faint text-xs">Tap New to create one</p>
          </div>
        )}

        {!loading && sessions.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {sessions.map((s) => (
              <div
                key={s.id}
                className="group bg-surface rounded-xl px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-hover transition-colors duration-150"
                onClick={() => onOpenSession(s)}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-medium text-ink truncate">{s.name}</div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-ink-muted">
                    <span className="inline-flex items-center gap-1">
                      <Clock size={11} weight="regular" />
                      {formatDuration(s.duration_secs)}
                    </span>
                    <span>·</span>
                    <span>
                      {s.blocked_apps.length} app{s.blocked_apps.length !== 1 ? "s" : ""}
                    </span>
                    <span>·</span>
                    <span>
                      {s.blocked_websites.length} site{s.blocked_websites.length !== 1 ? "s" : ""}
                    </span>
                    <span>·</span>
                    <span>{formatTimestamp(s.created_at)}</span>
                  </div>
                </div>
                <button
                  className="p-1.5 text-ink-faint hover:text-danger rounded-lg cursor-pointer border-0 bg-transparent opacity-0 group-hover:opacity-100 transition-all duration-150"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(s.id);
                  }}
                  aria-label="Delete session"
                >
                  <Trash size={16} weight="regular" />
                </button>
                <div className="p-1.5 text-ink-faint">
                  <Play size={14} weight="fill" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <NameModal
        open={modalOpen}
        title="New Session"
        placeholder="Session name"
        confirmLabel="Create"
        onConfirm={handleCreate}
        onCancel={() => setModalOpen(false)}
      />
    </div>
  );
}
