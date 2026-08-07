import { Howl, Howler } from "howler";

// 첫 터치/마우스다운에서 AudioContext를 미리 unlock —
// "가게 열기" click 이벤트 시점엔 이미 활성 상태라 지연 없이 재생된다.
function unlockEarly() {
  const ctx = Howler.ctx;
  if (ctx && ctx.state === "suspended") ctx.resume();
  document.removeEventListener("mousedown", unlockEarly, true);
  document.removeEventListener("touchstart", unlockEarly, true);
}
document.addEventListener("mousedown", unlockEarly, true);
document.addEventListener("touchstart", unlockEarly, true);

// start 는 HTMLAudioElement 직접 재생 — AudioContext unlock 불필요, 즉시 재생
const startAudio = new Audio("/sounds/sfx_start.mp3");
startAudio.volume = 0.6;
startAudio.preload = "auto";

const sfx = {
  tap:    new Howl({ src: ["/sounds/sfx_tap.mp3"],    volume: 0.35 }),
  reward: new Howl({ src: ["/sounds/sfx_reward.mp3"], volume: 0.7  }),
};

let bgm = null;
let bgmPrologue = null;
let bgmEnding = null;
// 효과음·음악을 따로 끈다 (S29). Howler.mute 는 전역이라 분리가 안 돼서 각각 관리한다.
// bgm 은 첫 재생 때 생성되므로, 그 전에 끈 상태도 기억했다가 생성 시점에 적용한다.
let bgmMuted = false;

function ensureBgm() {
  if (!bgm) {
    bgm = new Howl({
      src: ["/sounds/bgm_shop.ogg"],
      loop: true,
      volume: 0.2,
      html5: true,
      mute: bgmMuted,
    });
  }
  return bgm;
}

function ensureBgmPrologue() {
  if (!bgmPrologue) {
    bgmPrologue = new Howl({
      src: ["/sounds/bgm_prologue.ogg"],
      loop: true,
      volume: 0.25,
      html5: true,
      mute: bgmMuted,
      onloaderror(_, e) { console.error("[bgm_prologue] load error:", e); },
      onplayerror(_, e) { console.error("[bgm_prologue] play error:", e); },
      onplay() { console.log("[bgm_prologue] playing"); },
      onload() { console.log("[bgm_prologue] loaded"); },
    });
  }
  return bgmPrologue;
}

function ensureBgmEnding() {
  if (!bgmEnding) {
    bgmEnding = new Howl({
      src: ["/sounds/bgm_ending.ogg"],
      loop: true,
      volume: 0.25,
      mute: bgmMuted,
    });
  }
  return bgmEnding;
}

export const soundManager = {
  playSfx(key, { vary = false } = {}) {
    if (key === "start") {
      startAudio.currentTime = 0.2;
      startAudio.play().catch(() => {});
      return;
    }
    const s = sfx[key];
    if (!s) return;
    if (vary) s.rate(0.95 + Math.random() * 0.1);
    s.play();
  },

  playBgmPrologue() {
    const p = ensureBgmPrologue();
    if (p.playing()) return;
    // 엔딩 BGM 등이 재생 중이면 페이드아웃
    if (bgmEnding?.playing()) {
      bgmEnding.fade(bgmEnding.volume(), 0, 800);
      bgmEnding.once("fade", () => { bgmEnding.stop(); bgmEnding.volume(0.25); });
    }
    if (bgm?.playing()) {
      bgm.fade(bgm.volume(), 0, 800);
      bgm.once("fade", () => { bgm.stop(); bgm.volume(0.2); });
    }
    p.play();
  },

  playBgm() {
    const b = ensureBgm();
    if (b.playing()) return;
    // 프롤로그 BGM 이 재생 중이면 페이드아웃 후 전환
    if (bgmPrologue?.playing()) {
      bgmPrologue.fade(bgmPrologue.volume(), 0, 800);
      bgmPrologue.once("fade", () => {
        bgmPrologue.stop();
        bgmPrologue.volume(0.25); // 다음 재생을 위해 원래 볼륨 복원
        b.play();
      });
      return;
    }
    b.play();
  },

  playBgmEnding() {
    const e = ensureBgmEnding();
    if (e.playing()) return;
    // shop BGM 페이드아웃과 동시에 엔딩 BGM 즉시 재생
    if (bgm?.playing()) {
      bgm.fade(bgm.volume(), 0, 800);
      bgm.once("fade", () => { bgm.stop(); bgm.volume(0.2); });
    }
    e.play();
  },

  stopBgm() { bgm?.stop(); bgmPrologue?.stop(); bgmEnding?.stop(); },

  // 효과음만 끄기 — Howl 인스턴스들과 별도 <audio>(start) 를 함께 처리한다
  setSfxMute(muted) {
    Object.values(sfx).forEach((s) => s.mute(muted));
    startAudio.muted = muted;
  },

  // 음악만 끄기 — 아직 생성 전이면 플래그만 기억했다가 생성 시 적용
  setBgmMute(muted) {
    bgmMuted = muted;
    bgm?.mute(muted);
    bgmPrologue?.mute(muted);
    bgmEnding?.mute(muted);
  },
};
