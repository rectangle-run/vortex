import {
	type SignalOrValue,
	type Store,
	getImmediateValue,
	useDerived,
} from "@vortexjs/core";

/**
 * Creates an accessible radio group component.
 *
 * This hook provides configuration for a group of radio buttons including a label and options.
 * Each radio button is associated with a unique identifier and updates the provided store when selected.
 *
 * @example
 * const selected = useState("option1");
 * const radioGroup = useRadioGroup({
 *   label: "Choose an option:",
 *   options: ["option1", "option2", "option3"],
 *   selected,
 *   name: "example",
 * });
 *
 * // In a component:
 * <div {...radioGroup.group.props}>
 *   <label {...radioGroup.label.props}></label>
 *   {radioGroup.options.map(option => (
 *     <>
 *       <input {...option.props} />
 *       <label {...option.labelProps}></label>
 *     </>
 *   ))}
 * </div>
 *
 * @param {Object} params - Configuration object for the radio group.
 * @param {SignalOrValue<string>} params.label - The label for the radio group.
 * @param {T[]} params.options - An array of option strings.
 * @param {Store<T>} params.selected - A store that holds the currently selected option.
 * @param {string} [params.name] - Optional name attribute for the radio inputs.
 * @returns {Object} An object containing properties for the group container, label, and mapped radio options.
 */
export function useRadioGroup<T extends string>({
	label,
	options,
	selected,
	name,
}: {
	label: SignalOrValue<string>;
	options: T[];
	selected: Store<T>;
	name?: string;
}) {
	const groupId = useId();
	return {
		group: {
			props: {
				role: "radiogroup",
			},
		} as { props: Record<string, unknown> },
		label: {
			props: {
				id: groupId,
				children: label,
			},
		} as { props: Record<string, unknown> },
		options: options.map((option) => {
			const id = useId();
			return {
				props: {
					type: "radio",
					name,
					id,
					value: option,
				},
				labelProps: {
					htmlFor: id,
					children: option,
				},
			} as {
				props: Record<string, unknown>;
				labelProps: Record<string, unknown>;
			};
		}),
	};
}

/**
 * Creates an accessible switch component.
 *
 * This hook returns properties for a switch component that behaves like a toggle button
 * with proper roles and ARIA attributes for accessibility.
 *
 * @example
 * const checked = useState(false);
 * const switchApi = useSwitch({ label: "Enable feature", checked });
 *
 * // In a component:
 * <label {...switchApi.label.props}></label>
 * <button {...switchApi.switch.props}></button>
 *
 * @param {Object} params - Configuration object for the switch.
 * @param {SignalOrValue<string>} params.label - The label for the switch.
 * @param {Store<boolean>} params.checked - A store that holds the current state of the switch.
 * @returns {Object} An object containing properties for the switch label and the interactive switch button.
 */
export function useSwitch({
	label,
	checked,
}: {
	label: SignalOrValue<string>;
	checked: Store<boolean>;
}) {
	const labelId = useId();
	const switchId = useId();
	return {
		label: {
			props: {
				htmlFor: switchId,
				id: labelId,
				children: label,
			},
		} as { props: Record<string, unknown> },
		switch: {
			props: {
				role: "switch",
				tabIndex: 0,
				id: switchId,
				ariaChecked: useDerived((get) =>
					get(checked) ? "true" : "false",
				),
			},
		} as { props: Record<string, unknown> },
	};
}

/**
 * Creates an accessible text area component.
 *
 * This hook provides configuration for a text area input, along with an associated label.
 *
 * @example
 * const textValue = useState("");
 * const textAreaApi = useTextArea({ label: "Description", value: textValue });
 *
 * // In a component:
 * <label {...textAreaApi.label.props}></label>
 * <textarea {...textAreaApi.textarea.props}></textarea>
 *
 * @param {Object} params - Configuration object for the text area.
 * @param {SignalOrValue<string>} params.label - The label for the text area.
 * @param {Store<string>} params.value - A store that holds the current text value.
 * @returns {Object} An object containing the label and text area properties.
 */
export function useTextArea({
	label,
	value,
}: {
	label: SignalOrValue<string>;
	value: Store<string>;
}) {
	const labelId = useId();
	const areaId = useId();
	return {
		label: {
			props: {
				htmlFor: areaId,
				id: labelId,
				children: label,
			},
		} as { props: Record<string, unknown> },
		textarea: {
			props: {
				"bind:value": value,
				id: areaId,
				rows: 3,
			},
		} as { props: Record<string, unknown> },
	};
}

/**
 * Creates an accessible select (dropdown) component.
 *
 * This hook returns configuration for a select input with an associated label and dynamically generated options.
 *
 * @example
 * const selectedOption = useState("option1");
 * const selectApi = useSelect({
 *   label: "Choose an option:",
 *   options: ["option1", "option2", "option3"],
 *   selected: selectedOption,
 * });
 *
 * // In a component:
 * <label {...selectApi.label.props}></label>
 * <select {...selectApi.select.props}>
 *   {selectApi.options.map(option => (
 *     <option {...option.props}>{option.props.children}</option>
 *   ))}
 * </select>
 *
 * @param {Object} params - Configuration object for the select input.
 * @param {SignalOrValue<string>} params.label - The label for the select input.
 * @param {T[]} params.options - An array of option strings.
 * @param {Store<T>} params.selected - A store that holds the currently selected option.
 * @returns {Object} An object containing properties for the label, select input, and option elements.
 */
export function useSelect<T extends string>({
	label,
	options,
	selected,
}: {
	label: SignalOrValue<string>;
	options: T[];
	selected: Store<T>;
}) {
	const labelId = useId();
	const selectId = useId();
	return {
		label: {
			props: {
				htmlFor: selectId,
				id: labelId,
				children: label,
			},
		} as { props: Record<string, unknown> },
		select: {
			props: {
				id: selectId,
				"bind:value": selected,
			},
		} as { props: Record<string, unknown> },
		options: options.map((option) => ({
			props: {
				value: option,
				children: option,
				"on:click": () => {
					selected.set(option);
				},
			},
		})) as { props: Record<string, unknown> }[],
	};
}

/**
 * Creates an accessible slider (range input) component.
 *
 * This hook returns configuration for a slider component, including an associated label.
 * The slider is configured with minimum, maximum, and step values.
 *
 * @example
 * const sliderValue = useState(50);
 * const sliderApi = useSlider({ label: "Volume", value: sliderValue, min: 0, max: 100, step: 1 });
 *
 * // In a component:
 * <label {...sliderApi.label.props}></label>
 * <input {...sliderApi.input.props} />
 *
 * @param {Object} params - Configuration object for the slider.
 * @param {SignalOrValue<string>} params.label - The label for the slider.
 * @param {Store<number>} params.value - A store holding the slider's current value.
 * @param {number} [params.min=0] - The minimum value for the slider.
 * @param {number} [params.max=100] - The maximum value for the slider.
 * @param {number} [params.step=1] - The step increment for the slider.
 * @returns {Object} An object containing properties for the slider label and input element.
 */
export function useSlider({
	label,
	value,
	min = 0,
	max = 100,
	step = 1,
}: {
	label: SignalOrValue<string>;
	value: Store<number>;
	min?: number;
	max?: number;
	step?: number;
}) {
	const labelId = useId();
	const sliderId = useId();
	return {
		label: {
			props: {
				htmlFor: sliderId,
				id: labelId,
				children: label,
			},
		} as { props: Record<string, unknown> },
		input: {
			props: {
				type: "range",
				id: sliderId,
				min: String(min),
				max: String(max),
				step: String(step),
				role: "slider",
				"bind:value": value,
			},
		} as { props: Record<string, unknown> },
	};
}

/**
 * Creates an accessible toggle button component.
 *
 * This hook returns configuration for a toggle button with an ARIA attribute indicating its pressed state.
 * It updates the provided store with the toggled value when clicked.
 *
 * @example
 * const pressed = useState(false);
 * const toggleApi = useToggle({ label: "Toggle", pressed });
 *
 * // In a component:
 * <button {...toggleApi.button.props} onClick={toggleApi.button["on:click"]}>
 *   {toggleApi.button.props.children}
 * </button>
 *
 * @param {Object} params - Configuration object for the toggle button.
 * @param {SignalOrValue<string>} params.label - The label displayed on the button.
 * @param {Store<boolean>} params.pressed - A store representing whether the toggle is active.
 * @returns {Object} An object containing properties for the toggle button.
 */
export function useToggle({
	label,
	pressed,
}: {
	label: SignalOrValue<string>;
	pressed: Store<boolean>;
}) {
	const toggleId = useId();
	return {
		button: {
			props: {
				id: toggleId,
				role: "button",
				tabIndex: 0,
				children: label,
				ariaPressed: useDerived((get) =>
					get(pressed) ? "true" : "false",
				),
				"on:click": () => {
					pressed.set(!getImmediateValue(pressed));
				},
			},
		} as { props: Record<string, unknown> },
	};
}
import { useId } from "./id";

/**
 * Creates an accessible checkbox component.
 *
 * This hook returns configuration for a checkbox input along with an associated label.
 * The checkbox's checked state is bound to the provided store.
 *
 * @example
 * const checked = useState(false);
 * const checkboxApi = useCheckbox({ label: "Accept Terms", checked });
 *
 * // In a component:
 * <label {...checkboxApi.label.props}></label>
 * <input {...checkboxApi.checkbox.props} />
 *
 * @param {Object} params - Configuration object for the checkbox.
 * @param {SignalOrValue<string>} params.label - The label for the checkbox.
 * @param {Store<boolean>} params.checked - A store representing whether the checkbox is checked.
 * @returns {Object} An object containing properties for the checkbox label and input element.
 */
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
			},
		} as { props: Record<string, unknown> },
		checkbox: {
			props: {
				role: "checkbox",
				tabIndex: 0,
				id: checkboxId,
				"bind:checked": checked,
			},
		} as { props: Record<string, unknown> },
	};
}

/**
 * Creates an accessible text input component.
 *
 * This hook returns configuration for a text input field with an associated label.
 * The input's value is bound to the provided store.
 *
 * @example
 * const textValue = useState("");
 * const textInputApi = useTextInput({ label: "Your Name", value: textValue });
 *
 * // In a component:
 * <label {...textInputApi.label.props}></label>
 * <input {...textInputApi.input.props} />
 *
 * @param {Object} params - Configuration object for the text input.
 * @param {SignalOrValue<string>} params.label - The label for the text input.
 * @param {Store<string>} params.value - A store representing the current value of the input.
 * @returns {Object} An object containing properties for the text input label and input element.
 */
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
			},
		} as { props: Record<string, unknown> },
		input: {
			props: {
				type: "text",
				"bind:value": value,
				id: inputId,
			},
		} as { props: Record<string, unknown> },
	};
}
