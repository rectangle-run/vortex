import { ContextScope, Lifetime, type Renderer } from "@vortexjs/core";
import type { Project } from "~/state";
import { createHTMLRoot, ssr, printHTML, createCodegenStream, diffInto } from "@vortexjs/ssr";
import { DevAdapter, type DevAdapterResult } from "~/build/adapters/dev";
import { Build } from "~/build/build";
import { addLog, addTask, type RequestTag } from "~/cli/statusboard";
import { join } from "node:path";
import { watch } from "node:fs";
import type { HTTPMethod } from "~/shared/http-method";

export interface DevServer {
    lifetime: Lifetime;
    server: Bun.Server;
    processRequest(request: Request, tags: RequestTag[]): Promise<Response>;
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
            "/*": async (req) => {
                const tags: RequestTag[] = [];
                const response = await self.processRequest(req, tags);

                addLog({
                    type: "request",
                    url: new URL(req.url).pathname,
                    method: req.method as HTTPMethod,
                    responseCode: response.status,
                    tags
                })

                return response;
            }
        }
    });

    const devServerTask = addTask({
        name: `Development server running @ ${server.url.toString()}`
    });

    project.lt.onClosed(devServerTask[Symbol.dispose]);

    self.rebuild();

    // Watch sourcedir
    const watcher = watch(join(project.projectDir, "src"), { recursive: true });

    let isWaitingForRebuild = false;

    watcher.on("change", async (eventType, filename) => {
        if (isWaitingForRebuild) return;
        isWaitingForRebuild = true;
        await self.buildResult;
        isWaitingForRebuild = false;
        self.rebuild();
    });

    project.lt.onClosed(() => {
        watcher.close();
    });

    return self;
}

async function DevServer_rebuild(this: DevServer): Promise<void> {
    const build = new Build(this.project, DevAdapter());
    this.buildResult = build.run();
    await this.buildResult;
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
    isRoute404(pathname: string): boolean;
}

async function DevServer_processRequest(this: DevServer, request: Request, tags: RequestTag[]): Promise<Response> {
    const built = await this.buildResult;

    const serverPath = built.serverEntry;
    const serverEntrypoint = (await import(serverPath + `?v=${Date.now()}`)) as ServerEntrypoint;

    // Priority 1: API routes
    const apiResponse = await serverEntrypoint.tryHandleAPI(request);

    if (apiResponse !== undefined && apiResponse !== null) {
        tags.push("api");
        return apiResponse;
    }

    // Priority 2: Static files
    const filePath = join(built.outdir, new URL(request.url).pathname);

    if (await Bun.file(filePath).exists()) {
        tags.push("static");
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

    tags.push("ssr");

    return new Response(readable, {
        status: serverEntrypoint.isRoute404(new URL(request.url).pathname) ? 404 : 200,
        headers: {
            'Content-Type': "text/html"
        }
    })
}
