# AGENTS.md

Рабочие правила проекта «Календарь звонков» (учебный проект Хекслета,
<https://ru.hexlet.io/programs/ai-for-developers>).

## Что это

Каркас веб-приложения для сервиса бронирования календаря. На текущем этапе
функционала нет — есть только работающие бекенд, фронтенд, тесты, линтеры и CI.

## Стек

- **Язык:** TypeScript
- **Бекенд:** Fastify
- **Фронтенд:** Vite + React + [Mantine](https://mantine.dev/)
- **Тесты:** Vitest
- **Линтер/формат:** ESLint (flat config) + Prettier, проверка типов через `tsc`
- **Пакетный менеджер:** npm (workspaces)

## Структура

```
.
├── backend/                 # Fastify API
│   ├── src/app.ts           # buildApp() — сборка приложения (используется и в тестах)
│   ├── src/server.ts        # точка входа, читает PORT/HOST
│   └── test/smoke.test.ts   # дымовой тест
├── frontend/                # Vite + React + Mantine
│   └── src/App.tsx
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

## Установка

```bash
npm install
```

## Команды

Все команды выполняются из корня репозитория.

| Команда                | Что делает                                                   |
| ---------------------- | ------------------------------------------------------------ |
| `npm run dev`          | Запускает бекенд (`:3000`) и фронтенд (`:5173`) одновременно |
| `npm run dev:backend`  | Только бекенд (`tsx watch`)                                  |
| `npm run dev:frontend` | Только фронтенд (Vite dev server)                            |
| `npm test`             | Прогоняет тесты во всех воркспейсах (Vitest)                 |
| `npm run lint`         | ESLint по всему репозиторию                                  |
| `npm run lint:fix`     | ESLint с автоисправлением                                    |
| `npm run typecheck`    | Проверка типов (`tsc --noEmit`) во всех воркспейсах          |
| `npm run build`        | Сборка всех воркспейсов                                      |
| `npm run format`       | Форматирование Prettier                                      |
| `npm run format:check` | Проверка форматирования                                      |

Те же действия доступны через `make` (полный список — `make help`):

| Команда          | Что делает                          |
| ---------------- | ----------------------------------- |
| `make install`   | Установка зависимостей              |
| `make dev`       | Бекенд и фронтенд одновременно      |
| `make test`      | Тесты                               |
| `make lint`      | Линтер                              |
| `make typecheck` | Проверка типов                      |
| `make build`     | Сборка                              |
| `make check`     | Линтер + типы + тесты               |
| `make ci`        | Полный прогон, как в GitHub Actions |
| `make clean`     | Удалить `node_modules` и сборку     |

Адреса при локальном запуске:

- Бекенд: <http://localhost:3000> (проверка — `GET /health` → `{"status":"ok"}`)
- Фронтенд: <http://localhost:5173>
- Запросы фронтенда на `/api/*` проксируются на бекенд (`http://localhost:3000`).

## Правила коммитов

Проект использует [Conventional Commits](https://www.conventionalcommits.org/).

Формат:

```
<type>(<scope>): <description>
```

- `type` — обязателен, один из: `feat`, `fix`, `docs`, `style`, `refactor`,
  `perf`, `test`, `build`, `ci`, `chore`, `revert`.
- `scope` — необязателен, например `backend`, `frontend`, `ci`.
- `description` — краткое описание в повелительном наклонении, без точки в конце.
- Ломающие изменения помечаются `!` после типа/скоупа или футером
  `BREAKING CHANGE:`.

Примеры:

```
feat(backend): add booking endpoint
fix(frontend): correct date picker timezone
test(backend): cover health endpoint
chore: bump dependencies
docs: describe release process
```

Правило: **каждый коммит в `main` должен соответствовать Conventional Commits**,
иначе release-please не построит корректный CHANGELOG и не предложит версию.

## Релизы

За релизы отвечает [release-please](https://github.com/googleapis/release-please)
(workflow `.github/workflows/release-please.yml`, конфиг
`release-please-config.json` и манифест `.release-please-manifest.json`).

Как это работает:

1. Коммиты с `feat:` / `fix:` попадают в `main`.
2. release-please открывает (или обновляет) release-PR с новой версией и CHANGELOG.
3. Мерж release-PR создаёт git-тег и GitHub Release.

## CI

`.github/workflows/ci.yml` запускается на каждый push и pull request и выполняет
по порядку: `npm ci` → `npm run lint` → `npm run typecheck` → `npm test` →
`npm run build`. Прогон должен быть зелёным.

## Важно

- **Не удаляйте и не редактируйте `.github/workflows/hexlet-check.yml`** и не
  переименовывайте репозиторий — это автопроверка Хекслета.
- Держите `npm run lint`, `npm run typecheck` и `npm test` зелёными перед
  коммитом.

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
