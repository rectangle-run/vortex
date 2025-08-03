import type { EntrypointProps } from "~/runtime";
import type { Build, BuildAdapter, TargetLocation } from "../build";
import type { Export } from "~/local/export";
import type { BunFile } from "bun";
import { addTask } from "~/cli/statusboard";

export interface DevAdapterResult {
    clientEntry: string;
    serverEntry: string;
}

export interface DevAdapter extends BuildAdapter<DevAdapterResult> {
    buildForLocation(build: Build, server: TargetLocation): Promise<string>;
}

export function DevAdapter(): DevAdapter {
    return {
        async buildForLocation(build: Build, location: TargetLocation) {
            using _task = addTask({
                name: `Rebuilding development ${location}`
            });
            let codegenSource = "";

            codegenSource += `import { INTERNAL_entrypoint } from "@vortexjs/wormhole";`;

            if (location === "client") {
                codegenSource += `import { html } from "@vortexjs/dom";`;
            }

            codegenSource += `export function main(props) {`;

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
                }))
            }

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
				props: ${JSON.stringify(entrypointProps)},
				loaders,
				renderer,
				root
			});`;

            codegenSource += `}`;

            const filename = `entrypoint-${location}`;

            const path = await build.writeCodegenned(filename, codegenSource);

            const bundled = await build.bundle({
                target: location,
                inputPaths: {
                    main: path,
                },
                dev: false
            })

            return bundled.outputs.main;
        },
        async run(build) {
            const clientEntry = this.buildForLocation(build, "client");
            const serverEntry = this.buildForLocation(build, "server");

            return {
                clientEntry: await clientEntry,
                serverEntry: await serverEntry,
            }
        }
    };
}
