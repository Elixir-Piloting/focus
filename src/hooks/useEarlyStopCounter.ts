import { useState, useCallback } from "react";

const STORAGE_KEY = "focus_early_stops";

interface StoredData {
  date: string;
  count: number;
}

function getToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getInitialCount(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data: StoredData = JSON.parse(raw);
      if (data.date === getToday()) return data.count;
    }
  } catch {}
  return 0;
}

function persistCount(count: number) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: getToday(), count }));
}

export function useEarlyStopCounter() {
  const [count, setCount] = useState(getInitialCount);

  const increment = useCallback(() => {
    setCount((prev) => {
      const next = prev + 1;
      persistCount(next);
      return next;
    });
  }, []);

  const levelForCount = useCallback((c: number) => {
    if (c >= 2) return 3;
    if (c === 1) return 2;
    return 1;
  }, []);

  return { count, increment, levelForCount };
}
