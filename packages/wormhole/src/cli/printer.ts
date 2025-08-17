import { colors } from "@vortexjs/cli";
import chalk from "chalk";

export function createPrinter() {
	const indent: string[] = [];
	let lastWasGap = false;
	const lines: string[] = [];

	return {
		gap() {
			if (lastWasGap) return;

			lastWasGap = true;
			lines.push("");
		},
		log(text: string) {
			lastWasGap = false;
			for (const line of text.split("\n")) {
				const indentedLine = indent.join("") + line;
				lines.push(indentedLine);
			}
		},
		show() {
			for (const line of lines) {
				console.log(line);
			}
		},
		indent() {
			indent.push("    ");

			return {
				close() {
					indent.pop();
				},
				[Symbol.dispose]() {
					this.close();
				},
			};
		},
		group(heading: string, styled = true) {
			this.gap();
			this.log(
				styled ? chalk.hex(Bun.color(colors.blue[400], "hex")!).bold(`# ${heading}`) : heading,
			);
			this.gap();

			return this.indent();
		},
		get lines() {
			return lines;
		},
	};
}

export type Printer = ReturnType<typeof createPrinter>;
