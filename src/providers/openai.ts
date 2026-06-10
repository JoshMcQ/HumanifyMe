import { CompletionArgs, CompletionResult, LLMProvider } from './types.js';
import { providerFetch } from './http.js';

const DEFAULT_MODEL = 'gpt-4o';

export class OpenAIProvider implements LLMProvider {
  readonly name: string = 'openai';
  readonly route = '/v1/chat/completions';

  constructor(
    private apiKey: string,
    private model: string = DEFAULT_MODEL,
    private baseUrl: string = 'https://api.openai.com',
  ) {}

  async complete(args: CompletionArgs): Promise<CompletionResult> {
    const started = Date.now();
    const body: Record<string, unknown> = {
      model: this.model,
      max_tokens: args.maxTokens,
      temperature: args.temperature,
      messages: [
        { role: 'system', content: args.system },
        { role: 'user', content: args.user },
      ],
    };
    if (args.responseFormat === 'json') {
      body.response_format = { type: 'json_object' };
    }
    const res = await providerFetch(`${this.baseUrl}${this.route}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as {
      choices: Array<{ message: { content: string } }>;
      usage: { prompt_tokens: number; completion_tokens: number };
    };
    return {
      text: data.choices[0]?.message.content ?? '',
      inputTokens: data.usage?.prompt_tokens ?? 0,
      outputTokens: data.usage?.completion_tokens ?? 0,
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

/** Ollama speaks the OpenAI-compatible chat API at /v1; no key required. */
export class OllamaProvider extends OpenAIProvider {
  override readonly name: string = 'ollama';
  constructor(baseUrl: string, model: string) {
    super('ollama', model, baseUrl.replace(/\/$/, ''));
  }
}
