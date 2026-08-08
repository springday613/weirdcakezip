import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vercel은 /api 폴더의 서버리스 함수를 자동 인식한다.
// 로컬 `npm run dev`에서는 /api가 안 뜨므로, 프론트가 로컬 mock으로 폴백한다(judge.js 참고).

// ── GitHub Pages 빌드 (S28) ──────────────────────────────────
// Pages는 서브패스(/weirdcakezip/) + 정적 전용이라, 코드의 하드코딩 절대경로
// ("/assets/…", "/api/…")를 빌드 산출물에서만 치환한다. 환경변수가 없으면
// 아무것도 안 바꾸므로 Vercel 배포·로컬 dev는 완전히 그대로다.
//   VITE_BASE      예: /weirdcakezip/   (Vite base + /assets 접두어)
//   VITE_API_BASE  예: https://cake-shop-black.vercel.app   (/api 호출 대상)
const BASE = process.env.VITE_BASE || "/";
const API_BASE = process.env.VITE_API_BASE || "";

function rewriteAbsolutePaths() {
  if (BASE === "/" && !API_BASE) return { name: "noop" };
  const P = BASE.replace(/\/$/, "");
  const fix = (code) =>
    code
      .replaceAll("/assets/", `${P}/assets/`)
      .replaceAll("/sounds/", `${P}/sounds/`)
      // Vite가 base를 이미 붙여둔 자기 참조가 위 치환에 또 걸리면 이중 접두어가 된다 → 원복
      .replaceAll(`${P}${P}/assets/`, `${P}/assets/`)
      .replaceAll(`${P}${P}/sounds/`, `${P}/sounds/`)
      .replaceAll('"/api/', `"${API_BASE}/api/`)
      .replaceAll("'/api/", `'${API_BASE}/api/`);
  return {
    name: "rewrite-absolute-paths",
    generateBundle(_, bundle) {
      for (const file of Object.values(bundle)) {
        if (file.type === "chunk") file.code = fix(file.code);
        else if (typeof file.source === "string") file.source = fix(file.source);
      }
    },
    transformIndexHtml(html) {
      return fix(html);
    },
  };
}

export default defineConfig({
  base: BASE,
  plugins: [react(), rewriteAbsolutePaths()],
  // /api 요청을 로컬 dev API 서버(:3001)로 프록시 → 브라우저에서 실제 LLM 사용.
  // dev API 서버는 별도 터미널에서: npm run api
  server: {
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
});
