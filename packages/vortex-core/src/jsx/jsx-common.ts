import { getUltraglobalReference } from "@vortexjs/common";
import {
    isSignal,
    type Signal,
    type Store,
    toSignal,
    useDerived,
} from "../signal";

export type JSXNode =
    | JSXElement
    | JSXComponent<unknown>
    | JSXFragment
    | JSXText
    | JSXDynamic
    | JSXList<unknown>
    | JSXContext
    | undefined;

export interface JSXContext {
    type: "context";
    id: string;
    value: Signal<any>;
    children: JSXNode;
}

export interface JSXList<T> {
    type: "list";
    getKey(item: T, index: number): string;
    renderItem(item: T, idx: number): JSXNode;
    items: Signal<T[]>;
    key(cb: (item: T, idx: number) => string | number): JSXList<T>;
    show(cb: (item: T, idx: number) => JSXNode): JSXList<T>;
}

export interface JSXSource {
    fileName?: string;
    lineNumber?: number;
    columnNumber?: number;
}

export interface JSXElement extends JSXSource {
    type: "element";
    name: string;
    attributes: Record<string, Signal<string | undefined>>;
    bindings: Record<string, Store<any>>;
    eventHandlers: Record<string, (event: any) => void>;
    use: Use<unknown>;
    children: JSXNode[];
    styles: Record<string, Signal<string | undefined>>;
}

export type Use<T> = ((ref: T) => void) | Use<T>[];

export interface JSXComponent<Props> extends JSXSource {
    type: "component";
    impl: (props: Props) => JSXNode;
    props: Props;
}

export interface JSXFragment extends JSXSource {
    type: "fragment";
    children: JSXNode[];
}

export interface JSXText extends JSXSource {
    type: "text";
    value: string;
}

export interface JSXDynamic extends JSXSource {
    type: "dynamic";
    value: Signal<JSXNode>;
}

export interface JSXRuntimeProps {
    children?: JSXChildren;
    [key: string]: any;
}

export const Fragment = getUltraglobalReference({
    name: "Fragment",
    package: "@vortexjs/core"
}, Symbol("Fragment"));

export type JSXNonSignalChild = JSXNode | string | number | boolean | undefined;

export type JSXChild = JSXNonSignalChild | Signal<JSXNonSignalChild>;

export type JSXChildren = JSXChild | JSXChild[];

export function normalizeChildren(children: JSXChildren): JSXNode[] {
    if (children === undefined) {
        return [];
    }
    return [children]
        .flat()
        .filter((child) => child !== null && child !== undefined)
        .map((x) =>
            typeof x === "string" ||
                typeof x === "number" ||
                typeof x === "boolean"
                ? createTextNode(x)
                : isSignal(x)
                    ? {
                        type: "dynamic",
                        value: useDerived((get) => {
                            const val = get(x);
                            return typeof val === "number" ||
                                typeof val === "string" ||
                                typeof val === "boolean"
                                ? createTextNode(val)
                                : val;
                        }),
                    }
                    : x,
        );
}

export function createTextNode(value: any, source?: JSXSource): JSXNode {
    return {
        type: "text",
        value,
        ...source,
    };
}

export function createElementInternal(
    type: string,
    props: Record<string, any>,
    children: JSXChildren,
    source?: JSXSource,
): JSXNode {
    const normalizedChildren = normalizeChildren(children).map((child) => {
        if (
            typeof child === "string" ||
            typeof child === "number" ||
            typeof child === "boolean"
        ) {
            return createTextNode(child);
        }
        return child;
    });

    const properAttributes: Record<string, Signal<string | undefined>> = {};
    const bindings: Record<string, Store<any>> = {};
    const eventHandlers: Record<string, (event: any) => void> = {};
    const use: Use<unknown> = [];
    const styles: Record<string, Signal<any>> = {};

    for (const [key, value] of Object.entries(props)) {
        if (value !== undefined) {
            if (key.startsWith("bind:")) {
                const bindingKey = key.slice(5);

                if (!isSignal(value) || !("set" in value)) {
                    throw new Error(
                        `Binding value for "${bindingKey}" must be a writable store.`,
                    );
                }

                bindings[bindingKey] = value as Store<any>;
            } else if (key.startsWith("on:")) {
                const eventKey = key.slice(3);
                if (typeof value !== "function") {
                    throw new Error(
                        `Event handler for "${eventKey}" must be a function.`,
                    );
                }
                eventHandlers[eventKey] = value;
            } else if (key === "use") {
                if (typeof value !== "function" && !Array.isArray(value)) {
                    throw new Error(
                        "Use hook must be a function or an array of functions.",
                    );
                }
                use.push(value);
            } else if (key === "style") {
                for (const [styleKey, styleValue] of Object.entries(value)) {
                    if (styleValue !== undefined) {
                        styles[styleKey] = toSignal(styleValue);
                    }
                }
            } else {
                properAttributes[key] = toSignal(value);
            }
        }
    }

    return {
        type: "element",
        name: type,
        attributes: properAttributes,
        children: normalizedChildren,
        bindings,
        eventHandlers,
        use,
        styles,
    };
}
