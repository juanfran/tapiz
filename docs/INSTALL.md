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
