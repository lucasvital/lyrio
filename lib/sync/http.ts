/**
 * Fetch with exponential backoff on 429/5xx (coding-standards / NFR4).
 * Honors Retry-After when present.
 */
export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  opts: RetryOptions = {},
): Promise<Response> {
  const maxAttempts = opts.maxAttempts ?? 5;
  const baseDelayMs = opts.baseDelayMs ?? 500;
  const maxDelayMs = opts.maxDelayMs ?? 30_000;

  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    attempt++;
    const res = await fetch(url, init);
    if (res.status !== 429 && res.status < 500) return res;
    if (attempt >= maxAttempts) return res;

    const retryAfter = res.headers.get("retry-after");
    const headerDelay = retryAfter ? Number(retryAfter) * 1000 : 0;
    const backoff = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);
    const delay = Math.max(headerDelay, backoff);
    await sleep(delay);
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Pure backoff calculator (unit-tested). */
export function computeBackoff(
  attempt: number,
  baseDelayMs = 500,
  maxDelayMs = 30_000,
): number {
  return Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);
}
