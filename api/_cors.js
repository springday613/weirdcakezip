// ─────────────────────────────────────────────────────────────
// CORS (S28) — GitHub Pages 프론트가 이 서버리스 API 를 부를 수 있게 한다.
// 허용 origin 만 화이트리스트. 프리플라이트(OPTIONS)면 true 를 반환 —
// 핸들러는 그 즉시 return 해야 한다.
// ─────────────────────────────────────────────────────────────

const ALLOWED = [
  "https://springday613.github.io", // GitHub Pages
];

export function cors(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Max-Age", "86400");
  }
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return true;
  }
  return false;
}
