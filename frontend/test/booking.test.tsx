import type { Slot, SlotsResponse } from "contracts";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "../src/App";
import type { ServiceConfig } from "../src/api/config";
import type { EventType } from "../src/api/event-types";
import { book } from "../src/copy/book";
import { common } from "../src/copy/common";
import { api, mockApi, resetApiMock } from "./helpers/api";

vi.mock("../src/api/client", () => import("./helpers/api"));

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

const config: ServiceConfig = {
  timezone: "Europe/Moscow",
  workingWindow: { start: "09:00", end: "18:00" },
  bookingWindowDays: 14,
  today: "2026-10-14",
};

const slots: Slot[] = [
  { start: "2026-10-14T09:00:00+03:00", end: "2026-10-14T09:15:00+03:00", available: true },
];

const slotsResponse: SlotsResponse = { eventTypeId: "et-15", date: config.today, slots };

/** Мок config, справочника типов и сетки слотов одной настройкой. */
function mockDefaults(): void {
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

describe("мастер записи /book", () => {
  beforeEach(() => {
    resetApiMock();
    mockDefaults();
  });

  it("показывает четыре шага мастера", async () => {
    renderBook();

    for (const step of Object.values(book.steps)) {
      expect((await screen.findAllByText(step.label)).length).toBeGreaterThan(0);
    }
  });

  it("на шаге «Тип» показывает типы событий с длительностью", async () => {
    renderBook();

    expect(await screen.findByText("Короткий звонок")).toBeInTheDocument();
    expect(screen.getByText("Стандартная встреча")).toBeInTheDocument();
    expect(
      screen.getByText("Знакомство, быстрый вопрос или уточнение деталей."),
    ).toBeInTheDocument();
    expect(screen.getByText(book.duration(15))).toBeInTheDocument();
    expect(screen.getByText(book.duration(30))).toBeInTheDocument();
    expect(api.listEventTypes).toHaveBeenCalled();
  });

  it("берёт список типов из GET /api/event-types", async () => {
    mockApi({
      "/api/config": config,
      "/api/event-types": [
        {
          id: "et-60",
          title: "Часовая встреча",
          description: "Глубокий разбор.",
          durationMinutes: 60,
        },
      ],
      "/api/event-types/{id}/slots": slotsResponse,
    });

    renderBook();

    expect(await screen.findByText("Часовая встреча")).toBeInTheDocument();
    expect(screen.getByText(book.duration(60))).toBeInTheDocument();
  });

  it("открывает «Далее» только после выбора типа и ведёт на следующий шаг", async () => {
    const user = userEvent.setup();
    renderBook();

    const next = screen.getByRole("button", { name: book.nav.next });
    expect(next).toBeDisabled();

    await user.click(await screen.findByRole("radio", { name: /Короткий звонок/ }));

    expect(screen.getByRole("radio", { name: /Короткий звонок/ })).toBeChecked();
    expect(next).toBeEnabled();

    await user.click(next);

    expect(await screen.findByRole("radiogroup", { name: /окно записи/ })).toBeInTheDocument();
  });

  it("переносит фокус на заголовок нового шага при «Далее»", async () => {
    const user = userEvent.setup();
    renderBook();

    await user.click(await screen.findByRole("radio", { name: /Короткий звонок/ }));
    await user.click(screen.getByRole("button", { name: book.nav.next }));

    expect(
      screen.getByRole("heading", { level: 2, name: book.steps.dateTime.label }),
    ).toHaveFocus();
  });

  it("не забирает фокус на заголовок при первом рендере", async () => {
    renderBook();

    await screen.findByText("Короткий звонок");

    expect(
      screen.getByRole("heading", { level: 2, name: book.steps.type.label }),
    ).not.toHaveFocus();
  });

  it("делает «Назад» недоступной на первом шаге", async () => {
    renderBook();

    expect(screen.getByRole("button", { name: book.nav.back })).toBeDisabled();
  });

  it("показывает ошибку чтения типов и повторяет запрос по «Повторить»", async () => {
    api.listEventTypes.mockRejectedValueOnce(new Error("network"));
    const user = userEvent.setup();

    renderBook();

    expect(await screen.findByRole("alert")).toHaveTextContent(common.readError.title);

    await user.click(screen.getByRole("button", { name: common.readError.retry }));

    expect(await screen.findByText("Короткий звонок")).toBeInTheDocument();
  });
});
