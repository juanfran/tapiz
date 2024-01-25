## Pre-requisites

- Docker

## Installation & Configuration

Follow these steps to set up TeamUp on your system with Docker:

1. Create a copy of the example environment file `.env.example` and name it as `.env`:

```console
cp .env.example .env
```

2. Configure your database and front-end access as per your setup.

3. [Get your Google authentication credentials] (https://developers.google.com/identity/protocols/oauth2), add the redirct url `http://localhost:9000/login-redirect` and fill in the `.env` file with the client ID and the client secret.

With the setup complete, you can now run the Docker command to spin up your application:

```console
docker compose up -d
```

TeamUp will now be accessible at [http://localhost:9000](http://localhost:9000).
