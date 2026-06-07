import type { AIProvider } from "./types";

export const PROVIDER_PRESETS: Record<AIProvider["kind"], { baseUrl: string; model: string; needsKey: boolean; label: string }> = {
  openai: { baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini", needsKey: true, label: "OpenAI" },
  anthropic: { baseUrl: "https://api.anthropic.com/v1", model: "claude-3-5-sonnet-latest", needsKey: true, label: "Anthropic" },
  ollama: { baseUrl: "http://localhost:11434", model: "llama3.1", needsKey: false, label: "Ollama (local)" },
  lmstudio: { baseUrl: "http://localhost:1234/v1", model: "local-model", needsKey: false, label: "LM Studio (local)" },
  openai_compatible: { baseUrl: "https://", model: "", needsKey: true, label: "OpenAI-compatible" },
};

export async function chatComplete(
  provider: AIProvider,
  system: string,
  user: string,
): Promise<string> {
  if (provider.kind === "anthropic") {
    const res = await fetch(`${provider.baseUrl}/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": provider.apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: provider.model,
        max_tokens: 2048,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data.content?.[0]?.text ?? "";
  }
  if (provider.kind === "ollama") {
    const res = await fetch(`${provider.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: provider.model,
        stream: false,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (!res.ok) throw new Error(`Ollama ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data.message?.content ?? "";
  }
  // openai / lmstudio / openai_compatible
  const res = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(provider.apiKey ? { authorization: `Bearer ${provider.apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: provider.model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.4,
    }),
  });
  if (!res.ok) throw new Error(`${provider.name} ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

export async function pingProvider(provider: AIProvider): Promise<string> {
  return chatComplete(provider, "You are a connectivity test. Reply with 'ok'.", "ping");
}
