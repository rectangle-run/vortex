import symbols from "../tokens/symbols";
import { ANSIWriter } from "./ansi";

export interface Cell {
    text: string;
    background: string;
    foreground: string;
    bold: boolean;
    italic: boolean;
    underline: boolean;
}

export type BoxStyle = "outline-round" | "outline-square" | "background-square" | "none";

export class Canvas {
    constructor(public width: number, public height: number) {
        this.clipEndX = width;
        this.clipEndY = height;
        this.buffer = new Array(width * height).fill({
            text: " ",
            background: "black",
            foreground: "white",
            bold: false,
            italic: false,
            underline: false
        }).map(x => structuredClone(x));
    }

    put(x: number, y: number, cell: Cell) {
        if (x < this.clipStartX || x >= this.clipEndX || y <
            this.clipStartY || y >= this.clipEndY) {
            return;
        }

        const index = y * this.width + x;
        this.buffer[index]!.text = cell.text;
        if (cell.background !== "transparent") {
            this.buffer[index]!.background = cell.background;
        }
        this.buffer[index]!.bold = cell.bold;
        this.buffer[index]!.italic = cell.italic;
        this.buffer[index]!.underline = cell.underline;
        this.buffer[index]!.foreground = cell.foreground;
    }

    box(type: BoxStyle, x1: number, y1: number, x2: number, y2: number, color: string) {
        if (type === "none") {
            return;
        }

        for (let y = y1; y <= y2; y++) {
            for (let x = x1; x <= x2; x++) {
                if (type === "background-square") {
                    this.put(x, y, {
                        text: " ",
                        background: color,
                        foreground: "white",
                        bold: false,
                        italic: false,
                        underline: false
                    });
                    continue;
                }

                const vertical = x === x1 || x === x2;
                const horizontal = y === y1 || y === y2;

                const up = (y > y1) && vertical;
                const down = (y < y2) && vertical;
                const left = (x > x1) && horizontal;
                const right = (x < x2) && horizontal;
                const symbol = ({
                    "outline-round": symbols.outline.rounded,
                    "outline-square": symbols.outline.square,
                })[type]({
                    up,
                    down,
                    left,
                    right,
                });

                if (!(up || down || left || right)) {
                    if (type === "outline-round" || type === "outline-square") {
                        continue; // Skip the inner area for outlines
                    }

                    this.put(x, y, {
                        text: " ",
                        background: color,
                        foreground: "transparent",
                        bold: false,
                        italic: false,
                        underline: false,
                    });
                } else {
                    this.put(x, y, {
                        text: symbol,
                        background: "transparent",
                        foreground: color,
                        bold: false,
                        italic: false,
                        underline: false
                    });
                }
            }
        }
    }

    clip(x1: number, y1: number, x2: number, y2: number) {
        const prevClipStartX = this.clipStartX;
        const prevClipStartY = this.clipStartY;
        const prevClipEndX = this.clipEndX;
        const prevClipEndY = this.clipEndY;

        this.clipStartX = Math.max(0, x1, this.clipStartX);
        this.clipStartY = Math.max(0, y1, this.clipStartY);
        this.clipEndX = Math.min(this.width, x2, this.clipEndX);
        this.clipEndY = Math.min(this.height, y2, this.clipEndY);

        const self = this;

        return {
            [Symbol.dispose]() {
                self.clipStartX = prevClipStartX;
                self.clipStartY = prevClipStartY;
                self.clipEndX = prevClipEndX;
                self.clipEndY = prevClipEndY;
            }
        }
    }

    clipStartX = 0;
    clipStartY = 0;
    clipEndX = 0;
    clipEndY = 0;
    buffer: Cell[];
}

function getCellKey(cell: Cell) {
    return `${cell.text}-${cell.background}-${cell.foreground}`;
}

export class Renderer {
    currentCells: string[] = [];
    currentWidth = 0;
    currentHeight = 0;
    ansi = new ANSIWriter(Bun.stdout.writer());
    currentBGColor = "";
    currentFGColor = "";
    currentX = 0;
    currentY = 0;
    currentBold: boolean | undefined = undefined;
    currentUnderline: boolean | undefined = undefined;
    currentItalic: boolean | undefined = undefined;

    setBGColor(color: string) {
        if (this.currentBGColor === color) return;
        this.currentBGColor = color;
        this.ansi.setBackground(color);
    }

    setFGColor(color: string) {
        if (this.currentFGColor === color) return;
        this.currentFGColor = color;
        this.ansi.setForeground(color);
    }

    setPosition(x: number, y: number) {
        if (this.currentX === x && this.currentY === y) return;
        this.currentX = x;
        this.currentY = y;
        this.ansi.moveTo(x, y);
    }

    setBold(bold: boolean) {
        if (this.currentBold === bold) return;
        this.currentBold = bold;
        this.ansi.setBold(bold);
    }

    setItalic(italic: boolean) {
        if (this.currentItalic === italic) return;
        this.currentItalic = italic;
        this.ansi.setItalic(italic);
    }

    setUnderline(underline: boolean) {
        if (this.currentUnderline === underline) return;
        this.currentUnderline = underline;
        this.ansi.setUnderline(underline);
    }

    render(canvas: Canvas) {
        if (this.currentWidth !== canvas.width || this.currentHeight !== canvas.height) {
            this.currentCells = [];
        }

        this.currentX = -1;
        this.currentY = -1;
        this.currentBold = undefined;
        this.currentUnderline = undefined;
        this.currentItalic = undefined;

        this.currentWidth = canvas.width;
        this.currentHeight = canvas.height;

        for (let y = 0; y < canvas.height; y++) {
            for (let x = 0; x < canvas.width; x++) {
                const cell = canvas.buffer[y * canvas.width + x]!;
                const key = getCellKey(cell);

                if (this.currentCells[y * canvas.width + x] !== key) {
                    this.setPosition(x, y);
                    this.setBGColor(cell.background);
                    this.setFGColor(cell.foreground);
                    this.setItalic(cell.italic);
                    this.setBold(cell.bold);
                    this.setUnderline(cell.underline);
                    this.ansi.write(cell.text);
                    this.currentX++;
                    this.currentCells[y * canvas.width + x] = key;
                }
            }
        }
    }
}
