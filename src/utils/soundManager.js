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
      });
    }
    bgm.play();
  },

  stopBgm() { bgm?.stop(); },

  setMute(muted) { Howler.mute(muted); startAudio.muted = muted; },
};
