import { useState, useEffect, useRef } from "react";
import { X } from "@phosphor-icons/react";
import { Button } from "./Button";
import { Input } from "./Input";

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
        className="bg-surface rounded-2xl w-full max-w-[340px] shadow-inset-lg p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[17px] font-semibold text-ink">{title}</h2>
          <Button
            variant="ghost" size="sm" className="-mr-1 p-1 text-ink-faint hover:text-ink"
            onClick={onCancel}
            aria-label="Close"
          >
            <X size={18} weight="regular" />
          </Button>
        </div>
        <Input
          ref={inputRef}
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          className="mb-4"
        />
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost" size="md"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            variant="primary" size="md"
            onClick={submit}
            disabled={!value.trim()}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
