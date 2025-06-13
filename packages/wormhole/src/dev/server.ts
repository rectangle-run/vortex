import {
	type Lifetime,
	type Signal,
	useDerived,
	useEffect,
} from "@vortexjs/core";
import type { Config } from "./config";
import { addTask } from "./tasks";

export interface DevServer {
	readonly type: "DevServer";
	readonly port: Signal<number>;
}

export function developmentServer(
	lt: Lifetime,
	config: Signal<Config>,
): DevServer {
	const port = useDerived(
		(get) => get(config).dev?.port ?? 3000,
		undefined,
		lt,
	);

	useEffect(
		(get, { lifetime }) => {
			const task = addTask({
				name: `Development server on port ${get(port)}`,
			});
			const server = Bun.serve({
				routes: {
					"/*": async (req) => {
						return new Response("Development server is running");
					},
				},
				port: get(port),
				reusePort: true,
			});

			lifetime.onClosed(() => {
				server.stop();
				task[Symbol.dispose]();
			});
		},
		undefined,
		lt,
	);

	return {
		type: "DevServer",
		port,
	};
}
