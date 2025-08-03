import { unwrap } from "@vortexjs/common";
import {
    awaited,
    flatten,
    type JSXNode,
    Lifetime,
    render,
    type Renderer,
    useDerived,
    useState,
} from "@vortexjs/core";
import { matchPath, type RoutePath } from "~/build/router";
import { initializeClientSideRouting, usePathname } from "~/runtime/csr";

export interface EntrypointImport {
    index: number;
}

export interface EntrypointRoute {
    matcher: RoutePath;
    frames: EntrypointImport[];
}

export interface EntrypointProps {
    routes: EntrypointRoute[];
}

export function INTERNAL_entrypoint<Root>({
    props,
    loaders,
    renderer,
    root,
    pathname: pathnameToUse,
    lifetime = new Lifetime(),
}: {
    props: EntrypointProps, loaders: (() => Promise<any>)[], renderer: Renderer<Root, any>, root: Root, pathname?: string,
    lifetime?: Lifetime
}) {
    using _hlt = Lifetime.changeHookLifetime(lifetime);

    if ("location" in globalThis) {
        initializeClientSideRouting();
    }

    const pathname = pathnameToUse ? useState(pathnameToUse) : usePathname();
    const route = useDerived((get) => {
        const path = get(pathname);
        return props.routes.find((r) => matchPath(r.matcher, path));
    });
    const framesPromise = useDerived(async (get) => {
        const rot = unwrap(get(route));
        const frames = [];

        for (const frame of rot.frames) {
            frames.push(await unwrap(loaders[frame.index])());
        }

        return frames;
    });
    const frames = flatten(useDerived((get) => {
        return awaited(get(framesPromise))
    }));
    const hierarchy = useDerived((get) => {
        let node = <></>;

        const framesResolved = get(frames);

        if (!framesResolved) {
            return <h1>loading</h1>
        }

        for (const Frame of framesResolved.toReversed()) {
            node = <Frame>
                {node}
            </Frame>
        }

        return node;
    })

    render(renderer, root, <html>
        <head>
            <link rel="stylesheet" href="/styles.css" />
            <script src="/entrypoint-client.js" type="module"></script>
        </head>
        <body>
            {hierarchy}
        </body>
    </html>);
}
