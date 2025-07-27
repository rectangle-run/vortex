import { describe, expect, test } from "bun:test";
import { deepEquals } from "./deep-equals";

/*
    You may be wondering why I wrote a test for this, it's because for some
    reason, this function seems to keep giving bogus outputs, so I might as
    well write tests to make sure it's not the function being schizo
*/
describe("deep equals works", () => {
	const samples = [
		1,
		"one",
		Promise.resolve(123),
		{
			a: 123,
			b: [1, 2, 3],
		},
		{
			a: 123,
			b: [],
		},
		{
			b: 123,
			a: [],
		},
		[],
		[1],
		[[]],
		"A",
		"a",
	];

	for (let a = 0; a < samples.length; a++) {
		for (let b = 0; b < samples.length; b++) {
			test(`${a} vs ${b}`, () => {
				expect(deepEquals(samples[a], samples[b])).toBe(
					Bun.deepEquals(samples[a], samples[b]),
				);
			});
		}
	}
});
