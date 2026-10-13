# AGENTS.md

Рабочие правила проекта «Календарь звонков» (учебный проект Хекслета,
<https://ru.hexlet.io/programs/ai-for-developers>).

## Что это

Каркас веб-приложения для сервиса бронирования календаря. Функционала пока нет —
есть бекенд, фронтенд, тесты, линтеры и CI.

## Стек

- **Язык:** TypeScript
- **Бекенд:** Fastify
- **Фронтенд:** Vite + React + [Mantine](https://mantine.dev/)
- **Контракты:** TypeSpec → OpenAPI 3.0.0 → типы (`openapi-typescript`), клиент
  на `openapi-fetch` (ADR-0008)
- **Тесты:** Vitest
- **Линтер/формат:** ESLint (flat config) + Prettier, проверка типов через `tsc`
- **Пакетный менеджер:** npm (workspaces)

## Структура

```
.
├── contracts/               # TypeSpec-контракты HTTP API (ADR-0008)
│   ├── main.tsp             # источник истины контракта
│   └── tspconfig.yaml       # эмиттер OpenAPI, версия пинится как 3.0.0
├── backend/                 # Fastify API
│   ├── src/app.ts           # buildApp() — сборка приложения (используется и в тестах)
│   ├── src/server.ts        # точка входа, читает PORT/HOST
│   └── test/smoke.test.ts   # дымовой тест
├── frontend/                # Vite + React + Mantine
│   └── src/App.tsx
├── Dockerfile               # прод-образ: API + статика фронта (ADR-0014)
├── .dockerignore            # контекст сборки образа
├── .github/workflows/
│   ├── ci.yml               # линтер, типы, тесты, сборка
│   ├── release-please.yml   # релизы по Conventional Commits
│   └── hexlet-check.yml     # автопроверка Хекслета — НЕ ТРОГАТЬ
├── eslint.config.mjs
├── tsconfig.base.json
└── Makefile                 # удобные команды (make help)
```

## Требования

- Node.js **>= 22**
- npm (идёт вместе с Node)

## Команды

Все команды выполняются из корня репозитория. Скрипты — в `package.json`, цели —
`make help`. Ключевое:

- `npm install` — установка зависимостей.
- `npm run contracts:generate` — сгенерировать OpenAPI 3.0.0 и типы из
  `contracts/main.tsp`; выполняется автоматически перед `typecheck`, `test` и
  `build`. Артефакты (`contracts/tsp-output/`, `contracts/generated/`) не
  коммитятся.
- `make check` — линтер + типы + тесты (прогнать перед коммитом).
- `make dev` — бекенд и фронтенд вместе.
- `make docker-build` / `make docker-run` — собрать и запустить прод-образ
  (API + статика фронта в одном контейнере, ADR-0014).
- backend :3000 (`GET /health` → `{"status":"ok"}`), frontend :5173; запросы
  фронтенда на `/api/*` проксируются на backend.

## Правила коммитов

[Conventional Commits](https://www.conventionalcommits.org/):
`<type>(<scope>): <description>`. Типы: `feat`, `fix`, `docs`, `style`,
`refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`. `scope`
необязателен (например `backend`, `frontend`, `ci`), `description` — в
повелительном наклонении, без точки в конце.

Каждый коммит в `main` обязан следовать формату — от этого зависит
release-please (CHANGELOG и версия).

Пример: `feat(backend): add booking endpoint`

## CI и ограничения

CI (`.github/workflows/ci.yml`) запускается на каждый push и pull request:
`npm ci` → `npm run lint` → `npm run typecheck` → `npm test` → `npm run build`.
Держите прогон зелёным.

Не удаляйте и не редактируйте `.github/workflows/hexlet-check.yml` и не
переименовывайте репозиторий — это автопроверка Хекслета.

## Agent skills

### Трекер задач

Задачи живут в GitHub Issues этого репозитория (через CLI `gh`). См.
`docs/agents/issue-tracker.md`.

### Метки триажа

Пять канонических ролей триажа отображаются 1:1 на метки: `needs-triage`,
`needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. См.
`docs/agents/triage-labels.md`.

### Документы предметной области

Один контекст: один `GLOSSARY.md` + `docs/adr/` в корне репозитория. См.
`docs/agents/domain.md`.
