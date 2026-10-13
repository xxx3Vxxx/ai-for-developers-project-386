# syntax=docker/dockerfile:1
#
# Прод-образ «Календаря звонков»: один контейнер отдаёт и API, и статику фронта
# (ADR-0014). Сборка из корня репозитория: `docker build .`.
#
# База — node:22-bookworm-slim (паритет с CI); стадии, где может компилироваться
# better-sqlite3, получают python3/make/g++.

FROM node:22-bookworm-slim AS base
WORKDIR /app

# Тулчейн под нативную сборку better-sqlite3 в стадиях сборки.
FROM base AS build-base
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

# deps: все workspace'ы с dev-зависимостями (нужны для генерации и сборки).
FROM build-base AS deps
COPY package.json package-lock.json ./
COPY contracts/package.json contracts/package.json
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm ci

# contracts: генерируем OpenAPI и типы внутри docker build (ADR-0008, ADR-0014).
FROM deps AS contracts
COPY contracts ./contracts
RUN npm run contracts:generate

# build: tsc бекенда + vite build фронта; контракты уже сгенерированы выше.
FROM contracts AS build
COPY tsconfig.base.json ./
COPY backend ./backend
COPY frontend ./frontend
RUN npm run build --workspaces --if-present

# prod-deps: только рантайм-зависимости (better-sqlite3 остаётся нативной сборкой).
FROM build-base AS prod-deps
COPY package.json package-lock.json ./
COPY contracts/package.json contracts/package.json
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm ci --omit=dev

# runtime: non-root, статика фронта рядом с собранным бекендом, БД в /app/data.
FROM base AS runtime

COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/backend/dist ./backend/dist
COPY --from=build --chown=node:node /app/backend/package.json ./backend/package.json
COPY --from=build --chown=node:node /app/frontend/dist ./frontend/dist
COPY --from=build --chown=node:node /app/contracts/package.json ./contracts/package.json

# Каталог под SQLite принадлежит node (ADR-0014); VOLUME не объявляем — том
# размечает тот, кто запускает контейнер (`-v calendar-data:/app/data`).
RUN mkdir -p /app/data && chown node:node /app/data

# PORT/HOST читаются из env (ADR-0013), ENV PORT не хардкодим.
USER node
EXPOSE 3000
CMD ["node", "backend/dist/server.js"]
