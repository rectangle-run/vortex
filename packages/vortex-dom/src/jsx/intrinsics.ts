import type { JSXChildren } from "@vortexjs/core/jsx-common";

export type ElementProps<T extends HTMLElement> = Partial<
	{
		[key in keyof T]: T[key] extends string | number | boolean ? T[key] : never;
	} & {
		className: string;
		children: JSXChildren;
	}
>;

type BaseIntrinsicElements = {
	[key in keyof HTMLElementTagNameMap]: ElementProps<
		HTMLElementTagNameMap[key]
	>;
};

export namespace JSX {
	export interface IntrinsicElements extends BaseIntrinsicElements {}

	export interface ElementChildrenAttribute {
		// biome-ignore lint/complexity/noBannedTypes: need to do this jank to make typescript happy, JSX is awful
		children: {};
	}
}
