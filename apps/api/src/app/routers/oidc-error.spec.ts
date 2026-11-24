import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ResponseBodyError } from 'openid-client';
import { logOidcError } from './oidc-error.js';

// Mirrors oauth4webapi's error class, which is not a direct dependency.
class OperationProcessingError extends Error {
  code?: string;
  constructor(message: string, options?: { code?: string; cause?: unknown }) {
    super(message, { cause: options?.cause });
    this.name = 'OperationProcessingError';
    this.code = options?.code;
  }
}

describe('OIDC failure logging', () => {
  let spy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    spy.mockRestore();
  });

  function logged() {
    expect(spy).toHaveBeenCalledTimes(1);
    return String(spy.mock.calls[0][0]);
  }

  it('records an error code without leaking a token or callback URL', () => {
    logOidcError(
      'OIDC login failed',
      Object.assign(
        new Error(
          'invalid_client https://example.test/callback?code=private-code',
        ),
        { code: 'OAUTH_RESPONSE_IS_NOT_CONFORM' },
      ),
    );
    expect(logged()).toBe(
      'OIDC login failed: OAUTH_RESPONSE_IS_NOT_CONFORM: Provider request or validation failed',
    );
  });

  it('distinguishes OAuth error codes from the token endpoint', () => {
    const error = new ResponseBodyError('server responded with an error', {
      cause: {
        error: 'invalid_client',
        error_description: 'secret s3cr3t-value is wrong',
      },
      response: new Response(null, { status: 401 }),
    });
    logOidcError('OIDC login failed', error);
    const line = logged();
    expect(line).toBe(
      'OIDC login failed: OAUTH_RESPONSE_BODY_ERROR (invalid_client, HTTP 401): Provider request or validation failed',
    );
    expect(line).not.toContain('s3cr3t');
  });

  it('drops provider error values that are not plain OAuth tokens', () => {
    logOidcError(
      'OIDC login failed',
      Object.assign(new Error('Invalid OIDC authorization response'), {
        error: 'access_denied https://evil.example/?token=abc',
      }),
    );
    expect(logged()).toBe(
      'OIDC login failed: unknown: Invalid OIDC authorization response',
    );
  });

  it('keeps the provider error from a failed authorization response', () => {
    logOidcError(
      'OIDC login failed',
      Object.assign(new Error('Invalid OIDC authorization response'), {
        error: 'access_denied',
      }),
    );
    expect(logged()).toBe(
      'OIDC login failed: unknown (access_denied): Invalid OIDC authorization response',
    );
  });

  it('reports the network error code for unreachable providers', () => {
    const error = new TypeError('fetch failed', {
      cause: Object.assign(new Error('connect ECONNREFUSED 10.0.0.1:443'), {
        code: 'ECONNREFUSED',
      }),
    });
    logOidcError('OIDC provider unavailable', error);
    expect(logged()).toBe(
      'OIDC provider unavailable: unknown (ECONNREFUSED): Provider request or validation failed',
    );
  });

  it('explains unsupported ID token signing algorithms', () => {
    logOidcError(
      'OIDC login failed',
      Object.assign(new Error('unsupported operation'), {
        code: 'OAUTH_UNSUPPORTED_OPERATION',
      }),
    );
    expect(logged()).toContain('RS256, PS256 or ES256');
  });

  it('names the failed check without logging claim values', () => {
    const inner = new OperationProcessingError(
      'unexpected ID Token "nonce" claim value',
      {
        code: 'OAUTH_JWT_CLAIM_COMPARISON_FAILED',
        cause: { claims: { nonce: 'attacker-nonce', email: 'p@example.test' } },
      },
    );
    const error = Object.assign(
      new Error('unexpected JWT claim value encountered', { cause: inner }),
      { code: 'OAUTH_JWT_CLAIM_COMPARISON_FAILED' },
    );
    logOidcError('OIDC login failed', error);
    const line = logged();
    expect(line).toBe(
      'OIDC login failed: OAUTH_JWT_CLAIM_COMPARISON_FAILED: Provider request or validation failed: unexpected ID Token "nonce" claim value',
    );
    expect(line).not.toContain('attacker-nonce');
    expect(line).not.toContain('p@example.test');
  });

  it('ignores library messages that could carry values', () => {
    const inner = new OperationProcessingError(
      'bad value https://idp.example/?token=secret',
      { code: 'OAUTH_INVALID_RESPONSE' },
    );
    logOidcError(
      'OIDC login failed',
      Object.assign(
        new Error('invalid response encountered', { cause: inner }),
        {
          code: 'OAUTH_INVALID_RESPONSE',
        },
      ),
    );
    expect(logged()).toBe(
      'OIDC login failed: OAUTH_INVALID_RESPONSE: Provider request or validation failed',
    );
  });
});
