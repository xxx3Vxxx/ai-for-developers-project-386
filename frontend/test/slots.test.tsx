import type { Slot, SlotsResponse } from "contracts";
import { MantineProvider } from "@mantine/core";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "../src/App";
import type { ServiceConfig } from "../src/api/config";
import type { EventType } from "../src/api/event-types";
import { book } from "../src/copy/book";
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
];

const slots: Slot[] = [
  { start: "2026-10-14T09:00:00+03:00", end: "2026-10-14T09:15:00+03:00", available: true },
  { start: "2026-10-14T09:15:00+03:00", end: "2026-10-14T09:30:00+03:00", available: false },
  { start: "2026-10-14T09:30:00+03:00", end: "2026-10-14T09:45:00+03:00", available: true },
];

function slotsResponse(overrides: Partial<SlotsResponse> = {}): SlotsResponse {
  return { eventTypeId: "et-15", date: config.today, slots, ...overrides };
}

/** Мок config, справочника типов и сетки слотов одной настройкой. */
function mockAll(slotsData: SlotsResponse): void {
  mockApi({
    "/api/config": config,
    "/api/event-types": eventTypes,
    "/api/event-types/{id}/slots": slotsData,
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

/** Проходит шаг 1 и открывает шаг 2 «Дата и время». */
async function goToDateTimeStep() {
  const user = userEvent.setup();
  await user.click(await screen.findByRole("radio", { name: /Короткий звонок/ }));
  await user.click(screen.getByRole("button", { name: book.nav.next }));
  return user;
}

describe("шаг 2 «Дата и время»", () => {
  beforeEach(() => {
    resetApiMock();
  });

  it("показывает полосу из 14 дней и сетку слотов выбранного дня", async () => {
    mockAll(slotsResponse());
    renderBook();
    await goToDateTimeStep();

    const strip = await screen.findByRole("radiogroup", { name: /окно записи/ });
    expect(within(strip).getAllByRole("radio")).toHaveLength(config.bookingWindowDays);
    const todayRadio = within(strip).getByRole("radio", { name: /сегодня/ });
    expect(todayRadio).toHaveAttribute("aria-checked", "true");
    expect(todayRadio).toHaveAttribute("aria-current", "date");

    const grid = screen.getByRole("group", { name: "Слоты на 14 октября" });
    expect(within(grid).getByRole("button", { name: "09:00" })).toBeEnabled();
    expect(within(grid).getByRole("button", { name: "09:30" })).toBeEnabled();
    expect(screen.getByText("Время указано в зоне сервиса (Europe/Moscow).")).toBeInTheDocument();
  });

  it("зачёркивает и делает недоступными занятые и начавшиеся слоты", async () => {
    mockAll(slotsResponse());
    renderBook();
    await goToDateTimeStep();

    const busy = await screen.findByRole("button", { name: "09:15" });
    expect(busy).toBeDisabled();
    expect(busy).toHaveStyle("text-decoration: line-through");
  });

  it("перечитывает слоты при выборе другой даты", async () => {
    mockAll(slotsResponse());
    renderBook();
    const user = await goToDateTimeStep();

    const strip = await screen.findByRole("radiogroup", { name: /окно записи/ });
    await user.click(within(strip).getAllByRole("radio")[1]);

    expect(api.listSlots).toHaveBeenCalledWith({
      path: { id: "et-15" },
      query: { date: "2026-10-15" },
    });
  });

  it("показывает сообщение, когда на день не осталось свободных слотов", async () => {
    mockAll(
      slotsResponse({
        slots: slots.map((slot) => ({ ...slot, available: false })),
      }),
    );
    renderBook();
    await goToDateTimeStep();

    expect(await screen.findByText(book.dateTimeStep.emptyTitle)).toBeInTheDocument();
    expect(screen.getByText(book.dateTimeStep.emptyForToday)).toBeInTheDocument();
  });

  it("показывает скелеты, пока слоты грузятся", async () => {
    mockApi({ "/api/config": config, "/api/event-types": eventTypes });
    api.listSlots.mockImplementation(() => new Promise(() => {}));
    renderBook();
    await goToDateTimeStep();

    expect(await screen.findByRole("status", { name: "Загрузка…" })).toBeInTheDocument();
  });

  it("показывает ошибку чтения слотов и повторяет запрос по «Повторить»", async () => {
    mockApi({ "/api/config": config, "/api/event-types": eventTypes });
    api.listSlots
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce(mockResponse(slotsResponse()));
    renderBook();
    const user = await goToDateTimeStep();

    expect(await screen.findByRole("alert")).toHaveTextContent(book.dateTimeStep.readError.title);

    await user.click(screen.getByRole("button", { name: book.dateTimeStep.readError.retry }));

    expect(await screen.findByRole("button", { name: "09:00" })).toBeInTheDocument();
  });

  it("открывает «Далее» только после выбора слота", async () => {
    mockAll(slotsResponse());
    renderBook();
    const user = await goToDateTimeStep();

    const next = screen.getByRole("button", { name: book.nav.next });
    expect(next).toBeDisabled();

    await user.click(await screen.findByRole("button", { name: "09:00" }));

    expect(next).toBeEnabled();
  });

  it("сбрасывает выбранный слот при смене даты", async () => {
    mockAll(slotsResponse());
    renderBook();
    const user = await goToDateTimeStep();

    await user.click(await screen.findByRole("button", { name: "09:00" }));
    const next = screen.getByRole("button", { name: book.nav.next });
    expect(next).toBeEnabled();

    const strip = screen.getByRole("radiogroup", { name: /окно записи/ });
    await user.click(within(strip).getAllByRole("radio")[1]);

    expect(next).toBeDisabled();
  });

  it("переводит фокус по стрелкам, оставляя выбор прежним (roving tabindex)", async () => {
    mockAll(slotsResponse());
    renderBook();
    const user = await goToDateTimeStep();

    const strip = await screen.findByRole("radiogroup", { name: /окно записи/ });
    const radios = within(strip).getAllByRole("radio");
    radios[0].focus();

    await user.keyboard("{ArrowRight}");

    expect(radios[1]).toHaveFocus();
    expect(radios[1]).toHaveAttribute("tabindex", "0");
    expect(radios[0]).toHaveAttribute("tabindex", "-1");
    // Стрелки двигают фокус, но не меняют выбор (ADR-0016).
    expect(radios[0]).toHaveAttribute("aria-checked", "true");
  });
});
