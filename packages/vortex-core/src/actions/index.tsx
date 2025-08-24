import { getImmediateValue } from "../signal";
import { createContext } from "../context";
import type { JSXChildren, JSXComponent, JSXNode } from "../jsx/jsx-common";
import { useState, type Signal } from "../signal";
import { useHookLifetime, type Lifetime } from "../lifetime";

export type KeyModifier = "ctrl"
    | "shift"
    | "alt"
    | "meta";
export type Key =
    | KeyModifier
    | "backspace"
    | "tab"
    | "enter"
    | "escape"
    | "space"
    | "a"
    | "b"
    | "c"
    | "d"
    | "e"
    | "f"
    | "g"
    | "h"
    | "i"
    | "j"
    | "k"
    | "l"
    | "m"
    | "n"
    | "o"
    | "p"
    | "q"
    | "r"
    | "s"
    | "t"
    | "u"
    | "v"
    | "w"
    | "x"
    | "y"
    | "z"
    | "0"
    | "1"
    | "2"
    | "3"
    | "4"
    | "5"
    | "6"
    | "7"
    | "8"
    | "9";

export type UnionToArray<T, U = T> =
    [T] extends [never] ? [] :
    T extends any ? [T, ...UnionToArray<Exclude<U, T>>] : [];

export type ModifierList<Modifiers extends KeyModifier[]> =
    Modifiers extends [] ? "" :
    Modifiers extends [infer First extends KeyModifier, ...infer Rest extends KeyModifier[]] ?
    `${First}+${ModifierList<Rest>}` | ModifierList<Rest> :
    "";
export type KeyboardShortcut = `${ModifierList<UnionToArray<KeyModifier>>}${Key}`;

export interface Action {
    run?(): void | Promise<void>;
    shortcut?: KeyboardShortcut
    name: string;
    icon?: JSXComponent<{}>;
    description?: string;
    group?: string;
}

export interface ActionContext {
    actions: Signal<Action[]>;
    addAction(action: Action, lt: Lifetime): void;
}

export const ActionContext = createContext<ActionContext>("ActionContext");

export function ActionProvider(props: {
    children: JSXChildren;
}): JSXNode {
    const actions = new Set<Action>();
    const signal = useState<Action[]>([]);

    function update() {
        signal.set(Array.from(actions));
    }

    function addAction(action: Action, lt: Lifetime) {
        actions.add(action);
        update();
        lt.onClosed(() => {
            actions.delete(action);
            update();
        });
    }

    return <ActionContext value={{ actions: signal, addAction }}>
        <>{props.children}</>
    </ActionContext>
}

export function useActionContext(): ActionContext {
    return getImmediateValue(ActionContext.use());
}

export function useAction(action: Action, lt: Lifetime = useHookLifetime()) {
    const ctx = useActionContext();

    ctx.addAction(action, lt);

    return action;
}
