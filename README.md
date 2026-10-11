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
