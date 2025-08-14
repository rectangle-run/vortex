//
//    SKL - A one file library for efficient serialization
//

export type Identifier = ["identifier", string];

export type String = ["string", string];

export type Number = ["number", number];

export const keywords = {
	null: "Null",
	true: "True",
	false: "False",
	undefined: "Undefined",
} as const;

export const symbols = {
	"(": "LeftParenthesis",
	")": "RightParenthesis",
	"[": "LeftSquareBracket",
	"]": "RightSquareBracket",
	"{": "LeftCurlyBracket",
	"}": "RightCurlyBracket",
	",": "Comma",
	":": "Colon",
	";": "Semicolon",
	".": "Dot",
	"=": "Equals",
	"+": "Plus",
	"-": "Minus",
	"*": "Asterisk",
	"/": "Slash",
	"%": "Percent",
	"!": "ExclamationMark",
	"<": "LeftAngularBracket",
	">": "RightAngularBracket",
} as const;

export type Keyword = ["keyword", (typeof keywords)[keyof typeof keywords]];

export type Symbol = ["symbol", (typeof symbols)[keyof typeof symbols]];

export type Token = Identifier | String | Number | Keyword | Symbol;

export function isWhitespace(char: string) {
	return char === " " || char === "\t" || char === "\n" || char === "\r";
}

export function isAlphabetic(char: string) {
	return (
		(char >= "a" && char <= "z") ||
		(char >= "A" && char <= "Z") ||
		char === "_"
	);
}
export function isNumeric(char: string) {
	return char >= "0" && char <= "9";
}

export function isAlphanumeric(char: string) {
	return isAlphabetic(char) || isNumeric(char);
}

export function* lex(str: string): Generator<Token, any, any> {
	let i = 0;

	const peek = () => str[i] ?? "";
	const read = () => str[i++] ?? "";
	const seek = () => {
		i++;
	};

	while (i < str.length) {
		const indicator = peek();

		if (isWhitespace(indicator)) {
			seek();
			continue;
		}

		if (isAlphabetic(indicator)) {
			let str = "";

			while (isAlphanumeric(peek())) {
				str += read();
			}

			if (str in keywords) {
				yield ["keyword", keywords[str as keyof typeof keywords]];
			} else {
				yield ["identifier", str];
			}

			continue;
		}

		if (isNumeric(indicator)) {
			let numStr = "";

			while (isNumeric(peek()) || peek() === ".") {
				numStr += read();
			}

			yield ["number", Number(numStr)];

			continue;
		}

		if (indicator === '"' || indicator === "'" || indicator === "`") {
			const quote = read();
			let acc = "";

			while (peek() !== quote && i < str.length) {
				const char = read();

				if (char === "\\") {
					// Handle escape sequences
					const nextChar = peek();
					const escapers = {
						n: "\n",
						t: "\t",
						r: "\r",
						b: "\b",
						f: "\f",
						v: "\v",
						"\\": "\\",
					};
					if (nextChar in escapers) {
						acc += escapers[nextChar as keyof typeof escapers];
						seek(); // consume the escape character
					} else if (nextChar === quote) {
						acc += quote; // handle escaped quote
						seek(); // consume the closing quote
					} else {
						acc += char; // just add the backslash if no valid escape sequence
					}
				} else {
					acc += char;
				}
			}

			if (peek() === quote) {
				seek(); // consume the closing quote
			}

			yield ["string", acc];

			continue;
		}

		if (indicator in symbols) {
			yield ["symbol", symbols[indicator as keyof typeof symbols]];
			seek(); // consume the symbol
			continue;
		}

		// If we reach here, it means we encountered an unknown character
		throw new Error(`Unknown character: '${indicator}' at position ${i}`);
	}
}

export interface ParseContext {
	tokens: Token[];
	current: number;
}

export function parseContext_create(tokens: Token[]): ParseContext {
	return {
		tokens,
		current: 0,
	};
}

export function parseContext_next(context: ParseContext): Token | null {
	if (context.current >= context.tokens.length) {
		return null; // No more tokens
	}
	return context.tokens[context.current++] ?? null;
}

export function parseContext_peek(context: ParseContext): Token | null {
	if (context.current >= context.tokens.length) {
		return null; // No more tokens
	}
	return context.tokens[context.current] ?? null;
}

export function parseContext_read(context: ParseContext): Token | null {
	const token = parseContext_peek(context);
	if (token !== null) {
		context.current++;
	}
	return token;
}

export function parseContext_readObj(context: ParseContext) {
	let indicator = parseContext_read(context);

	if (indicator === null) {
		throw new Error("Unexpected end of input");
	}

	if (indicator[0] === "number") {
		return indicator[1];
	}

	if (indicator[0] === "string") {
		return indicator[1];
	}

	if (indicator[0] === "keyword") {
		if (indicator[1] === keywords.null) {
			return null;
		}
		if (indicator[1] === keywords.undefined) {
			return undefined;
		}
		if (indicator[1] === keywords.true) {
			return true;
		}
		if (indicator[1] === keywords.false) {
			return false;
		}
		throw new Error(`Unexpected keyword: ${indicator[1]}`);
	}

	let clazz = null;

	if (indicator[0] === "identifier") {
		clazz = indicator[1];
		indicator = parseContext_read(context);
	}

	if (indicator === null) {
		throw new Error("Unexpected end of input (after reading class)");
	}

	if (indicator[0] === "symbol" && indicator[1] === "LeftParenthesis") {
		const kv: Record<string, unknown> = {};

		while (true) {
			const key = parseContext_read(context);

			if (key === null) {
				throw new Error(
					"Unexpected end of input (when trying to read key)",
				);
			}

			if (key[0] === "symbol" && key[1] === "RightParenthesis") {
				break; // End of object
			}

			if (key[0] !== "identifier" && key[0] !== "string") {
				throw new Error(`Expected identifier or string, got ${key[0]}`);
			}

			const equals = parseContext_read(context);

			if (
				equals === null ||
				equals[0] !== "symbol" ||
				equals[1] !== "Equals"
			) {
				throw new Error(
					`Expected '=', got ${equals ? equals[0] : "end of input"}`,
				);
			}

			const keyName = key[1];

			const value = parseContext_readObj(context);

			kv[keyName] = value;
		}

		if (clazz !== null) {
			if (clazz === "date") {
				return new Date(kv.unix as number);
			}
			if (clazz === "set") {
				return new Set(kv.items as unknown[]);
			}
			if (clazz === "map") {
				const map = new Map<unknown, unknown>();
				for (const [key, value] of kv.entries as [unknown, unknown][]) {
					map.set(key, value);
				}
				return map;
			}
			throw new Error(`Unknown class: ${clazz}`);
		}

		return kv;
	}

	if (indicator[0] === "symbol" && indicator[1] === "LeftSquareBracket") {
		const arr: unknown[] = [];

		while (true) {
			if (
				parseContext_peek(context)?.[0] === "symbol" &&
				parseContext_peek(context)?.[1] === "RightSquareBracket"
			) {
				parseContext_read(context); // consume the closing bracket
				break; // End of array
			}

			const value = parseContext_readObj(context);

			arr.push(value);
		}

		return arr;
	}
}

export function parse(source: string): unknown {
	const tokens = [...lex(source)];

	const context = parseContext_create(tokens);

	const result = parseContext_readObj(context);

	if (context.current < tokens.length) {
		throw new Error(
			`Unexpected tokens at the end: ${tokens
				.slice(context.current)
				.map((t) => t[0])
				.join(", ")}`,
		);
	}

	return result;
}

export interface SerializeContext {
	output: string;
	indentLevel: number;
	minified: boolean;
}

export function serializeContext_create(): SerializeContext {
	return {
		output: "",
		indentLevel: 0,
		minified: false,
	};
}

export function serializeContext_indent(context: SerializeContext): void {
	context.indentLevel++;
}

export function serializeContext_dedent(context: SerializeContext): void {
	context.indentLevel = Math.max(0, context.indentLevel - 1);
}

export function serializeContext_newline(context: SerializeContext): void {
	if (context.minified) {
		serializeContext_write(context, " ");
		return;
	}
	serializeContext_write(context, "\n");
	serializeContext_write(context, "    ".repeat(context.indentLevel));
}

export function serializeContext_write(
	context: SerializeContext,
	str: string,
): void {
	context.output += str;
}

export function escapeStr(str: string): string {
	let minimumLength = Number.POSITIVE_INFINITY;
	let result = "";

	for (const container of [`"`, `'`, "`"]) {
		let current = "";

		current += container;

		for (const char of str) {
			if (char === container) {
				current += `\\${char}`;
			} else if (char === "\\") {
				current += "\\\\";
			} else if (char === "\n") {
				current += "\\n";
			} else if (char === "\t") {
				current += "\\t";
			} else if (char === "\r") {
				current += "\\r";
			} else {
				current += char;
			}
		}

		current += container;

		if (current.length < minimumLength) {
			minimumLength = current.length;
			result = current;
		}
	}

	return result;
}

export function serializeContext_writeObject(
	context: SerializeContext,
	obj: unknown,
) {
	if (typeof obj === "number") {
		serializeContext_write(context, obj.toString());
		return;
	}
	if (typeof obj === "string") {
		serializeContext_write(context, escapeStr(obj)); // Use JSON.stringify to handle escaping
		return;
	}
	if (obj === null) {
		serializeContext_write(context, "null");
		return;
	}
	if (obj === undefined) {
		serializeContext_write(context, "undefined");
		return;
	}
	if (typeof obj === "boolean") {
		serializeContext_write(context, obj ? "true" : "false");
		return;
	}
	if (Array.isArray(obj)) {
		serializeContext_write(context, "[");
		serializeContext_indent(context);
		for (const item of obj) {
			serializeContext_newline(context);
			serializeContext_writeObject(context, item);
		}
		serializeContext_dedent(context);
		serializeContext_newline(context);
		serializeContext_write(context, "]");
		return;
	}
	if (obj instanceof Date) {
		serializeContext_write(context, `date(unix=${obj.getTime()})`);
	}
	if (obj instanceof Set) {
		serializeContext_write(context, "set(");
		serializeContext_indent(context);
		serializeContext_newline(context);
		serializeContext_write(context, "items = ");
		serializeContext_writeObject(context, obj.values());
		serializeContext_dedent(context);
		serializeContext_newline(context);
		serializeContext_write(context, ")");
	}
	if (obj instanceof Map) {
		serializeContext_write(context, "map(");
		serializeContext_indent(context);
		serializeContext_newline(context);
		serializeContext_write(context, "entries = ");
		serializeContext_writeObject(context, obj.entries());
		serializeContext_dedent(context);
		serializeContext_newline(context);
		serializeContext_write(context, ")");
	}
	if (typeof obj === "object") {
		serializeContext_write(context, "(");
		serializeContext_indent(context);
		for (const [key, value] of Object.entries(obj)) {
			serializeContext_newline(context);
			if ([...key].every(isAlphabetic)) {
				serializeContext_write(context, `${key} = `);
			} else {
				serializeContext_write(context, `${escapeStr(key)} = `);
			}
			serializeContext_writeObject(context, value);
		}
		serializeContext_dedent(context);
		serializeContext_newline(context);
		serializeContext_write(context, ")");
		return;
	}
	throw new Error(`Unsupported type for serialization: ${typeof obj}`);
}

export function serialize(obj: unknown, opts?: { minified?: boolean }): string {
	const context = serializeContext_create();

	const minified = opts?.minified ?? false;

	context.minified = minified;

	serializeContext_writeObject(context, obj);
	return context.output.trim();
}

export const stringify = serialize;
