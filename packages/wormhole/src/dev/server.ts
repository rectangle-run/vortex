import { join } from "node:path";
import { SKL, unwrap } from "@vortexjs/common";
import {
	getImmediateValue,
	type JSXNode,
	Lifetime,
	render,
	type Signal,
	useDerived,
	useEffect,
} from "@vortexjs/core";
import { createHTMLRoot, printHTML, ssr } from "@vortexjs/ssr";
import chalk from "chalk";
import {
	generateRouterTree,
	type ImportNamed,
	type InputRoute,
	matchRoute,
	type RouterNode,
} from "~/build/router";
import type { State } from "../state";
import { build } from "~/build/build";
import { getLoadKey } from "~/build/load-key";
import { addTask } from "~/cli/statusboard";
import type { HTTPMethod } from "~/shared/http-method";
import type { StandardSchemaV1 } from "~/shared/standard";

export interface DevServer {
	readonly type: "DevServer";
	readonly port: Signal<number>;
}

interface APIDeclaration {
	endpoint: string;
	implLoadKey: string;
	schemaLoadKey: string;
	method: HTTPMethod;
}

export async function developmentServer(state: State): Promise<DevServer> {
	const lt = state.lt;

	using _hlt = Lifetime.changeHookLifetime(lt);

	const index = state.index.instance;
	const config = await state.config.instance;

	let routerTree: RouterNode<ImportNamed> | undefined;
	let serverEntryPath = "";
	let clientEntryPath = "";

	useEffect(async (get) => {
		const routes: InputRoute[] = [];

		for (const discovery of get(index.discoveries)) {
			if (discovery.type !== "route_frame") continue;

			routes.push({
				path: discovery.path,
				frame: {
					filePath: discovery.filePath,
					exportId: discovery.exported,
				},
				frameType: discovery.frameType,
			});

			console.log(discovery, routes);
		}

		routerTree = generateRouterTree({ routes, errors: state.routingErrors });

		const { serverBundle, clientBundle } = await build({
			routes: routerTree,
			dev: true,
			state,
			discoveries: get(index.discoveries)
		});

		serverEntryPath = serverBundle;
		clientEntryPath = clientBundle;
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

					const { render: serverRender, apis: apiz, load: loader } = await import(serverEntryPath);

					const apis = apiz as APIDeclaration[];
					const load = loader as (key: string) => Promise<unknown>;

					for (const api of apis) {
						if (req.method !== api.method) continue;
						if (api.endpoint !== route) continue;

						const impl = await load(api.implLoadKey) as ((props: any) => Promise<unknown>) & { schema: StandardSchemaV1<any, any> };

						const schema = await load(api.schemaLoadKey) as StandardSchemaV1<any, any>;

						let props: any = undefined;

						try {
							props = api.method === "GET" ?
								SKL.parse(unwrap(new URL(req.url).searchParams.get("props"))) : SKL.parse(await req.text());
						} catch (e) {
							return new Response(
								"Invalid data passed (could not parse SKL)",
								{
									status: 400,
									headers: {
										"Content-Type": "text/plain; charset=utf-8",
									},
								}
							);
						}

						const valid = await schema["~standard"].validate(props);

						if (valid.issues) {
							return new Response(
								`Invalid data passed (did not match schema) (${valid.issues.map(x => x.message).join(", ")}
                                ), your data was interpreted as ${JSON.stringify(props)}`,
								{
									status: 400,
									headers: {
										"Content-Type": "text/plain; charset=utf-8",
									},
								}
							);
						}

						const result = await impl(props);

						return new Response(SKL.stringify(result));
					}

					let node: JSXNode;

					const vroot = createHTMLRoot();

					await serverRender({
						pathname: route,
						root: vroot
					})

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
