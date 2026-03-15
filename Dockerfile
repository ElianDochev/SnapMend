FROM oven/bun:1.3.10 AS base
WORKDIR /app

FROM base AS deps
COPY package.json ./
COPY bun.lock ./bun.lock
COPY api/package.json api/package.json
COPY client/package.json client/package.json
RUN bun install --frozen-lockfile

FROM deps AS build
COPY . .
RUN bun run build

FROM base AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/api ./api
COPY --from=build /app/client ./client
COPY --from=build /app/test-scenerio ./test-scenerio
EXPOSE 3000
CMD ["bun", "run", "--cwd", "api", "start"]
