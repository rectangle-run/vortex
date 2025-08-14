export interface UDLR {
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
}

type Fallback<T, F> = T extends "" ? F : T;

export type UDLRSymbolSet = Record<Fallback<`${"u" | ""}${"d" | ""}${"l" | ""}${"r" | ""}`, "none">, string>;

function udlrSymbol16(symbols: UDLRSymbolSet) {
    return function ({ up, down, left, right }: UDLR) {
        const key = `${up ? "u" : ""}${down ? "d" : ""}${left ? "l" : ""}${right ? "r" : ""}` as keyof UDLRSymbolSet;
        return symbols[key] || symbols.none;
    }
}

const symbols = {
    outline: {
        rounded: udlrSymbol16({
            u: "╵",
            d: "╷",
            l: "╴",
            r: "╶",
            lr: "─",
            dr: "╭",
            dl: "╮",
            dlr: "┬",
            ur: "╰",
            ul: "╯",
            ulr: "┴",
            ud: "│",
            udr: "├",
            udl: "┤",
            udlr: "┼",
            none: " "
        }),
        double: udlrSymbol16({
            u: "╨",
            d: "╥",
            l: "╡",
            r: "╞",
            lr: "═",
            dr: "╔",
            dl: "╗",
            dlr: "╦",
            ur: "╚",
            ul: "╝",
            ulr: "╩",
            ud: "║",
            udr: "╠",
            udl: "╣",
            udlr: "╬",
            none: " "
        }),
        square: udlrSymbol16({
            u: "╵",
            d: "╷",
            l: "╴",
            r: "╶",
            lr: "─",
            dr: "┌",
            dl: "┐",
            dlr: "┬",
            ur: "└",
            ul: "┘",
            ulr: "┴",
            ud: "│",
            udr: "├",
            udl: "┤",
            udlr: "┼",
            none: " "
        }),
    },
    background: {
        square: udlrSymbol16({
            u: "▀",
            d: "▄",
            l: "▌",
            r: "▐",
            lr: "█",
            dr: "▘",
            dl: "▝",
            dlr: "▄",
            ur: "▖",
            ul: "▗",
            ulr: "▀",
            ud: "█",
            udr: "█",
            udl: "█",
            udlr: "█",
            none: " "
        }),
    }
} as const;

export default symbols;
