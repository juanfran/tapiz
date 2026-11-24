# OpenID Connect

Tapiz supports an OpenID Connect (OIDC) provider such as Keycloak alongside, or
instead of, Google OAuth. Start with the [installation guide](INSTALL.md) for
Docker setup, then use this guide to configure your provider.

## Register a client

1. Create a web client with the standard authorization-code flow. A confidential
   client is recommended; public clients are also supported with PKCE.
2. Register `${API_URL}/auth/oidc/callback` as its redirect URI. With the default
   local settings, this is `http://localhost:8000/api/auth/oidc/callback`.
3. Configure the provider to send a verified email address and sign ID tokens with
   an asymmetric algorithm such as RS256, PS256 or ES256, with public keys in its
   JWKS. HS256-signed ID tokens are rejected.

The redirect URI may use HTTP locally, but the issuer must use HTTPS.

## Configure Tapiz

For a confidential Keycloak client, add the following to `.env`, replacing the
example issuer and credentials:

```dotenv
OIDC_ISSUER=https://idp.example.com/realms/example
OIDC_CLIENT_ID=tapiz
OIDC_CLIENT_SECRET=replace-with-your-client-secret
OIDC_TOKEN_ENDPOINT_AUTH_METHOD=client_secret_basic
OIDC_DISPLAY_NAME="Single sign-on"
```

`OIDC_ISSUER` is the issuer identifier, not the URL ending in
`/.well-known/openid-configuration`. `OIDC_DISPLAY_NAME` is optional and controls
the sign-in button label.

`API_URL` must be an absolute HTTP(S) URL without a trailing slash, query or
fragment. Tapiz refuses to start if the issuer, API URL or client authentication
settings are invalid.

### Client authentication

Match `OIDC_TOKEN_ENDPOINT_AUTH_METHOD` to the registered client:

| Method                | `OIDC_CLIENT_SECRET` | When to use                                                    |
| --------------------- | -------------------- | -------------------------------------------------------------- |
| `client_secret_basic` | Required             | Default for confidential clients.                              |
| `client_secret_post`  | Required             | Only when the provider and client require POST authentication. |
| `none`                | Must be empty        | Public clients; PKCE protects the authorization code.          |

For a public client, explicitly set both values:

```dotenv
OIDC_CLIENT_SECRET=""
OIDC_TOKEN_ENDPOINT_AUTH_METHOD=none
```

### Provider-specific settings

- **Keycloak:** use the realm issuer, for example
  `https://idp.example.com/realms/<realm>`.
- **Microsoft Entra ID:** use a tenant-specific issuer. Tapiz rejects `common`,
  `organizations` and `consumers` because they do not identify a single issuer.
- **Azure AD B2C:** if discovery is published outside
  `<issuer>/.well-known/openid-configuration`, such as with a custom domain, set
  `OIDC_DISCOVERY_URL` to the HTTPS discovery document URL containing
  `/.well-known/`. The document's `issuer` must equal `OIDC_ISSUER` exactly. Use a
  policy that sends `email` and `email_verified: true`; the `emails` array sent by
  standard user flows does not satisfy Tapiz's verified-email requirement.

Once configured, continue with
[building and starting Tapiz](INSTALL.md#3-build-and-start-tapiz).

## Email and account identity

The ID token or UserInfo response must contain an email address in `email` and
the `email_verified` claim set to the JSON boolean `true`. A string `"true"` or a
missing claim is rejected. Check that your provider can send these claims before
deploying.

If the ID token omits a verified email, Tapiz fetches UserInfo and checks that
its subject matches the ID token. If only the name or picture is missing, Tapiz
also tries UserInfo, but a failure does not block login. Profile pictures must
be absolute HTTP(S) URLs.

Users are identified by issuer and subject. Email addresses never link accounts
automatically. If an email already belongs to another Tapiz account, login fails
with HTTP 409. An administrator must verify ownership with both providers and
resolve the conflicting account or email before retrying; do not link by email
alone.

Changing `OIDC_ISSUER`, including moving to another host or realm, gives every
user a new identity. Existing users then receive HTTP 409 until their accounts
are re-keyed in `oidc_identities`.

## Troubleshooting

Inspect the API logs:

```bash
docker compose logs api
```

Login failures include the provider's OAuth error code, such as `invalid_client`
or `access_denied`, or the network error code. Tokens and secrets are never
logged. HTTP 409 conflicts are logged without the email address.

- **API refuses to start:** check the issuer uses HTTPS, the API URL is valid,
  and the client secret matches the authentication method above.
- **Missing verified email:** check for both `email` and the boolean
  `email_verified: true` in the ID token or UserInfo.
- **Unsupported signing algorithm:** configure asymmetric ID-token signing and
  published JWKS keys; HS256 is unsupported.
- **HTTP 409:** follow the account identity guidance above to resolve ownership
  conflicts.
- **Provider request fails:** verify discovery and network connectivity from the
  API. Provider requests time out after 10 seconds.

## Upgrading an existing installation

These database migrations run automatically at API startup:

- `0011_youthful_vindicator` creates `oidc_identities`.
- `0012_case_insensitive_accounts_email` adds a unique index on
  `lower(accounts.email)`, affecting both Google and OIDC accounts.

Before upgrading, check for accounts whose emails differ only in case. With the
existing database running in Docker Compose, run this read-only query:

```bash
docker compose exec db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT lower(email) AS email, array_agg(id ORDER BY id) AS account_ids FROM accounts GROUP BY lower(email) HAVING count(*) > 1"'
```

From a source checkout, you can instead run `pnpm check:email-collisions` with
the production database connection variables in an approved environment. Both
commands report conflicting emails and account IDs without modifying data.
Resolve collisions after verifying account ownership; otherwise the migration
fails at startup with a specific error instead of retrying forever.

If an existing public-client deployment has an empty `OIDC_CLIENT_SECRET`, add
`OIDC_TOKEN_ENDPOINT_AUTH_METHOD=none`. An empty secret no longer implies a
public client.

## Protocol validation

Tapiz uses discovery, state, nonce and PKCE S256. It validates ID tokens with
`openid-client`, including their signatures and audiences. Tapiz's client ID
must be an audience; extra audiences, such as Zitadel's project ID, require
`azp` (authorized party) to equal that client ID. An `azp` naming another client
is always rejected.

Over HTTPS, transient login cookies use the `__Host-` prefix, binding them to
the API host so a sibling subdomain cannot plant them.

For database regression tests, see the
[API and OIDC testing commands](dev-guide.md#api-and-oidc-tests).
