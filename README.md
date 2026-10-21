# Календарь звонков

[![hexlet-check](https://github.com/xxx3Vxxx/ai-for-developers-project-386/actions/workflows/hexlet-check.yml/badge.svg)](https://github.com/xxx3Vxxx/ai-for-developers-project-386/actions)

Сервис для бронирования календаря, разработанный совместно с ИИ.

Учебный проект Хекслета: https://ru.hexlet.io/programs/ai-for-developers
Как это должно работать: https://files.hexlet.app/a/2ipc5m

## Демо

Опубликованное приложение: <https://xxx3vxxx-hexlet-ai-for-developers.onrender.com>

> Сервис развёрнут на бесплатном плане Render и засыпает после простоя —
> первый запрос может занять до минуты.

## Стек

- TypeScript
- Бекенд: [Fastify](https://fastify.dev/)
- Фронтенд: [Vite](https://vite.dev/) + [React](https://react.dev/) + [Mantine](https://mantine.dev/)
- Тесты: [Vitest](https://vitest.dev/)
- Линтер и формат: ESLint + Prettier
- Пакетный менеджер: npm (workspaces)

## Установка

Требуется Node.js >= 22.

```bash
git clone https://github.com/xxx3Vxxx/ai-for-developers-project-386.git
cd ai-for-developers-project-386
npm install
```

## Использование

Запуск бекенда и фронтенда одновременно:

```bash
npm run dev
```

Отдельные сервисы:

```bash
npm run dev:backend  # только бекенд (tsx watch)
npm run dev:frontend # только фронтенд (Vite dev server)
```

- Бекенд: http://localhost:3000 (`GET /health` → `{"status":"ok"}`)
- Фронтенд: http://localhost:5173
- Запросы фронтенда на `/api/*` проксируются на бекенд (`http://localhost:3000`).

### Переменные окружения

Вся конфигурация читается из переменных окружения один раз при старте
(`backend/src/config.ts`, ADR-0013). Файл `.env` автоматически не подхватывается —
задайте переменные в окружении; полный список с дефолтами — в `.env.example`.
Некорректное значение переменной роняет старт с понятной ошибкой.

| Переменная            | Дефолт                   | Значение                                                   |
| --------------------- | ------------------------ | ---------------------------------------------------------- |
| `PORT`                | `3000`                   | целое 1–65535                                              |
| `HOST`                | `0.0.0.0`                | непустая строка                                            |
| `DATABASE_PATH`       | `./data/calendar.sqlite` | непустой путь к файлу SQLite; каталог создаётся при старте |
| `SERVICE_TIMEZONE`    | `Europe/Moscow`          | валидная IANA-зона                                         |
| `WORK_DAY_START`      | `09:00`                  | `HH:MM` (24 ч), начало раньше конца                        |
| `WORK_DAY_END`        | `18:00`                  | `HH:MM` (24 ч)                                             |
| `BOOKING_WINDOW_DAYS` | `14`                     | целое 1–365                                                |

### MCP-серверы

Инструменты разработки описаны в `opencode.json` в корне репозитория (секция
`mcp.servers`). Секреты в конфиг не попадают: значения подставляются из
переменных окружения через `{env:NAME}`.

| Сервер   | Переменная       | Назначение                             |
| -------- | ---------------- | -------------------------------------- |
| `render` | `RENDER_API_KEY` | работа с инфраструктурой Render по MCP |

Как задать ключ:

```bash
export RENDER_API_KEY=...   # Render Dashboard → Account Settings → API Keys
```

`RENDER_API_KEY` нужен только для MCP-инструментов и **не коммитится**: `.env`
в `.gitignore`, в репозитории лежит лишь имя переменной (`.env.example`). В CI
ключ можно передать через GitHub Secret, если MCP понадобится в сборке.

### Контракты API

HTTP-контракт описан на [TypeSpec](https://typespec.io/) в `contracts/main.tsp`; из него
генерируются OpenAPI 3.0.0, типы и **клиентский SDK** (`@hey-api/openapi-ts`), которыми
пользуются бекенд и фронтенд. Артефакты не коммитятся: они создаются командой
`npm run contracts:generate` (она же выполняется автоматически перед `typecheck`,
`test` и `build`).

- Фронтенд вызывает сгенерированные операции (`getConfig`, `listEventTypes`,
  `listSlots`, `listBookings`, `createEventType`, `createBooking`); ручного клиента
  нет — только настройка origin в `frontend/src/api/client.ts`.
- Бекенд берёт из спеки только типы (`contracts/types`); маршруты и валидация —
  руками (ADR-0005).

Решения: ADR-0008, ADR-0017.

Проверки:

```bash
npm test          # тесты (Vitest)
npm run lint      # линтер (ESLint)
npm run typecheck # проверка типов (tsc)
npm run build     # сборка
npm run e2e       # браузерные E2E (Playwright, сборка + прогон)

npm run format       # форматирование (Prettier)
npm run format:check # проверка форматирования
```

Те же команды доступны через Makefile:

```bash
make dev    # бекенд + фронтенд
make contracts-generate # TypeSpec → OpenAPI → типы
make test   # тесты
make lint   # линтер
make check  # линтер + типы + тесты
make e2e    # браузерные E2E (Playwright)
make ci     # полный прогон, как в GitHub Actions
make docker-build # собрать прод-образ
make docker-run   # запустить прод-образ с томом под БД
make clean  # удалить node_modules и артефакты сборки
make help   # список всех команд
```

### Прод-образ (Docker)

Приложение поставляется одним образом из корневого `Dockerfile` (ADR-0014):
контейнер отдаёт и API, и статику фронта, а `GET /` возвращает приложение.
Контракты генерируются внутри сборки образа, `PORT`/`HOST` читаются из
окружения, а SQLite лежит в `/app/data/calendar.sqlite`.

```bash
make docker-build            # docker build -t calendar:local .
make docker-run              # docker run --rm -p 3000:3000 -v calendar-data:/app/data calendar:local
```

`docker-run` поднимает контейнер на `http://localhost:3000` с именованным томом
под базу, поэтому данные не теряются между перезапусками. Без тома поднимается
свежая БД (схема идемпотентна, сид — `INSERT OR IGNORE`).

---

<details>
<summary>Автоматические тесты Хекслета</summary>

Тесты запускаются на каждый коммит. За запуск отвечает файл `.github/workflows/hexlet-check.yml` — не удаляйте и не переименовывайте ни его, ни репозиторий.

</details>

## О Хекслете

[Хекслет](https://ru.hexlet.io/) — школа программирования: авторские программы обучения с практикой, поддержкой наставников и реальными проектами, которые остаются в резюме. Этот репозиторий — один из таких проектов.
