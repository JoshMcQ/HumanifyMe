import { CompletionArgs, CompletionResult, LLMProvider } from './types.js';
import { providerFetch } from './http.js';

const DEFAULT_MODEL = 'gemini-1.5-pro';
const BASE_URL = 'https://generativelanguage.googleapis.com';

export class GeminiProvider implements LLMProvider {
  readonly name = 'gemini';
  readonly route = '/v1beta/models/:generateContent';

  constructor(private apiKey: string, private model: string = DEFAULT_MODEL) {}

  async complete(args: CompletionArgs): Promise<CompletionResult> {
    const started = Date.now();
    const url = `${BASE_URL}/v1beta/models/${this.model}:generateContent?key=${encodeURIComponent(this.apiKey)}`;
    const res = await providerFetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: args.system }] },
        contents: [{ role: 'user', parts: [{ text: args.user }] }],
        generationConfig: {
          maxOutputTokens: args.maxTokens,
          temperature: args.temperature,
          ...(args.responseFormat === 'json' ? { responseMimeType: 'application/json' } : {}),
        },
      }),
    });
    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
    };
    const text =
      data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
    return {
      text,
      inputTokens: data.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
      latencyMs: Date.now() - started,
    };
  }

  async testKey(): Promise<boolean> {
    try {
      await this.complete({ system: 'ping', user: 'ping', maxTokens: 1, temperature: 0 });
      return true;
    } catch {
      return false;
    }
  }
}
