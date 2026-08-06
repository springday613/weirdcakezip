import { Howl, Howler } from "howler";

const sfx = {
  // start 는 html5 모드 — 첫 제스처에서 AudioContext 디코딩 없이 즉시 재생
  start:  new Howl({ src: ["/sounds/sfx_start.mp3"],  volume: 0.6, html5: true }),
  tap:    new Howl({ src: ["/sounds/sfx_tap.mp3"],    volume: 0.35 }),
  reward: new Howl({ src: ["/sounds/sfx_reward.mp3"], volume: 0.7  }),
};

let bgm = null;

export const soundManager = {
  playSfx(key, { vary = false } = {}) {
    const s = sfx[key];
    if (!s) return;
    if (vary) s.rate(0.95 + Math.random() * 0.1);
    s.play();
  },

  playBgm() {
    if (bgm?.playing()) return;
    if (!bgm) {
      bgm = new Howl({
        src: ["/sounds/bgm_shop.mp3"],
        loop: true,
        volume: 0.2,
        html5: true,
      });
    }
    bgm.play();
  },

  stopBgm() { bgm?.stop(); },

  setMute(muted) { Howler.mute(muted); },
};
