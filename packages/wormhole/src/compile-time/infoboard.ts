import { Lifetime, useEffect } from "@vortexjs/core";
import chalk from "chalk";
import { tasks } from "./tasks";

function createPrinter() {
	const indent: string[] = [];

	return {
		log(text: string) {
			for (const line of text.split("\n")) {
				const indentedLine = indent.join("") + line;
				console.log(indentedLine);
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
			this.log(
				styled ? chalk.hex("#34d399").bold(`# ${heading}`) : heading,
			);

			return this.indent();
		},
	};
}

export function informationBoard(lt: Lifetime) {
	using _hlt = Lifetime.changeHookLifetime(lt);

	useEffect((get) => {
		//console.clear();

		const printer = createPrinter();

		using _p = printer.indent();

		printer.log("");
		printer.log(chalk.hex("#3b82f6")("wormhole"));
		printer.log("");

		{
			using _g = printer.group("Tasks");
			const currentTasks = get(tasks);

			if (currentTasks.length === 0) {
				printer.log("No tasks available.");
			} else {
				for (const task of currentTasks) {
					printer.log(`- ${task.name}`);
				}
			}
		}
	});
}
