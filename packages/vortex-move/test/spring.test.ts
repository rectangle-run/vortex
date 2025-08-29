import { expect, test } from "bun:test";
import { Spring } from "../src";

test("Springs scale properly", () => {
	const springA = new Spring(0);
	const springB = new Spring(0);
	const springBScale = 0.5;

	springA.target = 100;
	springB.target = 100 * springBScale;

	for (let i = 0; i < 1000; i++) {
		springA.update(0.016);
		springB.update(0.016);

		expect(springB.value).toBeCloseTo(springA.value * springBScale, 3);
	}
});
