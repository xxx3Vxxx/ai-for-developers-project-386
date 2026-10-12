# Критерии автопроверки `hexlet-check` (research #16)

Дата: 2026-10-12. Ветка/состояние репозитория: `main`, `docs/research/` создан этим документом.

Вопрос тикета: что именно проверяет `hexlet/project-action`
(`.github/workflows/hexlet-check.yml`) и какие критерии приёмки задаёт Хекслет;
не расходится ли наша модель (типы событий с переменной длительностью, окно
записи 14 дней, публичный `/admin`) с тем, что проверяет автопроверка.

---

## Резюме

1. `hexlet/project-action` — это **не набор проверок, а раннер**. Он сам не знает
   ничего о задаче: скачивает по `hexlet-id` описание проекта-участника из API
   Хекслета, вытягивает Docker-образ проекта `hexletprojects/<image_name>:latest`,
   кладёт код студента в этот образ и запускает тесты через `docker compose`.
   Вердикт (exit code сервиса `test`) уходит обратно в API Хекслета.
2. **Все проверки живут в приватном образе проекта и в интерфейсе Хекслета, а не
   в экшене.** Публично задокументированного списка критериев для проекта 386 нет.
3. Прямо сейчас автопроверка в нашем репозитории **ничего не проверяет**: в логах
   каждого прогона стоит `##[warning]Tests will run during review step`, все
   прогоны зелёные за ~10 секунд. Это флаг `tests_on: false` у нашего
   project member: тесты включатся после прохождения шагов проекта в интерфейсе
   Хекслета.
4. Когда тесты включатся, проверка (по логам других студентов этого же проекта)
   сводится к: **собрать приложение из `Dockerfile` в корне репозитория** и
   прогнать **один скрытый Playwright-тест «smoke: application opens»** (GET `/`
   → 200). Доменные правила — длительности, окно 14 дней, `/admin` — автопроверка
   **не проверяет**.
5. Референсная реализация этого же проекта (репозиторий Хекслета
   `fey/ai-for-developers-test-project-386`) устроена ровно как наша модель:
   типы событий с `durationMinutes`, окно `AVAILABILITY_DAYS = 14`, публичный
   `/admin`, занятость через пересечение интервалов. **Расхождения нет.**
6. Единственный реальный риск — упаковка: в корне репозитория **нет `Dockerfile`**,
   а без него `make setup` внутри образа падает (подтверждено логом падения у
   другого студента). Это единственное, что гарантированно ломает автопроверку.

---

## 1. Как устроен `hexlet/project-action` (по исходникам)

Первоисточник — репозиторий <https://github.com/hexlet/project-action>, ветка
`release` (именно на неё ссылается workflow), коммит
`998dae57882219a25a076071f3e3d06dcd14c8b3`.

### 1.1 Workflow в нашем репозитории

`.github/workflows/hexlet-check.yml` — сгенерированный файл («DO NOT DELETE OR
EDIT»), триггерится на любой push и тег, вызывает:

```yaml
- uses: hexlet/project-action@release
  with:
    hexlet-id: ${{ secrets.HEXLET_ID }}
```

`action.yml` объявляет входы `hexlet-id` (обязательный), `verbose` (по умолчанию
`false`), `mount-path` (по умолчанию `/var/tmp`) и две точки входа:
`dist/run-tests/index.js` (main) и `dist/run-post-actions/index.js` (post).

### 1.2 Пайплайн `runTests` (`src/index.js`)

1. `GET https://hexlet.io/api/user_project_github_workflow/project_members/<hexlet-id>.json`
   (`src/routes.js`) — получает JSON project member: `tests_on`,
   `project.image_name`, `project.language`.
2. **Если `tests_on === false`** → пишет `core.warning('Tests will run during
   review step')` и выходит. Никаких Docker-операций не делается.
3. Иначе `prepareProject`:
   - `docker pull hexletprojects/<image_name>:latest`;
   - `docker run ... cp -r /project/. /mnt/source` — распаковывает **исходники
     проекта** (образ) в `mount-path/source`, удаляя `source/code`;
   - копирует **код студента** (checked-out репозиторий) в `source/code`;
   - `docker build --cache-from <image> .` в `source`.
4. `check`:
   - `checkPackageName(codePath, language)` — проверка имени пакета (см. 1.4);
   - `docker compose -f docker-compose.yml run --rm app make setup`;
   - `docker compose -f docker-compose.yml config --services`; если есть сервис
     `test` → `docker compose run --rm test`, иначе fallback
     `docker compose up --abort-on-container-exit`;
   - **вердикт = exit code сервиса `test`**; при падении дополнительно печатаются
     логи compose.

### 1.3 Post-действия (`runPostActions`)

- `POST .../project_members/<id>/checks.json` с `{ check: checkState }` — отчёт о
  результате в API Хекслета;
- загрузка артефактов из `source/tmp/artifacts/*/**` как GitHub-артефакт
  `test-results` (скриншоты/трейсы Playwright);
- загрузка `test-data` по списку путей из `source/__data__/spec.yml` → `project.artifacts`.
  Для проекта 386 этого ключа нет (`uploadTestData: no artifacts key in spec.yml
  project section, skipping`).

### 1.4 Проверка имени пакета (`src/packageChecker.js`)

Применяется **только** для трёх языков:

| `project.language` | файл | требуемое имя |
| --- | --- | --- |
| `javascript` | `package.json` | `@hexlet/code` |
| `php` | `composer.json` | `hexlet/code` |
| `python` | `pyproject.toml` | `hexlet-code` |

Для любого другого значения `language` (например `ruby`, `html`, `java`,
`typescript` или отсутствующего) проверка **молча пропускается**. Если имя не
совпадает — экшен падает с сообщением
`Package name should be @hexlet/code instead of <name>`.

Публичного списка «что за тесты в образе» нет: `hexlet/project-action` —
раннер, а тесты и `docker-compose.yml`/`Makefile` лежат внутри
`hexletprojects/<image_name>`. Публичного образа именно для проекта 386 в
организации `hexletprojects` на Docker Hub найти не удалось (в листинге
организации видны только старые проекты вида `js_l1_brain_games4_project`,
`rails_*`, `css_*`; образа с `ai`/`calendar`/`slot` в имени нет). Имя
`image_name` в логах скрыто: `docker pull` вызывается с `silent: true` при
`verbose: false`, поэтому строка pull не попадает в лог.

---

## 2. Что происходит в нашем репозитории прямо сейчас

Факт из логов GitHub Actions (проверено `gh run view`):

- Все прогоны `hexlet-check` зелёные и длятся 8–15 секунд.
- В логе есть строка `##[warning]Tests will run during review step`.
- `Preparing`, `make setup`, docker-сборка и тесты **не запускаются**.

Вывод: у нашего project member сейчас `tests_on: false`, автопроверка
пока ничего не валидирует. Это же поведение наблюдается у других студентов
проекта, которые ещё не «сдали» шаги в интерфейсе (короткие прогоны 8–17 с), и
не наблюдается у тех, кто дошёл до проверки (прогоны 1,5–3 минуты с реальной
сборкой и тестами).

> Пример нашего прогона:
> <https://github.com/xxx3Vxxx/ai-for-developers-project-386/actions/runs/38179288865>

---

## 3. Что именно проверяется, когда тесты включены

Публичной документации по проекту 386 нет, поэтому критерии восстановлены по
логам других студентов **того же проекта**, у которых тесты реально
запускались, и по референсной реализации Хекслета.

### 3.1 Успешный прогон (sv99, Vue + nginx)

Источник: <https://github.com/sv99/ai-for-developers-project-386/actions/runs/37278197889>

```
##[group]Preparing
[command]/usr/bin/docker compose -f docker-compose.yml run --rm app make setup
make[1]: Entering directory '/project'
docker build -t calendar-slot-code:local -f code/Dockerfile code
...
[command]/usr/bin/docker compose -f docker-compose.yml config --services
test
[command]/usr/bin/docker compose -f docker-compose.yml run --rm test
npm test
> playwright test
Running 1 test using 1 worker
  ✓  1 [chromium] › __tests__/00-smoke.spec.ts:3:5 › smoke: application opens (405ms)
  1 passed (1.1s)
```

Второй успешный прогон (snicksnk, Node-сервер + SPA, проект 387 — тот же
образ/набор проверок) даёт ровно тот же результат: `1 passed`, единственный
тест `__tests__/00-smoke.spec.ts › smoke: application opens`.

Источник: <https://github.com/snicksnk/ai-dev-calend-ci/actions/runs/33398047501>

### 3.2 Провал (sv99, когда `Dockerfile` в корне ещё не было)

Источник: <https://github.com/sv99/ai-for-developers-project-386/actions/runs/36825305035>

```
make[1]: Entering directory '/project'
docker build -t calendar-slot-code:local -f code/Dockerfile code
ERROR: failed to solve: failed to read dockerfile: open Dockerfile: no such file or directory
make[1]: *** [Makefile:46: code-setup] Error 1
make: *** [Makefile:34: setup] Error 2
##[error]The tests have failed. Examine what they have to say. Inhale deeply. Exhale. Fix the code.
```

### 3.3 Что из этого следует (подтверждённые критерии)

1. `.github/workflows/hexlet-check.yml` присутствует и не изменён — иначе
   автопроверка не запустится (файл сгенерированный, «не удалять/не
   переименовывать репозиторий»).
2. В **корне репозитория студента есть `Dockerfile`**, который собирает
   приложение (образ `calendar-slot-code:local`). Это делает `make setup` из
   образа проекта (`setup` → `code-setup` → `docker build -f code/Dockerfile code`).
3. Приложение из этого Dockerfile **поднимается и отвечает HTTP**: скрытый тест
   открывает `/` и ждёт статус 200.
4. Приложение должно быть доступно сервису `test` по сети compose. Порты у
   разных студентов разные (`10000`, `4010`, `3000`, `8080`), и все проходят,
   поэтому контракт — **слушать порт из переменной окружения `PORT`** (в
   референсе `PORT` по умолчанию `8080`); точное значение, которое подставляет
   образ, публично не подтверждено (см. раздел 6).

### 3.4 Референсная реализация Хекслета

`fey/ai-for-developers-test-project-386` — тестовый проект, зарегистрированный
в Хекслете (в нём тот же `hexlet-check.yml`), с пакетом
`ai-assisted-development-calendar-slot-project`. Его `e2e/tests/` содержит
`00-smoke.spec.ts` с тем же названием теста, что запускает автопроверка
(`smoke: application opens`), плюс `booking-flow.spec.ts` с полным сценарием
(главная → каталог `/book` → запись `/book/:slug` → админка
`/admin/events`, `/admin/event-types` → создание/редактирование/удаление типа
события → бронь видна в списке встреч). Наличие общего теста и совпадающая
доменная модель указывают, что это референс проекта; при этом **скрытая
автопроверка сейчас прогоняет только smoke-тест**.

---

## 4. Наша модель против автопроверки

| Наша модель (GLOSSARY.md, ADR) | Референс Хекслета | Что проверяет автопроверка |
| --- | --- | --- |
| Тип события: id, название, описание, **длительность в минутах** | `event_types`: `durationMinutes` (5–480) | ничего |
| **Окно записи 14 дней** | `AVAILABILITY_DAYS = 14` | ничего |
| **Публичный `/admin`** без авторизации | публичный `/admin/events`, `/admin/event-types` | ничего |
| Слоты считаются на лету из рабочего окна 09:00–18:00 | `startHour=9`, `endHour=18`, шаг = `durationMinutes` | ничего |
| Занятость = пересечение полуинтервалов `[start, end)` | `isIntervalsOverlapping` по всем броням | ничего |
| Гость указывает имя и email (у нас ещё и заметки не обязательны) | `clientName`, `clientEmail`, `notes` | ничего |

**Расхождения нет.** Наоборот, наша модель совпадает с референсной. Единственное,
что реально проверяется, — собираемость и «открываемость» приложения, и от
доменных решений это не зависит.

Риски — не в модели, а в упаковке:

- **Нет `Dockerfile` в корне.** Без него `make setup` падает, и автопроверка
  краснеет (подтверждено логом 3.2). Это нужно завести.
- **Порт.** Dockerfile должен слушать `$PORT` (см. 3.3), а не хардкодить порт;
  в референсе `8080`, но разные студенты используют разные порты и проходят.
- **Совместимость сборки.** `make setup` в образе выполняет `npm ci` для образа
  тестов; студенческий `Dockerfile` собирается отдельно (`docker build code`).
  У нас workspaces `backend`/`frontend` — Dockerfile должен собрать оба и
  отдавать фронтенд с бэкенда (или статикой).
- **Единственный smoke-тест** может быть расширен Хекслетом в любой момент
  (образ тегается `:latest`). Референсный `booking-flow.spec.ts` показывает
  ожидаемый UI-флоу и может стать частью проверки.

---

## 5. Выводы для тикета

1. Автопроверка `hexlet-check` не задаёт доменных критериев приёмки. Она
   проверяет инфраструктуру: наличие валидного workflow, сборку
   `Dockerfile` из корня и ответ приложения на `/`.
2. Доменные критерии приёмки задаёт **интерфейс Хекслета** (шаги проекта,
   скрытые от нас) и **человеческая проверка**; автоматика — лишь дымовой тест.
3. Наша модель (переменная длительность, окно 14 дней, публичный `/admin`) не
   расходится с автопроверкой и совпадает с референсом Хекслета.
4. Практическое следствие: к моменту сдачи обязательно добавить корневой
   `Dockerfile`, который собирает и поднимает приложение на `$PORT`, и держать
   smoke-доступность `/`. Остальное — на усмотрение ревью.

---

## 6. Неопределённости (что публично не подтверждено)

- **Имя образа проекта** (`hexletprojects/<image_name>`) и содержимое его
  `docker-compose.yml`, `Makefile`, скрытых тестов. В логах скрыто (silent pull),
  публичного образа для 386 не найдено.
- **Конкретное значение `PORT`**, которое подставляет образ, и как именно тест
  находит приложение. Косвенно: все проходящие репозитории слушают `$PORT`,
  референс использует `8080`.
- **Полный список тестов**: в наблюдаемых прогонах ровно один smoke-тест, но
  образ обновляется как `:latest` и состав проверок может измениться.
- **`project.language` для 386**: проверка имени пакета к проекту не применяется
  (иначе бы падали все — у студентов имена вроде `book-a-call`,
  `ai-for-developers-project-386`, `booking-calendar`), значит `language` не
  входит в `{javascript, php, python}`. Точное значение неизвестно.
- **Список шагов проекта в интерфейсе Хекслета** (истинные критерии приёмки) —
  за авторизацией, публично недоступен. `https://files.hexlet.app/a/2ipc5m` —
  только галерея скриншотов «как это должно работать».

---

## Источники

Первоисточники:

- `hexlet/project-action`, ветка `release` (SHA `998dae57882219a25a076071f3e3d06dcd14c8b3`):
  - <https://github.com/hexlet/project-action/blob/release/action.yml>
  - <https://github.com/hexlet/project-action/blob/release/src/index.js>
  - <https://github.com/hexlet/project-action/blob/release/src/packageChecker.js>
  - <https://github.com/hexlet/project-action/blob/release/src/routes.js>
  - <https://github.com/hexlet/project-action/blob/release/AGENTS.md>
  - <https://github.com/hexlet/project-action/blob/release/examples/hexlet-check.yml>
- Референсная реализация проекта: <https://github.com/fey/ai-for-developers-test-project-386>
  (`src/slots.ts`, `src/config.ts`, `src/db/schema.ts`, `src/app.ts`,
  `e2e/tests/00-smoke.spec.ts`, `e2e/tests/booking-flow.spec.ts`, `Dockerfile`,
  `README.md`).

Логи GitHub Actions (наблюдаемое поведение):

- Наш репозиторий (no-op, `Tests will run during review step`):
  <https://github.com/xxx3Vxxx/ai-for-developers-project-386/actions/runs/38179288865>
- Реальный прогон (сборка + smoke-тест):
  <https://github.com/sv99/ai-for-developers-project-386/actions/runs/37278197889>
- Падение без `Dockerfile`:
  <https://github.com/sv99/ai-for-developers-project-386/actions/runs/36825305035>
- Второй реальный прогон (проект 387):
  <https://github.com/snicksnk/ai-dev-calend-ci/actions/runs/33398047501>

Прочее:

- Программа: <https://ru.hexlet.io/programs/ai-for-developers>
- «Как это должно работать» (галерея скриншотов):
  <https://files.hexlet.app/a/2ipc5m>
