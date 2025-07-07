import type {
	Expression,
	LabelIdentifier,
	ModuleDeclaration,
	Span,
	StringLiteral,
} from "oxc-parser";
import type { CompilerState } from "./compiler";

export const defaultSpan: Span = {
	start: 0,
	end: 0,
};

export function literal<T>(value: T, span = defaultSpan): StringLiteral {
	return {
		type: "Literal",
		value,
		...span,
	} as unknown as StringLiteral;
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

export function identifier(name: string): LabelIdentifier {
	return {
		type: "Identifier",
		name,
		...defaultSpan,
	};
}

export function importDeclaration(
	module: string,
	name: string,
	local: string,
): ModuleDeclaration {
	return {
		type: "ImportDeclaration",
		specifiers: [
			{
				type: "ImportSpecifier",
				imported: identifier(name),
				local: identifier(local),
				...defaultSpan,
			},
		],
		source: literal(module),
		phase: null,
		importKind: "value",
		attributes: [],
		...defaultSpan,
	};
}

export function createObject(
	properties: Record<string, Expression>,
	span = defaultSpan,
): Expression & Span {
	return {
		type: "ObjectExpression",
		properties: Object.entries(properties).map(([key, value]) => ({
			type: "Property",
			key: identifier(key),
			value,
			kind: "init",
			computed: false,
			method: false,
			shorthand: false,
			...defaultSpan,
		})),
		...span,
	};
}
