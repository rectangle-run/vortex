import { describe, expect, test } from "bun:test";
import { matchPath, parseRoute } from "./router";

describe("route matching", () => {
	const matchups = [
		[
			"/test/[...slug]/abc",
			"/test/hello/world/abc",
			true
		],
		[
			"/test/[...slug]/abc",
			"/test/abc",
			true
		],
		[
			"/test",
			"/test",
			true
		],
		[
			"/test/[...slug]",
			"/test",
			true
		],
		[
			"/abc",
			"/test",
			false
		]
	] as const;

	for (const [route, path, expected] of matchups) {
		test(`should${expected ? "" : " not"} match route '${route}' with path '${path}'`, () => {
			const parsed = parseRoute(route);
			const doesMatch = matchPath(parsed, path).matched;

			expect(doesMatch).toBe(expected);
		})
	}
})
