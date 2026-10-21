---
status: accepted
---

# Клиентский SDK из OpenAPI: `@hey-api/openapi-ts` генерирует и типы, и клиент

Требование проекта — **генерировать из OpenAPI не только типы, но и клиентский
SDK**. Это уточняет ADR-0008: раньше из OpenAPI генерировались **только типы**
(`openapi-typescript`), а клиент собирался руками через `createClient<paths>()`
(`openapi-fetch`). Теперь источник контракта (TypeSpec → OpenAPI 3.0.0) не
меняется, но генератор один — **`@hey-api/openapi-ts`**: он выдаёт из той же спеки
**типы и SDK**.

## Что генерируется и как потребляется

- Команда `npm run contracts:generate` (см. `contracts/openapi-ts.config.ts`):
  TypeSpec → `openapi.yaml` → `@hey-api/openapi-ts` → `contracts/generated/`
  (`types.gen.ts`, `sdk.gen.ts`, `client.gen.ts`, `client/`, `core/`). Артефакты
  по-прежнему **не коммитятся** (ADR-0008) и производятся перед `typecheck`,
  `test`, `build` и стадией `contracts` прод-`Dockerfile` (ADR-0014).
- Пакет `contracts` отдаёт три точки входа: `.` — SDK и типы (для фронтенда),
  `./types` — только типы (без клиента), `./client` — экземпляр клиента.
- **Фронтенд** настраивает сгенерированный клиент под текущий origin
  (`client.setConfig({ baseUrl: "" })`; пути в спеке уже с префиксом `/api`) и
  вызывает сгенерированные операции (`getConfig`, `listEventTypes`, `listSlots`,
  `listBookings`, `createEventType`, `createBooking`). Единственный модуль-клей —
  `frontend/src/api/client.ts`; ручного `createClient<paths>()` больше нет.
- **Бекенд** берёт из спеки только типы через `contracts/types`
  (подпуть без клиента: сгенерированный клиент тянет DOM-типы вроде `BodyInit`, а
  у бекенда `lib: ES2022` без DOM). Маршруты и валидация остаются ручными
  (ADR-0005 не пересматривается).
- Генерируемые импорты получают расширение **`.js`** (`importFileExtension`):
  один и тот же артефакт читают фронтенд (`moduleResolution: Bundler`, который
  разворачивает `.js` → `.ts`) и бекенд (`NodeNext`, который требует расширение).

## Considered Options

- **Оставить `openapi-typescript` (только типы) + ручной `openapi-fetch`** —
  отброшено: формально не выполняет требование «генерировать SDK».
- **`openapi-typescript-codegen`** — отброшено: менее поддерживаемый предшественник
  `@hey-api/openapi-ts`.
- **OpenAPI Generator (JVM)** — отброшено: тянет JVM, что противоречит ADR-0008.
- **Два генератора (типы для бекенда + SDK для фронта)** — отброшено: две точки
  правды от одной спеки и лишний инструмент; `@hey-api/openapi-ts` покрывает оба
  потребителя, а бекенду достаточно подпути `./types`.

## Consequences

- ADR-0008 в части «генерируем только типы» заменён этим решением; остальное
  (TypeSpec как источник, OpenAPI 3.0.0, некоммитимые артефакты, стадия в
  `Dockerfile`) сохраняется.
- Контрактный тест (`contracts/test/pipeline.test.ts`) дополнительно пиннит
  наличие сгенерированного SDK и операций.
- Компонентные тесты фронтенда мокают сгенерированные операции
  (`frontend/test/helpers/api.ts`), а не путь+метод.
- Обновление спеки автоматически меняет и типы, и SDK; при breaking-change в
  генераторе фронтенд ломается на `typecheck`, а не в рантайме.
