import type {
    Expression,
    LabelIdentifier,
    ModuleDeclaration,
    Span,
    StringLiteral,
    Statement,
    ParamPattern,
    ThrowStatement,
    CallExpression,
    NullLiteral,
    Argument
} from "oxc-parser";
import type { CompilerState } from "./compiler";

export const defaultSpan: Span = {} as unknown as Span;

export function literal<T>(value: T, span = defaultSpan): StringLiteral {
    return {
        type: "Literal",
        value,
        ...span,
    } as unknown as StringLiteral;
}

export function exportNode(state: CompilerState, node: Expression): string {
    const transformer = state.transformer;
    const id = transformer.getExportId(node);

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

export function paren(expr: Expression): Expression {
    return {
        type: "ParenthesizedExpression",
        expression: expr,
        start: expr.start,
        end: expr.end
    }
}

export function anonFunct(props: {
    arguments: ParamPattern[];
    body: Statement[]
}) {
    return paren({
        type: "ArrowFunctionExpression",
        params: props.arguments,
        body: {
            type: "BlockStatement",
            body: props.body,
            ...defaultSpan
        },
        expression: false,
        async: false,
        id: null,
        generator: false,
        ...defaultSpan
    })
}

export function throwStmt(toThrow: Expression): ThrowStatement {
    return {
        type: "ThrowStatement",
        argument: toThrow,
        ...defaultSpan
    }
}

export function call(callee: Expression, args: Argument[]): CallExpression {
    return {
        type: "CallExpression",
        callee,
        arguments: args,
        optional: false,
        ...defaultSpan
    }
}

export function nullLiteral(): NullLiteral {
    return {
        type: "Literal",
        value: null,
        raw: "null",
        ...defaultSpan
    }
}
