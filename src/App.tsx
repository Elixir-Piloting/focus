import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Crosshair, Play, ArrowsClockwise, Check, AppWindow, Globe } from "@phosphor-icons/react";
import { DurationPicker } from "./components/DurationPicker";
import { BlockedApps } from "./components/BlockedApps";
import { BlockedWebsites } from "./components/BlockedWebsites";
import { SessionView } from "./components/SessionView";
import type { SessionState } from "./types";

type View = "setup" | "session" | "complete";
type Tab = "apps" | "websites";

function App() {
  const [view, setView] = useState<View>("setup");
  const [activeTab, setActiveTab] = useState<Tab>("apps");
  const [, setSessionState] = useState<SessionState | null>(null);
  const [blockedApps, setBlockedApps] = useState<string[]>([]);
  const [blockedWebsites, setBlockedWebsites] = useState<string[]>([]);
  const [durationSecs, setDurationSecs] = useState(25 * 60);
  const [remaining, setRemaining] = useState(0);
  const [staleCleaned, setStaleCleaned] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const completeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshState = useCallback(async () => {
    try {
      const state = await invoke<SessionState>("get_session_state");
      setSessionState(state);
      if (state.status === "Active") {
        setView("session");
        setRemaining(state.remaining_secs);
        setBlockedApps(state.blocked_apps);
        setBlockedWebsites(state.blocked_websites);
      }
    } catch (e) {
      console.error("Failed to get session state:", e);
    }
  }, []);

  useEffect(() => {
    refreshState();

    const unlistenTick = listen<number>("session-tick", (event) => {
      setRemaining(event.payload);
    });

    const unlistenEnd = listen("session-ended", () => {
      setView("complete");
      setRemaining(0);
      completeTimerRef.current = setTimeout(() => {
        setView("setup");
      }, 4000);
    });

    const unlistenKilled = listen<string>("process-killed", (event) => {
      console.log("Killed process:", event.payload);
    });

    const unlistenStale = listen("stale-hosts-cleaned", () => {
      setStaleCleaned(true);
      setTimeout(() => setStaleCleaned(false), 5000);
    });

    return () => {
      unlistenTick.then((fn) => fn());
      unlistenEnd.then((fn) => fn());
      unlistenKilled.then((fn) => fn());
      unlistenStale.then((fn) => fn());
      if (completeTimerRef.current) clearTimeout(completeTimerRef.current);
    };
  }, [refreshState]);

  const handleStart = async () => {
    setError(null);
    try {
      await invoke("start_session", {
        blockedApps,
        blockedWebsites,
        durationSecs,
      });
      setRemaining(durationSecs);
      setView("session");
    } catch (e) {
      setError(String(e));
    }
  };

  const handleStop = async () => {
    try {
      await invoke("stop_session");
    } catch (e) {
      console.error("Failed to stop session:", e);
    }
  };

  return (
    <div className="max-w-[440px] mx-auto px-5 pt-10 pb-12 min-h-screen">
      {staleCleaned && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-xl text-sm font-medium z-1000 max-w-[380px] text-center bg-accent/90 text-white [animation:toast-slide_240ms_cubic-bezier(0.4,0,0.2,1)] backdrop-blur-xl">
          Cleaned up stale hosts entries from a previous session.
        </div>
      )}

      {error && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-xl text-sm font-medium z-1000 max-w-[380px] text-center bg-danger/90 text-white cursor-pointer [animation:toast-slide_240ms_cubic-bezier(0.4,0,0.2,1)] backdrop-blur-xl"
          onClick={() => setError(null)}
        >
          {error}
        </div>
      )}

      {view === "setup" && (
        <div>
          <header className="text-center mb-9">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent text-white mb-3.5 shadow-lg shadow-accent/30">
              <Crosshair size={28} weight="bold" />
            </div>
            <h1 className="text-[28px] font-bold tracking-[-0.022em] text-ink">Focus</h1>
            <p className="text-[15px] text-ink-muted mt-1.5 tracking-[-0.005em]">
              Block distractions. Get things done.
            </p>
          </header>

          <DurationPicker value={durationSecs} onChange={setDurationSecs} />

          <div className="flex bg-black/5 dark:bg-white/10 rounded-full p-0.5 mb-5">
            <button
              className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border-0 cursor-pointer transition-all duration-200 ${
                activeTab === "apps"
                  ? "bg-black/12 dark:bg-white/12 text-ink"
                  : "bg-transparent text-ink-muted hover:text-ink"
              }`}
              onClick={() => setActiveTab("apps")}
            >
              <AppWindow size={14} weight="regular" />
              Apps
            </button>
            <button
              className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border-0 cursor-pointer transition-all duration-200 ${
                activeTab === "websites"
                  ? "bg-black/12 dark:bg-white/12 text-ink"
                  : "bg-transparent text-ink-muted hover:text-ink"
              }`}
              onClick={() => setActiveTab("websites")}
            >
              <Globe size={14} weight="regular" />
              Websites
            </button>
          </div>

          {activeTab === "apps" && (
            <BlockedApps apps={blockedApps} onChange={setBlockedApps} />
          )}

          {activeTab === "websites" && (
            <BlockedWebsites websites={blockedWebsites} onChange={setBlockedWebsites} />
          )}

          <button
            className="inline-flex items-center justify-center gap-1.5 w-full px-5 py-3 rounded-xl bg-accent text-white text-lg font-semibold tracking-[-0.01em] border-0 cursor-pointer transition-colors duration-150 hover:bg-accent-hover active:bg-accent-pressed disabled:bg-input disabled:text-ink-faint disabled:cursor-default"
            onClick={handleStart}
            disabled={blockedApps.length === 0 && blockedWebsites.length === 0}
          >
            <Play size={18} weight="fill" />
            Start Session
          </button>
        </div>
      )}

      {view === "session" && (
        <SessionView
          remaining={remaining}
          duration={durationSecs}
          blockedApps={blockedApps}
          blockedWebsites={blockedWebsites}
          onStop={handleStop}
        />
      )}

      {view === "complete" && (
        <div className="text-center pt-24">
          <div className="w-16 h-16 rounded-full bg-success inline-flex items-center justify-center text-white mb-5 [animation:complete-pop_400ms_cubic-bezier(0.4,0,0.2,1)]">
            <Check size={32} weight="bold" />
          </div>
          <h2 className="text-[22px] font-bold tracking-[-0.018em] mb-1.5 text-ink">Session Complete</h2>
          <p className="text-[15px] text-ink-muted mb-7">Great work staying focused.</p>
          <button
            className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-surface text-accent text-[15px] font-medium border-0 cursor-pointer hover:bg-hover transition-colors duration-150"
            onClick={() => {
              if (completeTimerRef.current) clearTimeout(completeTimerRef.current);
              setView("setup");
            }}
          >
            <ArrowsClockwise size={16} weight="regular" />
            New Session
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
