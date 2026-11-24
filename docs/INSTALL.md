## Prerequisites

- Docker installed on your system.
- Credentials for at least one sign-in provider: Google OAuth or an OpenID
  Connect provider.

## Installation & Configuration

Follow these steps to set up Tapiz using Docker:

1. **Copy the Example Environment File**  
   Create a copy of the example environment file `.env.example` and name it `.env`:

   ```bash
   cp .env.example .env
   ```

2. **Use the Default Environment Variables (Optional)**  
   The default settings in the `.env` file are suitable for local development using Docker. Specifically, the default PostgreSQL credentials are:

   - **Database User**: `tapiz_user`
   - **Database Password**: `tapiz_password`

   These defaults can be used in a local development environment, but **it is strongly recommended to change them** before deploying to production.

3. **Set Up Google Authentication Credentials**  
   Obtain your Google OAuth credentials by following [this guide](https://developers.google.com/identity/protocols/oauth2).  
   Make sure the redirect URL is set to `http://localhost:8000/api/auth/callback`.  
   Enter the `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` into the `.env` file under the appropriate fields.

   Google is optional when OpenID Connect is configured. For Keycloak or another
   OIDC provider, create a web client with standard authorization-code flow
   (confidential is recommended; for a public client leave
   `OIDC_CLIENT_SECRET` empty and set `OIDC_TOKEN_ENDPOINT_AUTH_METHOD=none`,
   and PKCE still protects the code) and register
   `http://localhost:8000/api/auth/oidc/callback` as its redirect URI. The
   redirect may be local HTTP for development, but `OIDC_ISSUER` must be an
   HTTPS issuer URL (for Keycloak:
   `https://idp.example.com/realms/<realm>`; the issuer identifier itself, not
   its `/.well-known/openid-configuration` URL; for Microsoft Entra ID use the
   tenant-specific issuer, since `common`, `organizations` and `consumers` are
   rejected), plus `OIDC_CLIENT_ID`,
   `OIDC_CLIENT_SECRET`, and optionally `OIDC_DISPLAY_NAME`. If the provider
   publishes its discovery document somewhere other than
   `<issuer>/.well-known/openid-configuration` (for example Azure AD B2C with a
   custom domain), also set `OIDC_DISCOVERY_URL`; its `issuer` must equal
   `OIDC_ISSUER` exactly. For Azure AD B2C, use a policy that sends `email`
   and `email_verified: true`; standard user flows send only an `emails` array,
   so logins fail with a missing verified email. `API_URL` must not end with a slash. Token endpoint
   client authentication defaults to `client_secret_basic` (the OIDC discovery
   default); set `OIDC_TOKEN_ENDPOINT_AUTH_METHOD=client_secret_post` only if
   the provider and registered client require POST authentication. Both
   secret methods require `OIDC_CLIENT_SECRET`; `none` requires it to be
   empty. The API refuses to start with an invalid combination, a non-HTTPS
   issuer or an `API_URL` that is not an absolute HTTP(S) URL. When upgrading
   a public-client deployment that left `OIDC_CLIENT_SECRET` empty, add
   `OIDC_TOKEN_ENDPOINT_AUTH_METHOD=none`; an empty secret no longer implies a
   public client.

   Tapiz uses discovery, state, nonce and PKCE S256, and validates the ID
   token with `openid-client`, including its signature and its audience:
   Tapiz's client ID must be an audience, extra audiences (such as Zitadel's
   project ID) require `azp` (authorized party) to equal it, and an `azp`
   naming another client is always rejected. Requests to the provider
   time out after 10 seconds. Over HTTPS the transient login cookies use the
   `__Host-` prefix, so they are bound to the API host and cannot be planted
   from a sibling subdomain. The provider must sign
   ID tokens with an asymmetric algorithm (RS256, PS256 or ES256) whose keys are
   published in its JWKS; HS256-signed ID tokens are rejected. Login failures
   are written to the API log with the provider's OAuth error code (for example
   `invalid_client` or `access_denied`) or the network error code, never tokens
   or secrets. If the ID token omits a verified email, Tapiz
   fetches UserInfo and checks its subject against the ID token; when only the
   name or picture is missing it tries UserInfo too, without blocking login if
   that fails. Profile pictures must be absolute HTTP(S) URLs. Users are
   keyed by issuer and subject, so changing `OIDC_ISSUER` (a new host or
   realm) gives every user a new identity, and existing users then get HTTP 409
   until their accounts are re-keyed in `oidc_identities`. A verified email is
   required: the provider must send `email_verified` as the JSON boolean `true`
   in the ID token or UserInfo (a string `"true"` or a missing claim is
   rejected), so check that providers which omit it can be configured to send
   it. Google logins likewise require a verified email. The email is never used
   to link accounts: if it already belongs to another Tapiz account, login fails
   with HTTP 409.
   Migration `0011_youthful_vindicator` creates `oidc_identities` and applies
   automatically at API startup. Migration `0012_case_insensitive_accounts_email`
   adds a unique index on `lower(accounts.email)`. Before upgrading an existing
   installation, check for accounts whose emails differ only in case. From a
   source checkout, run `pnpm check:email-collisions` with the production
   database connection variables in an approved environment. With Docker
   Compose, run the same read-only query in the database container:

   ```bash
   docker compose exec db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT lower(email) AS email, array_agg(id ORDER BY id) AS account_ids FROM accounts GROUP BY lower(email) HAVING count(*) > 1"'
   ```

   Both report conflicting account IDs and emails without modifying data. Resolve any collisions after
   verifying account ownership; otherwise the migration fails at startup with a
   specific error instead of retrying forever. On a 409, an administrator should
   verify ownership with both providers and resolve the conflicting account or
   email before retrying; do not link by email alone. The API log records the
   409 without the email address. The OIDC database regression tests run with
   the rest of the API tests (`pnpm e2e:tests`, or only those suites with
   `pnpm test:oidc-db`) against the database in the `POSTGRES_*` variables, so
   point them at a development or disposable PostgreSQL database.

   Kubernetes probes: `/api/livez` checks the process only after the server
   starts listening, and `/api/readyz` checks PostgreSQL connectivity. Startup
   waits for migrations and database connectivity, so configure a startupProbe
   with enough time for PostgreSQL initialization and migrations before the
   liveness probe begins; do not use `/api/livez` as readiness.

4. **Build and Run the Docker Containers**  
   After configuring your environment variables, build and start the Docker containers by running:

   ```bash
   docker-compose up -d
   ```

5. **Access the Application**  
   Your Tapiz application will be available at [http://localhost:4300](http://localhost:4300).
