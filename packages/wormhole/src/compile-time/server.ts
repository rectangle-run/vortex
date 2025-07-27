import { join } from "node:path";
import { unwrap } from "@vortexjs/common";
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
} from "../shared/router";
import type { State } from "../state";
import { build } from "./build";
import { getLoadKey } from "./load-key";
import { addTask } from "./tasks";
import type { HTTPMethod } from "../shared/http-method";

export interface DevServer {
    readonly type: "DevServer";
    readonly port: Signal<number>;
}

interface APIDeclaration {
    endpoint: string;
    loadKey: string;
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

        routerTree = generateRouterTree(routes);

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

                        const impl = await load(api.loadKey) as (() => Promise<unknown>);

                        const result = await impl();
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
