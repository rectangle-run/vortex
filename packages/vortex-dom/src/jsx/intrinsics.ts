import type { Signal, Store } from "@vortexjs/core";
import type { JSXChildren } from "@vortexjs/core/jsx-common";

export type BindableProps<T extends HTMLElement> = T extends HTMLInputElement
	? {
			value: string | number | boolean;
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

export type ElementProps<T extends HTMLElement> = Partial<
	{
		[key in keyof T]: T[key] extends string | number | boolean ? T[key] : never;
	} & {
		className: string;
	}
> & {
	children?: JSXChildren;
} & {
	// @ts-ignore: for some reason typescript believes key can be a symbol
	[key in keyof BindableProps<T> as `bind:${key}`]?: Store<
		BindableProps<T>[key]
	>;
} & {
	[eventKey in keyof HTMLElementEventMap as `on:${eventKey}`]?: (
		event: HTMLElementEventMap[eventKey],
	) => void;
};

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
