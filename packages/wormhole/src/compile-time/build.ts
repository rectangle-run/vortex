import { join } from "node:path/posix";
import { hash, unwrap } from "@vortexjs/common";
import { pippinPluginDiscovery } from "@vortexjs/discovery";
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
}

export async function buildClient(props: BuildProps): Promise<BuildResult> {
	using _task = addTask({ name: "Building client" });

	const state = props.state;
	const paths = state.paths;

	const routeExports: {
		filePath: string;
		export: string;
	}[] = [];

	function traverseNode(node: RouterNode<ImportNamed>) {
		if (node.page) {
			routeExports.push({
				filePath: node.page.filePath,
				export: node.page.exportId,
			});
		}

		if (node.layout) {
			routeExports.push({
				filePath: node.layout.filePath,
				export: node.layout.exportId,
			});
		}

		if (node.notFoundPage) {
			routeExports.push({
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

	const entrypoints: string[] = [];

	{
		// Client entrypoint
		let codegen = "";

		codegen += `import { INTERNAL_loadClient } from "@vortexjs/wormhole";\n`;

		codegen += "const importCache = {};";

		codegen += "async function load(key) {";

		for (const { filePath, export: exportId } of routeExports) {
			const key = getLoadKey({ filePath, exportId });

			codegen += `if (key === "${key}") {`;

			const importCacheKey = hash(filePath).toString(36);

			codegen += `const imported = (importCache[${JSON.stringify(importCacheKey)}] ??= await import(${JSON.stringify(filePath)}));`;

			codegen += `return imported[${JSON.stringify(exportId)}]`;

			codegen += "}";
		}

		codegen += "}";

		codegen += `INTERNAL_loadClient({ load, routes: ${JSON.stringify(hashImports(props.routes))} });`;

		const clientEntryPath = join(
			paths.wormhole.buildBox.codegenned.path,
			"client.ts",
		);

		await Bun.write(clientEntryPath, codegen);

		entrypoints.push(clientEntryPath);
	}

	{
		// Server entrypoint
		let codegen = "";

		codegen += "const importCache = {};";

		codegen += "export async function load(key) {";

		for (const { filePath, export: exportId } of routeExports) {
			const key = getLoadKey({ filePath, exportId });

			codegen += `if (key === "${key}") {`;

			const importCacheKey = hash(filePath).toString(36);

			codegen += `const imported = (importCache[${JSON.stringify(importCacheKey)}] ??= await import(${JSON.stringify(filePath)}));`;

			codegen += `return imported[${JSON.stringify(exportId)}]`;

			codegen += "}";
		}

		codegen += "}";

		const serverEntryPath = join(
			paths.wormhole.buildBox.codegenned.path,
			"server.ts",
		);

		await Bun.write(serverEntryPath, codegen);

		entrypoints.push(serverEntryPath);
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
			target: "client",
		}),
	);

	const pp = pippin().add(...plugins);

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

	return {
		clientBundle: join(paths.wormhole.buildBox.output.path, "client.js"),
		serverBundle: join(paths.wormhole.buildBox.output.path, "server.js"),
		cssBundle: join(paths.wormhole.buildBox.output.path, "styles.css"),
	};
}
