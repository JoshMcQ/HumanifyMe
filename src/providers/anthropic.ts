import { CompletionArgs, CompletionResult, LLMProvider } from './types.js';
import { providerFetch } from './http.js';

const DEFAULT_MODEL = 'claude-sonnet-4-6';
const BASE_URL = 'https://api.anthropic.com';

export class AnthropicProvider implements LLMProvider {
  readonly name = 'anthropic';
  readonly route = '/v1/messages';

  constructor(private apiKey: string, private model: string = DEFAULT_MODEL) {}

  private headers(): Record<string, string> {
    return {
      'content-type': 'application/json',
      'x-api-key': this.apiKey,
      'anthropic-version': '2023-06-01',
    };
  }

  async complete(args: CompletionArgs): Promise<CompletionResult> {
    const started = Date.now();
    const res = await providerFetch(`${BASE_URL}${this.route}`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        model: this.model,
        max_tokens: args.maxTokens,
        temperature: args.temperature,
        system: args.system,
        messages: [{ role: 'user', content: args.user }],
      }),
    });
    const data = (await res.json()) as {
      content: Array<{ type: string; text?: string }>;
      usage: { input_tokens: number; output_tokens: number };
    };
    const text = data.content
      .filter((b) => b.type === 'text' && typeof b.text === 'string')
      .map((b) => b.text)
      .join('');
    return {
      text,
      inputTokens: data.usage.input_tokens,
      outputTokens: data.usage.output_tokens,
      latencyMs: Date.now() - started,
    };
  }

  async testKey(): Promise<boolean> {
    try {
      await providerFetch(`${BASE_URL}${this.route}`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({
          model: this.model,
          max_tokens: 1,
          messages: [{ role: 'user', content: 'ping' }],
        }),
      });
      return true;
    } catch {
      return false;
    }
  }
}
