import { useState, useCallback } from "react";
import { soundManager } from "./utils/soundManager.js";

// 효과음·음악을 따로 기억한다 (S29). 구버전은 통합 키 하나만 썼으므로 그 값을 둘 다에 승계한다.
const SFX_KEY = "weirdcake-muted-sfx";
const BGM_KEY = "weirdcake-muted-bgm";
const LEGACY_KEY = "weirdcake-muted";

function read(key) {
  try {
    const v = localStorage.getItem(key);
    if (v != null) return v === "1";
    return localStorage.getItem(LEGACY_KEY) === "1"; // 마이그레이션
  } catch {
    return false;
  }
}

function write(key, value) {
  try { localStorage.setItem(key, value ? "1" : "0"); } catch {}
}

export default function useSfx() {
  const [sfxMuted, setSfxMuted] = useState(() => {
    const m = read(SFX_KEY);
    soundManager.setSfxMute(m);
    return m;
  });
  const [bgmMuted, setBgmMuted] = useState(() => {
    const m = read(BGM_KEY);
    soundManager.setBgmMute(m);
    return m;
  });

  const toggleSfx = useCallback(() => {
    setSfxMuted((prev) => {
      const next = !prev;
      soundManager.setSfxMute(next);
      write(SFX_KEY, next);
      return next;
    });
  }, []);

  const toggleBgm = useCallback(() => {
    setBgmMuted((prev) => {
      const next = !prev;
      soundManager.setBgmMute(next);
      write(BGM_KEY, next);
      return next;
    });
  }, []);

  return { sfxMuted, bgmMuted, toggleSfx, toggleBgm };
}
