// Shared HTTP helper for providers: maps transport failures and status codes
// to our closed error set, with the retry policy from the rewrite-engine spec
// (429 → backoff 1s/4s; 5xx → one retry after 2s).

import { HumanifyError } from '../mcp/errors.js';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function providerFetch(
  url: string,
  init: RequestInit,
  opts: { retries429?: number[]; retry5xxDelayMs?: number } = {},
): Promise<Response> {
  const backoffs = opts.retries429 ?? [1000, 4000];
  const retry5xx = opts.retry5xxDelayMs ?? 2000;
  let attempt429 = 0;
  let retried5xx = false;

  for (;;) {
    let res: Response;
    try {
      res = await fetch(url, init);
    } catch (err) {
      throw new HumanifyError('NETWORK', `network request failed: ${(err as Error).message}`, true);
    }
    if (res.ok) return res;
    if (res.status === 401 || res.status === 403) {
      throw new HumanifyError('INVALID_API_KEY', 'provider rejected the API key (401/403)');
    }
    if (res.status === 429) {
      if (attempt429 < backoffs.length) {
        await sleep(backoffs[attempt429]!);
        attempt429++;
        continue;
      }
      throw new HumanifyError('RATE_LIMITED', 'provider rate limit (429) after retries', true);
    }
    if (res.status >= 500) {
      if (!retried5xx) {
        retried5xx = true;
        await sleep(retry5xx);
        continue;
      }
      throw new HumanifyError('PROVIDER_ERROR', `provider error (${res.status}) after retry`, true);
    }
    const body = await res.text().catch(() => '');
    throw new HumanifyError(
      'PROVIDER_ERROR',
      `provider returned ${res.status}: ${body.slice(0, 200)}`,
    );
  }
}
