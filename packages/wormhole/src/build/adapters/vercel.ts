import type { EntrypointProps } from "~/runtime";
import type { Build, BuildAdapter, TargetLocation } from "../build";
import type { Export } from "~/local/export";
import { addTask } from "~/cli/statusboard";
import { join } from "node:path";

export interface VercelAdapterResult {
    clientEntry: string;
    serverEntry: string;
    cssEntry: string;
    outdir: string;
}

export interface VercelAdapter extends BuildAdapter<VercelAdapterResult> {
    buildForLocation(build: Build, location: TargetLocation): Promise<string>;
    buildCSS(build: Build): Promise<string>;
}

export function VercelAdapter(): VercelAdapter {
    return {
        async buildForLocation(build: Build, location: TargetLocation) {
            using _task = addTask({
                name: `Building ${location} for Vercel`
            });
            let codegenSource = "";

            codegenSource += `import { INTERNAL_entrypoint } from "@vortexjs/wormhole";`;
            codegenSource += `import { Lifetime } from "@vortexjs/core";`

            if (location === "client") {
                codegenSource += `import { html } from "@vortexjs/dom";`;
            }

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
            }

            codegenSource += `const entrypointProps = JSON.parse(${JSON.stringify(JSON.stringify(entrypointProps))});`;

            codegenSource += `export function main(props) {`;

            codegenSource += 'const loaders = [';

            for (const exp of imports) {
                const reexporterName = "proxy-" + Bun.hash(`${exp.file}-${exp.name}`).toString(36);

                const path = await build.writeCodegenned(reexporterName, `export { ${JSON.stringify(exp.name)} } from ${JSON.stringify(exp.file)}`);

                codegenSource += `(async () => (await import(${JSON.stringify(path)}))[${JSON.stringify(exp.name)}]),`;
            }

            codegenSource += '];';

            if (location === "server") {
                codegenSource += `const renderer = props.renderer;`;
                codegenSource += `const root = props.root;`;
            } else {
                codegenSource += `const renderer = html();`;
                codegenSource += `const root = document.documentElement;`;
            }

            codegenSource += `return INTERNAL_entrypoint({
				props: entrypointProps,
				loaders,
				renderer,
				root,
				pathname: props.pathname,
				context: props.context,
				lifetime: props.lifetime ?? new Lifetime(),
			});`;

            codegenSource += `}`;

            if (location === "server") {
                codegenSource += `import {INTERNAL_tryHandleAPI} from "@vortexjs/wormhole";`
                codegenSource += `export async function tryHandleAPI(request) {`;

                const apiIndicies: Export[] = [];

                const apiRoutes = build.routes.filter(x => x.type === "api");

                const getApiExportIndex = (exp: Export): number => {
                    const index = apiIndicies.findIndex(x => x.file === exp.file && x.name === exp.name);
                    if (index === -1) {
                        apiIndicies.push(exp);
                        return apiIndicies.length - 1;
                    }
                    return index;
                }

                codegenSource += `const apis = ${JSON.stringify(apiRoutes.map(x => ({
                    matcher: x.matcher,
                    impl: getApiExportIndex(x.impl),
                    schema: getApiExportIndex(x.schema),
                    method: x.method,
                })))};`;

                codegenSource += `return INTERNAL_tryHandleAPI(request, apis, [`;

                for (const exp of apiIndicies) {
                    const reexporterName = "proxy-" + Bun.hash(`${exp.file}-${exp.name}`).toString(36);

                    const path = await build.writeCodegenned(reexporterName, `export { ${JSON.stringify(exp.name)} } from ${JSON.stringify(exp.file)}`);

                    codegenSource += `(async () => (await import(${JSON.stringify(path)}))[${JSON.stringify(exp.name)}]),`;
                }

                codegenSource += `]);`;

                codegenSource += `}`;

                // Add Vercel serverless function export for page routes
                codegenSource += `import { createHTMLRoot, ssr, printHTML } from "@vortexjs/ssr";`;
                codegenSource += `import { ContextScope } from "@vortexjs/core";`;
                
                codegenSource += `export default async function handler(request, response) {`;
                codegenSource += `const url = new URL(request.url || '/', \`https://\${request.headers.host || 'localhost'}\`);`;
                codegenSource += `const pathname = url.pathname;`;
                
                // Handle API routes first
                codegenSource += `const apiResponse = await tryHandleAPI(request);`;
                codegenSource += `if (apiResponse) {`;
                codegenSource += `const body = await apiResponse.text();`;
                codegenSource += `const headers = {};`;
                codegenSource += `for (const [key, value] of apiResponse.headers) { headers[key] = value; }`;
                codegenSource += `response.status(apiResponse.status);`;
                codegenSource += `Object.entries(headers).forEach(([key, value]) => response.setHeader(key, value));`;
                codegenSource += `response.send(body);`;
                codegenSource += `return;`;
                codegenSource += `}`;

                // Handle page routes
                codegenSource += `const renderer = ssr();`;
                codegenSource += `const root = createHTMLRoot();`;
                codegenSource += `const lifetime = new ContextScope();`;
                codegenSource += `try {`;
                codegenSource += `const result = await main({ renderer, root, pathname, context: {}, lifetime });`;
                codegenSource += `const html = printHTML(root);`;
                codegenSource += `response.setHeader('Content-Type', 'text/html');`;
                codegenSource += `response.status(200).send(html);`;
                codegenSource += `} catch (error) {`;
                codegenSource += `console.error('Rendering error:', error);`;
                codegenSource += `response.status(500).send('Internal Server Error');`;
                codegenSource += `} finally {`;
                codegenSource += `lifetime.close();`;
                codegenSource += `}`;
                codegenSource += `}`;
            }

            if (location === "server") {
                codegenSource += `import { matchPath } from "@vortexjs/wormhole";`;
                codegenSource += `export function isRoute404(pathname) {`;
                codegenSource += `const route = entrypointProps.routes.find(x => matchPath(x.matcher, pathname).matched);`;
                codegenSource += `return route ? route.is404 : false;`;
                codegenSource += `}`;
            }

            if (location === "client") {
                codegenSource += `window.wormhole = {};`;
                codegenSource += `window.wormhole.hydrate = main;`;
                
                // Add client-side hydration initialization
                codegenSource += `document.addEventListener('DOMContentLoaded', () => {`;
                codegenSource += `const pathname = window.location.pathname;`;
                codegenSource += `main({ pathname, context: {}, lifetime: new Lifetime() });`;
                codegenSource += `});`;
            }

            const filename = `entrypoint-${location}`;

            const path = await build.writeCodegenned(filename, codegenSource);

            const bundled = await build.bundle({
                target: location,
                inputPaths: {
                    main: path,
                },
                dev: false // Production build for Vercel
            })

            return bundled.outputs.main;
        },
        async buildCSS(build: Build) {
            let codegenCSS = "";

            const appCSSPath = join(build.project.projectDir, "src", "app.css");

            if (await Bun.file(appCSSPath).exists()) {
                codegenCSS += `@import "${appCSSPath}";`;
            }

            const cssPath = await build.writeCodegenned("styles", codegenCSS, "css");

            const bundled = await build.bundle({
                target: "client",
                inputPaths: {
                    main: cssPath,
                },
                dev: false // Production build for Vercel
            });

            return bundled.outputs.main;
        },
        async run(build) {
            const clientEntry = this.buildForLocation(build, "client");
            const serverEntry = this.buildForLocation(build, "server");
            const cssEntry = this.buildCSS(build);

            return {
                clientEntry: await clientEntry,
                serverEntry: await serverEntry,
                cssEntry: await cssEntry,
                outdir: build.outputPath
            }
        }
    };
}