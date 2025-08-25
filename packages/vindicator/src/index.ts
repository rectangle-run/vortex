import type { Config, Route } from "./types-vercel";
import type { MatchStep } from "./types-vindicator";

export * as Vercel from "./types-vercel";
export * from "./types-vindicator";

export function vindicate(props: { steps: MatchStep[] }): Config {
	const routes: Route[] = [];

	for (const step of props.steps) {
		if (step.type === "all-filesystem") {
			routes.push({
				handle: "filesystem",
			});
		}
		if (step.type === "route") {
			routes.push({
				src: step.path,
				dest: step.func,
			});
		}
	}

	return {
		routes,
		version: 3,
	};
}
