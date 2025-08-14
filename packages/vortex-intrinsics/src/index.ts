import { intrinsic, type JSXChildren } from "@vortexjs/core";

type TextSize = "title" | "heading" | "subheading" | "body" | "caption";

export type FontWeight = "normal" | "bold" | "bolder" | "lighter" | number;

export function fontWeightToNumber(weight: FontWeight): number {
	switch (weight) {
		case "normal":
			return 400;
		case "bold":
			return 700;
		case "bolder":
			return 800;
		case "lighter":
			return 300;
		default:
			return weight;
	}
}

export function fontWeightToPrimitiveBoldness(
	weight: FontWeight,
): "normal" | "bold" {
	return fontWeightToNumber(weight) >= 700 ? "bold" : "normal";
}

export const Text = intrinsic<
	{
		children: JSXChildren;
		color?: string;
		weight?: FontWeight;
		italic?: boolean;
		underline?: boolean;
		size?: number | TextSize;
	},
	"vortex:text"
>("vortex:text");

export type UDLRDescription<T extends string | never> =
	| {
			base?: number | T;
			top?: number | T;
			right?: number | T;
			bottom?: number | T;
			left?: number | T;
			x?: number | T;
			y?: number | T;
	  }
	| number
	| T;

export function resolveUDLRDescription<T extends string | never>(
	desc: UDLRDescription<T>,
): {
	top: T | number;
	right: T | number;
	bottom: T | number;
	left: T | number;
} {
	if (typeof desc === "number" || typeof desc === "string") {
		return { top: desc, right: desc, bottom: desc, left: desc };
	}
	return {
		top: desc.top ?? desc.y ?? desc.base ?? 0,
		right: desc.right ?? desc.x ?? desc.base ?? 0,
		bottom: desc.bottom ?? desc.y ?? desc.base ?? 0,
		left: desc.left ?? desc.x ?? desc.base ?? 0,
	};
}

export type Background =
	| {
			color?: string;
	  }
	| string;
export type Border =
	| {
			color?: string;
			width?: number;
			radius?: number;
	  }
	| string;

export const Frame = intrinsic<
	{
		children: JSXChildren;
		border?: Border;
		background?: Background;

		padding?: UDLRDescription<string>;
		margin?: UDLRDescription<string>;
		width?: number | string;
		height?: number | string;
		minWidth?: number | string;
		minHeight?: number | string;
		maxWidth?: number | string;
		maxHeight?: number | string;
		direction?: "row" | "column" | "row-reverse" | "column-reverse";
		grow?: number;
		gap?: number | string;
		alignItems?:
			| "flex-start"
			| "flex-end"
			| "center"
			| "stretch"
			| "baseline";
		justifyContent?:
			| "flex-start"
			| "flex-end"
			| "center"
			| "space-between"
			| "space-around"
			| "space-evenly";
	},
	"vortex:frame"
>("vortex:frame");
