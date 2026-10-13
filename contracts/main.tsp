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

/** Клиентская ошибка чтения (400): невалидный `date` или дата вне окна записи. */
@error
model ReadClientError {
  @statusCode statusCode: 400;
  ...ErrorEnvelope;
}

/** Тип события не найден (404). */
@error
model EventTypeNotFoundError {
  @statusCode statusCode: 404;
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
 * Полная сетка слотов дня для типа события: занятые и уже начавшиеся слоты
 * присутствуют с `available: false` (ADR-0002, ADR-0003, ADR-0009). `date` —
 * локальные сутки зоны сервиса, обязателен и должен лежать в окне записи.
 */
@route("/api/event-types/{id}/slots")
@get
op listSlots(
  @path id: string,
  @query date: plainDate,
): SlotsResponse | ReadClientError | EventTypeNotFoundError | InternalError;
