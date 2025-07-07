import {
	derived,
	getImmediateValue,
	type Lifetime,
	type Signal,
	type Store,
	useState,
} from "@vortexjs/core";
import { diagram, importRichText } from "../cli/diagram";
import type { Printer } from "../cli/printer";

export interface WormholeError {
	message: string;
	path: string;
	from: number;
	to: number;
	hints: {
		from: number;
		to: number;
		message: string;
	}[];
}

export interface ErrorCollection {
	errors: Signal<WormholeError[]>;
}

export interface UpdatableErrorCollection extends ErrorCollection {
	update(errors: WormholeError[]): void;
}

export namespace ErrorCollection {
	export function composite(lt: Lifetime, ...providers: ErrorCollection[]) {
		return {
			errors: derived(
				(get) => {
					let errors: WormholeError[] = [];

					for (const provider of providers) {
						errors = errors.concat(get(provider.errors));
					}

					return errors;
				},
				undefined,
				lt,
			),
		};
	}

	export function updatable(): UpdatableErrorCollection {
		const errors: Store<WormholeError[]> = useState([]);

		return {
			errors,
			update(newErrors: WormholeError[]) {
				errors.set(newErrors);
			},
		};
	}
}

export async function showErrors(
	collection: ErrorCollection,
	printer: Printer,
) {
	const errors = getImmediateValue(collection.errors);

	if (errors.length === 0) {
		return;
	}

	const involvedFiles = new Set<string>();

	for (const error of errors) {
		involvedFiles.add(error.path);
	}

	for (const file of involvedFiles) {
		const content = await Bun.file(file).text();
		const diagnostics: {
			start: number;
			end: number;
			message: string;
			severity: "error" | "info";
		}[] = [];

		for (const error of errors) {
			if (error.path !== file) {
				continue;
			}

			diagnostics.push({
				start: error.from,
				end: error.to,
				message: error.message,
				severity: "error",
			});

			for (const hint of error.hints) {
				diagnostics.push({
					start: hint.from,
					end: hint.to,
					message: hint.message,
					severity: "info",
				});
			}
		}

		const highlighted = await importRichText(content);

		printer.gap();

		printer.log(`${" ".repeat(7) + file}\n`);

		printer.log(
			diagram({
				diagnostics: diagnostics,
				text: highlighted.text,
				logicalLocations: highlighted.logicalLocations,
			}),
		);

		printer.gap();
	}
}
