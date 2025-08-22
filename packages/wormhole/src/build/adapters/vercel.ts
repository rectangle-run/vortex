import type { EntrypointProps } from "~/runtime";
import type { Build, BuildAdapter, TargetLocation, BuildRoute } from "../build";
import type { Export } from "~/local/export";
import { addTask } from "~/cli/statusboard";
import { join, dirname } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { printRoutePath } from "../router";

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
    buildCatchAllFunction(build: Build): Promise<string>;
}

export function VercelAdapter(): VercelAdapter {
    return {
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
			});`;

            codegenSource += `}`;

            codegenSource += `window.wormhole = {};`;
            codegenSource += `window.wormhole.hydrate = main;`;
            
            // Add client-side hydration initialization
            codegenSource += `document.addEventListener('DOMContentLoaded', () => {`;
            codegenSource += `const pathname = window.location.pathname;`;
            codegenSource += `main({ pathname, context: {}, lifetime: new Lifetime() });`;
            codegenSource += `});`;

            const filename = "client-bundle";
            const path = await build.writeCodegenned(filename, codegenSource);

            const bundled = await build.bundle({
                target: "client",
                inputPaths: {
                    main: path,
                },
                dev: false
            });

            return bundled.outputs.main;
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
                    main: cssPath,
                },
                dev: false
            });

            return bundled.outputs.main;
        },

        async buildRouteFunction(build: Build, route: BuildRoute) {
            using _task = addTask({
                name: `Building function for route: ${printRoutePath(route.matcher)}`
            });

            let codegenSource = "";

            if (route.type === "api") {
                // API route function
                codegenSource += `import {INTERNAL_tryHandleAPI} from "@vortexjs/wormhole";`;
                
                const reexporterName = "proxy-" + Bun.hash(`${route.impl.file}-${route.impl.name}`).toString(36);
                const implPath = await build.writeCodegenned(reexporterName, `export { ${JSON.stringify(route.impl.name)} } from ${JSON.stringify(route.impl.file)}`);
                
                const schemaName = "proxy-" + Bun.hash(`${route.schema.file}-${route.schema.name}`).toString(36);
                const schemaPath = await build.writeCodegenned(schemaName, `export { ${JSON.stringify(route.schema.name)} } from ${JSON.stringify(route.schema.file)}`);

                codegenSource += `const apis = [{
                    matcher: ${JSON.stringify(route.matcher)},
                    impl: 0,
                    schema: 1,
                    method: ${JSON.stringify(route.method)},
                }];`;

                codegenSource += `const loaders = [`;
                codegenSource += `(async () => (await import(${JSON.stringify(implPath)}))[${JSON.stringify(route.impl.name)}]),`;
                codegenSource += `(async () => (await import(${JSON.stringify(schemaPath)}))[${JSON.stringify(route.schema.name)}]),`;
                codegenSource += `];`;

                codegenSource += `export default async function handler(request) {`;
                codegenSource += `const response = await INTERNAL_tryHandleAPI(request, apis, loaders);`;
                codegenSource += `return response || new Response("Not Found", { status: 404 });`;
                codegenSource += `}`;
            } else {
                // Page route function
                codegenSource += `import { INTERNAL_entrypoint } from "@vortexjs/wormhole";`;
                codegenSource += `import { Lifetime } from "@vortexjs/core";`;
                codegenSource += `import { createHTMLRoot, ssr, printHTML } from "@vortexjs/ssr";`;

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

                codegenSource += 'const loaders = [';

                for (const exp of imports) {
                    const reexporterName = "proxy-" + Bun.hash(`${exp.file}-${exp.name}`).toString(36);

                    const path = await build.writeCodegenned(reexporterName, `export { ${JSON.stringify(exp.name)} } from ${JSON.stringify(exp.file)}`);

                    codegenSource += `(async () => (await import(${JSON.stringify(path)}))[${JSON.stringify(exp.name)}]),`;
                }

                codegenSource += '];';

                codegenSource += `export default async function handler(request) {`;
                codegenSource += `const url = new URL(request.url);`;
                codegenSource += `const pathname = url.pathname;`;
                
                codegenSource += `const renderer = ssr();`;
                codegenSource += `const root = createHTMLRoot();`;
                codegenSource += `const lifetime = new Lifetime();`;
                codegenSource += `try {`;
                codegenSource += `await INTERNAL_entrypoint({
                    props: entrypointProps,
                    loaders,
                    renderer,
                    root,
                    pathname,
                    context: {},
                    lifetime,
                });`;
                codegenSource += `const html = printHTML(root);`;
                codegenSource += `return new Response(html, {`;
                codegenSource += `status: 200,`;
                codegenSource += `headers: { 'Content-Type': 'text/html' }`;
                codegenSource += `});`;
                codegenSource += `} catch (error) {`;
                codegenSource += `console.error('Rendering error:', error);`;
                codegenSource += `return new Response('Internal Server Error', { status: 500 });`;
                codegenSource += `} finally {`;
                codegenSource += `lifetime.close();`;
                codegenSource += `}`;
                codegenSource += `}`;
            }

            const routeId = printRoutePath(route.matcher).replace(/\[\.\.\.([^\]]+)\]/g, '[...$1]').replace(/\[([^\]]+)\]/g, '[$1]') || 'index';
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

        async buildCatchAllFunction(build: Build) {
            using _task = addTask({
                name: "Building catch-all function for Vercel"
            });

            let codegenSource = "";

            codegenSource += `import { INTERNAL_entrypoint } from "@vortexjs/wormhole";`;
            codegenSource += `import { Lifetime } from "@vortexjs/core";`;
            codegenSource += `import { createHTMLRoot, ssr, printHTML } from "@vortexjs/ssr";`;
            codegenSource += `import {INTERNAL_tryHandleAPI} from "@vortexjs/wormhole";`;

            const imports: Export[] = [];
            const apiImports: Export[] = [];

            function getExportIndex(exp: Export): number {
                const index = imports.findIndex(x => x.file === exp.file && x.name === exp.name);
                if (index === -1) {
                    imports.push(exp);
                    return imports.length - 1;
                }
                return index;
            }

            function getApiExportIndex(exp: Export): number {
                const index = apiImports.findIndex(x => x.file === exp.file && x.name === exp.name);
                if (index === -1) {
                    apiImports.push(exp);
                    return apiImports.length - 1;
                }
                return index;
            }

            const pageRoutes = build.routes.filter(x => x.type === "route");
            const apiRoutes = build.routes.filter(x => x.type === "api");

            const entrypointProps: EntrypointProps = {
                routes: pageRoutes.map(x => ({
                    matcher: x.matcher,
                    frames: x.frames.map((frame) => ({
                        index: getExportIndex(frame),
                    })),
                    is404: x.is404,
                }))
            };

            codegenSource += `const entrypointProps = JSON.parse(${JSON.stringify(JSON.stringify(entrypointProps))});`;

            // Page route loaders
            codegenSource += 'const loaders = [';
            for (const exp of imports) {
                const reexporterName = "proxy-" + Bun.hash(`${exp.file}-${exp.name}`).toString(36);
                const path = await build.writeCodegenned(reexporterName, `export { ${JSON.stringify(exp.name)} } from ${JSON.stringify(exp.file)}`);
                codegenSource += `(async () => (await import(${JSON.stringify(path)}))[${JSON.stringify(exp.name)}]),`;
            }
            codegenSource += '];';

            // API configuration
            codegenSource += `const apis = ${JSON.stringify(apiRoutes.map(x => ({
                matcher: x.matcher,
                impl: getApiExportIndex(x.impl),
                schema: getApiExportIndex(x.schema),
                method: x.method,
            })))};`;

            // API loaders
            codegenSource += `const apiLoaders = [`;
            for (const exp of apiImports) {
                const reexporterName = "proxy-" + Bun.hash(`${exp.file}-${exp.name}`).toString(36);
                const path = await build.writeCodegenned(reexporterName, `export { ${JSON.stringify(exp.name)} } from ${JSON.stringify(exp.file)}`);
                codegenSource += `(async () => (await import(${JSON.stringify(path)}))[${JSON.stringify(exp.name)}]),`;
            }
            codegenSource += `];`;

            codegenSource += `export default async function handler(request) {`;
            codegenSource += `const url = new URL(request.url);`;
            codegenSource += `const pathname = url.pathname;`;
            
            // Handle API routes first
            codegenSource += `const apiResponse = await INTERNAL_tryHandleAPI(request, apis, apiLoaders);`;
            codegenSource += `if (apiResponse) {`;
            codegenSource += `return apiResponse;`;
            codegenSource += `}`;

            // Handle page routes
            codegenSource += `const renderer = ssr();`;
            codegenSource += `const root = createHTMLRoot();`;
            codegenSource += `const lifetime = new Lifetime();`;
            codegenSource += `try {`;
            codegenSource += `await INTERNAL_entrypoint({
                props: entrypointProps,
                loaders,
                renderer,
                root,
                pathname,
                context: {},
                lifetime,
            });`;
            codegenSource += `const html = printHTML(root);`;
            codegenSource += `return new Response(html, {`;
            codegenSource += `status: 200,`;
            codegenSource += `headers: { 'Content-Type': 'text/html' }`;
            codegenSource += `});`;
            codegenSource += `} catch (error) {`;
            codegenSource += `console.error('Rendering error:', error);`;
            codegenSource += `return new Response('Internal Server Error', { status: 500 });`;
            codegenSource += `} finally {`;
            codegenSource += `lifetime.close();`;
            codegenSource += `}`;
            codegenSource += `}`;

            const filename = "catch-all-function";
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
            const staticDir = join(outputDir, "static");
            const functionsDir = join(outputDir, "functions");

            // Ensure directories exist
            await mkdir(outputDir, { recursive: true });
            await mkdir(staticDir, { recursive: true });
            await mkdir(functionsDir, { recursive: true });

            // Build client bundle and CSS
            const clientBundlePath = await this.buildClientBundle(build);
            const cssBundlePath = await this.buildCSS(build);

            // Copy static assets to static directory
            const staticClientPath = join(staticDir, "client.js");
            const staticCssPath = join(staticDir, "styles.css");
            
            await Bun.write(staticClientPath, await Bun.file(clientBundlePath).text());
            await Bun.write(staticCssPath, await Bun.file(cssBundlePath).text());

            // Build individual route functions
            const routeFunctions: string[] = [];
            for (const route of build.routes) {
                const functionPath = await this.buildRouteFunction(build, route);
                routeFunctions.push(functionPath);

                // Create function directory in Vercel output
                const routeId = printRoutePath(route.matcher).replace(/\[\.\.\.([^\]]+)\]/g, '[...$1]').replace(/\[([^\]]+)\]/g, '[$1]') || 'index';
                const functionDir = join(functionsDir, `${route.type}-${routeId}.func`);
                await mkdir(functionDir, { recursive: true });

                // Copy function file
                const functionIndexPath = join(functionDir, "index.js");
                await Bun.write(functionIndexPath, await Bun.file(functionPath).text());

                // Create .vc-config.json for each function
                const vcConfig = {
                    runtime: "edge",
                    entrypoint: "index.js"
                };
                await writeFile(join(functionDir, ".vc-config.json"), JSON.stringify(vcConfig, null, 2));
            }

            // Build catch-all function for unmatched routes
            const catchAllPath = await this.buildCatchAllFunction(build);
            const catchAllDir = join(functionsDir, "index.func");
            await mkdir(catchAllDir, { recursive: true });
            
            const catchAllIndexPath = join(catchAllDir, "index.js");
            await Bun.write(catchAllIndexPath, await Bun.file(catchAllPath).text());
            
            const catchAllVcConfig = {
                runtime: "edge",
                entrypoint: "index.js"
            };
            await writeFile(join(catchAllDir, ".vc-config.json"), JSON.stringify(catchAllVcConfig, null, 2));

            // Create main config.json
            const routes = [];
            
            // Add routes for static assets
            routes.push({
                src: "/client.js",
                dest: "/static/client.js"
            });
            routes.push({
                src: "/entrypoint-client.js",
                dest: "/static/client.js"
            });
            routes.push({
                src: "/styles.css", 
                dest: "/static/styles.css"
            });

            // Add routes for each specific route function
            for (const route of build.routes) {
                const routeId = printRoutePath(route.matcher).replace(/\[\.\.\.([^\]]+)\]/g, '[...$1]').replace(/\[([^\]]+)\]/g, '[$1]') || 'index';
                const routePath = "/" + printRoutePath(route.matcher).replace(/\[\.\.\.([^\]]+)\]/g, '*').replace(/\[([^\]]+)\]/g, '*');
                
                if (route.type === "api") {
                    routes.push({
                        src: routePath,
                        dest: `/functions/${route.type}-${routeId}.func`,
                        methods: [route.method]
                    });
                } else {
                    routes.push({
                        src: routePath,
                        dest: `/functions/${route.type}-${routeId}.func`
                    });
                }
            }

            // Add catch-all route last
            routes.push({
                src: "/(.*)",
                dest: "/functions/index.func"
            });

            const config = {
                version: 3,
                routes
            };

            const configPath = join(outputDir, "config.json");
            await writeFile(configPath, JSON.stringify(config, null, 2));

            return {
                outputDir,
                staticDir,
                functionsDir,
                configFile: configPath
            };
        }
    };
}