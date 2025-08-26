import { unwrap } from "@vortexjs/common";
import {
    useAwait,
    ContextScope,
    flatten,
    type JSXNode,
    Lifetime,
    render,
    type Renderer,
    useDerived,
    useState,
    useStreaming,
    when,
    type QuerySupplement
} from "@vortexjs/core";
import { matchPath, type RoutePath } from "~/build/router";
import { initializeClientSideRouting, usePathname } from "~/runtime/csr";

export interface EntrypointImport {
    index: number;
}

export interface EntrypointRoute {
    matcher: RoutePath;
    frames: EntrypointImport[];
    is404: boolean;
}

export interface EntrypointProps {
    routes: EntrypointRoute[];
}

function App({
    pathname: pathnameToUse,
    props,
    loaders
}: {
    pathname?: string,
    props: EntrypointProps
    loaders: (() => Promise<any>)[],
}) {
    if ("location" in globalThis) {
        initializeClientSideRouting();
    }

    useStreaming();

    const awaited = useAwait();
    const pathname = (pathnameToUse && typeof window === "undefined") ? useState(pathnameToUse) : usePathname();
    const route = useDerived((get) => {
        const path = get(pathname);
        return props.routes.find((r) => matchPath(r.matcher, path).matched);
    });
    const frames = useDerived((get) => {
        return get(route)!.frames.map(frame => awaited(unwrap(loaders[frame.index])()));
    })
    const hierarchy = useDerived((get) => {
        let node = <></>;

        const framesResolved = get(frames);

        for (const fr of framesResolved.toReversed()) {
            const Frame = get(fr);
            if (!Frame) {
                node = <h1>loading</h1>;
            } else {
                node = <Frame>
                    {node}
                </Frame>
            }
        }

        return node;
    }, { dynamic: true });

    return <>
        <head>
            <link rel="stylesheet" href="/styles.css" />
            <script src="/entrypoint-client.js" type="module"></script>
        </head>
        <body>
            {hierarchy}
        </body>
    </>;
}

function makePromiseGenerator(
    loaders: (() => Promise<any>)[]
): (() => any)[] {

    return loaders.map((loader, index) => {
        let cache: any = undefined;

        return () => {
            if (cache) return cache;
            cache = loader();
            return cache;
        }
    });
}

export async function INTERNAL_entrypoint<Root>({
    props,
    loaders,
    renderer,
    root,
    pathname,
    lifetime = new Lifetime(),
    context: _context,
    supplement,
    preload = false
}: {
    props: EntrypointProps, loaders: (() => Promise<any>)[], renderer: Renderer<Root, any>, root: Root, pathname?: string,
    lifetime?: Lifetime, context?: ContextScope, supplement?: QuerySupplement,
    preload?: boolean
}) {
    const context = _context ?? new ContextScope(lifetime);
    const promises: Promise<unknown>[] = [];
    const ldrs = makePromiseGenerator(loaders);

    if ("window" in globalThis || preload) {
        // We need to preload the routes so we don't flash the 'loading' state
        const path = pathname ?? window.location.pathname;
        const route = props.routes.find((r) => matchPath(r.matcher, path));
        if (!route) {
            throw new Error("No route matched");
        }

        for (const frame of route.frames) {
            promises.push(unwrap(ldrs[frame.index])());
        }
    }

    await Promise.all(promises);

    if (supplement) {
        context.query.hydrationSupplement = supplement;
    }

    render({
        context,
        renderer,
        root,
        component: <App pathname={pathname} props={props} loaders={ldrs} />,
    }).cascadesFrom(lifetime);
}
