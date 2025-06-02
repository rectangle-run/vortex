import type { JSXNode } from "../jsx/jsx-common";
import type { Lifetime } from "../lifetime";
import { Component, useComponent } from "../render";
import { derived, getImmediateValue, isSignal, store, type Signal, type SignalOrValue } from "../signal";

export type Case = (() => JSXNode) | JSXNode;

export interface When extends Signal<JSXNode> {
	or(condition: SignalOrValue<boolean>, then: Case): When;
	otherwise(value: Case): Signal<JSXNode>; // It shouldn't be possible to add more conditions after this
}

export function when(
	condition: SignalOrValue<boolean>,
	then: Case,
	lt: Lifetime = useComponent().lifetime
): When {
	const conditions = store<[SignalOrValue<boolean>, Case][]>([
		[condition, then],
	]);

	const result = derived((get) => {
		for (const [cond, value] of get(conditions)) {
			if (isSignal(cond) ? get(cond) : cond) {
				if (typeof value === "function") {
					return {
						type: "component",
						children: [],
						impl: value,
						props: {},
					} satisfies JSXNode;
				}

				return value;
			}
		}
		return undefined;
	}, { dynamic: true }, lt);

	return {
		...result,
		or(cond, value) {
			conditions.set([...getImmediateValue(conditions), [cond, value]]);
			return this;
		},
		otherwise(value) {
			conditions.set([
				...getImmediateValue(conditions),
				[store(true), value],
			]);

			return result as Signal<JSXNode>;
		},
	}
}
