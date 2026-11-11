import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { startVitest } from "vitest/node";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const vitest = await startVitest("test", [__dirname + "/vitest-example"], {
	watch: false,
	// browser: {
	// 	enabled: true,
	// 	provider: "playwright",
	// 	// https://vitest.dev/guide/browser/playwright
	// 	instances: [{ browser: "chromium" }],
	// },
});

// await vitest.close();
