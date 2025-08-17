import { unwrap } from "@vortexjs/common";

export interface Flags {
	positionals: string[];
	options: Record<string, string | boolean>;
}

export function parseFlags(args: string[]): Flags {
	let p = 0;

	const flags: Flags = {
		positionals: [],
		options: {},
	};

	while (p < args.length) {
		const arg = unwrap(args[p]);
		if (arg.startsWith("--")) {
			if (arg.includes("=")) {
				const [key, value] = arg.slice(2).split("=");
				flags.options[unwrap(key)] = unwrap(value);
			} else {
				const key = arg.slice(2);
				const value = args[p + 1];
				if (value && !value.startsWith("-")) {
					flags.options[key] = value;
					p++;
				} else {
					flags.options[key] = true;
				}
			}
		} else if (arg.startsWith("-")) {
			const key = arg.slice(1);
			flags.options[key] = true;
		} else {
			flags.positionals.push(arg);
		}
		p++;
	}

	return flags;
}
