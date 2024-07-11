# How to Install Tapiz Locally for Development

## Requirements

- **Node and PNPM**: Ensure you have the versions specified in the `engines` section of the [package.json](../package.json) file.
- **PostgreSQL**: Use the same version as specified in the [docker-compose.yaml](../docker-compose.yaml) file.

## Configuration

1. Create a `.env` file in the root directory of the project.
2. Follow the detailed instructions provided in [INSTALL.md](INSTALL.md) to fill in the required environment variables.

## Installation

To install the necessary dependencies, run:

```shell
pnpm install
```

## Running the Application

To start the application, use the following commands:

```shell
pnpm start
pnpm start:api
```

Tapiz should now be accessible at `http://localhost:4300/`.
