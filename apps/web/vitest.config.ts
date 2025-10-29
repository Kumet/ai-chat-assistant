import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "jsdom",
		setupFiles: [path.resolve(__dirname, "vitest.setup.ts")],
		globals: true,
		css: false,
	},
	resolve: {
		alias: {
			"@/": `${path.resolve(__dirname, "app/")}/`,
			"@ai-chat-assistant/shared": path.resolve(
				__dirname,
				"../..",
				"packages/shared/src/index.ts",
			),
		},
	},
});
