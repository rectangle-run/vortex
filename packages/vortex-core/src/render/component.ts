import { Lifetime } from "../lifetime";
import { unwrap } from "../utils";

export class Component {
	static rendering: Component | null = null;

	lifetime = new Lifetime();

	startRendering() {
		if (Component.rendering) {
			throw new Error("A component is already being rendered.");
		}

		Component.rendering = this;

		const self = this;

		return {
			[Symbol.dispose]() {
				if (Component.rendering !== self) {
					throw new Error("This component is not currently being rendered.");
				}

				Component.rendering = null;
			},
		};
	}
}

export function useComponent() {
	return unwrap(
		Component.rendering,
		"Hooks can only be called whilst rendering a component.",
	);
}
