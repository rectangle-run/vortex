import type { FileSink } from "bun";

export class ANSIWriter {
    buffer = "";

    constructor(public terminal: FileSink) { }

    csi() {
        this.write("\x1b[");
    }

    flush() {
        this.terminal.write(this.buffer);
        this.buffer = "";
    }

    write(text: string) {
        this.buffer += text;
    }

    moveTo(x: number, y: number) {
        this.csi();
        this.write(`${y + 1};${x + 1}H`);
    }

    setCursorVisible(visible: boolean) {
        this.csi();
        this.write(visible ? "?25h" : "?25l");
    };

    setBackground(color: string) {
        const { r, g, b } = Bun.color(color, "{rgb}")!;

        this.csi();
        this.write(`48;2;${r};${g};${b}m`);
    }

    setForeground(color: string) {
        const { r, g, b } = Bun.color(color, "{rgb}")!;

        this.csi();
        this.write(`38;2;${r};${g};${b}m`);
    }

    setItalic(italic: boolean) {
        this.csi();
        this.write(italic ? "3m" : "23m");
    }

    setBold(bold: boolean) {
        this.csi();
        this.write(bold ? "1m" : "22m");
    }

    setUnderline(underline: boolean) {
        this.csi();
        this.write(underline ? "4m" : "24m");
    }
}
