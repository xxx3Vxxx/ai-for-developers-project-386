import { axe, toHaveNoViolations } from "jest-axe";
import { expect } from "vitest";

expect.extend(toHaveNoViolations);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- слияние с глобальным Chai
  namespace Chai {
    interface Assertion {
      toHaveNoViolations(): void;
    }
  }
}

/**
 * Теги правил axe для целевого уровня WCAG 2.2 AA (ADR-0016): 2.0 A/AA,
 * 2.1 AA и 2.2 AA. `color-contrast` в `jsdom` не выполняется — контраст
 * остаётся на ручном чеклисте.
 */
const WCAG_22_AA_TAGS = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] as const;

/**
 * Прогоняет `axe-core` (через `jest-axe`) по поддереву и падает с отчётом, если
 * найдены нарушения выбранных тегов (ADR-0016). Для экранов с порталами
 * (выдвижная панель `/admin`) проверяйте `document.body`, а не контейнер рендера.
 */
export async function expectNoA11yViolations(container: HTMLElement): Promise<void> {
  const results = await axe(container, {
    runOnly: { type: "tag", values: [...WCAG_22_AA_TAGS] },
    // `jest-axe` по умолчанию глушит правила категории `cat.color` (в `jsdom`
    // нет layout и canvas), но `runOnly` их включает снова — возвращаем их
    // отключёнными явно. Контраст остаётся на ручном чеклисте (ADR-0016).
    rules: {
      "color-contrast": { enabled: false },
      "color-contrast-enhanced": { enabled: false },
      "link-in-text-block": { enabled: false },
    },
  });
  expect(results).toHaveNoViolations();
}
