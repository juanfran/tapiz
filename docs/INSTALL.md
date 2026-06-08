## Prerequisites

- Docker installed on your system.
- Google OAuth credentials (for authentication).

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

4. **Build and Run the Docker Containers**  
   After configuring your environment variables, build and start the Docker containers by running:

   ```bash
   docker-compose up -d
   ```

5. **Access the Application**  
   Your Tapiz application will be available at [http://localhost:4300](http://localhost:4300).

## Optional: Board Preview Thumbnails

Tapiz can render a thumbnail for each board and show it in the board listing. This
feature is **optional** — without it the listing simply shows a placeholder and the
app behaves exactly as before.

Thumbnails are produced by a separate `preview-worker` process so they never affect
the performance of the API or web app. The worker renders the real board with headless
Chromium, so the image is a faithful capture of the board (not a simplified version),
and it regenerates a board's thumbnail a short while after it stops being edited.

To enable it with Docker:

1. **Set a worker token** in `.env`. The API and the worker use it as a shared secret;
   pick any long random string:

   ```bash
   PREVIEW_WORKER_TOKEN="<long-random-string>"
   ```

   Optional tuning (defaults shown):

   - `PREVIEW_DIRTY_DEBOUNCE_MS=60000` — idle time before an edited board is queued.
   - `PREVIEW_WORKER_POLL_MS=15000` — how often the worker checks for work.

2. **Start the worker profile** alongside the rest of the stack:

   ```bash
   docker compose --env-file=.env --profile preview up -d --build
   ```

   The default `docker compose up` (no profile) leaves the worker off, so existing
   deployments are unaffected.

> If `PREVIEW_WORKER_TOKEN` is empty the preview endpoints reject all requests, so the
> worker can do nothing even if it is running — the app falls back to placeholders.
