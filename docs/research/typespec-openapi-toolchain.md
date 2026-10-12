# TypeSpec → OpenAPI → генерация типов: факты по тулчейну

Отчёт для wayfinder-тикета #18. Только **факты** со ссылками на первоисточники
(official docs, npm registry, репозитории). Решения здесь не принимаются.

Дата сбора: 2026-10-12. Версии — на этот момент (актуальны, пока не отмечено иное).

---

## TL;DR

- **TypeSpec** стабилен: `@typespec/compiler` **1.17.0**, официальный эмиттер
  `@typespec/openapi3` **1.17.0**. Чистый Node (engines `node >=22.0.0`), **Java не нужна**.
- Дефолт эмиттера — **OpenAPI 3.0.0**; 3.1.0/3.2.0 доступны опцией
  `openapi-versions`. При этом шаблон `tsp init` «Generic REST API» предлагает
  отдельный вариант «OpenAPI 3.1 document».
- **OpenAPI Generator** (npm-обёртка `@openapitools/openapi-generator-cli` 2.41.0)
  **требует Java**: скачивает JAR (~33.7 MB) и запускает `java` (минимум **JDK 11**).
  Именно он, и только он, приносит JVM в CI/Docker.
- У OpenAPI Generator **нет генератора под Fastify**. Node-серверные генераторы —
  только `nodejs-express-server (beta)`, `typescript-nestjs-server (beta)`,
  `graphql-nodejs-express-server`. Поэтому беку на Fastify он даёт только
  типы/клиент, но не серверную валидацию.
- **Только типы**: `openapi-typescript` (runtime-free `.d.ts`).
  **Типы + клиент + валидация**: `orval` (Zod), `@hey-api/openapi-ts` (плагины Zod/Valibot/Ajv),
  `typescript-fetch` (клиент с runtime-проверками). Ни один из них не генерирует
  валидацию для Fastify → с ADR-0005 (ручной валидатор) напрямую не конфликтуют,
  если генерируемое остаётся на фронтенде.

---

## 1. TypeSpec

### Версии и требования

| Пакет | latest | engines | Опубликован |
| --- | --- | --- | --- |
| `@typespec/compiler` | **1.17.0** | `node >=22.0.0` | 2026-10-08 |
| `@typespec/openapi3` | **1.17.0** | `node >=22.0.0` | 2026-10-08 |
| `@typespec/http` | **1.17.0** | `node >=22.0.0` | 2026-10-08 |

- `next`-тег компилятора — `1.18.0-dev.2` (пре-релиз).
- Источник версий/движка: npm registry (`https://registry.npmjs.org/@typespec%2Fcompiler`
  и `.../@typespec%2Fopenapi3`).
- Лендинг сайта подтверждает актуальную версию: «Version 1.17.0 is now available!»
  — <https://typespec.io/>.

### Официальный OpenAPI-эмиттер

- Пакет `@typespec/openapi3`. Описание из registry: «TypeSpec library for emitting
  **OpenAPI 3.0 and OpenAPI 3.1** from the TypeSpec REST protocol binding and
  converting OpenAPI3 to TypeSpec».
- Peer-зависимости: `@typespec/compiler ^1.17.0`, `@typespec/http ^1.17.0`,
  `@typespec/openapi ^1.17.0`, `@typespec/json-schema ^1.17.0` и др.
- Документация эмиттера: <https://typespec.io/docs/emitters/openapi3/reference/>.

### Как компилируется

**CLI** (официальная установка — `npm install -g @typespec/compiler` или как
dev-dependency):

```
tsp compile .
tsp compile . --emit=@typespec/openapi3
tsp compile . --watch
```

Источник: <https://typespec.io/docs/> (Installation) и
<https://typespec.io/docs/emitters/openapi3/reference/emitter/>.

**Через `tspconfig.yaml`**:

```yaml
emit:
  - "@typespec/openapi3"
options:
  "@typespec/openapi3":
    openapi-versions: ["3.0.0"]
```

Источник: та же страница emitter usage.

**JS API**: `@typespec/compiler` экспортирует `compile` и `NodeHost`
(подтверждено по `dist/src/index.d.ts` пакета 1.17.0). Сигнатура из исходников
(`packages/compiler/src/core/program.ts`):

```ts
export async function compile(
  host: CompilerHost,
  mainFile: string,
  options: CompilerOptions = {},
  oldProgram?: Program,
);
```

Эмиттеры запускаются внутри `compile`, если в `options` задан `emit`;
выходной каталог формируется как `[options.outputDir, <metadata.name>]`
(тоже из `program.ts`). То есть программный путь — примерно:

```ts
import { compile, NodeHost } from "@typespec/compiler";
await compile(NodeHost, "main.tsp", {
  emit: ["@typespec/openapi3"],
  outputDir: "./tsp-output",
});
```

> Замечание честности: официального рецепта «programmatic emit» на сайте
> TypeSpec в явном виде нет; `compile` и `NodeHost` — публичные экспорты
> (проверено по `index.d.ts`), а сборка эмиттеров при заданном `emit` — по коду
> `program.ts`. Есть дискуссия microsoft/typespec#6383 о том, что
> `createCLICompilerHost` не экспортируется (<https://github.com/microsoft/typespec/discussions/6383>).

### Версия OpenAPI на выходе

- Опция `openapi-versions`: тип `"3.0.0" | "3.1.0" | "3.2.0"`,
  **Default: `["3.0.0"]`**.
- Источник: <https://typespec.io/docs/emitters/openapi3/reference/emitter/>
  (раздел `openapi-versions`).

**Противоречие/нюанс (важно):** дефолт эмиттера — 3.0.0, но шаблон
`tsp init` «Generic REST API» содержит предвыбранную опцию с подписью
**«OpenAPI 3.1 document»** и настройками:

```json
"emitters": {
  "@typespec/openapi3": {
    "selected": true,
    "label": "OpenAPI 3.1 document",
    "options": {
      "emitter-output-dir": "{output-dir}/schema",
      "openapi-versions": ["3.1.0"]
    }
  }
}
```

Источник: `packages/compiler/templates/scaffolding.json` в репозитории
microsoft/typespec (<https://github.com/microsoft/typespec>). То есть при
создании проекта через `tsp init` можно случайно получить **3.1.0** — версию
надо выбирать осознанно.

### Каталог и имя вывода

- `emitter-output-dir` по умолчанию: `{output-dir}/@typespec/openapi3`
  (т.е. `tsp-output/@typespec/openapi3/`).
- `output-file` по умолчанию: `{service-name-if-multiple}.{version}.openapi.yaml`
  (для одного сервиса без версионирования — `openapi.yaml`).
- `file-type`: `"yaml" | "json"` (по умолчанию `yaml`).
- Пример структуры из Installation: `tsp-output/@typespec/openapi3/openapi.yaml`.
- Источники: <https://typespec.io/docs/> и
  <https://typespec.io/docs/emitters/openapi3/reference/emitter/>.

### Кастомные схемы, в т.ч. конверт ошибок `{ error: { code, message, fields? } }`

TypeSpec-модели напрямую мапятся в OpenAPI-схемы; именованные модели попадают
в `components/schemas` (**Schema Location**), `?`-свойство становится
необязательным (не в `required`). Источник:
<https://typespec.io/docs/emitters/openapi3/openapi/>.

Конверт ADR-0005 описывается штатно, например:

```tsp
model ErrorDetail {
  code: string;      // SCREAMING_SNAKE_CASE машинный код
  message: string;   // русский текст
  fields?: Record<string>;  // поле -> сообщение
}

model ErrorEnvelope {
  error: ErrorDetail;
}
```

- `Record<string>` в OpenAPI даёт объект с `additionalProperties: { type: string }`
  (стандартная библиотека TypeSpec).
- Статусы/ошибки: `@statusCode` на свойстве задаёт код ответа, а `@error`
  маркирует модель ошибки (в OpenAPI — `default`-ответ). Несколько вариантов
  ответа — через union в возвращаемом типе операции:

  ```tsp
  @error model ValidationError { @statusCode code: 400; @body body: ErrorEnvelope; }
  @error model ConflictError   { @statusCode code: 409; @body body: ErrorEnvelope; }
  op createBooking(@body b: Booking): BookingOk | ValidationError | ConflictError;
  ```

  Источник: раздел «Responses / Error Responses» в
  <https://typespec.io/docs/emitters/openapi3/openapi/>.

- Валидационные декораторы (`@minLength`, `@maxLength`, `@pattern`, `@format`,
  `@minValue`/`@maxValue`, `@minItems`/`@maxItems`) переносятся в
  JSON-Schema-ключи OpenAPI. Источник: тот же документ («Data Validation
  Decorators»).

> Важно: TypeSpec **описывает** контракт, но сам по себе не генерирует
> runtime-валидацию. Официального эмиттера сервера/Fastify нет (см. раздел 2 и
> `packages/http-server-js` — экспериментальный JS-сервер, не Fastify).

---

## 2. OpenAPI Generator

### Запуск в Node-монорепозитории и Java

- npm-обёртка: `@openapitools/openapi-generator-cli`, **latest 2.41.0**
  (2026-08-24), engines `node >=22.0.0`. Источник: npm registry.
- README обёртки (первоисточник, дословно): «The OpenAPI Generator is a Java
  project. `openapi-generator-cli` will download the appropriate JAR file and
  invoke the `java` executable to run the OpenAPI Generator. **You must have the
  `java` binary executable available on your `PATH`** for this to work. (**JDK 11
  is the minimal version supported.**)».
  Источник: <https://github.com/OpenAPITools/openapi-generator-cli> (README).
- Официальная страница установки подтверждает: npm-вариант — «cross-platform
  wrapper around the `.jar` artifact»; JAR — «Java 11 runtime at a minimum».
  Источник: <https://openapi-generator.tech/docs/installation/>.
- Обёртка пишет `openapitools.json`, где **пинится версия генератора**; README
  прямо просит «Please add this file to your VCS».
- Размер JAR (для версии генератора 7.26.0 с Maven Central): **33 737 249 байт
  (~33.7 MB)** — HTTP `HEAD`
  `https://repo1.maven.org/maven2/org/openapitools/openapi-generator-cli/7.26.0/openapi-generator-cli-7.26.0.jar`.
- Есть варианты **без локального Java**: Docker-образ
  `openapitools/openapi-generator-cli` и настройка `useDocker: true` в
  `openapitools.json` (<https://openapi-generator.tech/docs/installation/>).

**Вывод по Java:** нужна **только** если использовать OpenAPI Generator —
JDK/JRE **11+** в CI и, если генерация идёт внутри `docker build`, в образе.
TypeSpec и все JS-альтернативы (раздел 3) Java не требуют.

### TS-генераторы

- **`typescript-fetch`** (тип CLIENT, stability STABLE): «Generates a TypeScript
  client library using Fetch API». Это **браузерный клиент** для фронтенда.
  Примечательные опции: `useSingleRequestParameter` (default `true`),
  `validationAttributes` (default `false`), `withoutRuntimeChecks`,
  `modelPropertyNaming` (default `camelCase`).
  Источник: <https://openapi-generator.tech/docs/generators/typescript-fetch/>.
  - **Ограничения состава схем:** в feature-set указаны `allOf ✗`, `anyOf ✗`,
    `oneOf ✗`, `Union ✗`, `Null ✗` (OAS3). То есть для `typescript-fetch`
    спеку лучше держать без композиций (наш конверт ошибок — простой объект,
    проходит; union статусов лучше разложить по разным ответам).
- **Беку на Fastify**: генератора сервера под Fastify **нет**. Доступные
  Node/TS-серверные генераторы:
  `nodejs-express-server (beta)`, `typescript-nestjs-server (beta)`,
  `graphql-nodejs-express-server`.
  Источник: полный список — <https://openapi-generator.tech/docs/generators/>
  (раздел SERVER generators; слова «fastify» в списке нет).
  Значит, OpenAPI Generator не даёт ни Fastify-роутов, ни валидации Fastify —
  максимум типы/клиент/модели.
- **Полиглотность** — сильная сторона (клиенты и сервера на 40+ языках/фреймворках);
  но под нашу связку TS+Fastify это не конвертируется в плюс.

### Поддержка OpenAPI 3.1

- Официальная страница установки говорит про спеки «(both 2.0 and 3.0 are
  supported)» — 3.1 в списке **нет**:
  <https://openapi-generator.tech/docs/installation/>.
- В сообществе поддержка 3.1 описывается как beta/неполная (вторичные источники:
  Stack Overflow обсуждения, Roadmap). **Первоисточник, явно обещающий 3.1,
  не найден** — считаем 3.1 неофициальной/beta.
  → Если идём через OpenAPI Generator, безопасно пинить `openapi-versions: ["3.0.0"]`.

---

## 3. Альтернативы без JVM

| Инструмент | latest | engines | Что даёт | Валидация |
| --- | --- | --- | --- | --- |
| `openapi-typescript` | **7.13.0** (2026-02-11) | не задан (peer `typescript ^5.x`) | **только типы** (`.d.ts`), «runtime-free» | нет |
| `orval` | **8.41.0** (2026-10-08) | `node >=22.18.0` | клиенты + хуки (React/Vue/Svelte/Solid/Angular/SWR), MSW-моки, Faker | **да**: `client: 'zod'` |
| `@hey-api/openapi-ts` | **0.99.0** (2026-06-22) | `node >=22.18.0` | SDK + типы + клиенты (Fetch/Axios/…) + 20+ плагинов + TanStack Query | **да**: плагины Zod/Valibot/Ajv/Arktype/Joi/TypeBox/Yup |

Источники версий/движка: npm registry. Источники поведения:

- `openapi-typescript`: «turns OpenAPI 3.0 & 3.1 schemas into TypeScript quickly
  using Node.js. **No Java/node-gyp/running OpenAPI servers necessary**.»,
  «Generate **runtime-free types**». Компаньоны для клиента — отдельные пакеты
  `openapi-fetch` и `openapi-react-query`.
  <https://openapi-ts.dev/introduction>
- `orval`: «type-safe clients, mocks, and validators»; Zod-схемы из спеки
  (`client: 'zod'`), генерация под Zod 3/4, Zod Mini.
  <https://orval.dev/> и <https://orval.dev/docs/guides/zod>
- `@hey-api/openapi-ts`: CLI + `createClient()` JS API; валидаторы
  (Zod/Valibot/Ajv/…); «initial development» — «Please pin an exact version».
  <https://heyapi.dev/docs/openapi/typescript/get-started> и
  <https://heyapi.dev/docs/openapi/typescript/validators>

**Плюсы против OpenAPI Generator:** нет JVM, всё npm-native, быстрее, проще в
монорепо, TS-first (типы точнее).

**Минусы против OpenAPI Generator:** покрытие только JS/TS (нет клиентов/серверов
на другие языки); почти нет серверных генераторов; часть проектов молодые
(hey-api — «initial development», до 1.0 → нужен пинить версию).

---

## 4. Стоимость в CI и сборке

- **TypeSpec:** чистый Node, ставится через `npm ci`, компиляция — миллисекунды/
  секунды, JVM не нужна. Хорошо ложится в уже существующий пайплайн.
- **OpenAPI Generator:** + Java (минимум JDK 11) и + скачивание JAR ~33.7 MB
  при первом запуске (кэшируется; версию пинит `openapitools.json`).
  - GitHub-hosted runner `ubuntu-latest`: Java предустановлена — по policy
    runner-images ставятся «all LTS versions» Java (<https://github.com/actions/runner-images>,
    раздел «Software and Image Support»). Значит `java` на раннере есть без
    `setup-java`, но детерминированнее пиновать `actions/setup-java`.
  - **Docker:** production-образу Java не нужна, **если** генерация выполняется
    вне образа, а результат закоммичен. Если генерация внутри `docker build` —
    придётся ставить JDK+JAR в образ (либо брать образ
    `openapitools/openapi-generator-cli`).
- **orval / hey-api:** engines `node >=22.18.0` — строже, чем `>=22.0.0` в
  корневом `package.json`. CI `node-version: 22` резолвится в последнюю 22.x
  (обычно ≥22.18, ок), но **базовый Docker-образ должен быть ≥22.18**, иначе
  tools не запустятся.
- **Влияние на `ci.yml` и `hexlet-check`:** текущий CI — `npm ci → lint →
  typecheck → test → build`. Добавление кодогенерации:
  - безопаснее держать детерминизм: либо коммитить сгенерированное, либо
    запускать генерацию перед `build`/`typecheck` и проверять, что дерево не
    изменилось (`git diff --exit-code`).
  - `hexlet-check` при включении собирает корневой `Dockerfile` и гоняет
    `GET /` → 200 (контекст тикета; ADR/тикет #16–#17). Генерация в самом
    `Dockerfile` = Java в образе; генерация заранее = обычный `npm ci && build`.

---

## 5. Совместимость с ADR-0005

ADR-0005: ручная валидация входа, кастомный конверт `{ error: { code, message, fields? } }`,
встроенную schema-валидацию Fastify не используем
(`docs/adr/0005-unified-error-envelope-and-machine-codes.md`).

Разложим инструменты по тому, что они генерируют:

| Инструмент | Даёт | Генерирует валидацию? | Где она живёт | Конфликт с ADR-0005 |
| --- | --- | --- | --- | --- |
| TypeSpec (`@typespec/openapi3`) | контракт/OpenAPI | нет | — | нет |
| `openapi-typescript` | только типы | нет | — | нет |
| `typescript-fetch` (OpenAPI Gen) | браузерный клиент | runtime-проверки клиента (`RequiredError`, `validationAttributes`) | фронтенд | нет (не бэк) |
| `orval` | клиент + хуки | Zod-схемы (опционально) | фронтенд/consumer | нет, если не тащить на бэк |
| `@hey-api/openapi-ts` | SDK + типы | Zod/Valibot/Ajv (плагины) | фронтенд/consumer | нет, если не тащить на бэк |

Ключевые факты:

- **Ни один** из инструментов не генерирует валидацию для роутов **Fastify**.
  У OpenAPI Generator вообще нет Fastify-генератора (раздел 2), у JS-инструментов
  валидация — это потребительские схемы/клиентские проверки.
- Значит, ADR-0005 по умолчанию **не нарушается**: ручной валидатор на беке
  остаётся, генерация используется на фронтенде (типы/клиент/хуки).
- Конфликт возникнет, **только если** сознательно подключить сгенерированные
  JSON Schema/Zod в `schema` роутов Fastify или в тела ответов на беке — этого
  ADR-0005 и просит не делать.
- Конверт ошибок должен быть **в самой спеке** (модель `ErrorEnvelope`, раздел 1),
  чтобы сгенерированный клиент знал `error.code`/`error.message`/`error.fields`.
  На беке форма ответа по-прежнему формируется вручную.

---

## 6. Артефакты: где живут, что коммитить

Типовой layout (композиция из документированных дефолтов + распространённых практик):

```
contracts/ (или spec/)
  main.tsp              # источник
  tspconfig.yaml        # конфиг компилятора/эмиттера
  package.json          # deps: @typespec/compiler, @typespec/http, @typespec/openapi3
  tsp-output/           # артефакт сборки (обычно gitignore)
    @typespec/openapi3/
      openapi.yaml      # сгенерированный OpenAPI
frontend/src/api/generated/   # сгенерированные типы/клиент (вариант A: коммитим)
```

Факты и практики:

- **Источники TypeSpec** (`*.tsp`, `tspconfig.yaml`, `package.json`) — коммитим.
  Дефолтный вывод — `tsp-output/@typespec/openapi3/` (раздел 1).
- **`tsp-output/`** — это build-выход; распространённая практика — в `.gitignore`.
  Официального требования «gitignore tsp-output» в документации **не найдено**;
  шаблон `rest` в репозитории TypeSpec содержит только `main.tsp` (без
  `.gitignore`). То есть это **конвенция, а не документированное правило**.
- **Сгенерированный OpenAPI** (`openapi.yaml`) — часто коммитят (это контракт,
  удобно диффить в PR и отдавать во внешние тулзы), но можно генерировать в CI.
  Официальной директивы нет — осознанный выбор.
- **Сгенерированные TS-типы/клиент** — две распространённые практики:
  (A) коммитить (простые, обозримые диffы, не нужен JVM/кодген в сборке);
  (B) gitignore + генерация в `prepare`/`prebuild`. Официальной рекомендации
  «коммитить/не коммитить» ни у TypeSpec, ни у OpenAPI Generator **не найдено** —
  это командное решение (вторичные обсуждения расходятся).
- **`openapitools.json`** (если используем OpenAPI Generator) — **коммитим**,
  это требование README обёртки (пинит версию генератора).

---

## Противоречия, пробелы и что перепроверить при решении

1. **Версия OpenAPI по умолчанию зависит от способа создания проекта.** Эмиттер
   `@typespec/openapi3` по умолчанию даёт **3.0.0**, а шаблон `tsp init`
   «Generic REST API» предвыбирает **3.1.0**. Решать явно (и, если идём через
   OpenAPI Generator — пинить 3.0.0).
2. **Поддержка OpenAPI 3.1 в OpenAPI Generator** официально не заявлена (docs
   говорят про 2.0/3.0); в сообществе — beta. Первоисточника, обещающего 3.1,
   не найдено.
3. **«Коммитить ли сгенерированный код»** — официальной рекомендации нет ни у
   TypeSpec, ни у OpenAPI Generator. В отчёте это помечено как практика/выбор.
4. **Programmatic emit через JS API TypeSpec** — `compile`/`NodeHost` публичны и
   эмиттеры запускаются при заданном `emit`, но пошагового официального примера
   именно «Node JS API + emit» на сайте не нашлось (есть дискуссия #6383).

---

## Ссылки (первоисточники)

- TypeSpec Installation — <https://typespec.io/docs/>
- TypeSpec OpenAPI3 emitter options — <https://typespec.io/docs/emitters/openapi3/reference/emitter/>
- TypeSpec OpenAPI3 mapping (responses, errors, validation decorators) — <https://typespec.io/docs/emitters/openapi3/openapi/>
- TypeSpec repo (scaffolding / templates) — <https://github.com/microsoft/typespec>
- OpenAPI Generator CLI Installation — <https://openapi-generator.tech/docs/installation/>
- OpenAPI Generator generators list — <https://openapi-generator.tech/docs/generators/>
- OpenAPI Generator `typescript-fetch` — <https://openapi-generator.tech/docs/generators/typescript-fetch/>
- openapi-generator-cli npm wrapper README — <https://github.com/OpenAPITools/openapi-generator-cli>
- openapi-typescript — <https://openapi-ts.dev/introduction>
- orval — <https://orval.dev/> / <https://orval.dev/docs/guides/zod>
- hey-api openapi-ts — <https://heyapi.dev/docs/openapi/typescript/get-started> / <https://heyapi.dev/docs/openapi/typescript/validators>
- GitHub runner-images (preinstalled Java) — <https://github.com/actions/runner-images>
- npm registry (версии/engines) — <https://registry.npmjs.org/> (`@typespec/compiler`, `@typespec/openapi3`, `@openapitools/openapi-generator-cli`, `openapi-typescript`, `orval`, `@hey-api/openapi-ts`)
