import "@typespec/http";

using TypeSpec.Http;

/**
 * HTTP-контракт сервиса «Календарь звонков» — источник истины (ADR-0008).
 * Отсюда генерируются OpenAPI 3.0.0 и типы; маршруты и валидацию пишем руками (ADR-0005).
 */
@service(#{ title: "Календарь звонков" })
@server("http://localhost:3000", "Сервис «Календарь звонков»")
namespace Calendar;

/** Рабочее окно: ежедневный интервал, внутри которого существуют слоты. */
model WorkingWindow {
  /** Начало рабочего окна (HH:MM) в зоне сервиса. */
  start: plainTime;

  /** Конец рабочего окна (HH:MM) в зоне сервиса. */
  end: plainTime;
}

/** Параметры сервиса, которые фронтенд не выводит сам, а получает от бекенда. */
model ServiceConfig {
  /** Зона сервиса (IANA), в которой трактуются окна и календарные сутки. */
  timezone: string;

  /** Рабочее окно. */
  workingWindow: WorkingWindow;

  /** Длина окна записи в календарных сутках. */
  bookingWindowDays: int32;

  /** Сегодняшняя дата зоны сервиса (YYYY-MM-DD). */
  today: plainDate;
}

/** Тип события: шаблон брони (GLOSSARY). */
model EventType {
  /** Идентификатор типа события. */
  id: string;

  /** Название типа события. */
  title: string;

  /** Описание типа события. */
  description: string;

  /** Длительность в минутах. */
  durationMinutes: int32;
}

/**
 * Тело создания типа события (ADR-0010): `title` обязателен (1–100 после trim),
 * `description` необязателен (≤ 500, дефолт `""`), `durationMinutes` — целое,
 * кратное 15, от 15 до длины рабочего окна (ADR-0003).
 */
model EventTypeRequest {
  /** Название типа события. */
  title: string;

  /** Описание типа события. */
  description?: string;

  /** Длительность в минутах. */
  durationMinutes: int32;
}

/** Успех создания типа события (201, ADR-0010): «голый» созданный тип. */
model EventTypeCreated {
  @statusCode statusCode: 201;
  ...EventType;
}

/** Слот дня: начало, конец и признак доступности (ADR-0002, ADR-0003). */
model Slot {
  /** Начало слота — ISO 8601 со смещением зоны сервиса (ADR-0004). */
  start: offsetDateTime;

  /** Конец слота — ISO 8601 со смещением зоны сервиса (ADR-0004). */
  end: offsetDateTime;

  /**
   * Доступен ли слот: нет пересечения с бронью, а для сегодняшнего дня — ещё и
   * начало в будущем (ADR-0009).
   */
  available: boolean;
}

/** Полная сетка слотов дня для типа события (ADR-0009). */
model SlotsResponse {
  /** Идентификатор типа события. */
  eventTypeId: string;

  /** Дата сетки: локальные сутки зоны сервиса (YYYY-MM-DD). */
  date: plainDate;

  /** Слоты в порядке `start` asc. */
  slots: Slot[];
}

/** Тело создания брони (ADR-0010): `end` сервер считает сам из длительности типа. */
model BookingRequest {
  /** Идентификатор типа события. */
  eventTypeId: string;

  /** Начало слота — строка `start` из `GET /api/event-types/{id}/slots` (ADR-0004). */
  start: offsetDateTime;

  /** Имя гостя. */
  guestName: string;

  /** Email гостя. */
  guestEmail: string;
}

/** Созданная бронь в форме чтения (ADR-0010). */
model Booking {
  /** Идентификатор брони. */
  id: int32;

  /** Идентификатор типа события. */
  eventTypeId: string;

  /** Название типа события. */
  eventTypeTitle: string;

  /** Начало брони — ISO 8601 со смещением зоны сервиса (ADR-0004). */
  start: offsetDateTime;

  /** Конец брони — ISO 8601 со смещением зоны сервиса (ADR-0004). */
  end: offsetDateTime;

  /** Имя гостя. */
  guestName: string;

  /** Email гостя. */
  guestEmail: string;
}

/** Успех создания брони (201, ADR-0010): «голая» созданная бронь. */
model BookingCreated {
  @statusCode statusCode: 201;
  ...Booking;
}

/** Тело ошибки в едином конверте (ADR-0005). */
model ErrorDetail {
  /** Машинный код: `SCREAMING_SNAKE_CASE`. */
  code: string;

  /** Русское человекочитаемое сообщение. */
  message: string;

  /** По-полевые сообщения валидации: «поле → сообщение». */
  fields?: Record<string>;
}

/** Единый конверт ошибок: `{ error: { code, message, fields? } }`. */
model ErrorEnvelope {
  error: ErrorDetail;
}

/** Внутренняя ошибка сервиса без деталей. */
@error
model InternalError {
  @statusCode statusCode: 500;
  ...ErrorEnvelope;
}

/**
 * Клиентская ошибка (400): невалидный ввод, недоступный слот или дата вне окна
 * записи. Машинный код различает `VALIDATION_ERROR`, `INVALID_SLOT` и
 * `DATE_OUT_OF_WINDOW` (ADR-0005, ADR-0009, ADR-0010).
 */
@error
model ClientError {
  @statusCode statusCode: 400;
  ...ErrorEnvelope;
}

/** Тип события не найден (404). */
@error
model EventTypeNotFoundError {
  @statusCode statusCode: 404;
  ...ErrorEnvelope;
}

/** Конфликт записи: время уже занято (409, ADR-0007, ADR-0010). */
@error
model ConflictError {
  @statusCode statusCode: 409;
  ...ErrorEnvelope;
}

/** Сервис недоступен: чужая транзакция не отпустила базу (503, ADR-0007). */
@error
model ServiceUnavailableError {
  @statusCode statusCode: 503;
  ...ErrorEnvelope;
}

/** Параметры сервиса для клиента (зона сервиса, окна, сегодняшняя дата). */
@route("/api/config")
@get
op getConfig(): ServiceConfig | InternalError;

/**
 * Справочник типов событий в детерминированном порядке: `durationMinutes` asc,
 * при равенстве — `id` asc (ADR-0009).
 */
@route("/api/event-types")
@get
op listEventTypes(): EventType[] | InternalError;

/**
 * Создаёт тип события (ADR-0010). Тело валидируется целиком до обращения к базе:
 * `title` 1–100 после trim, `description` ≤ 500, `durationMinutes` — целое,
 * кратное 15, от 15 до длины рабочего окна (ADR-0003). Нарушения отдаются как
 * `400 VALIDATION_ERROR` с `fields`; уникальности `title` нет, поэтому конфликта
 * не бывает; занятая база — `503 SERVICE_UNAVAILABLE` (ADR-0007). Успех — `201` и
 * созданный тип в форме чтения.
 */
@route("/api/event-types")
@post
op createEventType(
  @body body: EventTypeRequest,
): EventTypeCreated | ClientError | ServiceUnavailableError | InternalError;

/**
 * Полная сетка слотов дня для типа события: занятые и уже начавшиеся слоты
 * присутствуют с `available: false` (ADR-0002, ADR-0003, ADR-0009). `date` —
 * локальные сутки зоны сервиса, обязателен и должен лежать в окне записи.
 */
@route("/api/event-types/{id}/slots")
@get
op listSlots(
  @path id: string,
  @query date: plainDate,
): SlotsResponse | ClientError | EventTypeNotFoundError | InternalError;

/**
 * Предстоящие встречи владельца: «предстоящая» — `end > now`, поэтому идущая
 * прямо сейчас встреча остаётся в списке до завершения; порядок `start` asc, без
 * пагинации (ADR-0009). Отдаёт брони вместе с названием типа события.
 */
@route("/api/bookings")
@get
op listBookings(): Booking[] | InternalError;

/**
 * Создаёт бронь: `end` сервер считает сам как `start + durationMinutes`
 * (ADR-0010). Тело валидируется до обращения к базе; `start` должен быть
 * началом слота сетки типа и лежать в окне записи, а занятость решает
 * транзакция (ADR-0007).
 */
@route("/api/bookings")
@post
op createBooking(
  @body body: BookingRequest,
): BookingCreated | ClientError | EventTypeNotFoundError | ConflictError | ServiceUnavailableError | InternalError;
