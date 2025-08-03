import type { Lifetime, Renderer } from "@vortexjs/core";
import type { Project } from "~/state";
import { createHTMLRoot, ssr, printHTML } from "@vortexjs/ssr";
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
        pathname: string
    }): void;
}

async function DevServer_processRequest(this: DevServer, request: Request): Promise<Response> {
    // Priority 1: API routes
    // Priority 2: Static files
    const outputPath = this.project.paths.wormhole.buildBox.output.path;
    const filePath = join(outputPath, new URL(request.url).pathname);

    console.log(filePath);

    if (await Bun.file(filePath).exists()) {
        return new Response(Bun.file(filePath));
    }

    // Priority 3: SSR
    const built = await this.buildResult;

    const serverPath = built.serverEntry;
    const serverEntrypoint = (await import(serverPath)) as ServerEntrypoint;

    const root = createHTMLRoot();
    const renderer = ssr();

    serverEntrypoint.main({
        root,
        renderer,
        pathname: new URL(request.url).pathname
    });

    const html = printHTML(root);

    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();

    writer.write(html);
    writer.write(`<script>window.addEventListener("load", () => {wormhole.hydrate({})});</script>`);
    writer.close();

    return new Response(readable, {
        headers: {
            'Content-Type': "text/html"
        }
    })
}
