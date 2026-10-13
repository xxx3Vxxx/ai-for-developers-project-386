import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";

try {
  const config = loadConfig();
  const app = buildApp({ config });

  await app.listen({ port: config.port, host: config.host });
} catch (error) {
  console.error(error);
  process.exit(1);
}
