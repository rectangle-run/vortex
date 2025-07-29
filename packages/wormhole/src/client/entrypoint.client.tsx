import {
    awaited,
    type JSXNode,
    Lifetime,
    render,
    useDerived,
} from "@vortexjs/core";
import { html, type JSX } from "@vortexjs/dom";
import { type ImportHash, matchRoute, type RouterNode } from "~/build/router";
import { initializeClientSideRouting, usePathname } from "~/runtime/csr";

export interface ClientProps {
    load<T>(hashKey: string): Promise<T>;
    routes: RouterNode<ImportHash>;
}

function createFrameLoader<T extends JSX.IntrinsicAttributes>(
    frame: ImportHash,
    props: ClientProps,
) {
    const loaded = awaited(props.load(frame));

    return (props: T) => {
        return (
            <>
                {useDerived((get) => {
                    const Loaded = get(loaded) as (props: T) => JSXNode;

                    return Loaded ? <Loaded {...props} /> : <></>;
                })}
            </>
        );
    };
}

export async function INTERNAL_loadClient(props: ClientProps) {
    using _hlt = Lifetime.changeHookLifetime(new Lifetime());
    initializeClientSideRouting();

    const pathname = usePathname();

    const routeMatch = useDerived((get) =>
        matchRoute(get(pathname), props.routes),
    );
    const hierarchy = useDerived((get) => {
        const rm = get(routeMatch);

        let node: JSXNode;

        for (const frame of rm.frames.toReversed()) {
            const Frame = createFrameLoader(frame, props);
            node = (
                <Frame {...rm.slugs} {...rm.spreads} children={node} />
            );
        }

        return node;
    });

    render(
        html(),
        document.documentElement,
        <>
            <head>
                <link rel="stylesheet" href="/dist/styles.css" />
                <script type="module" src="/dist/client.js" />
            </head>
            <body>
                {hierarchy}
            </body>
        </>,
    );
}
