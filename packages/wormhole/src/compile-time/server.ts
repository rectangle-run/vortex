import { join } from "node:path";
import { unwrap } from "@vortexjs/common";
import {
	type JSXNode,
	Lifetime,
	type Signal,
	render,
	useDerived,
	useEffect,
} from "@vortexjs/core";
import { createHTMLRoot, printHTML, ssr } from "@vortexjs/ssr";
import chalk from "chalk";
import {
	type ImportNamed,
	type InputRoute,
	type RouterNode,
	generateRouterTree,
	matchRoute,
} from "../shared/router";
import { buildClient } from "./build";
import { getConfig } from "./config";
import { ErrorCollection, showErrors } from "./errors";
import { indexDirectory } from "./indexing";
import { getLoadKey } from "./load-key";
import { paths } from "./paths";
import { addTask } from "./tasks";
import type { State } from "../state";

export interface DevServer {
	readonly type: "DevServer";
	readonly port: Signal<number>;
}

export async function developmentServer(
	state: State
): Promise<DevServer> {
	const lt = state.lt;

	using _hlt = Lifetime.changeHookLifetime(lt);

	const index = state.index.instance;
	const config = await state.config.instance;

	let routerTree: RouterNode<ImportNamed> | undefined = undefined;
	let serverEntryPath = "";

	useEffect(async (get) => {
		const routes: InputRoute[] = [];

		for (const discovery of get(index.discoveries)) {
			if (discovery.type !== "Route") return;

			routes.push({
				path: discovery.path,
				frame: {
					filePath: discovery.filePath,
					exportId: discovery.export,
				},
				frameType: discovery.frame,
			});
		}

		routerTree = generateRouterTree(routes);

		const { serverBundle } = await buildClient({
			routes: routerTree,
			dev: true,
			state,
		});

		serverEntryPath = serverBundle;
	});

	const port = useDerived((get) => get(config).dev?.port ?? 3000);

	useEffect((get, { lifetime }) => {
		const server = Bun.serve({
			routes: {
				"/*": async (req) => {
					if (!routerTree) {
						return new Response("Router tree not ready", {
							status: 503,
						});
					}

					const route = new URL(req.url).pathname;
					const matched = matchRoute(route, routerTree);

					let node: JSXNode = undefined;

					const { load } = await import(serverEntryPath);

					for (const frame of matched.frames.toReversed()) {
						const component = (await load(
							getLoadKey(frame),
						)) as () => JSXNode;

						if (!component) {
							console.warn("Failed to load component ", frame);
						}

						node = {
							type: "component",
							impl: component,
							props: {
								...matched.slugs,
								...matched.spreads,
								children: node,
							},
						};
					}

					const vroot = createHTMLRoot();

					render(ssr(), vroot, node).close();

					vroot.children.push({
						tagName: "script",
						attributes: {
							type: "module",
							src: "/dist/client.js",
						},
						children: [],
					});

					vroot.children.push({
						tagName: "link",
						attributes: {
							rel: "stylesheet",
							href: "/dist/styles.css",
						},
						children: [],
					});

					const html = printHTML(vroot);

					return new Response(html, {
						headers: {
							"Content-Type": "text/html; charset=utf-8",
						},
					});
				},
				"/dist/*": async (req) => {
					const path = unwrap(req.url.split("dist/")[1]);
					const filePath = join(
						state.paths.wormhole.buildBox.output.path,
						path,
					);

					return new Response(Bun.file(filePath));
				},
			},
			port: get(port),
			reusePort: true,
			development: true,
		});

		useEffect((get) => {
			get(state.errors);

			showErrors(state);
		});

		const task = addTask({
			name: `Server: ${chalk.magenta(server.url.href)} ${chalk.italic.gray("(in most terminals, hold control while clicking this link)")}`,
		});

		lifetime.onClosed(() => {
			server.stop();
			task[Symbol.dispose]();
		});
	});

	return {
		type: "DevServer",
		port,
	};
}
