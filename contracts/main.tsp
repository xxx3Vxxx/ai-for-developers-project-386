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

/** Параметры сервиса для клиента (зона сервиса, окна, сегодняшняя дата). */
@route("/api/config")
@get
op getConfig(): ServiceConfig | InternalError;
