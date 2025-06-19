import { getUltraglobalReference } from "@vortexjs/common";

class InternalLifetime {
	#closeSubscribers: (() => void)[] = [];

	static hookLifetime: InternalLifetime | null = null;

	static changeHookLifetime(lifetime: InternalLifetime | null) {
		const prev = InternalLifetime.hookLifetime;

		InternalLifetime.hookLifetime = lifetime;

		return {
			reset() {
				InternalLifetime.hookLifetime = prev;
			},
			[Symbol.dispose]() {
				InternalLifetime.hookLifetime = prev;
			},
		};
	}

	close() {
		for (const subscriber of this.#closeSubscribers) {
			subscriber();
		}
		this.#closeSubscribers = [];
	}

	onClosed(callback: () => void) {
		this.#closeSubscribers.push(callback);
		return this;
	}

	cascadesFrom(lifetime: InternalLifetime) {
		lifetime.onClosed(() => {
			this.close();
		});
		return this;
	}

	[Symbol.dispose] = this.close;
}

export class Lifetime extends getUltraglobalReference(
	{
		package: "@vortexjs/core",
		name: "Lifetime",
	},
	InternalLifetime,
) {}

export function useHookLifetime(): Lifetime {
	if (Lifetime.hookLifetime === null) {
		throw new Error("No hook lifetime available");
	}
	return Lifetime.hookLifetime;
}
