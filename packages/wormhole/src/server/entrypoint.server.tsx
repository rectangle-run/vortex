// import {
//     awaited,
//     type JSXNode,
//     Lifetime,
//     render,
//     type Renderer,
//     useDerived,
// } from "@vortexjs/core";
// import { type ImportHash, matchRoute, type RouterNode } from "~/build/router";
// import { ssr, type VElement } from "@vortexjs/ssr";

// export interface ServerProps {
//     load<T>(hashKey: string): Promise<T>;
//     routes: RouterNode<ImportHash>;
//     pathname: string;
//     root: VElement;
// }

// export async function INTERNAL_loadServer(props: ServerProps) {
//     using _hlt = Lifetime.changeHookLifetime(new Lifetime());

//     const pathname = props.pathname;

//     const routeMatch = matchRoute(pathname, props.routes);

//     let hierarchy: JSXNode;

//     for (const frame of routeMatch.frames.toReversed()) {
//         const Frame = await props.load(frame) as () => JSXNode;

//         hierarchy = (
//             <Frame {...routeMatch.slugs} {...routeMatch.spreads} children={hierarchy} />
//         );
//     }

//     render(
//         ssr(),
//         props.root,
//         <>
//             <head>
//                 <link rel="stylesheet" href="/dist/styles.css" />
//                 <script type="module" src="/dist/client.js" />
//             </head>
//             <body>
//                 {hierarchy}
//             </body>
//         </>,
//     ).close();
// }
