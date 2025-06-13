import type { JSXNode } from "../jsx/jsx-common";
import { type SignalOrValue, toSignal } from "../signal";

export function list<T>(items: SignalOrValue<T[]>) {
	const data = toSignal(items);

	return {
		type: "list",
		renderItem() {
			throw new Error("renderItem must be implemented");
		},
		getKey(_item: T, idx: number): string {
			return String(idx);
		},
		items: data,
		key(cb: (item: T, idx: number) => string | number) {
			return {
				...this,
				getKey(item: T, idx: number): string {
					return String(cb(item, idx));
				},
			};
		},
		show(cb: (item: T, idx: number) => JSXNode) {
			return {
				...this,
				renderItem(item: T, idx: number): JSXNode {
					return cb(item, idx);
				},
			};
		},
	} satisfies JSXNode;
}
