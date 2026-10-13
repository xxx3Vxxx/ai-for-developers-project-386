import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "../src/App";
import type { ServiceConfig } from "../src/api/config";
import { common } from "../src/copy/common";
import { landing } from "../src/copy/landing";
import { api, mockConfig, resetApiMock } from "./helpers/api";

vi.mock("../src/api/client", () => import("./helpers/api"));

// Значения намеренно отличаются от дефолтов бекенда: тест доказывает, что
// лендинг подставляет параметры из `GET /api/config`, а не хардкодит их.
const config: ServiceConfig = {
  timezone: "Europe/Berlin",
  workingWindow: { start: "08:00", end: "20:00" },
  bookingWindowDays: 7,
  today: "2026-10-13",
};

const windowCapability = "Свободные слоты на 7 дней вперёд, ежедневно с 08:00 до 20:00.";

function renderApp(path = "/") {
  return render(
    <MantineProvider>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </MantineProvider>,
  );
}

/** Рендерит лендинг и дожидается подстановки конфигурации из API. */
async function renderLanding() {
  renderApp();
  await screen.findByText(windowCapability);
}

describe("лендинг", () => {
  beforeEach(() => {
    resetApiMock();
    mockConfig(config);
  });

  it("показывает бейдж, заголовок, подзаголовок и CTA", async () => {
    await renderLanding();

    expect(screen.getByText(landing.badge)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: landing.title })).toBeInTheDocument();
    expect(screen.getByText(landing.subtitle)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: landing.cta })).toHaveAttribute("href", "/book");
  });

  it("показывает блок «Что доступно прямо сейчас»", async () => {
    await renderLanding();

    expect(
      screen.getByRole("heading", { level: 2, name: landing.capabilitiesTitle }),
    ).toBeInTheDocument();
    expect(screen.getByText(windowCapability)).toBeInTheDocument();
    expect(screen.getByText(landing.capabilities.types)).toBeInTheDocument();
    expect(screen.getByText(landing.capabilities.exclusive)).toBeInTheDocument();
  });

  it("берёт дни окна записи и часы рабочего окна из GET /api/config", async () => {
    renderApp();

    expect(await screen.findByText(windowCapability)).toBeInTheDocument();
    expect(api.GET).toHaveBeenCalledWith("/api/config");
  });

  it("склоняет число дней окна записи", async () => {
    mockConfig({ ...config, bookingWindowDays: 1 });

    renderApp();

    expect(
      await screen.findByText("Свободные слоты на 1 день вперёд, ежедневно с 08:00 до 20:00."),
    ).toBeInTheDocument();
  });

  it("показывает ошибку чтения и повторяет запрос по «Повторить»", async () => {
    api.GET.mockRejectedValueOnce(new Error("network"));
    const user = userEvent.setup();

    renderApp();

    expect(await screen.findByRole("alert")).toHaveTextContent(common.readError.title);
    expect(screen.getByText(common.readError.description)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: common.readError.retry }));

    expect(await screen.findByText(windowCapability)).toBeInTheDocument();
  });
});

describe("шапка", () => {
  beforeEach(() => {
    resetApiMock();
    mockConfig(config);
  });

  it("ведёт на запись", async () => {
    await renderLanding();

    expect(screen.getByRole("link", { name: common.book })).toHaveAttribute("href", "/book");
  });

  it("показывает бренд «Календарь звонков»", async () => {
    await renderLanding();

    expect(screen.getByRole("link", { name: common.brand })).toHaveAttribute("href", "/");
  });

  it("не содержит «Calendar» и «Админка»", async () => {
    await renderLanding();

    expect(screen.queryByText("Calendar")).not.toBeInTheDocument();
    expect(screen.queryByText("Админка")).not.toBeInTheDocument();
  });
});
