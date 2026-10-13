import type { components } from "contracts";
import { MantineProvider } from "@mantine/core";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "../src/App";
import type { Booking } from "../src/api/bookings";
import type { ServiceConfig } from "../src/api/config";
import type { EventType } from "../src/api/event-types";
import { NEW_EVENT_TYPE_DRAWER_ID } from "../src/components/admin/NewEventTypeDrawer";
import { admin } from "../src/copy/admin";
import { book } from "../src/copy/book";
import { common } from "../src/copy/common";
import { expectNoA11yViolations } from "./helpers/a11y";
import { api, mockApi, mockErrorResponse, mockResponse, resetApiMock } from "./helpers/api";

vi.mock("../src/api/client", () => import("./helpers/api"));

type Slot = components["schemas"]["Slot"];
type SlotsResponse = components["schemas"]["SlotsResponse"];
type User = ReturnType<typeof userEvent.setup>;

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
  { start: "2026-10-14T09:15:00+03:00", end: "2026-10-14T09:30:00+03:00", available: false },
];

const slotsResponse: SlotsResponse = { eventTypeId: "et-15", date: config.today, slots };

const bookings: Booking[] = [
  {
    id: 1,
    eventTypeId: "et-15",
    eventTypeTitle: "Короткий звонок",
    start: "2026-10-14T11:00:00+03:00",
    end: "2026-10-14T11:15:00+03:00",
    guestName: "Иван Петров",
    guestEmail: "ivan@example.com",
  },
];

const booking: Booking = bookings[0];

/** Мок всех чтений трёх поверхностей; слоты и встречи можно переопределить. */
function mockReads(overrides: { bookings?: Booking[]; slots?: SlotsResponse } = {}): void {
  mockApi({
    "/api/config": config,
    "/api/event-types": eventTypes,
    "/api/event-types/{id}/slots": overrides.slots ?? slotsResponse,
    "/api/bookings": overrides.bookings ?? bookings,
  });
}

function renderApp(path: string) {
  return render(
    <MantineProvider>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </MantineProvider>,
  );
}

/** Выбирает тип и открывает шаг «Дата и время». */
async function goToDateTimeStep(user: User) {
  await user.click(await screen.findByRole("radio", { name: /Короткий звонок/ }));
  await user.click(screen.getByRole("button", { name: book.nav.next }));
}

/** Проходит «Дата и время» и открывает шаг «Ваши данные». */
async function goToDetailsStep(user: User) {
  await goToDateTimeStep(user);
  await user.click(await screen.findByRole("button", { name: "09:00" }));
  await user.click(screen.getByRole("button", { name: book.nav.next }));
}

/** Заполняет имя и email. */
async function fillDetails(user: User) {
  await user.type(screen.getByRole("textbox", { name: /Имя/ }), "Иван Петров");
  await user.type(screen.getByRole("textbox", { name: /Email/ }), "ivan@example.com");
}

/** Проходит все шаги мастера и открывает «Подтверждение». */
async function goToConfirmation(user: User) {
  await goToDetailsStep(user);
  await fillDetails(user);
  await user.click(screen.getByRole("button", { name: book.nav.next }));
}

describe("лендинг /", () => {
  beforeEach(() => {
    resetApiMock();
    mockReads();
  });

  it("нет нарушений WCAG 2.2 AA в загруженном состоянии", async () => {
    const { container } = renderApp("/");
    await screen.findByText(/Свободные слоты на 14 дней вперёд/);

    await expectNoA11yViolations(container);
  });

  it("нет нарушений в состоянии загрузки", async () => {
    api.GET.mockImplementation(() => new Promise(() => {}));
    const { container } = renderApp("/");
    await screen.findByRole("status", { name: common.loading });

    await expectNoA11yViolations(container);
  });

  it("нет нарушений в состоянии ошибки чтения", async () => {
    api.GET.mockRejectedValue(new Error("network"));
    const { container } = renderApp("/");
    await screen.findByRole("alert");

    await expectNoA11yViolations(container);
  });
});

describe("мастер /book", () => {
  beforeEach(() => {
    resetApiMock();
    mockReads();
  });

  it("нет нарушений на шаге «Тип»", async () => {
    const { container } = renderApp("/book");
    await screen.findByRole("radio", { name: /Короткий звонок/ });

    await expectNoA11yViolations(container);
  });

  it("нет нарушений на шаге «Дата и время»", async () => {
    const user = userEvent.setup();
    const { container } = renderApp("/book");
    await goToDateTimeStep(user);
    await screen.findByRole("radiogroup", { name: /окно записи/ });

    await expectNoA11yViolations(container);
  });

  it("нет нарушений на шаге «Ваши данные»", async () => {
    const user = userEvent.setup();
    const { container } = renderApp("/book");
    await goToDetailsStep(user);
    await screen.findByRole("textbox", { name: /Имя/ });

    await expectNoA11yViolations(container);
  });

  it("нет нарушений на шаге «Подтверждение»", async () => {
    const user = userEvent.setup();
    const { container } = renderApp("/book");
    await goToConfirmation(user);
    await screen.findByRole("button", { name: book.confirmationStep.confirm });

    await expectNoA11yViolations(container);
  });

  it("нет нарушений на экране успеха", async () => {
    api.POST.mockResolvedValue(mockResponse(booking));
    const user = userEvent.setup();
    const { container } = renderApp("/book");
    await goToConfirmation(user);
    await user.click(screen.getByRole("button", { name: book.confirmationStep.confirm }));
    await screen.findByText(book.success.title);

    await expectNoA11yViolations(container);
  });

  it("нет нарушений на конфликте записи", async () => {
    api.POST.mockResolvedValue(mockErrorResponse("CONFLICT", "Это время уже занято.", 409));
    const user = userEvent.setup();
    const { container } = renderApp("/book");
    await goToConfirmation(user);
    await user.click(screen.getByRole("button", { name: book.confirmationStep.confirm }));
    await screen.findByText(book.conflict.title);

    await expectNoA11yViolations(container);
  });

  it("нет нарушений при недоступности сервиса на записи", async () => {
    api.POST.mockResolvedValue(
      mockErrorResponse("SERVICE_UNAVAILABLE", "Сервис временно недоступен.", 503),
    );
    const user = userEvent.setup();
    const { container } = renderApp("/book");
    await goToConfirmation(user);
    await user.click(screen.getByRole("button", { name: book.confirmationStep.confirm }));
    await screen.findByText(book.submitError.title);

    await expectNoA11yViolations(container);
  });

  it("нет нарушений, когда на день не осталось свободных слотов", async () => {
    mockReads({
      slots: { ...slotsResponse, slots: slots.map((slot) => ({ ...slot, available: false })) },
    });
    const user = userEvent.setup();
    const { container } = renderApp("/book");
    await goToDateTimeStep(user);
    await screen.findByText(book.dateTimeStep.emptyTitle);

    await expectNoA11yViolations(container);
  });

  it("нет нарушений при ошибке чтения слотов", async () => {
    api.GET.mockImplementation(async (path: string) => {
      if (path === "/api/config") return mockResponse(config);
      if (path === "/api/event-types") return mockResponse(eventTypes);
      if (path === "/api/event-types/{id}/slots") throw new Error("network");
      return mockResponse(bookings);
    });
    const user = userEvent.setup();
    const { container } = renderApp("/book");
    await goToDateTimeStep(user);
    await screen.findByText(book.dateTimeStep.readError.title);

    await expectNoA11yViolations(container);
  });
});

describe("кабинет /admin", () => {
  beforeEach(() => {
    resetApiMock();
    mockReads();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-14T09:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("нет нарушений в загруженном состоянии", async () => {
    const { container } = renderApp("/admin");
    await screen.findByRole("region", { name: admin.meetings.heading });

    await expectNoA11yViolations(container);
  });

  it("нет нарушений в пустом состоянии", async () => {
    mockReads({ bookings: [] });
    const { container } = renderApp("/admin");
    await screen.findByRole("region", { name: admin.meetings.heading });

    await expectNoA11yViolations(container);
  });

  it("нет нарушений в состоянии ошибки чтения", async () => {
    api.GET.mockRejectedValue(new Error("network"));
    const { container } = renderApp("/admin");
    await screen.findByRole("alert");

    await expectNoA11yViolations(container);
  });

  it("нет нарушений в открытой выдвижной панели создания типа", async () => {
    const user = userEvent.setup();
    renderApp("/admin");
    await user.click(await screen.findByRole("button", { name: admin.create.action }));
    await screen.findByRole("dialog", { name: admin.create.drawerTitle });

    await expectNoA11yViolations(document.body);
  });

  it("держит фокус в панели, закрывает по Escape и возвращает фокус на кнопку", async () => {
    const user = userEvent.setup();
    renderApp("/admin");
    const trigger = await screen.findByRole("button", { name: admin.create.action });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveAttribute("aria-controls", NEW_EVENT_TYPE_DRAWER_ID);

    await user.click(trigger);
    const drawer = await screen.findByRole("dialog", { name: admin.create.drawerTitle });
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    // Начальный фокус — на первом поле панели (ADR-0016).
    expect(within(drawer).getByLabelText(/Название/)).toHaveFocus();

    // Tab не выходит за пределы панели (focus-trap Mantine).
    for (let step = 0; step < 10; step += 1) {
      await user.tab();
      expect(drawer.contains(document.activeElement)).toBe(true);
    }

    await user.keyboard("{Escape}");

    expect(await screen.findByRole("button", { name: admin.create.action })).toHaveFocus();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});

describe("baseline-гигиена", () => {
  beforeEach(() => {
    resetApiMock();
    mockReads();
  });

  it("skip-link ведёт к основному содержимому и виден при фокусе", async () => {
    const user = userEvent.setup();
    renderApp("/");
    await screen.findByText(/Свободные слоты на 14 дней вперёд/);

    const skipLink = screen.getByRole("link", { name: common.skipToContent });
    expect(skipLink).toHaveAttribute("href", "#main-content");

    await user.tab();
    expect(skipLink).toHaveFocus();
  });

  it("у каждого экрана ровно один h1", async () => {
    for (const path of ["/", "/book", "/admin"]) {
      const { unmount } = renderApp(path);
      await screen.findAllByRole("heading", { level: 1 });
      expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
      unmount();
    }
  });

  it("выставляет document.title на маршрут", async () => {
    const { unmount } = renderApp("/");
    await screen.findByText(/Свободные слоты на 14 дней вперёд/);
    expect(document.title).toBe(common.brand);
    unmount();

    renderApp("/book");
    await screen.findByRole("radio", { name: /Короткий звонок/ });
    expect(document.title).toBe(common.documentTitle(book.title));
    unmount();

    renderApp("/admin");
    await screen.findByRole("region", { name: admin.meetings.heading });
    expect(document.title).toBe(common.documentTitle(admin.title));
  });
});
