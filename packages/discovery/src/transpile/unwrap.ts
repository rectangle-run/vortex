import { unwrap } from "@vortexjs/common";
import type { CallExpression } from "oxc-parser";
import {
    type CompilerState,
    getObjectKeys,
    getStringLiteralValue,
} from "../compiler";
import { defaultSpan, anonFunct, throwStmt, literal, call, identifier } from "../builders";

export function inlineUnwrapCall(
    state: CompilerState,
    node: CallExpression
) {
    if (node.arguments.length < 0) {
        return;
    };

    const expr = unwrap(node.arguments[0]);

    if (expr.type === "SpreadElement") {
        if (node.arguments.length < 0) {
            return;
        };
        return;
    };

    const unhappyUnwrap = state.transformer.import("@vortexjs/common", "INTERNAL_unhappyUnwrap");

    state.transformer.replace({
        type: "LogicalExpression",
        left: expr,
        right: call(identifier(unhappyUnwrap), node.arguments.slice(1)),
        operator: "??",
        ...defaultSpan
    }, node)
}
