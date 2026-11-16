import { describe, expect, it, vi } from 'vitest';
import { logOidcError } from './oidc-error.js';

describe('OIDC failure logging', () => {
  it('records an error code without leaking a token or callback URL', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      logOidcError(
        'OIDC login failed',
        Object.assign(
          new Error(
            'invalid_client https://example.test/callback?code=private-code',
          ),
          { code: 'OAUTH_RESPONSE_IS_NOT_CONFORM' },
        ),
      );
      expect(spy).toHaveBeenCalledWith(
        'OIDC login failed: OAUTH_RESPONSE_IS_NOT_CONFORM: Provider request or validation failed',
      );
    } finally {
      spy.mockRestore();
    }
  });
});
