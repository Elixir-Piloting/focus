import { useState } from "react";

const PRESETS = [
  { label: "25", mins: 25 },
  { label: "50", mins: 50 },
  { label: "90", mins: 90 },
];

interface Props {
  value: number;
  onChange: (secs: number) => void;
}

export function DurationPicker({ value, onChange }: Props) {
  const [customMode, setCustomMode] = useState(false);
  const [customMins, setCustomMins] = useState(Math.round(value / 60));

  const selectPreset = (mins: number) => {
    setCustomMode(false);
    onChange(mins * 60);
  };

  const applyCustom = () => {
    const mins = Math.max(1, Math.min(480, customMins));
    setCustomMins(mins);
    onChange(mins * 60);
  };

  const currentMins = Math.round(value / 60);

  return (
    <div className="mb-7">
      <div className="flex bg-black/5 dark:bg-white/10 rounded-full p-0.5">
        {PRESETS.map((p) => (
          <button
            key={p.mins}
            className={`flex-1 px-3 py-1.5 rounded-full text-sm font-medium border-0 cursor-pointer transition-all duration-200 ${
              !customMode && value === p.mins * 60
                ? "bg-black/12 dark:bg-white/12 text-ink"
                : "bg-transparent text-ink-muted hover:text-ink"
            }`}
            onClick={() => selectPreset(p.mins)}
          >
            {p.label}
          </button>
        ))}
        <button
          className={`flex-1 px-3 py-1.5 rounded-full text-sm font-medium border-0 cursor-pointer transition-all duration-200 ${
            customMode
              ? "bg-black/12 dark:bg-white/12 text-ink"
              : "bg-transparent text-ink-muted hover:text-ink"
          }`}
          onClick={() => setCustomMode(true)}
        >
          Custom
        </button>
      </div>
      <div className="h-[52px] mt-2.5 flex items-center justify-center">
        {customMode ? (
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={480}
              value={customMins}
              onChange={(e) => setCustomMins(Number(e.target.value))}
              onBlur={applyCustom}
              onKeyDown={(e) => e.key === "Enter" && applyCustom()}
              className="w-[80px] text-center border-0 outline-none bg-input rounded-lg px-3 py-1.5 text-[20px] font-semibold text-ink focus:bg-surface focus:ring-2 focus:ring-accent"
            />
            <span className="text-[17px] text-ink-muted">minutes</span>
          </div>
        ) : (
          <span className="text-[20px] font-semibold text-ink">
            {currentMins} minute{currentMins !== 1 ? "s" : ""}
          </span>
        )}
      </div>
    </div>
  );
}
