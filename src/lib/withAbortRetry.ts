type RetryOptions = {
  retries?: number;
  baseDelayMs?: number;
};

function isAbortError(err: unknown): boolean {
  if (!err) return false;
  if (typeof err === 'object') {
    const anyErr = err as any;
    const name = anyErr?.name;
    const message = anyErr?.message;
    return name === 'AbortError' || (typeof message === 'string' && message.includes('AbortError'));
  }
  return false;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retries a function when the browser aborts fetch (AbortError).
 * This commonly happens when multiple fast interactions trigger concurrent requests.
 */
export async function withAbortRetry<T>(
  fn: () => PromiseLike<T>,
  { retries = 2, baseDelayMs = 350 }: RetryOptions = {}
): Promise<T> {
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt += 1;
      if (!isAbortError(err) || attempt > retries) throw err;
      await sleep(baseDelayMs * attempt);
    }
  }
}
