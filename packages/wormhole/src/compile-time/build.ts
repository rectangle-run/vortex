import { join } from "node:path/posix";
import { unwrap } from "@vortexjs/common";
import {
	type ImportNamed,
	type RouterNode,
	hashImports,
} from "../shared/router";
import { discoveryPlugin } from "./discovery-plugin";
import { getLoadKey } from "./load-key";
import { paths } from "./paths";
import { addTask } from "./tasks";

export interface BuildResult {
	clientBundle: string;
	serverBundle: string;
}

export interface BuildProps {
	routes: RouterNode<ImportNamed>;
	dev: boolean;
}

export async function buildClient(props: BuildProps): Promise<BuildResult> {
	using _task = addTask({ name: "Building client" });

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

		codegen += `import { INTERNAL_loadClient } from "@vortexjs/wormhole";`;

		codegen += "const importCache = {};";

		codegen += "async function load(key) {";

		for (const { filePath, export: exportId } of routeExports) {
			const key = getLoadKey({ filePath, exportId });

			codegen += `if (key === "${key}") {`;

			const importCacheKey = Bun.hash(filePath).toString(36);

			codegen += `const imported = (importCache[${JSON.stringify(importCacheKey)}] ??= await import(${JSON.stringify(filePath)}));`;

			codegen += `return imported[${JSON.stringify(exportId)}]`;

			codegen += "}";
		}

		codegen += "}";

		codegen += `INTERNAL_loadClient({ load, routes: ${JSON.stringify(hashImports(props.routes))} });`;

		const clientEntryPath = join(
			paths().wormhole.buildBox.codegenned.path,
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

			const importCacheKey = Bun.hash(filePath).toString(36);

			codegen += `const imported = (importCache[${JSON.stringify(importCacheKey)}] ??= await import(${JSON.stringify(filePath)}));`;

			codegen += `return imported[${JSON.stringify(exportId)}]`;

			codegen += "}";
		}

		codegen += "}";

		const serverEntryPath = join(
			paths().wormhole.buildBox.codegenned.path,
			"server.ts",
		);

		await Bun.write(serverEntryPath, codegen);

		entrypoints.push(serverEntryPath);
	}

	await Bun.build({
		splitting: true,
		entrypoints,
		outdir: paths().wormhole.buildBox.output.path,
		plugins: [discoveryPlugin],
		minify: !props.dev,
		banner: "// happy hacking :3\n",
		sourcemap: props.dev ? "inline" : "none",
	});

	return {
		clientBundle: join(paths().wormhole.buildBox.output.path, "client.js"),
		serverBundle: join(paths().wormhole.buildBox.output.path, "server.js"),
	};
}
