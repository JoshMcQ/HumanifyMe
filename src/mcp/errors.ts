// Closed error-code set per docs/api-contract.md.

export type ErrorCode =
  | 'BAD_INPUT'
  | 'MISSING_CONSENT'
  | 'MISSING_API_KEY'
  | 'INVALID_API_KEY'
  | 'RATE_LIMITED'
  | 'PROVIDER_ERROR'
  | 'NETWORK'
  | 'OUTPUT_INVALID'
  | 'EMPTY_AFTER_REDACTION'
  | 'OVER_LENGTH_CAP'
  | 'RATE_LIMITED_LOCAL'
  | 'NOT_FOUND';

export class HumanifyError extends Error {
  readonly code: ErrorCode;
  readonly retryable: boolean;

  constructor(code: ErrorCode, message: string, retryable = false) {
    super(message);
    this.name = 'HumanifyError';
    this.code = code;
    this.retryable = retryable;
  }
}

export function badInput(message: string): HumanifyError {
  return new HumanifyError('BAD_INPUT', message);
}

/** Map any thrown value to a HumanifyError without leaking stack traces. */
export function toHumanifyError(err: unknown): HumanifyError {
  if (err instanceof HumanifyError) return err;
  if (err && typeof err === 'object' && 'issues' in (err as Record<string, unknown>)) {
    // zod error
    const issues = (err as { issues: Array<{ path: (string | number)[]; message: string }> }).issues;
    const detail = issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    return new HumanifyError('BAD_INPUT', detail || 'invalid input');
  }
  const message = err instanceof Error ? err.message : 'unexpected error';
  return new HumanifyError('PROVIDER_ERROR', message, true);
}
