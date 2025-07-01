import type {
	JSXChildren,
	JSXNode,
	SignalOrValue,
	Store,
	Use,
} from "@vortexjs/core";

export type BindableProps<T extends HTMLElement> = T extends HTMLInputElement
	? {
			value: string | number | boolean;
			checked: boolean;
		}
	: T extends HTMLTextAreaElement
		? {
				value: string;
			}
		: T extends HTMLSelectElement
			? {
					value: string | number;
				}
			: // biome-ignore lint/complexity/noBannedTypes: it's all good
				{};

export type ElementProps<T extends HTMLElement> = {
	[key in Exclude<keyof T, "children" | "style">]?: T[key] extends
		| string
		| number
		| boolean
		| null
		| undefined
		? SignalOrValue<T[key]>
		: never;
} & {
	className?: SignalOrValue<string>;
	children?: JSXChildren;
	use?: Use<T>;
	style?: Partial<{
		[key in keyof CSSStyleDeclaration]: SignalOrValue<
			CSSStyleDeclaration[key]
		>;
	}>;
	ariaDescribedBy?: SignalOrValue<string>;
} & {
	// @ts-ignore: for some reason typescript believes key can be a symbol
	[key in keyof BindableProps<T> as `bind:${key}`]?: Store<
		BindableProps<T>[key]
	>;
} & {
	[eventKey in keyof HTMLElementEventMap as `on:${eventKey}`]?: (
		event: HTMLElementEventMap[eventKey],
	) => void;
} & {
	[str in `data-${string}`]: SignalOrValue<string | number | boolean>;
};

type BaseIntrinsicElements = {
	[key in keyof HTMLElementTagNameMap]: ElementProps<
		HTMLElementTagNameMap[key]
	>;
};

export namespace JSX {
	export interface IntrinsicElements extends BaseIntrinsicElements {}
	export interface IntrinsicAttributes {
		children?: JSXChildren;
	}
	export type ElementType =
		| keyof IntrinsicElements
		| ((props: any) => JSXNode);

	export type Element = JSXNode;
}
