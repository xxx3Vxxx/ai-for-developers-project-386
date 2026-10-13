# Календарь звонков

[![hexlet-check](https://github.com/xxx3Vxxx/ai-for-developers-project-386/actions/workflows/hexlet-check.yml/badge.svg)](https://github.com/xxx3Vxxx/ai-for-developers-project-386/actions)

Сервис для бронирования календаря, разработанный совместно с ИИ.

Учебный проект Хекслета: https://ru.hexlet.io/programs/ai-for-developers
Как это должно работать: https://files.hexlet.app/a/2ipc5m

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

| Переменная             | Дефолт                   | Значение                                                          |
| ---------------------- | ------------------------ | ----------------------------------------------------------------- |
| `PORT`                 | `3000`                   | целое 1–65535                                                     |
| `HOST`                 | `0.0.0.0`                | непустая строка                                                   |
| `DATABASE_PATH`        | `./data/calendar.sqlite` | непустой путь к файлу SQLite; каталог создаётся при старте        |
| `SERVICE_TIMEZONE`     | `Europe/Moscow`          | валидная IANA-зона                                                |
| `WORK_DAY_START`       | `09:00`                  | `HH:MM` (24 ч), начало раньше конца                                |
| `WORK_DAY_END`         | `18:00`                  | `HH:MM` (24 ч)                                                    |
| `BOOKING_WINDOW_DAYS`  | `14`                     | целое 1–365                                                       |

### Контракты API

HTTP-контракт описан на [TypeSpec](https://typespec.io/) в `contracts/main.tsp`; из него
генерируются OpenAPI 3.0.0 и типы (`contracts/generated/openapi.d.ts`), которыми
пользуются бекенд и фронтенд. Артефакты не коммитятся: они создаются командой
`npm run contracts:generate` (она же выполняется автоматически перед `typecheck`,
`test` и `build`).

Проверки:

```bash
npm test          # тесты (Vitest)
npm run lint      # линтер (ESLint)
npm run typecheck # проверка типов (tsc)
npm run build     # сборка

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
make ci     # полный прогон, как в GitHub Actions
make clean  # удалить node_modules и артефакты сборки
make help   # список всех команд
```

---

<details>
<summary>Автоматические тесты Хекслета</summary>

Тесты запускаются на каждый коммит. За запуск отвечает файл `.github/workflows/hexlet-check.yml` — не удаляйте и не переименовывайте ни его, ни репозиторий.

</details>

## О Хекслете

[Хекслет](https://ru.hexlet.io/) — школа программирования: авторские программы обучения с практикой, поддержкой наставников и реальными проектами, которые остаются в резюме. Этот репозиторий — один из таких проектов.
