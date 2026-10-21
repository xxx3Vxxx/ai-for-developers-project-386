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
- **Контракты:** TypeSpec → OpenAPI 3.0.0 → типы и клиентский SDK
  (`@hey-api/openapi-ts`, ADR-0008, ADR-0017); фронтенд вызывает сгенерированные
  операции, бекенд берёт только типы.
- **Тесты:** Vitest; браузерные E2E — Playwright (ADR-0018)
- **Линтер/формат:** ESLint (flat config) + Prettier, проверка типов через `tsc`
- **Пакетный менеджер:** npm (workspaces)

## Структура

```
.
├── contracts/               # TypeSpec-контракты и генерация SDK (ADR-0008, ADR-0017)
│   ├── main.tsp             # источник истины контракта
│   ├── tspconfig.yaml       # эмиттер OpenAPI, версия пинится как 3.0.0
│   └── openapi-ts.config.ts # генератор типов и клиентского SDK (@hey-api/openapi-ts)
├── backend/                 # Fastify API
│   ├── src/app.ts           # buildApp() — сборка приложения (используется и в тестах)
│   ├── src/server.ts        # точка входа, читает PORT/HOST
│   └── test/smoke.test.ts   # дымовой тест
├── frontend/                # Vite + React + Mantine
│   └── src/App.tsx
├── e2e/                     # браузерные E2E-сценарии (Playwright, ADR-0018)
├── playwright.config.ts     # конфиг E2E: прод-сборка на БД :memory:
├── Dockerfile               # прод-образ: API + статика фронта (ADR-0014)
├── .dockerignore            # контекст сборки образа
├── .githooks/commit-msg     # проверка Conventional Commits + ссылки на тикет (ADR-0019)
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
- `npm run contracts:generate` — сгенерировать OpenAPI 3.0.0, типы и клиентский
  SDK из `contracts/main.tsp`; выполняется автоматически перед `typecheck`, `test` и
  `build`. Артефакты (`contracts/tsp-output/`, `contracts/generated/`) не
  коммитятся.
- `make check` — линтер + типы + тесты (прогнать перед коммитом).
- `npm run e2e` (или `make e2e`) — браузерные E2E на прод-сборке; в CI отдельный
  job. Прогон поднимает бекенд на изолированной БД `:memory:` (ADR-0018).
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

Каждый коммит **ссылается на тикет** в теме, например
`feat(backend): add booking endpoint (#29)` — от этого зависит трассируемость
(ADR-0019). Формат и ссылку проверяет хук `.githooks/commit-msg`; он включается
автоматически при `npm install` (`prepare` → `git config core.hooksPath .githooks`).

## CI и ограничения

CI (`.github/workflows/ci.yml`) запускается на каждый push и pull request. Job
`quality`: `npm ci` → `npm run lint` → `npm run typecheck` → `npm test` →
`npm run build`. Job `e2e`: `npm ci` → установка браузеров → `npm run e2e`.
Держите оба прогона зелёными.

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

### MCP-серверы

Конфигурация MCP живёт в `opencode.json` (секция `mcp.servers`). Секреты не
коммитим: значения подставляются из окружения через `{env:NAME}` (например
`RENDER_API_KEY`, см. `.env.example` и README).
