import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import * as oidc from 'openid-client';
import { describe, expect, it } from 'vitest';

const issuer = 'https://idp.example.test/realms/example';
const clientId = 'test-client';
const secret = 'test-secret';
const nonce = 'expected-nonce';
const state = 'expected-state';
const verifier = 'expected-verifier';
const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
});
const jwk = {
  ...publicKey.export({ format: 'jwk' }),
  kid: 'test-key',
  use: 'sig',
  alg: 'RS256',
};

function token(signatureKey = privateKey, tokenNonce = nonce) {
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString('base64url');
  const header = encode({ alg: 'RS256', kid: 'test-key' });
  const claims = encode({
    iss: issuer,
    aud: clientId,
    sub: 'subject-123',
    nonce: tokenNonce,
    email: 'person@example.test',
    email_verified: true,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 300,
  });
  const body = `${header}.${claims}`;
  return `${body}.${sign('RSA-SHA256', Buffer.from(body), signatureKey).toString('base64url')}`;
}

function provider(
  options: {
    responseIssuer?: string;
    tokenNonce?: string;
    wrongSignature?: boolean;
    wrongVerifier?: boolean;
  } = {},
) {
  const requests: string[] = [];
  const { privateKey: otherKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
  });
  const config = new oidc.Configuration(
    {
      issuer,
      authorization_endpoint: `${issuer}/authorize`,
      token_endpoint: `${issuer}/token`,
      jwks_uri: `${issuer}/keys`,
      authorization_response_iss_parameter_supported: true,
      id_token_signing_alg_values_supported: ['RS256'],
    },
    clientId,
    secret,
    oidc.ClientSecretBasic(secret),
  );
  oidc.enableNonRepudiationChecks(config);
  config[oidc.customFetch] = async (input, init) => {
    const url = String(input);
    requests.push(url);
    if (url.endsWith('/keys')) return Response.json({ keys: [jwk] });
    if (!url.endsWith('/token')) throw new Error('Unexpected provider request');
    const headers = new Headers(init?.headers);
    const formEncode = (value: string) =>
      new URLSearchParams({ value })
        .toString()
        .slice('value='.length)
        .replaceAll('-', '%2D');
    const expectedCredentials = `${formEncode(clientId)}:${formEncode(secret)}`;
    expect(headers.get('authorization')).toBe(
      `Basic ${Buffer.from(expectedCredentials).toString('base64')}`,
    );
    const body = new URLSearchParams(String(init?.body));
    expect(body.has('client_secret')).toBe(false);
    const expectedChallenge = createHash('sha256')
      .update(verifier)
      .digest('base64url');
    if (
      options.wrongVerifier ||
      createHash('sha256')
        .update(body.get('code_verifier') ?? '')
        .digest('base64url') !== expectedChallenge
    ) {
      return Response.json({ error: 'invalid_grant' }, { status: 400 });
    }
    return Response.json({
      access_token: 'access-token',
      token_type: 'Bearer',
      id_token: token(
        options.wrongSignature ? otherKey : privateKey,
        options.tokenNonce,
      ),
    });
  };
  const callback = new URL('https://tapiz.example.test/api/auth/oidc/callback');
  callback.searchParams.set('code', 'authorization-code');
  callback.searchParams.set('state', state);
  callback.searchParams.set('iss', options.responseIssuer ?? issuer);
  return { config, callback, requests };
}

describe('openid-client token validation boundary', () => {
  it('accepts a matching issuer, nonce, PKCE verifier, signed token and Basic authentication', async () => {
    const { config, callback, requests } = provider();
    const result = await oidc.authorizationCodeGrant(config, callback, {
      expectedState: state,
      expectedNonce: nonce,
      pkceCodeVerifier: verifier,
      idTokenExpected: true,
    });
    expect(result.claims()?.sub).toBe('subject-123');
    expect(requests).toContain(`${issuer}/token`);
  });

  it('rejects a mismatched response issuer before the token request', async () => {
    const { config, callback, requests } = provider({
      responseIssuer: 'https://other.example.test',
    });
    await expect(
      oidc.authorizationCodeGrant(config, callback, {
        expectedState: state,
        expectedNonce: nonce,
        pkceCodeVerifier: verifier,
      }),
    ).rejects.toThrow();
    expect(requests).not.toContain(`${issuer}/token`);
  });

  it('rejects a wrong nonce, verifier, and ID token signature', async () => {
    for (const options of [
      { tokenNonce: 'wrong' },
      { wrongVerifier: true },
      { wrongSignature: true },
    ]) {
      const { config, callback } = provider(options);
      await expect(
        oidc.authorizationCodeGrant(config, callback, {
          expectedState: state,
          expectedNonce: nonce,
          pkceCodeVerifier: options.wrongVerifier
            ? 'incorrect-verifier'
            : verifier,
          idTokenExpected: true,
        }),
      ).rejects.toThrow();
    }
  });
});
