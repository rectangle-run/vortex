import type { FileSink } from "bun";

export class ANSIWriter {
    constructor(public terminal: FileSink) { }

    csi() {
        this.terminal.write("\x1b[");
    }

    write(text: string) {
        this.terminal.write(text);
    }

    moveTo(x: number, y: number) {
        this.csi();
        this.terminal.write(`${y + 1};${x + 1}H`);
    }

    setBackground(color: string) {
        const { r, g, b } = Bun.color(color, "{rgb}")!;

        this.csi();
        this.terminal.write(`48;2;${r};${g};${b}m`);
    }

    setForeground(color: string) {
        const { r, g, b } = Bun.color(color, "{rgb}")!;

        this.csi();
        this.terminal.write(`38;2;${r};${g};${b}m`);
    }

    setItalic(italic: boolean) {
        this.csi();
        this.terminal.write(italic ? "3m" : "23m");
    }

    setBold(bold: boolean) {
        this.csi();
        this.terminal.write(bold ? "1m" : "22m");
    }

    setUnderline(underline: boolean) {
        this.csi();
        this.terminal.write(underline ? "4m" : "24m");
    }
}
