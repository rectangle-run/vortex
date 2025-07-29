import { describe, expect, it } from "bun:test";
import { unwrap } from "@vortexjs/common";
import {
    generateRouterTree,
    type ImportNamed,
    type ParsedRoute,
    parseRoute,
} from "~/build/router";

describe("route parsing", () => {
    it("should parse purely static routes", () => {
        const value: ParsedRoute = [
            {
                type: "static",
                match: "foo",
            },
            {
                type: "static",
                match: "bar",
            },
            {
                type: "static",
                match: "baz",
            },
        ];

        expect(parseRoute("foo/bar/baz")).toEqual(value);

        expect(parseRoute("/foo/bar/baz")).toEqual(value);

        expect(parseRoute("foo/bar/baz/")).toEqual(value);

        expect(parseRoute("foo//bar/baz/")).toEqual(value);
    });
});

describe("tree generation", () => {
    it("should work", () => {
        const exampleFrame: ImportNamed = {
            exportId: "exampleFrame",
            filePath: "example/path/to/file.tsx",
        };

        expect(
            generateRouterTree([
                {
                    frame: exampleFrame,
                    frameType: "page",
                    path: "test",
                },
            ]),
        ).toEqual({
            cases: {
                test: {
                    cases: {},
                    epsilon: undefined,
                    layout: undefined,
                    notFoundPage: undefined,
                    page: {
                        exportId: "exampleFrame",
                        filePath: "example/path/to/file.tsx",
                    },
                },
            },
            epsilon: undefined,
            layout: undefined,
            notFoundPage: undefined,
            page: undefined,
        });

        expect(
            generateRouterTree([
                {
                    frame: exampleFrame,
                    frameType: "page",
                    path: "[slug]/test",
                },
            ]),
        ).toEqual({
            cases: {},
            epsilon: {
                id: "slug",
                node: {
                    cases: {
                        test: {
                            cases: {},
                            epsilon: undefined,
                            layout: undefined,
                            notFoundPage: undefined,
                            page: {
                                exportId: "exampleFrame",
                                filePath: "example/path/to/file.tsx",
                            },
                        },
                    },
                    epsilon: undefined,
                    layout: undefined,
                    notFoundPage: undefined,
                    page: undefined,
                },
            },
            layout: undefined,
            notFoundPage: undefined,
            page: undefined,
        });

        const tree = generateRouterTree([
            {
                frame: exampleFrame,
                frameType: "page",
                path: "long/[...slug]/abc",
            },
        ]);

        expect(tree.cases.long?.epsilon?.node).toBe(unwrap(tree.cases.long));
    });
});
