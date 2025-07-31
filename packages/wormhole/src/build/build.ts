import type { Export } from "~/local/export";
import type { RoutePath } from "./router";
import { Build_analyze } from "./build.analysis";
import type { Project } from "~/state";

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
export class Build {
	routes: BuildRoute[] = [];

	constructor(public project: Project) { }

	analyze = Build_analyze;

	async run() {
		await this.analyze();
	}
}
