# Install Tapiz with Docker

This guide runs Tapiz locally with Docker Compose. For development without
Docker, see the [development guide](dev-guide.md).

## Prerequisites

- Docker with Docker Compose installed.
- A checkout of this repository; run the commands below from its root.
- Credentials for Google OAuth, an OpenID Connect provider, or both.

**Upgrading an existing installation?** Read the
[upgrade notes](openid-connect.md#upgrading-an-existing-installation) before
starting the new version. The email uniqueness migration affects accounts from
both sign-in providers.

## 1. Create the environment file

```bash
cp .env.example .env
```

The defaults work for local Docker use, including the PostgreSQL user
`tapiz_user` and password `tapiz_password`. Change these credentials before
deploying to production.

For a public deployment, set `API_URL`, `WS_URL` and `FRONTEND_URL` to the URLs
users will access. `API_URL` includes the `/api` path and must be an absolute
HTTP(S) URL without a trailing slash, query or fragment.

## 2. Configure sign-in

Configure at least one provider in `.env`. You can enable both.

### Google OAuth

1. Create OAuth credentials using the
   [Google OAuth guide](https://developers.google.com/identity/protocols/oauth2).
2. Register `${API_URL}/auth/callback` as the redirect URI. With the default
   settings, this is `http://localhost:8000/api/auth/callback`.
3. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`.

Google accounts must have a verified email address.

### OpenID Connect

Follow the [OpenID Connect setup guide](openid-connect.md) to register a client
and set the `OIDC_*` variables. Google credentials are optional when OIDC is
configured.

## 3. Build and start Tapiz

```bash
docker compose up -d --build
```

The API applies database migrations automatically at startup. Once the services
are ready, open [http://localhost:4300](http://localhost:4300), or your configured
`FRONTEND_URL`, and sign in with your provider.

## Deployment health checks

- `/api/livez` checks the API process after the server starts listening.
- `/api/readyz` checks PostgreSQL connectivity; use it for readiness.

Startup waits for database connectivity and migrations. In Kubernetes, configure
a `startupProbe` with enough time for PostgreSQL initialization and migrations
before liveness checks begin.
