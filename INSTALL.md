## Pre-requisites

- Docker
- Firebase (used for authentication)

## Installation & Configuration

Follow these steps to set up TeamUp on your system with Docker:

1. Create a copy of the example environment file `.env.example` and name it as `.env`:

```console
cp .env.example .env
```

2. Configure your database and front-end access as per your setup.

3. Set up a new project on [Firebase](https://firebase.google.com/).

4. Enable Google and Github as an [authentication provider](https://firebase.google.com/docs/auth) for your Firebase project.

5. In the Firebase console, navigate to Settings > [Service Accounts](https://console.firebase.google.com/project/_/settings/serviceaccounts/adminsdk).

6. Generate a new private key by clicking on 'Generate New Private Key', then confirm by clicking 'Generate Key'.

7. Securely store the downloaded JSON file containing the key.

8. Specify the path of the JSON file in the `GOOGLE_APPLICATION_CREDENTIALS` environment variable in your `.env` file.

9. Navigate to [Project settings](https://console.firebase.google.com/project/_/settings/general/) in the Firebase console.

10. Under the 'Firebase SDK snippet' section, select 'Config'.

11. Download your Firebase configuration JSON file and specify its path in the `FIREBASE_CONFIG` environment variable in your `.env` file.

With the setup complete, you can now run the Docker command to spin up your application:

```console
docker compose up -d
```

TeamUp will now be accessible at [http://localhost:9000](http://localhost:9000).
