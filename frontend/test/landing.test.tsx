import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { App } from "../src/App";

function renderApp(path = "/") {
  return render(
    <MantineProvider>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </MantineProvider>,
  );
}

describe("главная страница", () => {
  it("открывается и рассказывает про сервис", () => {
    renderApp();

    expect(screen.getByRole("heading", { level: 1, name: "Calendar" })).toBeInTheDocument();
    expect(screen.getByText(/быстрая бронь/i)).toBeInTheDocument();
    expect(screen.getByText("Что доступно прямо сейчас")).toBeInTheDocument();
  });

  it("ведёт на страницу записи", () => {
    renderApp();

    expect(screen.getByRole("link", { name: "Записаться" })).toHaveAttribute("href", "/book");
  });
});
