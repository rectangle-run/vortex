import {
	Lifetime,
	awaited,
	flatten,
	useDerived,
	useEffect,
} from "@vortexjs/core";
import chalk from "chalk";
import { createPrinter } from "../cli/printer";
import type { State } from "../state";
import { showErrors } from "./errors";
import { tasks } from "./tasks";

export function informationBoard(state: State) {
	const lt = state.lt;
	using _hlt = Lifetime.changeHookLifetime(lt);

	const lines = useDerived(async (get) => {
		const printer = createPrinter();

		using _p = printer.indent();

		printer.gap();
		printer.log(chalk.hex("#3b82f6")("wormhole"));
		printer.gap();

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

		const errors = get(state.errors);

		if (errors.length > 0) {
			using _g = printer.group(`${errors.length} Errors`);

			await showErrors(state, printer);
		}

		return printer.lines;
	});

	const awaitedLines = flatten(useDerived((get) => awaited(get(lines))));

	useEffect((get) => {
		const lines = get(awaitedLines);

		if (!lines) return;

		//console.clear();

		for (const line of lines) {
			console.log(line);
		}
	});
}
