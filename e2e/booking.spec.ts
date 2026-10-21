import { expect, test, type Page } from "@playwright/test";

/**
 * Полный браузерный путь гостя (ADR-0018): от выбора типа события до экрана
 * успеха, плюс конфликт на одном слоте между двумя гостями и исчезновение
 * занятого времени из числа доступных. Тексты — по copy-модулю фронта
 * (ADR-0015); тест чёрноящиковый и не импортирует код приложения.
 */
const typeName = "Короткий звонок";
const guest = "Иван Петров";
const guestEmail = "ivan@example.com";

/** Выбирает в полосе дат последний день окна и первый свободный слот. */
async function pickLastDayAndFirstSlot(page: Page): Promise<string> {
  const days = page.getByRole("radiogroup", { name: /окно записи/ }).getByRole("radio");
  await days.last().click();

  const grid = page.getByRole("group", { name: /^Слоты на / });
  const slot = grid.locator("button:enabled").first();
  await expect(slot).toBeVisible();
  const label = (await slot.innerText()).trim();

  await slot.click();
  return label;
}

/** Проходит шаги «Тип», «Дата и время», «Ваши данные» и открывает «Подтверждение». */
async function goToConfirmation(page: Page, email: string): Promise<string> {
  await page.goto("/book");

  await page.getByRole("radio", { name: new RegExp(typeName) }).click();
  await page.getByRole("button", { name: "Далее" }).click();

  const slot = await pickLastDayAndFirstSlot(page);
  await page.getByRole("button", { name: "Далее" }).click();

  await page.getByRole("textbox", { name: /Имя/ }).fill(guest);
  await page.getByRole("textbox", { name: /Email/ }).fill(email);
  await page.getByRole("button", { name: "Далее" }).click();

  await expect(page.getByRole("button", { name: "Подтвердить запись" })).toBeVisible();
  return slot;
}

test("гость проходит путь от типа до подтверждения записи", async ({ page }) => {
  await goToConfirmation(page, guestEmail);

  await page.getByRole("button", { name: "Подтвердить запись" }).click();

  // Экран успеха с деталями брони.
  await expect(page.getByText("Вы записаны")).toBeVisible();
  await expect(page.getByText(`${typeName} · 15 мин`)).toBeVisible();
  await expect(page.getByText(`${guest} · ${guestEmail}`)).toBeVisible();

  // Владелец видит запись в ленте предстоящих встреч.
  await page.goto("/admin");
  await expect(page.getByText(`${guest} · ${guestEmail}`)).toBeVisible();
});

test("конфликт: занятое время исчезает из числа доступных", async ({ browser }) => {
  const firstContext = await browser.newContext();
  const secondContext = await browser.newContext();
  const first = await firstContext.newPage();
  const second = await secondContext.newPage();

  try {
    // Оба гостя выбирают один и тот же слот и доходят до подтверждения.
    const slot = await goToConfirmation(first, guestEmail);
    await goToConfirmation(second, "maria@example.com");

    // Первый подтверждает — бронь создана.
    await first.getByRole("button", { name: "Подтвердить запись" }).click();
    await expect(first.getByText("Вы записаны")).toBeVisible();

    // Второй получает конфликт и предложение выбрать другое время.
    await second.getByRole("button", { name: "Подтвердить запись" }).click();
    await expect(second.getByText("Это время уже занято")).toBeVisible();
    await expect(
      second.getByText("Пока вы заполняли данные, слот забронировали. Выберите другое время"),
    ).toBeVisible();

    // Возврат к выбору времени: занятый слот больше недоступен.
    await second.getByRole("button", { name: "Выбрать другое время" }).click();
    const grid = second.getByRole("group", { name: /^Слоты на / });
    await expect(grid.getByRole("button", { name: slot })).toBeDisabled();
  } finally {
    await firstContext.close();
    await secondContext.close();
  }
});
