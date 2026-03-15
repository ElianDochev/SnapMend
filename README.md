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
- product lookup through OpenAI web search so the response can include hardware links

The backend fails fast on startup if required OpenAI environment variables are missing, with an explanation of what is missing and why it is needed.

Each repair result now also includes:

- evidence grounded in the image, text prompt, and optional voice transcript
- product recommendations with store links when the repair needs tools or replacement parts

## Local commands

```bash
bun install
bun run build
bun run lint
bun run format
bun run test
```

## Required environment variables

```bash
SKIP_OPENAI_API_KEY_CHECK
OPENAI_API_KEY
OPENAI_ANALYSIS_MODEL
OPENAI_PRODUCT_SEARCH_MODEL
OPENAI_TRANSCRIPTION_MODEL
```

`SKIP_OPENAI_API_KEY_CHECK` defaults to `false`. When it is `false`, the backend exits at startup if `OPENAI_API_KEY` is missing. When it is `true`, the startup check for `OPENAI_API_KEY` is skipped.

This bypass is only useful for local scaffolding or frontend work where you want the app to boot without a real key. It does not make OpenAI-backed endpoints usable without credentials.

The model environment variables are still required even when the API-key check is skipped, because the backend still needs a complete runtime configuration.

## Docker

```bash
docker compose up --build
```

The app is served from `http://localhost:3000`, and the API is available under `http://localhost:3000/api`.

## Real scenario test

The repository contains a live multimodal test case in `test-scenerio/`:

- `test-image.jpg`
- `test-user-prompt.txt`
- `user-prompt-voice.m4a`

This test is intended to run with real OpenAI credentials inside the container after the app image is built.

Run it inside the container:

```bash
docker compose run --rm app bun real-test
```

The script loads the scenario assets, sends them through the real backend analysis flow, and validates that the result:

- identifies the cabinet hinge issue
- mentions the missing screw
- recommends a Phillips screwdriver
- suggests looking for the missing screw before buying a replacement
- returns product links for the screwdriver and screw

The command prints the full JSON result and exits non-zero if the validation fails.
