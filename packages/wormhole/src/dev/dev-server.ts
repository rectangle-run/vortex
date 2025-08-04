import { ContextScope, Lifetime, type Renderer } from "@vortexjs/core";
import type { Project } from "~/state";
import { createHTMLRoot, ssr, printHTML, createCodegenStream, diffInto } from "@vortexjs/ssr";
import { DevAdapter, type DevAdapterResult } from "~/build/adapters/dev";
import { Build } from "~/build/build";
import { addTask } from "~/cli/statusboard";
import { join } from "node:path";

export interface DevServer {
	lifetime: Lifetime;
	server: Bun.Server;
	processRequest(request: Request): Promise<Response>;
	rebuild(): Promise<void>;
	buildResult: Promise<DevAdapterResult>;
	project: Project;
}

export function DevServer(project: Project): DevServer {
	const server = Bun.serve({
		port: 3141,
		routes: {
			"/*": async (req) => {
				return new Response();
			}
		},
		development: true
	});

	project.lt.onClosed(server.stop);

	const self: DevServer = {
		lifetime: project.lt,
		server,
		processRequest: DevServer_processRequest,
		rebuild: DevServer_rebuild,
		buildResult: new Promise(() => { }),
		project
	}

	server.reload({
		routes: {
			"/*": (req) => {
				return self.processRequest(req);
			}
		}
	});

	const devServerTask = addTask({
		name: `Development server running @ ${server.url.toString()}`
	});

	project.lt.onClosed(devServerTask[Symbol.dispose]);

	self.rebuild();

	return self;
}

async function DevServer_rebuild(this: DevServer): Promise<void> {
	const build = new Build(this.project, DevAdapter());
	this.buildResult = build.run();
}

interface ServerEntrypoint {
	main<RendererNode, HydrationContext>(props: {
		renderer: Renderer<RendererNode, HydrationContext>,
		root: RendererNode,
		pathname: string,
		context: ContextScope,
		lifetime: Lifetime
	}): void;
	tryHandleAPI(request: Request): Promise<Response | undefined>;
}

async function DevServer_processRequest(this: DevServer, request: Request): Promise<Response> {
	const built = await this.buildResult;

	const serverPath = built.serverEntry;
	const serverEntrypoint = (await import(serverPath)) as ServerEntrypoint;

	// Priority 1: API routes
	const apiResponse = await serverEntrypoint.tryHandleAPI(request);

	if (apiResponse !== undefined && apiResponse !== null) {
		return apiResponse;
	}

	// Priority 2: Static files
	const outputPath = this.project.paths.wormhole.buildBox.output.path;
	const filePath = join(outputPath, new URL(request.url).pathname);

	if (await Bun.file(filePath).exists()) {
		return new Response(Bun.file(filePath));
	}

	// Priority 3: SSR
	const root = createHTMLRoot();
	const renderer = ssr();

	const context = new ContextScope();

	const lifetime = new Lifetime();

	serverEntrypoint.main({
		root,
		renderer,
		pathname: new URL(request.url).pathname,
		context,
		lifetime
	});

	const html = printHTML(root);

	const { readable, writable } = new TransformStream();
	const writer = writable.getWriter();

	writer.write(html);

	let currentSnapshot = structuredClone(root);

	context.streaming.onUpdate(() => {
		const codegen = diffInto(currentSnapshot, root);

		const code = codegen.getCode();

		currentSnapshot = structuredClone(root);

		writer.write(`<script>${code}</script>`);
	});

	await context.streaming.onDoneLoading;

	writer.write(`<script>window.addEventListener("load", () => {wormhole.hydrate({})});</script>`);
	writer.close();
	lifetime.close();

	return new Response(readable, {
		headers: {
			'Content-Type': "text/html"
		}
	})
}
