import { useState, useEffect, useRef } from "react";
import { X } from "@phosphor-icons/react";

interface Props {
  open: boolean;
  title: string;
  initialValue?: string;
  placeholder?: string;
  confirmLabel: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export function NameModal({
  open,
  title,
  initialValue = "",
  placeholder,
  confirmLabel,
  onConfirm,
  onCancel,
}: Props) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setValue(initialValue);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 30);
    }
  }, [open, initialValue]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const submit = () => {
    const trimmed = value.trim();
    if (trimmed) onConfirm(trimmed);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-6"
      onClick={onCancel}
    >
      <div
        className="bg-surface rounded-2xl w-full max-w-[340px] shadow-2xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[17px] font-semibold text-ink">{title}</h2>
          <button
            className="p-1 -mr-1 text-ink-faint hover:text-ink rounded-lg cursor-pointer border-0 bg-transparent transition-colors duration-150"
            onClick={onCancel}
            aria-label="Close"
          >
            <X size={18} weight="regular" />
          </button>
        </div>
        <input
          ref={inputRef}
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          className="w-full border-0 outline-none bg-input rounded-lg px-3 py-2.5 text-[15px] text-ink placeholder:text-ink-faint focus:bg-surface focus:ring-2 focus:ring-accent mb-4"
        />
        <div className="flex justify-end gap-2">
          <button
            className="px-4 py-2 rounded-lg text-ink-muted text-sm font-medium border-0 cursor-pointer hover:bg-input bg-transparent transition-colors duration-150"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold border-0 cursor-pointer hover:bg-accent-hover disabled:bg-input disabled:text-ink-faint disabled:cursor-default transition-colors duration-150"
            onClick={submit}
            disabled={!value.trim()}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
