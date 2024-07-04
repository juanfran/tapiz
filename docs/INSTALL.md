## Prerequisites

- Docker installed on your system.

## Installation & Configuration

Follow these steps to set up Tapiz using Docker:

1. **Copy the Example Environment File**  
   Create a copy of the example environment file `.env.example` and name it `.env`:

   ```bash
   cp .env.example .env
   ```

2. **Configure Environment Variables**  
   Open the newly created `.env` file and update it with your specific configuration details, including database settings and front-end access. Modify the `nginx.conf` as needed.

3. **Set Up Google Authentication Credentials**  
   Follow [this guide](https://developers.google.com/identity/protocols/oauth2) to obtain your Google authentication credentials. Make sure to add the redirect URL `http://localhost:8000/api/auth/callback`. Enter the client ID and client secret into the `.env` file.

4. **Build and Run the Docker Containers**  
   Once your environment variables are configured, build and start the Docker containers by running:

   ```bash
   docker-compose up -d
   ```

5. **Access the Application**  
   Your Tapiz application will be accessible at [http://localhost:4300](http://localhost:4300).
