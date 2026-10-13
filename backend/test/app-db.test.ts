import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import { createDb } from "../src/db.js";

describe("buildApp: база", () => {
  it("пробрасывает инжектированную базу и закрывает её вместе с приложением", async () => {
    const db = createDb(":memory:");
    const app = buildApp({ config: loadConfig({}), db });

    expect(app.db).toBe(db);

    await app.close();
    expect(db.open).toBe(false);
  });

  it("без инжекции создаёт базу по config.databasePath со схемой и сидом", async () => {
    const directory = mkdtempSync(join(tmpdir(), "calendar-app-db-"));
    const file = join(directory, "data", "calendar.sqlite");
    const app = buildApp({ config: loadConfig({ DATABASE_PATH: file }) });

    try {
      expect(app.db.open).toBe(true);
      expect(app.db.prepare("SELECT id FROM event_types ORDER BY id").all()).toEqual([
        { id: "et-15" },
        { id: "et-30" },
      ]);
    } finally {
      await app.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
