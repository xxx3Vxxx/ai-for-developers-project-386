import type { components } from "contracts";
import { MantineProvider } from "@mantine/core";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "../src/App";
import type { ServiceConfig } from "../src/api/config";
import type { EventType } from "../src/api/event-types";
import { ConfirmationStep } from "../src/components/book/ConfirmationStep";
import { book } from "../src/copy/book";
import { fieldMessages } from "../src/copy/fields";
import { api, mockApi, mockErrorResponse, mockResponse, resetApiMock } from "./helpers/api";

vi.mock("../src/api/client", () => import("./helpers/api"));

const nameField = () => screen.getByRole("textbox", { name: /Имя/ });
const emailField = () => screen.getByRole("textbox", { name: /Email/ });

type Booking = components["schemas"]["Booking"];
type Slot = components["schemas"]["Slot"];
type SlotsResponse = components["schemas"]["SlotsResponse"];

const config: ServiceConfig = {
  timezone: "Europe/Moscow",
  workingWindow: { start: "09:00", end: "18:00" },
  bookingWindowDays: 14,
  today: "2026-10-14",
};

const eventTypes: EventType[] = [
  {
    id: "et-15",
    title: "Короткий звонок",
    description: "Знакомство, быстрый вопрос или уточнение деталей.",
    durationMinutes: 15,
  },
];

const slots: Slot[] = [
  { start: "2026-10-14T09:00:00+03:00", end: "2026-10-14T09:15:00+03:00", available: true },
  { start: "2026-10-14T09:30:00+03:00", end: "2026-10-14T09:45:00+03:00", available: true },
];

const slotsResponse: SlotsResponse = { eventTypeId: "et-15", date: config.today, slots };

const booking: Booking = {
  id: 1,
  eventTypeId: "et-15",
  eventTypeTitle: "Короткий звонок",
  start: "2026-10-14T09:00:00+03:00",
  end: "2026-10-14T09:15:00+03:00",
  guestName: "Иван Петров",
  guestEmail: "ivan@example.com",
};

/** Мок чтения config, справочника типов и сетки слотов одной настройкой. */
function mockReads(): void {
  mockApi({
    "/api/config": config,
    "/api/event-types": eventTypes,
    "/api/event-types/{id}/slots": slotsResponse,
  });
}

function renderBook() {
  return render(
    <MantineProvider>
      <MemoryRouter initialEntries={["/book"]}>
        <App />
      </MemoryRouter>
    </MantineProvider>,
  );
}

/** Проходит шаги «Тип» и «Дата и время», открывая «Ваши данные». */
async function goToDetailsStep() {
  const user = userEvent.setup();
  await user.click(await screen.findByRole("radio", { name: /Короткий звонок/ }));
  await user.click(screen.getByRole("button", { name: book.nav.next }));
  await user.click(await screen.findByRole("button", { name: "09:00" }));
  await user.click(screen.getByRole("button", { name: book.nav.next }));
  return user;
}

/** Заполняет имя и email и переходит на «Подтверждение». */
async function fillGuest(user: ReturnType<typeof userEvent.setup>) {
  await user.type(nameField(), "Иван Петров");
  await user.type(emailField(), "ivan@example.com");
  await user.click(screen.getByRole("button", { name: book.nav.next }));
}

describe("шаг «Ваши данные»", () => {
  beforeEach(() => {
    resetApiMock();
    mockReads();
  });

  it("показывает поля имени и email с подсказками и примечанием", async () => {
    renderBook();
    await goToDetailsStep();

    const name = nameField();
    expect(name).toHaveAttribute("placeholder", "Как к вам обращаться");
    const email = emailField();
    expect(email).toHaveAttribute("placeholder", "name@example.com");
    expect(screen.getByText("Email увидит владелец календаря.")).toBeInTheDocument();
  });

  it("немедленно подсказывает об ошибке в email и не пускает дальше", async () => {
    renderBook();
    const user = await goToDetailsStep();

    await user.type(emailField(), "не-имейл");

    expect(await screen.findByText(fieldMessages.guestEmail.INVALID_FORMAT)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: book.nav.next })).toBeDisabled();
  });

  it("подсказывает об ошибке в имени, когда его очистили", async () => {
    renderBook();
    const user = await goToDetailsStep();

    const name = nameField();
    await user.type(name, "Иван");
    await user.clear(name);

    expect(await screen.findByText(fieldMessages.guestName.REQUIRED)).toBeInTheDocument();
  });

  it("открывает «Далее» только с валидными именем и email", async () => {
    renderBook();
    const user = await goToDetailsStep();

    const next = screen.getByRole("button", { name: book.nav.next });
    expect(next).toBeDisabled();

    await user.type(nameField(), "Иван Петров");
    await user.type(emailField(), "ivan@example.com");

    expect(next).toBeEnabled();
  });
});

describe("шаг «Подтверждение» и экран успеха", () => {
  beforeEach(() => {
    resetApiMock();
    mockReads();
  });

  it("показывает сводку выбранных значений", async () => {
    renderBook();
    const user = await goToDetailsStep();
    await fillGuest(user);

    const panel = screen.getByRole("heading", { name: book.steps.confirmation.label })
      .parentElement as HTMLElement;
    expect(within(panel).getByText(book.confirmationStep.labels.type)).toBeInTheDocument();
    expect(within(panel).getByText("Короткий звонок")).toBeInTheDocument();
    expect(within(panel).getByText(book.confirmationStep.labels.when)).toBeInTheDocument();
    expect(within(panel).getByText("14 октября, среда")).toBeInTheDocument();
    expect(within(panel).getByText(book.confirmationStep.labels.time)).toBeInTheDocument();
    expect(within(panel).getByText("09:00–09:15")).toBeInTheDocument();
    expect(within(panel).getByText(book.confirmationStep.labels.guest)).toBeInTheDocument();
    expect(within(panel).getByText("Иван Петров · ivan@example.com")).toBeInTheDocument();
  });

  it("создаёт бронь и показывает экран успеха с деталями", async () => {
    api.POST.mockResolvedValue(mockResponse(booking));
    renderBook();
    const user = await goToDetailsStep();
    await fillGuest(user);

    await user.click(screen.getByRole("button", { name: book.confirmationStep.confirm }));

    expect(api.POST).toHaveBeenCalledWith("/api/bookings", {
      body: {
        eventTypeId: "et-15",
        start: "2026-10-14T09:00:00+03:00",
        guestName: "Иван Петров",
        guestEmail: "ivan@example.com",
      },
    });

    expect(await screen.findByText(book.success.title)).toBeInTheDocument();
    expect(screen.getByText(book.success.description)).toBeInTheDocument();
    expect(screen.getByText("Короткий звонок · 15 мин")).toBeInTheDocument();
    expect(screen.getByText("14 октября, среда, 09:00–09:15")).toBeInTheDocument();
    expect(screen.getByText("Иван Петров · ivan@example.com")).toBeInTheDocument();
    expect(screen.getByText("Время указано в зоне сервиса (Europe/Moscow).")).toBeInTheDocument();
  });
});

describe("ошибки записи", () => {
  beforeEach(() => {
    resetApiMock();
    mockReads();
  });

  /** Доходит до «Подтверждения» и жмёт «Подтвердить запись». */
  async function confirmBooking() {
    renderBook();
    const user = await goToDetailsStep();
    await fillGuest(user);
    await user.click(screen.getByRole("button", { name: book.confirmationStep.confirm }));
    return user;
  }

  it("на конфликт показывает блок и предлагает выбрать другое время", async () => {
    api.POST.mockResolvedValue(mockErrorResponse("CONFLICT", "Это время уже занято.", 409));
    const user = await confirmBooking();

    expect(await screen.findByText(book.conflict.title)).toBeInTheDocument();
    expect(screen.getByText(book.conflict.description)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: book.conflict.action }));

    expect(
      screen.getByRole("heading", { level: 2, name: book.steps.dateTime.label }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: book.nav.next })).toBeDisabled();
  });

  it("на недоступность сервиса показывает алерт, сохраняет данные и повторяет", async () => {
    api.POST.mockResolvedValueOnce(
      mockErrorResponse(
        "SERVICE_UNAVAILABLE",
        "Сервис временно недоступен. Попробуйте позже.",
        503,
      ),
    ).mockResolvedValueOnce(mockResponse(booking));
    const user = await confirmBooking();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(book.submitError.title);
    expect(alert).toHaveTextContent(book.submitError.description);

    await user.click(within(alert).getByRole("button", { name: book.submitError.retry }));

    expect(await screen.findByText(book.success.title)).toBeInTheDocument();
    const body = {
      eventTypeId: "et-15",
      start: "2026-10-14T09:00:00+03:00",
      guestName: "Иван Петров",
      guestEmail: "ivan@example.com",
    };
    expect(api.POST).toHaveBeenNthCalledWith(1, "/api/bookings", { body });
    expect(api.POST).toHaveBeenNthCalledWith(2, "/api/bookings", { body });
  });

  it("на внутреннюю ошибку показывает тот же алерт", async () => {
    api.POST.mockResolvedValue(
      mockErrorResponse("INTERNAL_ERROR", "Внутренняя ошибка сервера.", 500),
    );
    await confirmBooking();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(book.submitError.title);
    expect(alert).toHaveTextContent(book.submitError.description);
  });

  it("при устаревании слота возвращает на «Дата и время» и перезагружает сетку", async () => {
    api.POST.mockResolvedValue(
      mockErrorResponse("INVALID_SLOT", "Это время недоступно для записи.", 400),
    );
    await confirmBooking();

    expect(await screen.findByText(book.stale.slot.title)).toBeInTheDocument();
    expect(screen.getByText(book.stale.slot.description)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: book.steps.dateTime.label }),
    ).toBeInTheDocument();
    const slotsCalls = api.GET.mock.calls.filter(
      ([path]) => path === "/api/event-types/{id}/slots",
    );
    expect(slotsCalls.length).toBeGreaterThan(1);
  });

  it("при выходе даты из окна возвращает на «Дата и время» и перезагружает сетку", async () => {
    api.POST.mockResolvedValue(
      mockErrorResponse("DATE_OUT_OF_WINDOW", "Дата вне окна записи.", 400),
    );
    await confirmBooking();

    expect(await screen.findByText(book.stale.date.title)).toBeInTheDocument();
    expect(screen.getByText(book.stale.date.description)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: book.steps.dateTime.label }),
    ).toBeInTheDocument();
    const slotsCalls = api.GET.mock.calls.filter(
      ([path]) => path === "/api/event-types/{id}/slots",
    );
    expect(slotsCalls.length).toBeGreaterThan(1);
  });

  it("при исчезновении типа возвращает на «Тип» и перезагружает список", async () => {
    api.POST.mockResolvedValue(
      mockErrorResponse("EVENT_TYPE_NOT_FOUND", "Тип события не найден.", 404),
    );
    await confirmBooking();

    expect(await screen.findByText(book.stale.type.title)).toBeInTheDocument();
    expect(screen.getByText(book.stale.type.description)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: book.steps.type.label }),
    ).toBeInTheDocument();
    const typeCalls = api.GET.mock.calls.filter(([path]) => path === "/api/event-types");
    expect(typeCalls.length).toBeGreaterThan(1);
  });

  it("на ошибки полей от сервера возвращает на «Ваши данные» с сообщениями", async () => {
    api.POST.mockResolvedValue(
      mockErrorResponse("VALIDATION_ERROR", "Некорректный формат запроса.", 400, {
        guestName: "Недопустимые символы",
        guestEmail: "Некорректный email",
      }),
    );
    await confirmBooking();

    expect(await screen.findByText("Недопустимые символы")).toBeInTheDocument();
    expect(screen.getByText("Некорректный email")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: book.steps.details.label }),
    ).toBeInTheDocument();
    expect(nameField()).toHaveValue("Иван Петров");
    expect(emailField()).toHaveValue("ivan@example.com");
  });

  it("показывает сообщение сервера без полей как есть", async () => {
    api.POST.mockResolvedValue(
      mockErrorResponse("VALIDATION_ERROR", "Некорректный формат запроса.", 400),
    );
    await confirmBooking();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Некорректный формат запроса.");
  });

  it("показывает сообщение, если VALIDATION_ERROR пришёл про поля вне формы", async () => {
    api.POST.mockResolvedValue(
      mockErrorResponse("VALIDATION_ERROR", "Некорректное время", 400, {
        start: "Некорректное время",
      }),
    );
    await confirmBooking();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Некорректное время");
    expect(
      screen.getByRole("heading", { level: 2, name: book.steps.confirmation.label }),
    ).toBeInTheDocument();
  });
});

describe("сводка подтверждения", () => {
  it("показывает «—» для пустых значений", () => {
    render(
      <MantineProvider>
        <ConfirmationStep
          typeTitle={null}
          dateLabel={null}
          time={null}
          guest={null}
          conflict={false}
          unavailable={false}
          serverMessage={null}
          onChooseAnotherTime={vi.fn()}
          onRetry={vi.fn()}
        />
      </MantineProvider>,
    );

    expect(screen.getAllByText(book.confirmationStep.emptyValue)).toHaveLength(4);
  });
});
