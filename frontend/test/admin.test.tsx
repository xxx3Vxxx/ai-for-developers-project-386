import { MantineProvider } from "@mantine/core";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "../src/App";
import type { Booking } from "../src/api/bookings";
import type { ServiceConfig } from "../src/api/config";
import type { EventType } from "../src/api/event-types";
import { admin } from "../src/copy/admin";
import { common } from "../src/copy/common";
import { api, mockApi, mockResponse, resetApiMock } from "./helpers/api";

vi.mock("../src/api/client", () => import("./helpers/api"));

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
  {
    id: "et-30",
    title: "Стандартная встреча",
    description: "Обсуждение задачи, разбор требований или демо.",
    durationMinutes: 30,
  },
];

/** Встречи в порядке `start` asc: идущая сейчас, позже сегодня, завтра, послезавтра. */
const bookings: Booking[] = [
  {
    id: 1,
    eventTypeId: "et-30",
    eventTypeTitle: "Стандартная встреча",
    start: "2026-10-14T11:45:00+03:00",
    end: "2026-10-14T12:15:00+03:00",
    guestName: "Иван Петров",
    guestEmail: "ivan@example.com",
  },
  {
    id: 2,
    eventTypeId: "et-15",
    eventTypeTitle: "Короткий звонок",
    start: "2026-10-14T14:00:00+03:00",
    end: "2026-10-14T14:15:00+03:00",
    guestName: "Мария Соколова",
    guestEmail: "maria@example.com",
  },
  {
    id: 3,
    eventTypeId: "et-30",
    eventTypeTitle: "Стандартная встреча",
    start: "2026-10-15T10:00:00+03:00",
    end: "2026-10-15T10:30:00+03:00",
    guestName: "Пётр Ким",
    guestEmail: "petr@example.com",
  },
  {
    id: 4,
    eventTypeId: "et-15",
    eventTypeTitle: "Короткий звонок",
    start: "2026-10-16T09:00:00+03:00",
    end: "2026-10-16T09:15:00+03:00",
    guestName: "Ольга Лебедева",
    guestEmail: "olga@example.com",
  },
];

/** Мок трёх чтений кабинета: конфигурации, типов и встреч. */
function mockAdmin(data: { bookings?: Booking[] } = {}): void {
  mockApi({
    "/api/config": config,
    "/api/event-types": eventTypes,
    "/api/bookings": data.bookings ?? bookings,
  });
}

function renderAdmin() {
  return render(
    <MantineProvider>
      <MemoryRouter initialEntries={["/admin"]}>
        <App />
      </MemoryRouter>
    </MantineProvider>,
  );
}

/** Элемент встречи по уникальной строке гостя. */
function item(guest: string): HTMLElement {
  return screen.getByText(guest).closest("div") as HTMLElement;
}

describe("кабинет /admin", () => {
  beforeEach(() => {
    resetApiMock();
    mockAdmin();
    // «Сейчас» — 14 октября 2026, 12:00 в Москве (09:00 UTC): первая встреча идёт.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-14T09:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("назван «Типы событий и предстоящие встречи»", async () => {
    renderAdmin();

    expect(await screen.findByRole("heading", { level: 1, name: admin.title })).toBeInTheDocument();
  });

  it("показывает рельс типов: название и бейдж длительности (только просмотр)", async () => {
    renderAdmin();

    const rail = await screen.findByRole("region", { name: admin.types.heading });
    expect(within(rail).getByText("Короткий звонок")).toBeInTheDocument();
    expect(within(rail).getByText("Стандартная встреча")).toBeInTheDocument();
    expect(within(rail).getByText("15 мин")).toBeInTheDocument();
    expect(within(rail).getByText("30 мин")).toBeInTheDocument();
    expect(api.listEventTypes).toHaveBeenCalled();
    expect(api.listBookings).toHaveBeenCalled();
  });

  it("группирует встречи по суткам зоны сервиса: «Сегодня»/«Завтра»/дата и метка «сегодня»", async () => {
    renderAdmin();

    const feed = await screen.findByRole("region", { name: admin.meetings.heading });
    expect(within(feed).getByText("Сегодня")).toBeInTheDocument();
    expect(within(feed).getByText("Завтра")).toBeInTheDocument();
    expect(within(feed).getByText("16 октября")).toBeInTheDocument();
    expect(within(feed).getByText(admin.meetings.todayMark)).toBeInTheDocument();
  });

  it("в элементе встречи — интервал, длительность, тип, имя и email гостя", async () => {
    renderAdmin();

    await screen.findByRole("region", { name: admin.meetings.heading });

    const ongoingItem = item("Иван Петров · ivan@example.com");
    expect(within(ongoingItem).getByText("11:45–12:15")).toBeInTheDocument();
    expect(within(ongoingItem).getByText("30 мин")).toBeInTheDocument();
    expect(within(ongoingItem).getByText("Стандартная встреча")).toBeInTheDocument();

    const laterItem = item("Мария Соколова · maria@example.com");
    expect(within(laterItem).getByText("14:00–14:15")).toBeInTheDocument();
    expect(within(laterItem).getByText("15 мин")).toBeInTheDocument();
    expect(within(laterItem).getByText("Короткий звонок")).toBeInTheDocument();
  });

  it("помечает маркером «идёт сейчас» только идущую встречу", async () => {
    renderAdmin();

    const feed = await screen.findByRole("region", { name: admin.meetings.heading });
    expect(within(feed).getAllByText(admin.meetings.ongoing)).toHaveLength(1);
    expect(
      within(item("Иван Петров · ivan@example.com")).getByText(admin.meetings.ongoing),
    ).toBeInTheDocument();
    expect(
      within(item("Мария Соколова · maria@example.com")).queryByText(admin.meetings.ongoing),
    ).not.toBeInTheDocument();
  });

  it("показывает пустое состояние, когда встреч нет", async () => {
    mockAdmin({ bookings: [] });
    renderAdmin();

    const feed = await screen.findByRole("region", { name: admin.meetings.heading });
    expect(within(feed).getByText(admin.meetings.empty.title)).toBeInTheDocument();
    expect(within(feed).getByText(admin.meetings.empty.description)).toBeInTheDocument();
  });

  it("показывает ошибку чтения и повторяет запрос по «Повторить»", async () => {
    let failed = false;
    api.listBookings.mockImplementation(async () => {
      if (!failed) {
        failed = true;
        throw new Error("network");
      }
      return mockResponse(bookings);
    });
    const user = userEvent.setup();

    renderAdmin();

    expect(await screen.findByRole("alert")).toHaveTextContent(common.readError.title);
    expect(screen.getByText(common.readError.description)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: common.readError.retry }));

    expect(await screen.findByRole("region", { name: admin.meetings.heading })).toBeInTheDocument();
  });
});
