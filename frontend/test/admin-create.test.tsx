import { MantineProvider } from "@mantine/core";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "../src/App";
import type { Booking } from "../src/api/bookings";
import type { ServiceConfig } from "../src/api/config";
import type { EventType } from "../src/api/event-types";
import { admin } from "../src/copy/admin";
import { fieldMessages } from "../src/copy/fields";
import { api, mockApi, mockErrorResponse, mockResponse, resetApiMock } from "./helpers/api";

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

const bookings: Booking[] = [];

/** Созданный тип-пример, который «появляется» после успешной отправки. */
const created: EventType = {
  id: "et-new",
  title: "Демо-звонок",
  description: "Показ продукта и ответы на вопросы.",
  durationMinutes: 45,
};

function renderAdmin() {
  return render(
    <MantineProvider>
      <MemoryRouter initialEntries={["/admin"]}>
        <App />
      </MemoryRouter>
    </MantineProvider>,
  );
}

/** Открывает панель создания и возвращает её как область взаимодействия. */
async function openDrawer() {
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: admin.create.action }));
  const drawer = await screen.findByRole("dialog", { name: admin.create.drawerTitle });
  return { user, drawer };
}

/** Заполняет панель валидными значениями. */
async function fillDrawer(
  user: ReturnType<typeof userEvent.setup>,
  drawer: HTMLElement,
  duration: number,
) {
  await user.type(within(drawer).getByLabelText(/Название/), created.title);
  await user.type(within(drawer).getByLabelText(/Описание/), created.description);
  const durationField = within(drawer).getByLabelText(/Длительность/);
  await user.clear(durationField);
  await user.type(durationField, String(duration));
}

describe("/admin: создание типа события", () => {
  beforeEach(() => {
    resetApiMock();
    mockApi({ "/api/config": config, "/api/event-types": eventTypes, "/api/bookings": bookings });
  });

  it("кнопка «+ Новый тип» открывает панель с полями и кнопками", async () => {
    renderAdmin();
    const { drawer } = await openDrawer();

    expect(within(drawer).getByLabelText(/Название/)).toBeInTheDocument();
    expect(within(drawer).getByLabelText(/Описание/)).toBeInTheDocument();
    expect(within(drawer).getByLabelText(/Длительность/)).toBeInTheDocument();
    expect(within(drawer).getByRole("button", { name: admin.create.submit })).toBeInTheDocument();
    expect(within(drawer).getByRole("button", { name: admin.create.cancel })).toBeInTheDocument();
  });

  it("создаёт тип, закрывает панель и показывает успех, обновляя рельс", async () => {
    api.POST.mockResolvedValue(mockResponse(created));
    renderAdmin();
    const { user, drawer } = await openDrawer();

    await fillDrawer(user, drawer, created.durationMinutes);
    // Следующий GET `event-types` отдаёт созданный тип — рельс обновляется.
    mockApi({
      "/api/config": config,
      "/api/event-types": [...eventTypes, created],
      "/api/bookings": bookings,
    });
    await user.click(within(drawer).getByRole("button", { name: admin.create.submit }));

    expect(api.POST).toHaveBeenCalledWith("/api/event-types", {
      body: {
        title: created.title,
        description: created.description,
        durationMinutes: created.durationMinutes,
      },
    });
    expect(await screen.findByText(admin.create.success.title)).toBeInTheDocument();
    expect(
      screen.getByText(admin.create.success.description(created.title, "45 мин")),
    ).toBeInTheDocument();

    const rail = await screen.findByRole("region", { name: admin.types.heading });
    expect(await within(rail).findByText(created.title)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    // Панель сброшена: повторное открытие показывает пустые поля.
    const { drawer: reopened } = await openDrawer();
    expect(within(reopened).getByLabelText(/Название/)).toHaveValue("");
  });

  it("показывает ошибки 400 под полями и не закрывает панель", async () => {
    api.POST.mockResolvedValue(
      mockErrorResponse("VALIDATION_ERROR", "Некорректный формат запроса.", 400, {
        title: fieldMessages.title.REQUIRED,
        durationMinutes: fieldMessages.durationMinutes.NOT_MULTIPLE,
      }),
    );
    renderAdmin();
    const { user, drawer } = await openDrawer();
    await fillDrawer(user, drawer, created.durationMinutes);

    await user.click(within(drawer).getByRole("button", { name: admin.create.submit }));

    expect(await screen.findByText(fieldMessages.title.REQUIRED)).toBeInTheDocument();
    expect(screen.getByText(fieldMessages.durationMinutes.NOT_MULTIPLE)).toBeInTheDocument();
    // Панель остаётся открытой, ввод не теряется.
    expect(screen.getByRole("dialog", { name: admin.create.drawerTitle })).toBeInTheDocument();
    expect(within(drawer).getByLabelText(/Название/)).toHaveValue(created.title);
  });

  it("подсказывает об ошибке поля до отправки, не отправляя запрос", async () => {
    renderAdmin();
    const { user, drawer } = await openDrawer();

    await user.clear(within(drawer).getByLabelText(/Название/));
    await user.click(within(drawer).getByRole("button", { name: admin.create.submit }));

    expect(await screen.findByText(fieldMessages.title.REQUIRED)).toBeInTheDocument();
    expect(api.POST).not.toHaveBeenCalled();
  });

  it("подсказывает «Укажите длительность», когда поле очистили", async () => {
    renderAdmin();
    const { user, drawer } = await openDrawer();

    await user.clear(within(drawer).getByLabelText(/Длительность/));
    await user.click(within(drawer).getByRole("button", { name: admin.create.submit }));

    expect(await screen.findByText(fieldMessages.durationMinutes.REQUIRED)).toBeInTheDocument();
    expect(api.POST).not.toHaveBeenCalled();
  });

  it("на недоступность сервиса показывает алерт с «Повторить», сохраняя ввод", async () => {
    api.POST.mockResolvedValueOnce(
      mockErrorResponse("SERVICE_UNAVAILABLE", "Сервис временно недоступен.", 503),
    ).mockResolvedValueOnce(mockResponse(created));
    renderAdmin();
    const { user, drawer } = await openDrawer();
    await fillDrawer(user, drawer, created.durationMinutes);

    await user.click(within(drawer).getByRole("button", { name: admin.create.submit }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(admin.create.error.title);
    expect(alert).toHaveTextContent(admin.create.error.description);
    expect(within(drawer).getByLabelText(/Название/)).toHaveValue(created.title);

    await user.click(within(alert).getByRole("button", { name: admin.create.error.retry }));

    expect(await screen.findByText(admin.create.success.title)).toBeInTheDocument();
    expect(api.POST).toHaveBeenNthCalledWith(2, "/api/event-types", {
      body: {
        title: created.title,
        description: created.description,
        durationMinutes: created.durationMinutes,
      },
    });
  });

  it("на внутреннюю ошибку показывает тот же алерт", async () => {
    api.POST.mockResolvedValue(
      mockErrorResponse("INTERNAL_ERROR", "Внутренняя ошибка сервера.", 500),
    );
    renderAdmin();
    const { user, drawer } = await openDrawer();
    await fillDrawer(user, drawer, created.durationMinutes);

    await user.click(within(drawer).getByRole("button", { name: admin.create.submit }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(admin.create.error.title);
    expect(alert).toHaveTextContent(admin.create.error.description);
  });
});
