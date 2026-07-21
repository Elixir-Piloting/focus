import { Timer, Stop } from "@phosphor-icons/react";
import { Button } from "./Button";

interface Props {
  remaining: number;
  duration: number;
  blockedApps: string[];
  blockedWebsites: string[];
  onStop: () => void;
}

export function SessionView({
  remaining,
  duration,
  blockedApps,
  blockedWebsites,
  onStop,
}: Props) {
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const progress = duration > 0 ? ((duration - remaining) / duration) * 100 : 0;
  const circumference = 2 * Math.PI * 54;

  return (
    <div className="text-center pt-6">
      <div className="relative w-[200px] h-[200px] mx-auto mb-5">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          <circle
            cx="60"
            cy="60"
            r="54"
            className="fill-none stroke-separator"
            strokeWidth="3"
          />
          <circle
            cx="60"
            cy="60"
            r="54"
            className="fill-none stroke-accent"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress / 100)}
            style={{ transition: "stroke-dashoffset 500ms linear" }}
          />
        </svg>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <span className="text-[44px] font-bold tabular-nums tracking-[-0.02em] text-ink">
            {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
          </span>
        </div>
      </div>

      <p className="text-[15px] text-ink-muted mb-7 inline-flex items-center gap-1.5">
        <Timer size={14} weight="regular" />
        Focus session in progress
      </p>

      {(blockedApps.length > 0 || blockedWebsites.length > 0) && (
        <div className="bg-surface rounded-xl px-4 py-3.5 mb-7 text-left shadow-inset-md">
          {blockedApps.length > 0 && (
            <div className="mb-1.5 last:mb-0">
              <span className="text-xs font-semibold text-ink-muted tracking-wide">Apps </span>
              <span className="text-[13px] text-ink">{blockedApps.join(", ")}</span>
            </div>
          )}
          {blockedWebsites.length > 0 && (
            <div className="mb-1.5 last:mb-0">
              <span className="text-xs font-semibold text-ink-muted tracking-wide">Websites </span>
              <span className="text-[13px] text-ink">{blockedWebsites.join(", ")}</span>
            </div>
          )}
        </div>
      )}

      <Button
        variant="outline-danger" size="lg" className="w-full px-5 py-3 text-lg"
        onClick={onStop}
      >
        <Stop size={16} weight="fill" />
        End Session
      </Button>
    </div>
  );
}
