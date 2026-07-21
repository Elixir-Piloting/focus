import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Play, Check, AppWindow, Globe, ArrowLeft, Bookmarks } from "@phosphor-icons/react";
import { Button } from "./components/Button";
import { DurationPicker } from "./components/DurationPicker";
import { BlockedApps } from "./components/BlockedApps";
import { BlockedWebsites } from "./components/BlockedWebsites";
import { SessionView } from "./components/SessionView";
import { SessionsList } from "./components/SessionsList";
import { ConfirmEndModal } from "./components/ConfirmEndModal";
import { useEarlyStopCounter } from "./hooks/useEarlyStopCounter";
import type { SessionState, SessionPreset } from "./types";

type View = "list" | "setup" | "session" | "complete";
type Tab = "apps" | "websites";

function App() {
  const [view, setView] = useState<View>("list");
  const [activeTab, setActiveTab] = useState<Tab>("apps");
  const [, setSessionState] = useState<SessionState | null>(null);
  const [currentPreset, setCurrentPreset] = useState<SessionPreset | null>(null);
  const [blockedApps, setBlockedApps] = useState<string[]>([]);
  const [blockedWebsites, setBlockedWebsites] = useState<string[]>([]);
  const [durationSecs, setDurationSecs] = useState(25 * 60);
  const [remaining, setRemaining] = useState(0);
  const [staleCleaned, setStaleCleaned] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [showConfirmEnd, setShowConfirmEnd] = useState(false);
  const [confirmEndLevel, setConfirmEndLevel] = useState(1);
  const completeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentPresetRef = useRef<SessionPreset | null>(null);
  const earlyStopCounter = useEarlyStopCounter();

  useEffect(() => {
    currentPresetRef.current = currentPreset;
  }, [currentPreset]);

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
      setShowConfirmEnd(false);
      setView("complete");
      setRemaining(0);
      completeTimerRef.current = setTimeout(() => {
        setView(currentPresetRef.current ? "setup" : "list");
      }, 4000);
    });

    const unlistenKilled = listen<string>("process-killed", (event) => {
      console.log("Killed process:", event.payload);
    });

    const unlistenStale = listen("stale-hosts-cleaned", () => {
      setStaleCleaned(true);
      setTimeout(() => setStaleCleaned(false), 5000);
      earlyStopCounter.increment();
    });

    return () => {
      unlistenTick.then((fn) => fn());
      unlistenEnd.then((fn) => fn());
      unlistenKilled.then((fn) => fn());
      unlistenStale.then((fn) => fn());
      if (completeTimerRef.current) clearTimeout(completeTimerRef.current);
    };
  }, [refreshState]);

  // Autosave (debounced) when editing a preset
  useEffect(() => {
    if (!currentPreset || view !== "setup") return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        await invoke("update_session", {
          id: currentPreset.id,
          name: currentPreset.name,
          blockedApps,
          blockedWebsites,
          durationSecs,
        });
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 1200);
      } catch (e) {
        console.error("Autosave failed:", e);
      }
    }, 800);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [currentPreset, blockedApps, blockedWebsites, durationSecs, view]);

  const handleStart = async () => {
    setError(null);
    setShowConfirmEnd(false);
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

  const handleStopClick = () => {
    setConfirmEndLevel(earlyStopCounter.levelForCount(earlyStopCounter.count));
    setShowConfirmEnd(true);
  };

  const handleConfirmEnd = async () => {
    earlyStopCounter.increment();
    setShowConfirmEnd(false);
    try {
      await invoke("stop_session");
    } catch (e) {
      console.error("Failed to stop session:", e);
    }
  };

  const handleCancelEnd = () => {
    setShowConfirmEnd(false);
  };

  const openSession = (preset: SessionPreset) => {
    setCurrentPreset(preset);
    setBlockedApps(preset.blocked_apps);
    setBlockedWebsites(preset.blocked_websites);
    setDurationSecs(preset.duration_secs);
    setView("setup");
  };

  const backToList = () => {
    // flush any pending save
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    if (currentPreset) {
      invoke("update_session", {
        id: currentPreset.id,
        name: currentPreset.name,
        blockedApps,
        blockedWebsites,
        durationSecs,
      }).catch((e) => console.error("Flush save failed:", e));
    }
    setView("list");
  };

  const hasItems = blockedApps.length > 0 || blockedWebsites.length > 0;

  return (
    <div className="max-w-[440px] mx-auto px-5 pb-12 min-h-screen">
      {staleCleaned && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-xl text-sm font-medium z-1000 max-w-[380px] text-center bg-accent/90 text-white [animation:toast-slide_240ms_cubic-bezier(0.4,0,0.2,1)] backdrop-blur-xl shadow-inset-md">
          Cleaned up stale hosts entries from a previous session.
        </div>
      )}

      {error && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-xl text-sm font-medium z-1000 max-w-[380px] text-center bg-danger/90 text-white cursor-pointer [animation:toast-slide_240ms_cubic-bezier(0.4,0,0.2,1)] backdrop-blur-xl shadow-inset-md"
          onClick={() => setError(null)}
        >
          {error}
        </div>
      )}

      {view === "list" && <SessionsList onOpenSession={openSession} />}

      {view === "setup" && currentPreset && (
        <div>
          <header className="sticky top-0 z-10 -mx-5 px-5 pt-4 pb-3 mb-6 bg-canvas flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <Button
                variant="ghost" size="sm" className="-ml-1.5"
                onClick={backToList}
                aria-label="Back to sessions"
              >
                <ArrowLeft size={20} weight="regular" />
              </Button>
              <h1 className="text-[20px] font-bold tracking-[-0.018em] text-ink leading-none truncate">
                {currentPreset.name}
              </h1>
              {savedFlash && (
                <span className="inline-flex items-center gap-1 text-[11px] text-success font-medium shrink-0">
                  <Check size={12} weight="bold" />
                  Saved
                </span>
              )}
            </div>
            <Button
              variant="primary" className="rounded-full px-4 py-2.5"
              onClick={handleStart}
              disabled={!hasItems}
            >
              <Play size={15} weight="fill" />
              Start
            </Button>
          </header>

          <DurationPicker value={durationSecs} onChange={setDurationSecs} />

          <div className="flex bg-black/5 dark:bg-white/10 rounded-full p-0.5 mb-5 shadow-inset-sm">
            <button
              className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border-0 cursor-pointer transition-all duration-200 ${
                activeTab === "apps"
                  ? "bg-black/12 dark:bg-white/12 text-ink shadow-inset-sm"
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
                  ? "bg-black/12 dark:bg-white/12 text-ink shadow-inset-sm"
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
        </div>
      )}

      {view === "session" && (
        <SessionView
          remaining={remaining}
          duration={durationSecs}
          blockedApps={blockedApps}
          blockedWebsites={blockedWebsites}
          onStop={handleStopClick}
        />
      )}

      {view === "session" && (
        <ConfirmEndModal
          open={showConfirmEnd}
          level={confirmEndLevel}
          onConfirm={handleConfirmEnd}
          onCancel={handleCancelEnd}
        />
      )}

      {view === "complete" && (
        <div className="text-center pt-24">
          <div className="w-16 h-16 rounded-full bg-success inline-flex items-center justify-center text-white mb-5 [animation:complete-pop_400ms_cubic-bezier(0.4,0,0.2,1)]">
            <Check size={32} weight="bold" />
          </div>
          <h2 className="text-[22px] font-bold tracking-[-0.018em] mb-1.5 text-ink">Session Complete</h2>
          <p className="text-[15px] text-ink-muted mb-7">Great work staying focused.</p>
          <Button
            variant="surface" size="lg"
            onClick={() => {
              if (completeTimerRef.current) clearTimeout(completeTimerRef.current);
              setView(currentPreset ? "setup" : "list");
            }}
          >
            <Bookmarks size={16} weight="regular" />
            Back to Session
          </Button>
        </div>
      )}
    </div>
  );
}

export default App;
