# SnapMend

SnapMend is an AI-powered home repair assistant that analyzes photos and voice descriptions of household problems and provides step-by-step instructions, material estimates, and guidance on how to fix them.

## Project layout

- `api/`: NestJS backend. It exposes all HTTP endpoints under `/api`, serves the built frontend for same-origin deployment, and contains Jest tests.
- `client/`: React + TypeScript frontend boilerplate. It is intentionally separate from the backend so UI code and API code do not mix.
- `logos/`: project assets supplied in the repository.

## Why this split exists

The app is deployed as a single container and listens on one port, but the codebase stays clean:

- the backend owns routing, API endpoints, validation, and server-side behavior
- the frontend owns the browser UI and builds into static assets
- Docker builds both pieces, then NestJS serves the client build and keeps the API available at `/api/*`

This gives same-origin behavior in production without blending the frontend and backend implementation details together.

## Current backend scope

The initial backend includes:

- `GET /api/health`
- `POST /api/analyze`
- `GET /api/cases`
- `GET /api/cases/:id`

Analysis now uses OpenAI for:

- voice transcription when an audio file is uploaded
- repair-plan generation from the title, optional description, optional transcript, and optional image

The backend fails fast on startup if required OpenAI environment variables are missing, with an explanation of what is missing and why it is needed.

## Local commands

```bash
bun install
bun run build
bun run lint
bun run format
bun run test
```

## Docker

```bash
docker compose up --build
```

The app is served from `http://localhost:3000`, and the API is available under `http://localhost:3000/api`.
