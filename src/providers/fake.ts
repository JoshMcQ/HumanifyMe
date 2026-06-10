// Deterministic provider for tests. Never touches the network.

import { CompletionArgs, CompletionResult, LLMProvider } from './types.js';

export class FakeLLMProvider implements LLMProvider {
  readonly name = 'fake';
  readonly route = '/fake';
  calls: CompletionArgs[] = [];

  /** If set, returns these responses in order (then repeats the last). */
  cannedResponses: string[] = [];
  /** If set, throws this error on the next call. */
  failWith: Error | null = null;

  async complete(args: CompletionArgs): Promise<CompletionResult> {
    this.calls.push(args);
    if (this.failWith) {
      const err = this.failWith;
      this.failWith = null;
      throw err;
    }
    let text: string;
    if (this.cannedResponses.length > 0) {
      const idx = Math.min(this.calls.length - 1, this.cannedResponses.length - 1);
      text = this.cannedResponses[idx]!;
    } else {
      // Deterministic echo: stable transform of the user content.
      text = `[fake-rewrite] ${args.user.slice(0, 400)}`;
    }
    return {
      text,
      inputTokens: Math.ceil((args.system.length + args.user.length) / 4),
      outputTokens: Math.ceil(text.length / 4),
      latencyMs: 1,
    };
  }

  async testKey(): Promise<boolean> {
    return true;
  }
}
