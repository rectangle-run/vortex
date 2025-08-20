import { parseFlags } from "./flags";

export async function parseArgs({
	commands,
	args,
	showHelp,
}: {
	commands: Command<any>[];
	args: string[];
	showHelp(): void;
}): Promise<void> {
	const flags = parseFlags(args);
	const debugLogging = false;

	if (
		"help" in flags.options ||
		"h" in flags.options ||
		flags.positionals[0] === "help"
	) {
		showHelp();
		return;
	}

	outer: for (const command of commands) {
		let ptr = 0;

		const args: Record<string, any> = {};

		debugLogging &&
			console.log(`Checking command: ${command.path.join(" ")}`);

		for (const combinator of command.combinators) {
			if (typeof combinator === "string") {
				if (ptr >= flags.positionals.length) {
					debugLogging &&
						console.warn(
							`command dq'ed due to lack of positionals`,
						);
					continue outer;
				}
				if (flags.positionals[ptr] !== combinator) {
					debugLogging &&
						console.warn(
							`command dq'ed due to positional mismatch: expected "${combinator}", got "${flags.positionals[ptr]}"`,
						);
					continue outer;
				}

				ptr++;

				continue;
			}

			if (combinator.type === "positional") {
				if (ptr >= flags.positionals.length) {
					debugLogging &&
						console.warn(
							`command dq'ed due to lack of positionals for combinator ${combinator.id}`,
						);
					continue outer;
				}
				args[combinator.id] = flags.positionals[ptr++];
			} else if (combinator.type === "stringOption") {
				if (
					!(combinator.id in flags.options) &&
					!("optional" in combinator)
				) {
					debugLogging &&
						console.warn(
							`command dq'ed due to lack of option for combinator ${combinator.id}`,
						);
					continue outer;
				}
				args[combinator.id] = flags.options[combinator.id] as
					| string
					| undefined;
			} else if (combinator.type === "booleanOption") {
				if (
					!(combinator.id in flags.options) &&
					!("optional" in combinator)
				) {
					debugLogging &&
						console.warn(
							`command dq'ed due to lack of option for combinator ${combinator.id}`,
						);
					continue outer;
				}
				args[combinator.id] = flags.options[combinator.id] === true;
			}
		}

		if (ptr < flags.positionals.length) {
			debugLogging &&
				console.warn(
					`command dq'ed due to excess positionals: ${flags.positionals.slice(ptr).join(", ")}`,
				);
			continue;
		}

		await command.impl(args);
		return;
	}

	showHelp();
}

export interface Command<T> {
	impl(args: T): Promise<void> | void;
	combinators: Combinator<string>[];
	path: string[];
}

export interface PositionalCombinator<ID extends string> {
	type: "positional";
	id: ID;
}

export interface StringOptionCombinator<ID extends string> {
	type: "stringOption";
	id: ID;
}

export interface BooleanOptionCombinator<ID extends string> {
	type: "booleanOption";
	id: ID;
}

export type OptionalCombinator<BaseCombinator extends Combinator<string>> =
	BaseCombinator & {
		optional: true;
	};

type InternalCombinator<ID extends string> =
	| PositionalCombinator<ID>
	| StringOptionCombinator<ID>
	| BooleanOptionCombinator<ID>;

export type Combinator<ID extends string> =
	| InternalCombinator<ID>
	| OptionalCombinator<InternalCombinator<ID>>
	| string;

export type InferArgEach<Item> = Item extends OptionalCombinator<infer Base>
	? Partial<InferArgEach<Base>>
	: Item extends PositionalCombinator<infer ID>
		? { [K in ID]: string }
		: Item extends StringOptionCombinator<infer ID>
			? { [K in ID]: string }
			: Item extends BooleanOptionCombinator<infer ID>
				? { [K in ID]: boolean }
				: never;

export type InferArgs<Combinators extends Combinator<string>[]> = {
	[K in keyof Combinators]: InferArgEach<Combinators[K]>;
}[number] extends infer U
	? (U extends any ? (x: U) => void : never) extends (x: infer I) => void
		? I
		: never
	: never;

export function command<Combinators extends Combinator<string>[]>(
	impl: (args: InferArgs<Combinators>) => Promise<void> | void,
	...combinators: Combinators
): Command<InferArgs<Combinators>> {
	return {
		impl,
		combinators,
		path: combinators.filter((c) => typeof c === "string"),
	};
}

export function positional<ID extends string>(
	id: ID,
): PositionalCombinator<ID> {
	return {
		type: "positional",
		id,
	};
}

export function stringOption<ID extends string>(
	id: ID,
): StringOptionCombinator<ID> {
	return {
		type: "stringOption",
		id,
	};
}

export function booleanOption<ID extends string>(
	id: ID,
): BooleanOptionCombinator<ID> {
	return {
		type: "booleanOption",
		id,
	};
}

export function optional<BaseCombinator extends Combinator<string>>(
	combinator: BaseCombinator,
): OptionalCombinator<BaseCombinator> {
	if (typeof combinator !== "object") {
		throw new Error("Cannot make a string combinator optional");
	}

	return {
		...combinator,
		optional: true,
	};
}
