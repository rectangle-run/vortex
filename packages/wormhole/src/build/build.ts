import type { Export } from "~/local/export";
import type { RoutePath } from "./router";
import { Build_analyze } from "./build_analysis";
import type { Project } from "~/state";
import { pippin, type PippinPlugin } from "@vortexjs/pippin";
import { getImmediateValue } from "@vortexjs/core";
import pippinPluginTailwind from "@vortexjs/pippin-plugin-tailwind";
import { pippinPluginDiscovery } from "@vortexjs/discovery";
import { basename, extname, join } from "node:path";
import { rm, rmdir } from "node:fs/promises";
import type { HTTPMethod } from "~/shared/http-method";

export interface BuildBaseRoute<Type extends string> {
    type: Type;
    matcher: RoutePath;
}

export interface BuildAPIRoute extends BuildBaseRoute<"api"> {
    impl: Export;
    schema: Export;
    method: HTTPMethod;
}

export interface BuildPageRoute extends BuildBaseRoute<"route"> {
    frames: Export[];
    is404: boolean;
}

export type BuildRoute = BuildAPIRoute | BuildPageRoute;

export interface BuildAdapter<AdapterOutput> {
    run(
        build: Build<AdapterOutput>,
    ): Promise<AdapterOutput>;
}

export type TargetLocation = "client" | "server";

/**
 * Represents one build at the current time, do *not* reuse this class.
 * It is not a singleton and should be created for each build.
 *
 * # Build Pipeline
 * The build pipeline is a series of steps that are executed in order to build the project.
 *
 * 1. Generate project structure (apis, route matchers, etc.)
 * 2. Call into the adapter and pass the project structure (and a few helper functions).
 * 3. Pass the adapter data back up
 */
export class Build<AdapterOutput = any> {
    routes: BuildRoute[] = [];
    outputPath: string;
    workingPath: string;

    constructor(public project: Project, public adapter: BuildAdapter<AdapterOutput>) {
        const bb = this.project.paths.wormhole.buildBox(crypto.randomUUID());
        this.outputPath = bb.output.path;
        this.workingPath = bb.codegenned.path;
    }

    async writeCodegenned(
        name: string,
        content: string,
        ext = "tsx"
    ): Promise<string> {
        const path = join(this.workingPath, `${name}.${ext}`);

        await Bun.write(path, content);

        return path;
    }

    analyze = Build_analyze;

    async bundle<Files extends string>(
        { inputPaths, target, dev = false, noSplitting = false, outdir = this.outputPath }: {
            inputPaths: Record<Files, string>,
            target: TargetLocation;
            dev?: boolean;
            noSplitting?: boolean;
            outdir?: string;
        }
    ): Promise<{
        outputs: Record<Files, string>;
    }> {
        const entrypoints = Object.values<string>(inputPaths);
        const p = pippin();

        // Check for tailwind
        if (getImmediateValue(this.project.config).tailwind?.enabled) {
            p.add(pippinPluginTailwind());
        }

        p.add(pippinPluginDiscovery({
            target
        }));

        const build = await Bun.build({
            plugins: [p],
            splitting: !noSplitting,
            entrypoints,
            outdir,
            target: target === "server" ? "bun" : "browser",
            sourcemap: dev ? "inline" : "none",
            naming: {
                entry: "[name].[ext]",
            },
            minify: !dev,
        });

        const results: Record<Files, string> = {} as any;

        for (const [id, entry] of Object.entries(inputPaths)) {
            const name = basename(entry as string);
            const fileName = name.slice(0, name.lastIndexOf("."));
            const originalExt = extname(entry as string);

            // Use correct extension based on input file type
            let outputExt = ".js"; // default
            if (originalExt === ".css") {
                outputExt = ".css";
            }

            const path = join(outdir, fileName + outputExt);

            results[id as Files] = path;
        }

        return {
            outputs: results
        };
    }

    async run() {
        await this.project.index.instance.ready;
        await this.analyze();
        return await this.adapter.run(this);
    }
}
