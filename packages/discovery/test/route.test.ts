import { expect, test } from "bun:test";
import { discoveryCompile } from "../src";

test("client output", async () => {
	expect(
		await discoveryCompile({
			fileName: "test.wormhole",
			source: `
			import route from "@vortexjs/wormhole/route";

route(
    "/",
    {
        page() {
            return (
                <>
                    <h1 class="text-4xl font-bold">
                        Welcome to Wormhole, {Object.entries(globalThis).length}
                    </h1>
                    <p>
                        This is an example app, go to the{" "}
                        <a href="/docs/tada">docs</a>
                    </p>
                </>
            );
        },
        layout({ children }) {
            return (
                <>
                    <head>
                        <title>Wormhole Example</title>
                    </head>
                    <body>{children}</body>
                </>
            );
        },
    },
);

route(
    "/docs/[page]",
    {
        page({ page }) {
            return (
                <>
                    <h1>Documentation for {page}</h1>
                    <p>This is the documentation page for {page}.</p>
                </>
            );
        },
    }
);
        `,
			jsx: true,
			typescript: true,
			target: "client",
		}),
	).toMatchSnapshot();

	expect(
		await discoveryCompile({
			fileName: "test.wormhole",
			source: `import { query } from "@vortexjs/wormhole/route";

	const a = query("/api/data", {
		impl: "data",
		schema: "abc",
		method: "DELETE",
	});

	a(); `,
			jsx: true,
			typescript: true,
			target: "client",
		}),
	).toMatchSnapshot();
});
