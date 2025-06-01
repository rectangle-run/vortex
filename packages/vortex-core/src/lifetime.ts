export class Lifetime {
	private closeSubscribers: (() => void)[] = [];

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
