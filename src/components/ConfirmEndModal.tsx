import { useState, useEffect, useRef } from "react";
import { Button } from "./Button";
import { Input } from "./Input";

interface Props {
  open: boolean;
  level: number;
  onConfirm: () => void;
  onCancel: () => void;
}

const SHORT = [
  "I am choosing to end my focus session early.",
  "I am ending my focus session before the timer completes.",
  "I acknowledge that I am cutting this focus session short.",
  "I am stopping my focus session before it naturally ends.",
];

const LONG = [
  "I am aware that I have already ended a session early today. I am choosing to end another session before it is complete.",
  "I understand that ending sessions early reduces their effectiveness. I still choose to end this focus session now.",
  "Consistency is key to building strong focus habits. I am choosing to break this session early anyway.",
];

const PARAGRAPHS = [
  "I have ended multiple sessions early today. Each time I stop early, I weaken my focus discipline and make it harder to build lasting concentration habits. I understand this, and I still choose to end this session before the timer completes. This decision is mine alone.",
  "Ending a focus session early means I am not getting the full benefit of my planned work time. Uninterrupted focus periods are essential for deep work and productivity. I have already ended several sessions early today. Despite knowing this, I am choosing to end this session now.",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickSentence(level: number): string {
  if (level >= 3) return pick(PARAGRAPHS);
  if (level === 2) return pick(LONG);
  return pick(SHORT);
}

export function ConfirmEndModal({ open, level, onConfirm, onCancel }: Props) {
  const [typed, setTyped] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [sentence] = useState(() => pickSentence(level));
  const inputRef = useRef<HTMLInputElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const needsDelay = level >= 2;
  const delaySecs = level >= 3 ? 30 : 10;
  const isMatch = typed.trim().toLowerCase() === sentence.trim().toLowerCase();
  const canConfirm = isMatch && (!needsDelay || countdown === 0);

  useEffect(() => {
    if (open) {
      setTyped("");
      setCountdown(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [open]);

  useEffect(() => {
    if (!open || !isMatch || !needsDelay) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setCountdown(0);
      return;
    }

    setCountdown(delaySecs);

    const id = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    intervalRef.current = id;

    return () => {
      clearInterval(id);
    };
  }, [open, isMatch, needsDelay, delaySecs]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const prompt =
    level >= 3
      ? "Type the paragraph below to end your session early:"
      : level === 2
        ? "Type the sentences below to end your session early:"
        : "Type the sentence below to end your session early:";

  const confirmLabel =
    needsDelay && countdown > 0 ? `End Session (${countdown}s)` : "End Session";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-6"
      onClick={onCancel}
    >
      <div
        className="bg-surface rounded-2xl w-full max-w-[420px] shadow-inset-lg p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-[17px] font-semibold text-ink mb-2">
          End Session Early
        </h2>

        <p className="text-[13px] text-ink-muted mb-3 leading-relaxed">
          {prompt}
        </p>

        <div className="bg-input rounded-lg px-3 py-2.5 mb-3 text-[13px] text-ink leading-relaxed select-none">
          {sentence}
        </div>

        <Input
          ref={inputRef}
          type="text"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          onPaste={(e) => e.preventDefault()}
          placeholder="Type here…"
          className="text-[13px] mb-3"
        />

        {needsDelay && countdown > 0 && isMatch && (
          <p className="text-[12px] text-ink-muted mb-3 text-center">
            Wait {countdown}s before you can end the session…
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button
            variant="ghost" size="md"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            variant="danger" size="md"
            onClick={canConfirm ? onConfirm : undefined}
            disabled={!canConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
