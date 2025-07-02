import { unwrap } from "@vortexjs/common";

export type Argument =
	| {
			type: "positional";
			optional: boolean;
			id: string;
	  }
	| {
			type: "string";
			optional: boolean;
			aliases: string[];
			id: string;
	  }
	| {
			type: "flag";
			id: string;
			aliases: string[];
	  };

export interface ArgsParser {
	strings: Record<string, string>;
	flags: string[];
	consumePositional(): string | undefined;
}

export interface RunnableCommand {
	runnable_impl: {
		handle(parser: ArgsParser): Promise<void> | void;
	};
}

export type BlankObject = {
	[key in never]: never;
};

export interface Command<Args extends BlankObject = BlankObject>
	extends RunnableCommand {
	data: {
		description?: string;
		arguments: Argument[];
		callback: (args: Args) => Promise<void> | void;
	};
	optional: {
		string<ID extends string>(
			id: ID,
			...aliases: string[]
		): Command<Args & { [K in ID]?: string }>;
		positional<ID extends string>(
			id: string,
		): Command<Args & { [K in ID]: string }>;
	};
	flag<ID extends string>(
		id: ID,
		...aliases: string[]
	): Command<Args & { [K in ID]: boolean }>;
	string<ID extends string>(
		id: ID,
		...aliases: string[]
	): Command<Args & { [K in ID]?: string }>;
	positional<ID extends string>(
		id: string,
	): Command<Args & { [K in ID]: string }>;
	impl(callback: (args: Args) => Promise<void> | void): Command<Args>;
}

export function cmd() {
	const self: Command = {
		runnable_impl: {
			async handle(parser) {
				const args: Record<string, any> = {};

				for (const arg of self.data.arguments) {
					if (arg.type === "positional") {
						const value = parser.consumePositional();

						if (value === undefined && !arg.optional) {
							throw new Error(
								`Missing required positidonal argument: ${arg.id}`,
							);
						}

						args[arg.id] = value;
					} else if (arg.type === "string") {
						let value: string | undefined = undefined;

						for (const alias of arg.aliases) {
							if (alias in parser.strings) {
								value = parser.strings[alias];
								break;
							}
						}

						if (value === undefined && !arg.optional) {
							throw new Error(
								`Missing required string argument: ${arg.id}`,
							);
						}

						args[arg.id] = value;
					} else if (arg.type === "flag") {
						args[arg.id] = arg.aliases.some((alias) =>
							parser.flags.includes(alias),
						);
					}
				}

				await self.data.callback(args as any);
			},
		},
		data: {
			description: undefined,
			arguments: [],
			callback(_args: any): Promise<void> | void {
				throw new Error("Function not implemented.");
			},
		},
		optional: {
			string(id, ...aliases) {
				self.data.arguments.push({
					type: "string",
					optional: true,
					id,
					aliases: [id, ...aliases],
				});

				return self;
			},
			positional(id) {
				self.data.arguments.push({
					type: "positional",
					optional: false,
					id,
				});

				return self as any;
			},
		},
		flag(id, ...aliases) {
			self.data.arguments.push({
				type: "flag",
				id,
				aliases: [id, ...aliases],
			});

			return self as any;
		},
		string(id, ...aliases) {
			self.data.arguments.push({
				type: "string",
				optional: false,
				id,
				aliases: [id, ...aliases],
			});

			return self;
		},
		positional(id) {
			self.data.arguments.push({
				type: "positional",
				optional: false,
				id,
			});

			return self as any;
		},
		impl(callback) {
			self.data.callback = callback;
			return self;
		},
	};
}

export function parseArgs(args: string[]) {
	const flags: string[] = [];
	const strings: Record<string, string> = {};
	const positional: string[] = [];

	for (let i = 0; i < args.length; i++) {
		const arg = unwrap(args[i]);

		if (arg.startsWith("--")) {
			if (arg.includes("=")) {
				const [key, value] = arg.slice(2).split("=", 2);
				strings[unwrap(key)] = unwrap(value);
			} else if (
				i < args.length - 1 &&
				!unwrap(args[i + 1]).startsWith("-")
			) {
				strings[arg.slice(2)] = unwrap(args[++i]);
			} else {
				flags.push(arg.slice(2));
			}
		} else if (arg.startsWith("-")) {
			flags.push(arg.slice(1));
		} else {
			positional.push(arg);
		}
	}

	return {
		flags,
		strings,
		consumePositional() {
			return positional.shift();
		},
	} as ArgsParser;
}
