import type { Export } from "~/local/export";
import type { RoutePath } from "./router";
import { Build_analyze } from "./build.analysis";
import type { Project } from "~/state";
import { pippin, type PippinPlugin } from "@vortexjs/pippin";
import { getImmediateValue } from "@vortexjs/core";
import pippinPluginTailwind from "@vortexjs/pippin-plugin-tailwind";
import { pippinPluginDiscovery } from "@vortexjs/discovery";
import { basename, join } from "node:path";

export interface BuildBaseRoute<Type extends string> {
	type: Type;
	matcher: RoutePath;
}

export interface BuildAPIRoute extends BuildBaseRoute<"api"> {
	impl: Export;
	schema: Export;
}

export interface BuildPageRoute extends BuildBaseRoute<"route"> {
	frames: Export[];
}

export type BuildRoute = BuildAPIRoute | BuildPageRoute;

export interface BuildAdapter<AdapterOutput> {
	run(
		build: Build<AdapterOutput>,
	): Promise<void>;
}

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
		this.outputPath = this.project.paths.wormhole.buildBox.output.path;
		this.workingPath = this.project.paths.wormhole.buildBox.codegenned.path;
	}

	async writeCodegenned(
		name: string,
		content: string,
	): Promise<string> {
		const path = join(this.workingPath, `name.tsx`);

		await Bun.write(path, content);

		return path;
	}

	analyze = Build_analyze;

	async bundle<Files extends string>(
		{ inputPaths, target }: {
			inputPaths: Record<Files, string>,
			target: "server" | "client";
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
			splitting: true,
			entrypoints,
			outdir: this.outputPath,
			target: target === "server" ? "bun" : "browser",
			sourcemap: "linked",
			naming: {
				entry: "[name]",
			}
		});

		const results: Record<Files, string> = {} as any;

		for (const entry of entrypoints) {
			const name = basename(entry);
			const nameWithoutExt = name.replace(/\.[^/.]+$/, "");
			const path = join(this.outputPath, nameWithoutExt);
		}

		return {
			outputs: results
		};
	}

	async run() {
		await this.analyze();
		return await this.adapter.run(this);
	}
}
