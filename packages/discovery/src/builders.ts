import type { Expression, ModuleDeclaration, Span } from "oxc-parser";
import type { CompilerState } from "./compiler";

export const defaultSpan: Span = {
	start: 0,
	end: 0,
};

export function literal<T>(
	value: T,
	span = defaultSpan,
): {
	type: "Literal";
	value: T;
} & Span {
	return {
		type: "Literal",
		value,
		...span,
	};
}

export function exportNode(state: CompilerState, node: Expression): string {
	const transformer = state.transformer;
	const id = transformer.getExportId();

	const decl: ModuleDeclaration = {
		type: "ExportNamedDeclaration",
		declaration: {
			type: "VariableDeclaration",
			kind: "const",
			declarations: [
				{
					type: "VariableDeclarator",
					id: {
						type: "Identifier",
						name: id,
						...defaultSpan,
					},
					init: node,
					...defaultSpan,
				},
			],
			...defaultSpan,
		},
		specifiers: [],
		source: null,
		attributes: [],
		...defaultSpan,
	};

	transformer.addDeclaration(decl);

	return id;
}
