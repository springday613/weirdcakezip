import { useState, useCallback } from "react";
import { soundManager } from "./utils/soundManager.js";

const STORAGE_KEY = "weirdcake-muted";

function readMuted() {
  try { return localStorage.getItem(STORAGE_KEY) === "1"; }
  catch { return false; }
}

export default function useSfx() {
  const [muted, setMuted] = useState(() => {
    const m = readMuted();
    soundManager.setMute(m);
    return m;
  });

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      soundManager.setMute(next);
      try { localStorage.setItem(STORAGE_KEY, next ? "1" : "0"); } catch {}
      return next;
    });
  }, []);

  return { muted, toggleMute };
}
