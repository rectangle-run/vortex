import { useAwait } from "@vortexjs/core";
import route, { query } from "@vortexjs/wormhole/route";
import * as v from "valibot";

route("/", {
	page() {
		const pause = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
		const awaited = useAwait();

		return (
			<>
				<h1 class="text-4xl font-bold">
					Welcome to Wormhole, {Object.entries(globalThis).length}
				</h1>
				<p>
					This is an example app, go to the{" "}
					<a href="/docs/tada">docs</a>
				</p>
				<button on:click={async () => {
					console.log(await add({
						a: 1,
						b: 2
					}))
				}}>
					add
				</button>
			</>
		);
	},
	layout({ children }) {
		return (
			<>
				<title>Wormhole Example</title>
				{children}
			</>
		);
	},
	notFound() {
		return (
			<>
				<h1>404 not found</h1>
			</>
		)
	}
});

route("/docs", {
	page({ }) {
		const page = "introduction";
		return (
			<>
				<h1>Documentation for {page}</h1>
				<p>This is the documentation page for {page}.</p>
			</>
		);
	},
});

export const add = query("/api/add", {
	schema: v.object({
		a: v.number(),
		b: v.number()
	}),
	impl({ a, b }) {
		return a + b;
	}
})
