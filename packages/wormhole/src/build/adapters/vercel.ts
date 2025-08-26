import type { EntrypointProps } from "~/runtime";
import type { Build, BuildAdapter, TargetLocation, BuildRoute } from "../build";
import type { Export } from "~/local/export";
import { addTask } from "~/cli/statusboard";
import { join, dirname } from "node:path";
import { mkdir, rmdir } from "node:fs/promises";
import { printRoutePath, type RoutePath } from "../router";
import { vindicate, type MatchStep } from "@vortexjs/vindicator";

export interface VercelAdapterResult {
    outputDir: string;
    staticDir: string;
    functionsDir: string;
    configFile: string;
}

export interface VercelAdapter extends BuildAdapter<VercelAdapterResult> {
    buildClientBundle(build: Build): Promise<string>;
    buildCSS(build: Build): Promise<string>;
    buildRouteFunction(build: Build, route: BuildRoute): Promise<string>;
}

export function getRouteId(matcher: RoutePath) {
    return printRoutePath(matcher).replaceAll(/\\|\//gi, "-").replaceAll(" ", "-") || 'index';
}

type HandlePhase = "filesystem" | "hit" | "miss" | "error" | "rewrite";
type VercelRoute = { src: string, dest: string, check?: boolean } | { handle: HandlePhase };

export function VercelAdapter(): VercelAdapter {
    return {
        target: "Vercel",
        async buildClientBundle(build: Build) {
            using _task = addTask({
                name: "Building client bundle for Vercel"
            });

            let codegenSource = "";

            codegenSource += `import { INTERNAL_entrypoint } from "@vortexjs/wormhole";`;
            codegenSource += `import { Lifetime } from "@vortexjs/core";`;
            codegenSource += `import { html } from "@vortexjs/dom";`;

            const imports: Export[] = [];

            function getExportIndex(exp: Export): number {
                const index = imports.findIndex(x => x.file === exp.file && x.name === exp.name);
                if (index === -1) {
                    imports.push(exp);
                    return imports.length - 1;
                }
                return index;
            }

            const entrypointProps: EntrypointProps = {
                routes: build.routes.filter(x => x.type === "route").map(x => ({
                    matcher: x.matcher,
                    frames: x.frames.map((frame) => ({
                        index: getExportIndex(frame),
                    })),
                    is404: x.is404,
                }))
            };

            codegenSource += `const entrypointProps = JSON.parse(${JSON.stringify(JSON.stringify(entrypointProps))});`;

            codegenSource += `function main(props) {`;

            codegenSource += 'const loaders = [';

            for (const exp of imports) {
                const reexporterName = "proxy-" + Bun.hash(`${exp.file}-${exp.name}`).toString(36);

                const path = await build.writeCodegenned(reexporterName, `export { ${JSON.stringify(exp.name)} } from ${JSON.stringify(exp.file)}`);

                codegenSource += `(async () => (await import(${JSON.stringify(path)}))[${JSON.stringify(exp.name)}]),`;
            }

            codegenSource += '];';

            codegenSource += `const renderer = html();`;
            codegenSource += `const root = document.documentElement;`;

            codegenSource += `return INTERNAL_entrypoint({
				props: entrypointProps,
				loaders,
				renderer,
				root,
				pathname: props.pathname,
				context: props.context,
				lifetime: props.lifetime ?? new Lifetime(),
				supplement: props.supplement
			});`;

            codegenSource += `}`;

            codegenSource += `window.wormhole = {};`;
            codegenSource += `window.wormhole.hydrate = main;`;

            const path = await build.writeCodegenned("entrypoint-client", codegenSource);

            const bundled = await build.bundle({
                target: "client",
                inputPaths: {
                    app: path,
                },
                outdir: join(build.project.projectDir, ".vercel", "output", "static"),
                dev: false
            });

            return bundled.outputs.app;
        },

        async buildCSS(build: Build) {
            using _task = addTask({
                name: "Building CSS for Vercel"
            });

            let codegenCSS = "";

            const appCSSPath = join(build.project.projectDir, "src", "app.css");

            if (await Bun.file(appCSSPath).exists()) {
                codegenCSS += `@import "${appCSSPath}";`;
            }

            const cssPath = await build.writeCodegenned("styles", codegenCSS, "css");

            const bundled = await build.bundle({
                target: "client",
                inputPaths: {
                    app: cssPath,
                },
                outdir: join(build.project.projectDir, ".vercel", "output", "static"),
                dev: false
            });

            return bundled.outputs.app;
        },

        async buildRouteFunction(build: Build, route: BuildRoute) {
            using _task = addTask({
                name: `Building function for route: ${printRoutePath(route.matcher)}`
            });

            let codegenSource = "";

            if (route.type === "api") {
                // API route function
                codegenSource += `import {INTERNAL_tryHandleAPI} from "@vortexjs/wormhole";`;

                codegenSource += `import { ${JSON.stringify(route.schema.name)} as schema } from ${JSON.stringify(route.schema.file)};`;
                codegenSource += `import { ${JSON.stringify(route.impl.name)} as impl } from ${JSON.stringify(route.impl.file)};`;
                codegenSource += `import { SKL } from "@vortexjs/common";`;

                codegenSource += `export default async function handler(request) {`;
                codegenSource += `const text = `;
                if (route.method === "GET") {
                    codegenSource += `new URL(request.url).searchParams.get("props")`;
                } else {
                    codegenSource += `await request.text()`;
                }
                codegenSource += `;`;

                codegenSource += `if (!text) { return new Response("Missing body", { status: 400 }); }`;

                codegenSource += `let body;`;
                codegenSource += `try { body = SKL.parse(text); } catch (e) { return new Response("Invalid SKL", { status: 400 }); }`;

                // check against standard schema
                codegenSource += `const parsed = await schema["~standard"].validate(body);`;

                codegenSource += `if ("issues" in parsed && parsed.issues != null && parsed.issues.length > 0) {`;
                codegenSource += `return new Response("Request did not match schema", { status: 400 })`;
                codegenSource += `}`;

                codegenSource += `try {`;
                codegenSource += `const result = await impl(parsed.value);`;
                codegenSource += `return new Response(SKL.stringify(result), { status: 200, headers: { "Content-Type": "application/skl" } });`;
                codegenSource += `} catch (e) {`;
                codegenSource += `console.error(e);`;
                codegenSource += `return new Response("Internal Server Error", { status: 500 });`;
                codegenSource += `}`;

                codegenSource += `}`;
            } else {
                // Page route function
                codegenSource += `import { INTERNAL_entrypoint, INTERNAL_createStreamUtility } from "@vortexjs/wormhole";`;
                codegenSource += `import { Lifetime, ContextScope } from "@vortexjs/core";`;
                codegenSource += `import { createHTMLRoot, ssr, printHTML, diffInto } from "@vortexjs/ssr";`;

                const imports: Export[] = [];

                function getExportIndex(exp: Export): number {
                    const index = imports.findIndex(x => x.file === exp.file && x.name === exp.name);
                    if (index === -1) {
                        imports.push(exp);
                        return imports.length - 1;
                    }
                    return index;
                }

                const entrypointProps: EntrypointProps = {
                    routes: [{
                        matcher: route.matcher,
                        frames: route.frames.map((frame) => ({
                            index: getExportIndex(frame),
                        })),
                        is404: route.is404,
                    }]
                };

                codegenSource += `const entrypointProps = JSON.parse(${JSON.stringify(JSON.stringify(entrypointProps))});`;

                let idx = 0;
                for (const exp of imports) {
                    const reexporterName = "proxy-" + Bun.hash(`${exp.file}-${exp.name}`).toString(36);

                    const path = await build.writeCodegenned(reexporterName, `export { ${JSON.stringify(exp.name)} } from ${JSON.stringify(exp.file)}`);

                    codegenSource += `import {${JSON.stringify(exp.name)} as imp${idx}} from ${JSON.stringify(path)};`;
                    idx++;
                }

                codegenSource += 'const loaders = [';

                idx = 0;
                for (const exp of imports) {
                    codegenSource += `(()=>imp${idx}),`;
                    idx++;
                }

                codegenSource += '];';

                codegenSource += `export default async function handler(request) {`;
                codegenSource += `const url = new URL(request.url);`;
                codegenSource += `const pathname = url.pathname;`;

                codegenSource += `const renderer = ssr();`;
                codegenSource += `const root = createHTMLRoot();`;
                codegenSource += `const lifetime = new Lifetime();`;
                codegenSource += `const context = new ContextScope(lifetime);`;
                codegenSource += `await INTERNAL_entrypoint({
                    props: entrypointProps,
                    loaders,
                    renderer,
                    root,
                    pathname,
                    context,
                    lifetime,
                    preload: true
                });`;
                codegenSource += `const streamutil = INTERNAL_createStreamUtility();`;
                codegenSource += `const html = printHTML(root);`;
                codegenSource += `async function load() {`;
                codegenSource += `streamutil.write(html);`;
                codegenSource += `let currentSnapshot = structuredClone(root);`;
                codegenSource += `context.streaming.updated();`;
                codegenSource += `context.streaming.onUpdate(() => {`;
                codegenSource += `const codegen = diffInto(currentSnapshot, root);`;
                codegenSource += `const code = codegen.getCode();`;
                codegenSource += `currentSnapshot = structuredClone(root);`;
                codegenSource += "streamutil.write(`<script>${code}</script>`);";
                codegenSource += `});`;
                codegenSource += `await context.streaming.onDoneLoading;`;
                codegenSource += "streamutil.write(`<script>window.addEventListener('load', () => {wormhole.hydrate({supplement:JSON.parse(${JSON.stringify(JSON.stringify(context.query.getSupplement()))})})});</script>`);";
                codegenSource += `streamutil.end();`;
                codegenSource += `lifetime.close();`;
                codegenSource += `}`;
                codegenSource += `load();`;
                codegenSource += `return new Response(streamutil.readable.pipeThrough(new TextEncoderStream()), {`;
                codegenSource += `status: 200,`;
                codegenSource += `headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Content-Type-Options': 'nosniff', 'Transfer-Encoding': 'chunked', Connection: 'keep-alive', }`;
                codegenSource += `});`;
                codegenSource += `}`;
            }

            const routeId = getRouteId(route.matcher);
            const filename = `function-${route.type}-${routeId}`;
            const path = await build.writeCodegenned(filename, codegenSource);

            const bundled = await build.bundle({
                target: "server",
                inputPaths: {
                    main: path,
                },
                dev: false,
                noSplitting: true
            });

            return bundled.outputs.main;
        },

        async run(build) {
            using _task = addTask({
                name: "Building for Vercel Build Output API"
            });

            const outputDir = join(build.project.projectDir, ".vercel", "output");

            await rmdir(outputDir, { recursive: true }).catch(() => { /* ignore */ });

            const staticDir = join(outputDir, "static");
            const functionsDir = join(outputDir, "functions");

            // Ensure directories exist
            await mkdir(outputDir, { recursive: true });
            await mkdir(staticDir, { recursive: true });
            await mkdir(functionsDir, { recursive: true });

            // Build client bundle and CSS
            const buildPromises: Promise<any>[] = [];

            buildPromises.push(this.buildClientBundle(build));
            buildPromises.push(this.buildCSS(build));

            let currentPhase: HandlePhase | null = null;
            let vindicatorSteps: MatchStep[] = [];

            vindicatorSteps.push({ type: "all-filesystem" });

            // Build individual route functions
            const routeFunctions: string[] = [];
            buildPromises.push(...build.routes.map(async (route) => {
                const functionPath = await this.buildRouteFunction(build, route);
                routeFunctions.push(functionPath);

                // Create function directory in Vercel output
                const functionDir = join(functionsDir, `${printRoutePath(route.matcher) || "index"}.func`);
                await mkdir(functionDir, { recursive: true });

                // Copy function file
                const functionIndexPath = join(functionDir, "index.js");
                await Bun.write(functionIndexPath, await Bun.file(functionPath).text());

                // Create .vc-config.json for each function
                const vcConfig = {
                    runtime: "edge",
                    entrypoint: "index.js"
                };
                await Bun.write(join(functionDir, ".vc-config.json"), JSON.stringify(vcConfig, null, 2));

                let srcStr = "";
                let destStr = "";

                for (const seg of route.matcher) {
                    if (seg.type === "static") {
                        srcStr += `/${seg.match}`;
                        destStr += `/${seg.match}`;
                    } else if (seg.type === "slug") {
                        srcStr += "/[^/]*";
                        destStr += `/[${seg.name}]`;
                    } else if (seg.type === "spread") {
                        srcStr += "/.*";
                        destStr += `/[...${seg.name}]`;
                    }
                }

                if (srcStr === "") srcStr = "/";
                if (destStr === "") destStr = "/";

                vindicatorSteps.push({
                    type: "route",
                    path: srcStr,
                    func: destStr,
                })
            }));

            await Promise.all(buildPromises);

            const config = vindicate({
                steps: vindicatorSteps,
            })

            const configPath = join(outputDir, "config.json");
            await Bun.write(configPath, JSON.stringify(config, null, 2));

            return {
                outputDir,
                staticDir,
                functionsDir,
                configFile: configPath
            };
        }
    };
}
