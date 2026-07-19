// ─────────────────────────────────────────────────────────────
// LLM 프로바이더 추상화 — OpenAI(우선) / Anthropic 지원.
// judge.js · chat.js · 테스트가 공용으로 쓴다.
// 키가 하나도 없으면 null 반환 → 호출부가 mock으로 폴백.
//
// 모델 교체는 env 하나로:  OPENAI_MODEL (기본 gpt-4o-mini) / ANTHROPIC_MODEL
// ─────────────────────────────────────────────────────────────

export function hasLLM() {
  return Boolean(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY);
}

export async function callLLM({ system, messages, maxTokens = 300, json = false, model }) {
  // ── OpenAI ──
  if (process.env.OPENAI_API_KEY) {
    const OpenAI = (await import("openai")).default;
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const res = await client.chat.completions.create({
      model: model || process.env.OPENAI_MODEL || "gpt-4o-mini",
      max_tokens: maxTokens,
      messages: [{ role: "system", content: system }, ...messages],
      ...(json ? { response_format: { type: "json_object" } } : {}),
    });
    return res.choices?.[0]?.message?.content ?? "";
  }

  // ── Anthropic ──
  if (process.env.ANTHROPIC_API_KEY) {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await client.messages.create({
      model: model || process.env.ANTHROPIC_MODEL || "claude-sonnet-5",
      max_tokens: maxTokens,
      system,
      messages,
    });
    return msg.content?.[0]?.text ?? "";
  }

  return null;
}
