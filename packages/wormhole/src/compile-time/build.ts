import { join } from "node:path/posix";
import { hash, unwrap } from "@vortexjs/common";
import { pippinPluginDiscovery, type Discovery } from "@vortexjs/discovery";
import { type PippinPlugin, pippin } from "@vortexjs/pippin";
import { pippinPluginTailwind } from "@vortexjs/pippin-plugin-tailwind";
import {
    hashImports,
    type ImportNamed,
    type RouterNode,
} from "../shared/router";
import type { State } from "../state";
import type { WormholeError } from "./errors";
import { getLoadKey } from "./load-key";
import { addTask } from "./tasks";

export interface BuildResult {
    clientBundle: string;
    serverBundle: string;
    cssBundle: string;
}

export interface BuildProps {
    routes: RouterNode<ImportNamed>;
    dev: boolean;
    state: State;
    target: "client" | "server";
    discoveries: (Discovery & { filePath: string })[];
}

export async function buildPlatform(props: BuildProps): Promise<void> {
    using _task = addTask({ name: "Building target: " + props.target });

    const state = props.state;
    const paths = state.paths;

    const symbolExports: {
        filePath: string;
        export: string;
    }[] = [];

    function traverseNode(node: RouterNode<ImportNamed>) {
        if (node.page) {
            symbolExports.push({
                filePath: node.page.filePath,
                export: node.page.exportId,
            });
        }

        if (node.layout) {
            symbolExports.push({
                filePath: node.layout.filePath,
                export: node.layout.exportId,
            });
        }

        if (node.notFoundPage) {
            symbolExports.push({
                filePath: node.notFoundPage.filePath,
                export: node.notFoundPage.exportId,
            });
        }

        if (node.epsilon) {
            traverseNode(node.epsilon.node);
        }

        for (const sub in node.cases) {
            traverseNode(unwrap(node.cases[sub]));
        }
    }

    traverseNode(props.routes);

    if (props.target === "server") {
        for (const discovery of props.discoveries) {
            if (discovery.type !== "api") continue;

            symbolExports.push({
                filePath: discovery.filePath,
                export: discovery.exported.impl
            })

            symbolExports.push({
                filePath: discovery.filePath,
                export: discovery.exported.schema
            })
        }
    }

    const entrypoints: string[] = [];

    {
        // entrypoint
        const loadFn = props.target === "server" ? "INTERNAL_loadServer" : "INTERNAL_loadClient";
        let codegen = "";

        codegen += `import { ${loadFn} } from "@vortexjs/wormhole";\n`;

        codegen += "const importCache = {};";

        codegen += "export async function load(key) {";

        for (const { filePath, export: exportId } of symbolExports) {
            const key = getLoadKey({ filePath, exportId });

            codegen += `if (key === "${key}") {`;

            const importCacheKey = hash(filePath).toString(36);

            codegen += `const imported = (importCache[${JSON.stringify(importCacheKey)}] ??= await import(${JSON.stringify(filePath)}));`;

            codegen += `return imported[${JSON.stringify(exportId)}]`;

            codegen += "}";
        }

        codegen += "}";

        if (props.target === "client") {
            codegen += `${loadFn}({ load, routes: ${JSON.stringify(hashImports(props.routes))} });`;
        } else if (props.target === "server") {
            codegen += "export async function render({ pathname, root }) {";

            codegen += `await ${loadFn}({ load, routes: ${JSON.stringify(hashImports(props.routes))}, pathname, root });`;

            codegen += "}";

            const apis = props.discoveries.filter(x => x.type === "api").map(x => ({
                implLoadKey: getLoadKey({
                    filePath: x.filePath,
                    exportId: x.exported.impl
                }),
                schemaLoadKey: getLoadKey({
                    filePath: x.filePath,
                    exportId: x.exported.schema
                }),
                method: x.method,
                endpoint: x.endpoint
            }));

            codegen += `export const apis = ${JSON.stringify(apis)};`;
        }

        const entryPath = join(
            paths.wormhole.buildBox.codegenned.path,
            props.target + ".ts",
        );

        await Bun.write(entryPath, codegen);

        entrypoints.push(entryPath);
    }

    const plugins: PippinPlugin[] = [];

    {
        // CSS entrypoint
        const pkgJson = await Bun.file(join(paths.root, "package.json")).json();

        const appCssPath = join(paths.root, "src", "app.css");

        if (pkgJson.dependencies?.tailwindcss) {
            plugins.push(pippinPluginTailwind());
        }

        const cssEntryPath = join(
            paths.wormhole.buildBox.codegenned.path,
            "styles.css",
        );
        let cssContent = "";

        if (await Bun.file(appCssPath).exists()) {
            cssContent += `@import url(${JSON.stringify(appCssPath)});\n`;
        }

        await Bun.write(cssEntryPath, cssContent);

        entrypoints.push(cssEntryPath);
    }

    plugins.push(
        pippinPluginDiscovery({
            target: props.target,
        }),
    );

    const pp = pippin({
        cache: state.cache
    }).add(...plugins);

    await Bun.build({
        splitting: true,
        entrypoints,
        outdir: paths.wormhole.buildBox.output.path,
        plugins: [pp],
        minify: !props.dev,
        banner: "// happy hacking :3\n",
        sourcemap: props.dev ? "inline" : "none",
    });

    const errors: WormholeError[] = [];

    for (const err of pp.errors) {
        errors.push(err);
    }

    state.buildErrors.update(errors);
}

export async function build(props: Omit<BuildProps, "target">) {
    const promises: Promise<void>[] = [];

    for (const target of ["client", "server"] as const) {
        promises.push(buildPlatform({
            ...props,
            target
        }))
    }

    await Promise.all(promises);

    const paths = props.state.paths;

    return {
        clientBundle: join(paths.wormhole.buildBox.output.path, "client.js"),
        serverBundle: join(paths.wormhole.buildBox.output.path, "server.js"),
        cssBundle: join(paths.wormhole.buildBox.output.path, "styles.css"),
    };
}
