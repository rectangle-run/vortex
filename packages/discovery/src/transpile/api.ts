import { unwrap } from "@vortexjs/common";
import type { CallExpression, Expression } from "oxc-parser";
import { anonFunct, createObject, defaultSpan, exportNode, identifier, literal } from "../builders";
import {
    type CompilerState,
    getObjectKeys,
    getStringLiteralValue,
} from "../compiler";

export function handleAPIFunction(
    state: CompilerState,
    node: CallExpression,
    specialImport: "query" | "mutation",
) {
    if (node.arguments.length !== 2) {
        state.errors.push({
            from: node.start,
            to: node.end,
            message: `expected 2 arguments, got ${node.arguments.length}`,
            hints: [],
        });
        return;
    }

    const pathname = getStringLiteralValue(state, unwrap(node.arguments[0]));
    const opts = getObjectKeys(state, unwrap(node.arguments[1]));

    if (!pathname || !opts) return;

    const impl = opts.impl;
    const schema = opts.schema;

    if (!impl || !schema) {
        state.errors.push({
            from: node.start,
            to: node.end,
            message: `expected 'impl' and 'schema' properties in options`,
            hints: [],
        });
        return;
    }

    const method = (opts.method
        ? getStringLiteralValue(state, opts.method)
        : undefined) ?? specialImport === "query"
        ? "GET"
        : "POST";

    const importName = `INTERNAL_${state.target}_api`;

    const local = state.transformer.import("@vortexjs/wormhole", importName);

    const props: Record<string, Expression> = {};

    props.schema = schema;

    if (state.target === "server") {
        const implExportId = exportNode(state, impl);
        props.impl = identifier(implExportId);

        const schemaExportId = exportNode(state, schema);

        props.schema = identifier(schemaExportId);

        state.clientEligible = false;
        state.discoveries.push({
            type: "api",
            method,
            endpoint: pathname,
            exported: {
                impl: implExportId,
                schema: schemaExportId
            }
        })
    }

    if (state.target === "client") {
        state.serverEligible = false;
    }

    props.endpoint = literal(pathname);
    props.method = literal(method);
    props.isQuery = literal(specialImport === "query");

    node.callee = identifier(local);
    node.arguments = [createObject(props)];
}
