/**
 * Tests for the /api/ai proxy handler's error-reporting path and the
 * P-025 forced-error trigger.
 *
 * Lives under src/ rather than next to its subject because vitest.config.ts
 * scopes the suite to `src/**\/*.test.ts`; the import reaches into functions/
 * exactly the way server.ts does, so this exercises the same module the
 * Cloud Function bundles. Authored for P-025 — reportError had no committed
 * test before this file.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { handleAiProxyRequest, isForcedErrorAllowed } from '../../functions/src/aiProxyHandler';

const REAL_UID = 'abcdefghij0123456789ABCD'; // 24 chars, uid-shaped
const OTHER_UID = 'zyxwvutsrq9876543210ZYXW';

const verifyOk = (uid = REAL_UID) => async () => ({ uid });

const baseBody = { messages: [{ role: 'user', content: 'SECRET USER CONTENT' }] };

function stubFetchThrowing(message = 'ECONNRESET simulated') {
  const spy = vi.fn(async () => {
    throw new Error(message);
  });
  globalThis.fetch = spy as unknown as typeof fetch;
  return spy;
}

function stubFetchOk() {
  const spy = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
  globalThis.fetch = spy as unknown as typeof fetch;
  return spy;
}

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
  vi.restoreAllMocks();
});

describe('isForcedErrorAllowed', () => {
  it('is false when the allowlist is unset or empty', () => {
    expect(isForcedErrorAllowed(REAL_UID, undefined)).toBe(false);
    expect(isForcedErrorAllowed(REAL_UID, '')).toBe(false);
    expect(isForcedErrorAllowed(REAL_UID, '   ')).toBe(false);
  });

  it('ignores the "none" placeholder the secret ships with', () => {
    expect(isForcedErrorAllowed(REAL_UID, 'none')).toBe(false);
  });

  it('ignores any entry that is not uid-shaped', () => {
    expect(isForcedErrorAllowed('none', 'none')).toBe(false);
    expect(isForcedErrorAllowed('short', 'short')).toBe(false);
    expect(isForcedErrorAllowed('has-a-dash-in-it-0123456', 'has-a-dash-in-it-0123456')).toBe(false);
    // 19 chars: one below the minimum length.
    expect(isForcedErrorAllowed('abcdefghij012345678', 'abcdefghij012345678')).toBe(false);
  });

  it('honors a uid-shaped entry, including alongside junk', () => {
    expect(isForcedErrorAllowed(REAL_UID, REAL_UID)).toBe(true);
    expect(isForcedErrorAllowed(REAL_UID, ` none , ${REAL_UID} `)).toBe(true);
    expect(isForcedErrorAllowed(REAL_UID, `${OTHER_UID},${REAL_UID}`)).toBe(true);
  });

  it('does not match a different uid', () => {
    expect(isForcedErrorAllowed(REAL_UID, OTHER_UID)).toBe(false);
  });
});

describe('handleAiProxyRequest error reporting', () => {
  it('awaits the report before returning the 502', async () => {
    stubFetchThrowing();
    const order: string[] = [];
    const reportError = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 20));
      order.push('report-finished');
    });

    const result = await handleAiProxyRequest(
      { authHeader: 'Bearer t', body: baseBody },
      'sk-fake',
      verifyOk(),
      undefined,
      reportError
    );
    order.push('response-returned');

    expect(result.status).toBe(502);
    // The report must complete first — an unawaited capture can die with
    // a frozen instance.
    expect(order).toEqual(['report-finished', 'response-returned']);
  });

  it('reports uid only, with nothing from the request body', async () => {
    stubFetchThrowing();
    const reportError = vi.fn(async () => {});

    await handleAiProxyRequest(
      { authHeader: 'Bearer t', body: { ...baseBody, system: 'SECRET SYSTEM PROMPT' } },
      'sk-fake',
      verifyOk(),
      undefined,
      reportError
    );

    expect(reportError).toHaveBeenCalledTimes(1);
    const [err, uid] = reportError.mock.calls[0] as unknown as [unknown, string];
    expect(reportError.mock.calls[0]).toHaveLength(2);
    expect(uid).toBe(REAL_UID);
    expect(JSON.stringify({ err: String(err), uid })).not.toContain('SECRET');
  });

  it('keeps a reporting failure invisible to the caller', async () => {
    stubFetchThrowing();
    const reportError = vi.fn(async () => {
      throw new Error('sentry unreachable');
    });

    const result = await handleAiProxyRequest(
      { authHeader: 'Bearer t', body: baseBody },
      'sk-fake',
      verifyOk(),
      undefined,
      reportError
    );

    expect(result.status).toBe(502);
    expect(result.body).toEqual({ error: { message: 'Failed to reach Anthropic API.' } });
  });

  it('does not report on the success path', async () => {
    stubFetchOk();
    const reportError = vi.fn(async () => {});

    const result = await handleAiProxyRequest(
      { authHeader: 'Bearer t', body: baseBody },
      'sk-fake',
      verifyOk(),
      undefined,
      reportError
    );

    expect(result.status).toBe(200);
    expect(reportError).not.toHaveBeenCalled();
  });

  it('survives an omitted reporter (local dev)', async () => {
    stubFetchThrowing();
    const result = await handleAiProxyRequest(
      { authHeader: 'Bearer t', body: baseBody },
      'sk-fake',
      verifyOk()
    );
    expect(result.status).toBe(502);
  });
});

describe('forced-error trigger', () => {
  it('is a complete no-op while the allowlist holds only the placeholder', async () => {
    const fetchSpy = stubFetchOk();
    const reportError = vi.fn(async () => {});

    const result = await handleAiProxyRequest(
      { authHeader: 'Bearer t', body: { ...baseBody, __forceError: true } },
      'sk-fake',
      verifyOk(),
      undefined,
      reportError,
      'none'
    );

    // __forceError ignored entirely: the request proceeds normally.
    expect(result.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(reportError).not.toHaveBeenCalled();
  });

  it('is a no-op when the allowlist is unset', async () => {
    const fetchSpy = stubFetchOk();
    const result = await handleAiProxyRequest(
      { authHeader: 'Bearer t', body: { ...baseBody, __forceError: true } },
      'sk-fake',
      verifyOk()
    );
    expect(result.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('is a no-op for a non-uid allowlist entry', async () => {
    const fetchSpy = stubFetchOk();
    const result = await handleAiProxyRequest(
      { authHeader: 'Bearer t', body: { ...baseBody, __forceError: true } },
      'sk-fake',
      verifyOk(),
      undefined,
      undefined,
      'test-account,placeholder,none'
    );
    expect(result.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('throws before the Anthropic call for an allowlisted uid, and reports', async () => {
    const fetchSpy = stubFetchOk();
    const reportError = vi.fn(async () => {});

    const result = await handleAiProxyRequest(
      { authHeader: 'Bearer t', body: { ...baseBody, __forceError: true } },
      'sk-fake',
      verifyOk(),
      undefined,
      reportError,
      REAL_UID
    );

    expect(result.status).toBe(502);
    // "before the Anthropic call" — no request was ever made.
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(reportError).toHaveBeenCalledTimes(1);
    expect((reportError.mock.calls[0] as unknown as [unknown, string])[1]).toBe(REAL_UID);
  });

  it('runs after the quota check, so a forced error still costs a request', async () => {
    stubFetchOk();
    const recordDailyUsage = vi.fn(async () => 1);

    const result = await handleAiProxyRequest(
      { authHeader: 'Bearer t', body: { ...baseBody, __forceError: true } },
      'sk-fake',
      verifyOk(),
      recordDailyUsage,
      async () => {},
      REAL_UID
    );

    expect(result.status).toBe(502);
    expect(recordDailyUsage).toHaveBeenCalledTimes(1);
  });

  it('ignores a non-true __forceError value', async () => {
    const fetchSpy = stubFetchOk();
    const result = await handleAiProxyRequest(
      { authHeader: 'Bearer t', body: { ...baseBody, __forceError: 'true' } },
      'sk-fake',
      verifyOk(),
      undefined,
      undefined,
      REAL_UID
    );
    expect(result.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
