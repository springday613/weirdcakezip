import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vercel은 /api 폴더의 서버리스 함수를 자동 인식한다.
// 로컬 `npm run dev`에서는 /api가 안 뜨므로, 프론트가 로컬 mock으로 폴백한다(judge.js 참고).
export default defineConfig({
  plugins: [react()],
  // /api 요청을 로컬 dev API 서버(:3001)로 프록시 → 브라우저에서 실제 LLM 사용.
  // dev API 서버는 별도 터미널에서: npm run api
  server: {
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
});
