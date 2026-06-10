// Provider abstraction per specs/rewrite-engine-spec.md. Provider-specific
// concepts must not leak past this interface.

export interface CompletionArgs {
  system: string;
  user: string;
  maxTokens: number;
  temperature: number;
  responseFormat?: 'text' | 'json';
}

export interface CompletionResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
}

export interface LLMProvider {
  readonly name: string;
  /** The route logged in the audit (e.g. "/v1/messages"). Never includes content. */
  readonly route: string;
  complete(args: CompletionArgs): Promise<CompletionResult>;
  /** Cheap ping (≤ 1 output token) to validate the configured key. */
  testKey(): Promise<boolean>;
}
