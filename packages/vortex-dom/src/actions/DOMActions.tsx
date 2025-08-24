import { getImmediateValue, useAbortSignal, type JSXNode } from "@vortexjs/core";
import { useActionContext, type Key } from "@vortexjs/core/actions";

function getCodeToKey(code: string): string {
    const mapping: Record<string, Key> = {
        "ControlLeft": "ctrl",
        "ControlRight": "ctrl",
        "ShiftLeft": "shift",
        "ShiftRight": "shift",
        "AltLeft": "alt",
        "AltRight": "alt",
        "MetaLeft": "meta",
        "MetaRight": "meta",
        "KeyA": "a",
        "KeyB": "b",
        "KeyC": "c",
        "KeyD": "d",
        "KeyE": "e",
        "KeyF": "f",
        "KeyG": "g",
        "KeyH": "h",
        "KeyI": "i",
        "KeyJ": "j",
        "KeyK": "k",
        "KeyL": "l",
        "KeyM": "m",
        "KeyN": "n",
        "KeyO": "o",
        "KeyP": "p",
        "KeyQ": "q",
        "KeyR": "r",
        "KeyS": "s",
        "KeyT": "t",
        "KeyU": "u",
        "KeyV": "v",
        "KeyW": "w",
        "KeyX": "x",
        "KeyY": "y",
        "KeyZ": "z",
        "Digit0": "0",
        "Digit1": "1",
        "Digit2": "2",
        "Digit3": "3",
        "Digit4": "4",
        "Digit5": "5",
        "Digit6": "6",
        "Digit7": "7",
        "Digit8": "8",
        "Digit9": "9",
    }

    if (code in mapping) {
        return mapping[code]!;
    }

    return code.toLowerCase();
}

function sortKeys(keys: string[]): string[] {
    const order = ["ctrl", "shift", "alt", "meta", "other"];
    return keys.sort((a, b) => {
        let aIndex = order.indexOf(a);
        let bIndex = order.indexOf(b);

        if (aIndex === -1) aIndex = order.length - 1;
        if (bIndex === -1) bIndex = order.length - 1;

        return aIndex - bIndex;
    });
}

function isNodeEditable(node: HTMLElement): boolean {
    const tagName = node.tagName.toLowerCase();
    if (tagName === "input" || tagName === "textarea" || node.isContentEditable) {
        return true;
    }
    if (node.parentElement) {
        return isNodeEditable(node.parentElement);
    }
    return false;
}

function isEditable(ev: KeyboardEvent): boolean {
    const target = ev.target as HTMLElement | null;
    if (!target) return false;
    return isNodeEditable(target);
}

export function DOMKeyboardActions(): JSXNode {
    if (!("window" in globalThis)) return <></>;

    const { actions } = useActionContext();

    const signal = useAbortSignal();

    const keys = new Set<string>();

    window.addEventListener("keydown", (ev) => {
        if (isEditable(ev)) return;
        keys.add(ev.code);
    }, { signal });

    window.addEventListener("keyup", (ev) => {
        if (isEditable(ev)) return;
        const shortcut = Array.from(keys).map(x => getCodeToKey(x));
        keys.delete(ev.code);

        let sortedShortcut = sortKeys(shortcut);

        const shortcutString = sortedShortcut.join("+");

        const action = getImmediateValue(actions).find(x =>
            x.shortcut && sortKeys(x.shortcut.split("+")).join("+") === shortcutString);

        if (action) {
            ev.preventDefault();
            action?.run?.();
        }
    }, { signal });

    return <></>;
}
