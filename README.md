# Календарь звонков

[![hexlet-check](https://github.com/xxx3Vxxx/ai-for-developers-project-386/actions/workflows/hexlet-check.yml/badge.svg)](https://github.com/xxx3Vxxx/ai-for-developers-project-386/actions)

Разработайте совместно с ИИ сервис для бронирования календаря

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

- Бекенд: http://localhost:3000 (`GET /health` → `{"status":"ok"}`)
- Фронтенд: http://localhost:5173

Проверки:

```bash
npm test          # тесты (Vitest)
npm run lint      # линтер (ESLint)
npm run typecheck # проверка типов (tsc)
npm run build     # сборка
```

---

<details>
<summary>Автоматические тесты Хекслета</summary>

Тесты запускаются на каждый коммит. За запуск отвечает файл `.github/workflows/hexlet-check.yml` — не удаляйте и не переименовывайте ни его, ни репозиторий.

</details>

## О Хекслете

[Хекслет](https://ru.hexlet.io/) — школа программирования: авторские программы обучения с практикой, поддержкой наставников и реальными проектами, которые остаются в резюме. Этот репозиторий — один из таких проектов.
