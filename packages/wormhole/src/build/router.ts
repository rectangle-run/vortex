import { type Brand, unwrap } from "@vortexjs/common";
import { getLoadKey } from "~/build/load-key";

// Parsing
export type ParsedRoute = RouteSegment[];
export type RouteSegment =
    | { type: "spread"; name: string }
    | { type: "static"; match: string }
    | { type: "slug"; name: string };

export function parseRoute(route: string): ParsedRoute {
    const segments = route
        .split("/")
        .map((x) => x.trim())
        .filter((x) => x !== "");
    const result: ParsedRoute = [];

    for (const segment of segments) {
        if (segment.startsWith("[") && segment.endsWith("]")) {
            const body = segment.slice(1, -1);

            if (body.startsWith("...")) {
                result.push({ type: "spread", name: body.slice(3) });
            } else {
                result.push({ type: "slug", name: body });
            }
        } else {
            result.push({
                type: "static",
                match: segment,
            });
        }
    }

    return result;
}

// Tree generation
export type RouterNode<Specifier extends ImportHash | ImportNamed> = {
    cases: Record<string, RouterNode<Specifier>>; // Cases for static segments
    layout?: Specifier; // Layout page, if any
    page?: Specifier; // Page to render for this route
    notFoundPage?: Specifier; // Not found page, if any
    epsilon?: {
        node: RouterNode<Specifier>;
        id: string; // the param key to add the value to
    }; // Epsilon transition, where it doesn't match any special cases
    arrayEpsilon?: boolean;
};

export type ImportHash = Brand<string, "importHash">;

export type ImportNamed = {
    filePath: string;
    exportId: string;
};

export interface InputRoute {
    path: string; // The path of the route
    frame: ImportNamed; // The frame to render for this route
    frameType: "page" | "layout";
}

const makeBlankNode = (): RouterNode<any> => ({
    cases: {},
    layout: undefined,
    page: undefined,
    notFoundPage: undefined,
    epsilon: undefined,
});

export function generateRouterTree(routes: InputRoute[]) {
    const tree: RouterNode<ImportNamed> = makeBlankNode();

    for (const route of routes) {
        const parsed = parseRoute(route.path);
        let currentNode = tree;

        for (const segment of parsed) {
            if (segment.type === "static") {
                currentNode = currentNode.cases[segment.match] ??=
                    makeBlankNode();
            } else if (segment.type === "slug") {
                if (currentNode.epsilon) {
                    console.warn(
                        `Route "${route.path}" has multiple slug segments.`,
                    );
                }

                currentNode.epsilon = {
                    node: makeBlankNode(),
                    id: segment.name,
                };
                currentNode = currentNode.epsilon.node;
            } else if (segment.type === "spread") {
                if (currentNode.epsilon) {
                    console.warn(
                        `Route "${route.path}" has multiple slug segments.`,
                    );
                }

                currentNode.epsilon = {
                    node: currentNode, // Is this completely fucked? Yes. Is it what is technically correct. Also yes.
                    id: segment.name,
                };

                currentNode.arrayEpsilon = true;
            }
        }

        if (route.frameType === "page") {
            if (currentNode.page) {
                console.warn(`Route "${route.path}" has multiple page frames.`);
            }

            currentNode.page = route.frame;
        } else if (route.frameType === "layout") {
            if (currentNode.layout) {
                console.warn(
                    `Route "${route.path}" has multiple layout frames.`,
                );
            }

            currentNode.layout = route.frame;
        }
    }

    return tree;
}

export type RouteMatch<Specifier extends ImportNamed | ImportHash> = {
    frames: Specifier[];
    slugs: Record<string, string>;
    spreads: Record<string, string[]>;
    notFound: boolean;
};
const routeDebugging = false;

export function matchRoute<Specifier extends ImportNamed | ImportHash>(
    route: string,
    tree: RouterNode<Specifier>,
): RouteMatch<Specifier> {
    const currentFrames: Specifier[] = [];
    const currentSlugs: Record<string, string> = {};
    const currentSpreads: Record<string, string[]> = {};
    let notFoundMatch: RouteMatch<Specifier> = {
        frames: [],
        slugs: {},
        spreads: {},
        notFound: true,
    };

    const segments = route
        .split("/")
        .map((x) => x.trim())
        .filter((x) => x !== "");

    if (routeDebugging) {
        console.log("Route matching started:", { route, segments, tree });
    }

    let currentNode: RouterNode<Specifier> = tree;

    if (currentNode.layout) {
        currentFrames.push(currentNode.layout);
        if (routeDebugging) {
            console.log("Added root layout to frames");
        }
    }

    if (currentNode.notFoundPage) {
        notFoundMatch = {
            frames: [...currentFrames, currentNode.notFoundPage],
            slugs: { ...currentSlugs },
            spreads: { ...currentSpreads },
            notFound: true,
        };
        if (routeDebugging) {
            console.log("Set initial notFoundMatch");
        }
    }

    for (const seg of segments) {
        if (routeDebugging) {
            console.log("Processing segment:", seg);
        }

        if (seg in currentNode.cases) {
            currentNode = unwrap(currentNode.cases[seg]);
            if (routeDebugging) {
                console.log("Matched static segment:", seg);
            }

            if (currentNode.layout) {
                currentFrames.push(currentNode.layout);
                if (routeDebugging) {
                    console.log("Added layout to frames for static segment");
                }
            }

            if (currentNode.notFoundPage) {
                notFoundMatch = {
                    frames: [...currentFrames, currentNode.notFoundPage],
                    slugs: { ...currentSlugs },
                    spreads: { ...currentSpreads },
                    notFound: true,
                };
                if (routeDebugging) {
                    console.log("Updated notFoundMatch for static segment");
                }
            }
        } else if (currentNode.epsilon) {
            const epsilon = unwrap(currentNode.epsilon);

            currentNode = epsilon.node;

            if (currentNode.arrayEpsilon) {
                // biome-ignore lint/suspicious/noAssignInExpressions: it's more concise this way
                (currentSpreads[epsilon.id] ??= []).push(seg);
                if (routeDebugging) {
                    console.log("Matched spread segment:", {
                        id: epsilon.id,
                        segment: seg,
                    });
                }
            } else {
                currentSlugs[epsilon.id] = seg;
                if (routeDebugging) {
                    console.log("Matched slug segment:", {
                        id: epsilon.id,
                        segment: seg,
                    });
                }
            }

            if (currentNode.layout) {
                currentFrames.push(currentNode.layout);
                if (routeDebugging) {
                    console.log(
                        "Added layout to frames for epsilon transition",
                    );
                }
            }

            if (currentNode.notFoundPage) {
                notFoundMatch = {
                    frames: [...currentFrames, currentNode.notFoundPage],
                    slugs: { ...currentSlugs },
                    spreads: { ...currentSpreads },
                    notFound: true,
                };
                if (routeDebugging) {
                    console.log("Updated notFoundMatch for epsilon transition");
                }
            }
        } else {
            if (routeDebugging) {
                console.log(
                    "No match found for segment, returning notFoundMatch:",
                    seg,
                );
            }
            return notFoundMatch;
        }
    }

    if (!currentNode.page) {
        if (routeDebugging) {
            console.log("No page found at final node, returning notFoundMatch");
        }
        return notFoundMatch;
    }

    const result = {
        frames: [...currentFrames, currentNode.page],
        slugs: { ...currentSlugs },
        spreads: { ...currentSpreads },
        notFound: false,
    };

    if (routeDebugging) {
        console.log("Route match successful:", result);
    }

    return result;
}

export function hashImports(
    node: RouterNode<ImportNamed>,
): RouterNode<ImportHash> {
    const newNode: RouterNode<ImportHash> = {
        cases: {},
        layout: node.layout ? getLoadKey(node.layout) : undefined,
        page: node.page ? getLoadKey(node.page) : undefined,
        notFoundPage: node.notFoundPage
            ? getLoadKey(node.notFoundPage)
            : undefined,
        epsilon: node.epsilon
            ? {
                node: hashImports(node.epsilon.node),
                id: node.epsilon.id,
            }
            : undefined,
        arrayEpsilon: node.arrayEpsilon,
    };

    for (const [key, child] of Object.entries(node.cases)) {
        newNode.cases[key] = hashImports(child);
    }

    return newNode;
}
