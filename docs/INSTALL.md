## Pre-requisites

- Docker

## Installation & Configuration

Follow these steps to set up Tapiz on your system using Docker:

1. **Copy the Example Environment File**  
   Create a copy of the example environment file `.env.example` and name it `.env`:

   ```bash
   cp .env.example .env
   ```

2. **Configure Environment Variables**  
   Update the `.env` file with your specific configuration details, including database settings and front-end access.

3. **Google Authentication Credentials**  
   Obtain your Google authentication credentials by following [this guide](https://developers.google.com/identity/protocols/oauth2). Add the redirect URL `http://localhost:8000/api/auth/callback` and fill in the `.env` file with the client ID and client secret.

4. **Build and Run the Docker Containers**  
   With the setup complete, you can now run the Docker command to spin up your application:

   ```bash
   docker-compose up -d
   ```

5. **Access the Application**  
   Tapiz will now be accessible at [http://localhost:4300](http://localhost:4300).
