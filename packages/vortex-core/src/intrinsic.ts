import type { JSXNode } from "./jsx/jsx-common";

export const IntrinsicKey = "~vortex:intrinsic";

export type IntrinsicComponent<Args extends {}, Id extends string> = {
	"~vortex:intrinsic": Id;
} & ((args: Args) => JSXNode);

export function intrinsic<Args extends {}, Id extends string>(id: Id) {
	const impl = (() => {
		throw new Error(
			`Intrinsic component "${id}" is not implemented. Please provide an implementation.`,
		);
	}) as unknown as IntrinsicComponent<Args, Id>;

	impl[IntrinsicKey] = id;

	return impl;
}

export type IntrinsicImplementation<
	Args extends {} = {},
	Id extends string = string,
> = {
	intrinsic: IntrinsicComponent<Args, Id>;
	implementation: (args: Args) => JSXNode;
};

export function implementIntrinsic<Args extends {}, Id extends string>(
	intrinsic: IntrinsicComponent<Args, Id>,
	implementation: (args: Args) => JSXNode,
): IntrinsicImplementation<Args, Id> {
	return {
		intrinsic,
		implementation,
	};
}
