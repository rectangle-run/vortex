import assert from "node:assert";
import { pippin } from "@vortexjs/pippin";
import pippinPluginTailwind from "../src";

// Mock CSS input with Tailwind directives
const inputCSS = `
@tailwind base;
@tailwind components;
@tailwind utilities;

.btn {
  @apply px-4 py-2 bg-blue-500 text-white rounded;
}
`;

async function runBasicTest() {
	const plugin = pippinPluginTailwind({
		sourceMap: false,
		minify: false,
	});

	const build = pippin().add(plugin);

	const result = await build.transform({
		source: inputCSS,
		format: { type: "css" },
		path: "src/input.css",
		namespace: "file",
	});

	// The output should contain Tailwind's generated CSS for .btn and utility classes
	assert(result.source.includes(".btn"), "Output should contain .btn class");
	assert(
		result.source.includes(".px-4"),
		"Output should contain px-4 utility",
	);
	assert(
		result.source.includes(".bg-blue-500"),
		"Output should contain bg-blue-500 utility",
	);
	assert(
		result.source.includes("text-white"),
		"Output should contain text-white utility",
	);
	assert(result.format.type === "css", "Output format should be css");

	console.log("Tailwind Pippin plugin basic integration test passed.");
}

runBasicTest().catch((err) => {
	console.error("Test failed:", err);
	process.exit(1);
});
