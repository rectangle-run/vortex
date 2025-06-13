/**
 * @module disclosure
 *
 * This module provides accessible disclosure components for creating interactive UI
 * elements such as accordions and collapsibles using Vortex.
 */

import { type Store, getImmediateValue, useDerived } from "@vortexjs/core";
import type { ElementProps } from "@vortexjs/dom";
import { useId } from "./id";

/**
 * Creates an accessible accordion component.
 *
 * This hook returns the properties for the accordion items, including the button and panel
 * for each item. It supports both single and multiple item expansion depending on the
 * provided configuration.
 *
 * @example
 * const items = [{ label: "Section 1" }, { label: "Section 2" }];
 * const openIndexes = useState<number[]>([]);
 * const accordion = useAccordion({ items, openIndexes, allowMultiple: true });
 *
 * // In your component:
 * accordion.items.map((item, i) => (
 *   <>
 *     <button {...item.button.props} onClick={item.button["on:click"]}>
 *       {item.button.label}
 *     </button>
 *     <div {...item.panel.props}>
 *       Content for section {i}
 *     </div>
 *   </>
 * ));
 *
 * @param {Object} params - Configuration object for the accordion.
 * @param {{ label: string }[]} params.items - List of items, each with a label property.
 * @param {Store<number[]>} params.openIndexes - A store managing an array of indexes for items that are open.
 * @param {boolean} [params.allowMultiple=false] - If true, allows multiple accordion items to be open simultaneously.
 * @returns {Object} An object containing the accordion items with their respective button and panel properties.
 */
export function useAccordion({
	items,
	openIndexes,
	allowMultiple = false,
}: {
	items: { label: string }[];
	openIndexes: Store<number[]>;
	allowMultiple?: boolean;
}) {
	const buttonIds = items.map(() => useId());
	const panelIds = items.map(() => useId());

	/**
	 * Toggles the open/closed state of an accordion item.
	 *
	 * @param {number} index - Index of the item to toggle.
	 */
	function toggle(index: number) {
		const prev = getImmediateValue(openIndexes);
		const isOpen = prev.includes(index);
		if (allowMultiple) {
			openIndexes.set(
				isOpen ? prev.filter((i) => i !== index) : [...prev, index],
			);
		} else {
			openIndexes.set(isOpen ? [] : [index]);
		}
	}

	return {
		items: items.map((item, i) => ({
			button: {
				props: {
					id: buttonIds[i],
					type: "button",
				} satisfies ElementProps<HTMLButtonElement>,
				label: item.label,
				"on:click": () => toggle(i),
			},
			panel: {
				props: {
					id: panelIds[i],
					role: "region",
					hidden: useDerived((get) => !get(openIndexes).includes(i)),
					tabIndex: 0,
				} satisfies ElementProps<HTMLDivElement>,
			},
		})),
	};
}

/**
 * Creates an accessible collapsible component.
 *
 * This hook provides the necessary properties for a collapsible component, including
 * a toggle button and a content panel. It allows a simple show/hide functionality.
 *
 * @example
 * const open = useState(false);
 * const collapsible = useCollapsible({ open, label: "Show Details" });
 *
 * // Usage in a component:
 * <button {...collapsible.button.props} onClick={collapsible.button["on:click"]}>
 *   {collapsible.button.label}
 * </button>
 * <div {...collapsible.panel.props}>
 *   Collapsible content here.
 * </div>
 *
 * @param {Object} params - Configuration object for the collapsible component.
 * @param {Store<boolean>} params.open - A boolean store indicating whether the panel is visible.
 * @param {string} [params.label] - Optional label for the collapsible button.
 * @returns {Object} An object containing the collapsible button and panel properties.
 */
export function useCollapsible({
	open,
	label,
}: {
	open: Store<boolean>;
	label?: string;
}) {
	const buttonId = useId();
	const panelId = useId();

	/**
	 * Toggles the visibility of the collapsible content.
	 */
	function toggle() {
		open.set(!getImmediateValue(open));
	}

	return {
		button: {
			props: {
				id: buttonId,
				type: "button",
			} satisfies ElementProps<HTMLButtonElement>,
			label,
			"on:click": toggle,
		},
		panel: {
			props: {
				id: panelId,
				role: "region",
				hidden: useDerived((get) => !get(open)),
				tabIndex: 0,
			} satisfies ElementProps<HTMLDivElement>,
		},
	};
}
