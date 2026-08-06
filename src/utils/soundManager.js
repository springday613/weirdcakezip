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
// 효과음·음악을 따로 끈다 (S29). Howler.mute 는 전역이라 분리가 안 돼서 각각 관리한다.
// bgm 은 첫 재생 때 생성되므로, 그 전에 끈 상태도 기억했다가 생성 시점에 적용한다.
let bgmMuted = false;

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

  playBgm() {
    if (bgm?.playing()) return;
    if (!bgm) {
      bgm = new Howl({
        src: ["/sounds/bgm_shop.ogg"],
        loop: true,
        volume: 0.2,
        html5: true,
        mute: bgmMuted,        // 켜기 전에 이미 꺼 뒀다면 그대로 생성
      });
    }
    bgm.play();
  },

  stopBgm() { bgm?.stop(); },

  // 효과음만 끄기 — Howl 인스턴스들과 별도 <audio>(start) 를 함께 처리한다
  setSfxMute(muted) {
    Object.values(sfx).forEach((s) => s.mute(muted));
    startAudio.muted = muted;
  },

  // 음악만 끄기 — 아직 생성 전이면 플래그만 기억했다가 생성 시 적용
  setBgmMute(muted) {
    bgmMuted = muted;
    bgm?.mute(muted);
  },
};
