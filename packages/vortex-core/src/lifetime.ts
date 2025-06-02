export class Lifetime {
	private closeSubscribers: (() => void)[] = [];

	static hookLifetime: Lifetime | null = null;

	static changeHookLifetime(lifetime: Lifetime | null) {
		const prev = Lifetime.hookLifetime;

		Lifetime.hookLifetime = lifetime;

		return {
			reset() {
				Lifetime.hookLifetime = prev;
			},
			[Symbol.dispose]() {
				Lifetime.hookLifetime = prev;
			},
		};
	}

	close() {
		for (const subscriber of this.closeSubscribers) {
			subscriber();
		}
		this.closeSubscribers = [];
	}

	onClosed(callback: () => void) {
		this.closeSubscribers.push(callback);
		return this;
	}

	cascadesFrom(lifetime: Lifetime) {
		lifetime.onClosed(() => {
			this.close();
		});
		return this;
	}

	[Symbol.dispose] = this.close;
}

export function useHookLifetime(): Lifetime {
	if (Lifetime.hookLifetime === null) {
		throw new Error("No hook lifetime available");
	}
	return Lifetime.hookLifetime;
}
