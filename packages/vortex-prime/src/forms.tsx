import {
	type SignalOrValue,
	type Store,
	getImmediateValue,
	useDerived,
} from "@vortexjs/core";
import type { ElementProps } from "@vortexjs/dom";
import { useId } from "./id";

export function useCheckbox({
	label,
	checked,
}: {
	label: SignalOrValue<string>;
	checked: Store<boolean>;
}) {
	const labelId = useId();
	const checkboxId = useId();

	return {
		label: {
			props: {
				htmlFor: checkboxId,
				id: labelId,
				children: label,
			} satisfies ElementProps<HTMLLabelElement>,
		},
		checkbox: {
			props: {
				role: "checkbox",
				ariaChecked: useDerived((get) => (get(checked) ? "true" : "false")),
				tabIndex: 0,
				"on:click": (event: MouseEvent) => {
					checked.set(getImmediateValue(checked));
				},
				"on:keydown": (event: KeyboardEvent) => {
					if (event.key === "Enter" || event.key === " ") {
						checked.set(getImmediateValue(checked));
						event.preventDefault();
					}
				},
				id: checkboxId,
			} satisfies ElementProps<HTMLInputElement>,
		},
	};
}

export function useTextInput({
	label,
	value,
}: {
	label: SignalOrValue<string>;
	value: Store<string>;
}) {
	const labelId = useId();
	const inputId = useId();

	return {
		label: {
			props: {
				htmlFor: inputId,
				id: labelId,
				children: label,
			} satisfies ElementProps<HTMLLabelElement>,
		},
		input: {
			props: {
				type: "text",
				"bind:value": value,
				id: inputId,
			} satisfies ElementProps<HTMLInputElement>,
		},
	};
}
