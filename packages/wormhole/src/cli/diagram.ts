import { type ShjToken, tokenize } from "@speed-highlight/core";
import { unwrap } from "@vortexjs/common";
import chalk from "chalk";

export type RichText = RichLine[];
export type RichLine = {
    chars: RichChar[];
    number: number;
    id: string;
};
export type Color = "default" | `#${string}`;
export type RichChar = {
    text: string;
    id: string;
    color: Color;
};

export function tinyIds_new() {
    let id = 0;

    return {
        next() {
            const nextId = id.toString(36);
            id++;
            return nextId;
        },
    };
}

export const tinyIds = tinyIds_new();

export interface ImportedRichText {
    text: RichText;
    logicalLocations: string[];
}

function pipe(...dirs: ("up" | "down" | "left" | "right")[]) {
    const up = dirs.includes("up");
    const down = dirs.includes("down");
    const left = dirs.includes("left");
    const right = dirs.includes("right");

    const index =
        (up ? 1 : 0) + (down ? 2 : 0) + (left ? 4 : 0) + (right ? 8 : 0);
    const charset = [
        " ", // 0: no connections
        "╵", // 1: up
        "╷", // 2: down
        "│", // 3: up + down
        "╴", // 4: left
        "┘", // 5: up + left
        "┐", // 6: down + left
        "┤", // 7: up + down + left
        "╶", // 8: right
        "└", // 9: up + right
        "┌", // 10: down + right
        "├", // 11: up + down + right
        "─", // 12: left + right
        "┴", // 13: up + left + right
        "┬", // 14: down + left + right
        "┼", // 15: up + down + left + right
    ];
    return charset[index] ?? " ";
}

const NO_SYNTAX_HIGHLIGHT = process.env.NO_SYNTAX_HIGHLIGHT === "true";

export async function importRichText(text: string): Promise<ImportedRichText> {
    if (NO_SYNTAX_HIGHLIGHT) {
        const lines: RichText = [];
        const logicalLocations: string[] = [];

        for (const line of text.split("\n")) {
            const content: RichChar[] = [];

            for (const char of `${line}\n`) {
                const id = tinyIds.next();
                logicalLocations.push(id);
                content.push({
                    text: char,
                    id,
                    color: "default",
                });
            }

            lines.push({
                chars: content,
                number: lines.length + 1,
                id: tinyIds.next(),
            });
        }

        return {
            text: lines,
            logicalLocations: unwrap(logicalLocations),
        };
    }

    const logicalLocations: string[] = [];
    const chars: RichChar[] = [];

    await tokenize(text, "ts", (token, type) => {
        const colors: Record<ShjToken, Color> = {
            deleted: "#ef4444",
            err: "#ef4444",
            var: "#8b5cf6",
            section: "#43AAF9",
            kwd: "#f75f8f",
            class: "#2dd4bf",
            cmnt: "#64748b",
            insert: "#22c55e",
            type: "#2dd4bf",
            func: "#8b5cf6",
            bool: "#2563eb",
            num: "#2563eb",
            oper: "default",
            str: "#fb923c",
            esc: "#ef4444",
        } as const;

        const color = (type ? colors[type] : "default") ?? "default";

        for (const character of token) {
            const id = tinyIds.next();

            logicalLocations.push(id);

            const char: RichChar = {
                text: character,
                id,
                color,
            };

            chars.push(char);
        }
    });

    const lines: RichLine[] = [];
    let currentLine: RichLine = {
        chars: [],
        number: 1,
        id: tinyIds.next(),
    };

    for (const char of chars) {
        if (char.text === "\n") {
            currentLine.chars.push(char);
            lines.push(currentLine);
            currentLine = {
                chars: [],
                number: currentLine.number + 1,
                id: tinyIds.next(),
            };
        } else {
            currentLine.chars.push(char);
        }
    }

    if (currentLine.chars.length > 0) {
        lines.push(currentLine);
    }

    return {
        text: lines,
        logicalLocations: unwrap(logicalLocations),
    };
}

export function printRichText(text: RichText) {
    for (const line of text) {
        let lineContent = chalk.gray(
            `${line.number.toString().padStart(5)} ${pipe("up", "down")} `,
        );

        for (const char of line.chars) {
            if (char.color === "default") {
                lineContent += char.text;
            } else {
                lineContent += chalk.hex(char.color.toUpperCase())(char.text);
            }
        }

        console.log(lineContent);
    }
}

const tabWidth = 4;

export function formatRichText(text: RichChar[]): string {
    return text
        .map((char) => {
            const niceText =
                char.text === "\t" ? " ".repeat(tabWidth) : char.text;

            if (char.color === "default") {
                return niceText;
            }
            return chalk.hex(char.color.toUpperCase())(niceText);
        })
        .join("");
}

export function getRichWidth(text: RichChar[]): number {
    let width = 0;

    for (const char of text) {
        if (char.text === "\t") {
            width += tabWidth;
        } else {
            width += char.text.length;
        }
    }

    return width;
}

export interface DiagramProps {
    text: RichText;
    logicalLocations: string[];
    diagnostics: {
        start: number;
        end: number;
        message: string;
        severity: "error" | "info";
    }[];
}

export const colors = {
    error: "#f87171",
    info: "#3b82f6",
};

export function diagram(props: DiagramProps): string {
    const outputLines: string[] = [];

    function getLineNumber(index: number): number {
        return props.text.findIndex((line) =>
            line.chars.some(
                (char) => char.id === props.logicalLocations[index],
            ),
        );
    }

    for (let idx = 0; idx < props.text.length; idx++) {
        const line = unwrap(props.text[idx]);

        const shouldShow = props.diagnostics.some((diagnostic) => {
            const lineNum = getLineNumber(diagnostic.start);
            return Math.abs(lineNum - idx) <= 2;
        });

        if (!shouldShow) continue;

        const linePrefix = `${line.number.toString().padStart(5)} ${pipe("up", "down")} `;
        const linePrefixNoNumber = `${" ".repeat(5)} ${pipe("up", "down")} `;

        outputLines.push(
            chalk.gray(linePrefix) + formatRichText(line.chars.slice(0, -1)),
        );

        // layout the annotations
        const relevantDiagnostics = props.diagnostics
            .filter((diagnostic) => {
                const lineNum = getLineNumber(diagnostic.start);
                return lineNum === idx;
            })
            .map((x) => ({
                ...x,
                offsetInLine: getRichWidth(
                    line.chars.slice(
                        0,
                        line.chars.findIndex(
                            (a) => a.id === props.logicalLocations[x.start],
                        ),
                    ),
                ),
            }))
            .toSorted((a, b) => a.offsetInLine - b.offsetInLine)
            .toReversed(); // we want to place rightmost diagnostics first, otherwise we'll run into a condition where later diagnostics wont have a path for their stem to take

        // layout the diagnostics
        const diagnosticPositions: {
            x: number;
            y: number;
            text: string;
            severity: "error" | "info";
        }[] = [];

        for (const diagnostic of relevantDiagnostics) {
            let y = 0;

            while (true) {
                let collides = false;

                for (const pos of diagnosticPositions) {
                    if (
                        pos.x <
                        diagnostic.message.length +
                        diagnostic.offsetInLine +
                        2 &&
                        pos.y === y
                    ) {
                        collides = true;
                    }
                }

                if (!collides) {
                    break;
                }
                y += 1;
            }

            diagnosticPositions.push({
                x: diagnostic.offsetInLine,
                y,
                text: diagnostic.message,
                severity: diagnostic.severity,
            });
        }

        const diagnosticLines =
            diagnosticPositions.length > 0
                ? Math.max(...diagnosticPositions.map((x) => x.y + 1))
                : 0;
        const diagnosticWidth = Math.max(
            ...diagnosticPositions.map((x) => x.text.length + x.x + 2),
        );

        for (let y = 0; y < diagnosticLines; y++) {
            let content = chalk.gray(linePrefixNoNumber);

            for (let x = 0; x < diagnosticWidth; x++) {
                let char = " ";

                // check for stems
                for (const pos of diagnosticPositions) {
                    if (pos.x === x && y <= pos.y) {
                        const color =
                            pos.severity === "error"
                                ? chalk.hex(colors.error)
                                : chalk.hex(colors.info);

                        if (y < pos.y) {
                            char = pipe("up", "down");
                        } else {
                            char = pipe("up", "right");
                        }

                        char = color(char);
                    }
                }

                // check for text
                for (const pos of diagnosticPositions) {
                    if (
                        pos.y === y &&
                        x >= pos.x + 2 &&
                        x < pos.x + pos.text.length + 2
                    ) {
                        const textChar = pos.text[x - pos.x - 2];
                        const color =
                            pos.severity === "error"
                                ? chalk.hex(colors.error)
                                : chalk.hex(colors.info);

                        if (textChar) {
                            char = color(textChar);
                        } else {
                            char = " ";
                        }
                    }
                }

                content += char;
            }

            outputLines.push(content);
        }
    }

    return outputLines.join("\n");
}
