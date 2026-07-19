// 로컬 개발용 API 서버 — Vercel 없이 /api/chat, /api/judge를 실제 LLM으로 띄운다.
//   node --env-file=.env.local devServer.js     (또는 npm run api)
// Vite(:5173)가 /api 요청을 이 서버(:3001)로 프록시한다(vite.config.js 참고).

import http from "node:http";
import judge from "./api/judge.js";
import chat from "./api/chat.js";

const routes = { "/api/judge": judge, "/api/chat": chat };
const PORT = 3001;

http
  .createServer((req, res) => {
    const path = req.url.split("?")[0];
    const handler = routes[path];
    if (!handler) {
      res.writeHead(404);
      return res.end("not found");
    }
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", async () => {
      try {
        req.body = body ? JSON.parse(body) : {};
      } catch {
        req.body = {};
      }
      // Vercel 스타일 res 셔임
      res.status = (code) => {
        res.statusCode = code;
        return res;
      };
      res.json = (obj) => {
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify(obj));
      };
      try {
        await handler(req, res);
      } catch (e) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: String(e) }));
      }
    });
  })
  .listen(PORT, () => {
    const provider = process.env.OPENAI_API_KEY
      ? "OpenAI"
      : process.env.ANTHROPIC_API_KEY
      ? "Anthropic"
      : "MOCK (키 없음)";
    console.log(`🍰 dev API on http://localhost:${PORT}  |  provider: ${provider}`);
  });
