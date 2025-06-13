import { unwrap } from "../utils";

export interface LocatedError {
	message: DevMarkup;
	location: SourceRange;
}

export interface SourceRange {
	start: number;
	end: number;
	filename: string;
}

export interface ErrorCollector {
	add(error: LocatedError): void;
	addNamed(subName: string, content: ErrorCollector): void;
	removeNamed(subName: string): void;

	errors: LocatedError[];
}

export function createErrorCollector(): ErrorCollector {
	const errors: LocatedError[] = [];
	const namedErrors = new Map<string, ErrorCollector>();

	return {
		add(error: LocatedError): void {
			errors.push(error);
		},
		addNamed(subName: string, content: ErrorCollector): void {
			namedErrors.set(subName, content);
		},
		removeNamed(subName: string): void {
			namedErrors.delete(subName);
		},
		get errors(): LocatedError[] {
			return errors.concat(
				Array.from(namedErrors.values()).flatMap((e) => e.errors),
			);
		},
	};
}

export type DevMarkup =
	| {
			type: "text";
			value: string;
	  }
	| {
			type: "reference";
			referencedCode: SourceRange;
			referencedLabel: string;
			content: DevMarkup;
	  }
	| {
			type: "fragment";
			children: DevMarkup[];
	  };

export const mk = {
	normalizeRest(...props: (DevMarkup | string)[]): DevMarkup {
		const asNormalized = props.map((p) => {
			if (typeof p === "string") {
				return this.text(p);
			}
			return p;
		});

		if (props.length === 1) {
			return unwrap(asNormalized[0]);
		}

		return { type: "fragment", children: asNormalized };
	},
	get fmt() {
		return this.normalizeRest;
	},
	text(value: string): DevMarkup {
		return { type: "text", value };
	},
	reference(
		referencedCode: SourceRange,
		referencedLabel: string,
		...content: DevMarkup[]
	): DevMarkup {
		return {
			type: "reference",
			referencedCode,
			referencedLabel,
			content: this.normalizeRest(...content),
		};
	},
};
