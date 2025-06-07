import {
	type SignalOrValue,
	type Store,
	getImmediateValue,
	isSignal,
	useDerived,
	useState,
} from "@vortexjs/core";
import type { ElementProps } from "@vortexjs/dom";
import { useId } from "./id";

/**
 * Creates an accessible dialog component.
 *
 * This hook returns configuration for a dialog component with a trigger, title, description, and close button.
 * The dialog's visibility is controlled by the provided store.
 *
 * @example
 * const open = useState(false);
 * const dialogApi = useDialog({ open });
 *
 * // Render the dialog and trigger
 * <button {...dialogApi.trigger.props}>Open Dialog</button>
 * {open && (
 *   <div {...dialogApi.dialog.props}>
 *     <h1 {...dialogApi.title.props}>Dialog Title</h1>
 *     <p {...dialogApi.description.props}>Dialog description here.</p>
 *     <button {...dialogApi.close.props}>Close</button>
 *   </div>
 * )}
 *
 * @param {Object} params - Configuration object for the dialog.
 * @param {Store<boolean>} params.open - A boolean store that controls the visibility of the dialog.
 * @returns {Object} An object containing properties for the dialog trigger, dialog container, title, description, and close button.
 */
export function useDialog({ open }: { open: Store<boolean> }) {
	const dialogId = useId();
	const titleId = useId();
	const descriptionId = useId();

	return {
		trigger: {
			props: {
				"on:click": () => {
					open.set(true);
				},
				type: "button",
			} as ElementProps<HTMLButtonElement>,
		},
		dialog: {
			props: {
				role: "dialog",
				id: dialogId,
				tabIndex: -1,
				hidden: useDerived((get) => !get(open)),
			} as ElementProps<HTMLDivElement>,
		},
		title: {
			props: {
				id: titleId,
			} as ElementProps<HTMLHeadingElement>,
		},
		description: {
			props: {
				id: descriptionId,
			} as ElementProps<HTMLParagraphElement>,
		},
		close: {
			props: {
				"on:click": () => {
					open.set(false);
				},
				type: "button",
			} as ElementProps<HTMLButtonElement>,
		},
	};
}

/**
 * Creates an accessible popover component.
 *
 * This hook returns properties for a popover component with a trigger and a popover container.
 * The popover's visibility is toggled by the provided store.
 *
 * @example
 * const open = useState(false);
 * const popoverApi = usePopover({ open });
 *
 * // Render the popover and trigger
 * <button {...popoverApi.trigger.props}>Open Popover</button>
 * {open && (
 *   <div {...popoverApi.popover.props}>Popover content here.</div>
 * )}
 * <button {...popoverApi.close.props}>Close Popover</button>
 *
 * @param {Object} params - Configuration object for the popover.
 * @param {Store<boolean>} params.open - A boolean store that controls the visibility of the popover.
 * @returns {Object} An object containing properties for the popover trigger, popover container, and close button.
 */
export function usePopover({ open }: { open: Store<boolean> }) {
	const popoverId = useId();

	return {
		trigger: {
			props: {
				"on:click": () => {
					open.set(true);
				},
				type: "button",
			} as ElementProps<HTMLButtonElement>,
		},
		popover: {
			props: {
				role: "dialog",
				id: popoverId,
				tabIndex: -1,
				hidden: useDerived((get) => !get(open)),
			} as ElementProps<HTMLDivElement>,
		},
		close: {
			props: {
				"on:click": () => {
					open.set(false);
				},
				type: "button",
			} as ElementProps<HTMLButtonElement>,
		},
	};
}

/**
 * Creates an accessible tooltip component.
 *
 * This hook returns properties for a tooltip component that appears on mouse over.
 * The tooltip visibility is controlled by the provided store and displays the given label.
 *
 * @example
 * const open = useState(false);
 * const tooltipApi = useTooltip({ open, label: "Tooltip text" });
 *
 * // Render the tooltip and attach to a target element
 * <div {...tooltipApi.trigger.props}>Hover me</div>
 * {open && <div {...tooltipApi.tooltip.props}>Tooltip text</div>}
 *
 * @param {Object} params - Configuration object for the tooltip.
 * @param {Store<boolean>} params.open - A boolean store that controls whether the tooltip is visible.
 * @param {string} params.label - The text to display inside the tooltip.
 * @returns {Object} An object containing properties for the tooltip trigger and tooltip container.
 */
export function useTooltip({
	open,
	label,
}: { open: Store<boolean>; label: string }) {
	const tooltipId = useId();

	return {
		trigger: {
			props: {
				ariaDescribedBy: tooltipId,
				"on:mouseover": () => {
					open.set(true);
				},
				"on:mouseout": () => {
					open.set(false);
				},
				tabIndex: 0,
			} as ElementProps<HTMLElement>,
		},
		tooltip: {
			props: {
				role: "tooltip",
				id: tooltipId,
				hidden: useDerived((get) => !get(open)),
				children: label,
			} as ElementProps<HTMLDivElement>,
		},
	};
}

/**
 * Creates an accessible dropdown menu component.
 *
 * This hook returns properties for a dropdown menu component, including a trigger, menu container,
 * a function to generate menu item properties, and a close button.
 *
 * @example
 * const open = useState(false);
 * const dropdownMenu = useDropdownMenu({ open });
 *
 * // Render the dropdown menu
 * <button {...dropdownMenu.trigger.props}>Open Menu</button>
 * {open && (
 *   <ul {...dropdownMenu.menu.props}>
 *     <li {...dropdownMenu.menuItem().props}>Menu Item 1</li>
 *     <li {...dropdownMenu.menuItem(true).props}>Disabled Item</li>
 *   </ul>
 * )}
 * <button {...dropdownMenu.close.props}>Close Menu</button>
 *
 * @param {Object} params - Configuration object for the dropdown menu.
 * @param {Store<boolean>} params.open - A boolean store that controls the visibility of the dropdown menu.
 * @returns {Object} An object containing properties for the menu trigger, menu list, dynamic menu items, and close button.
 */
export function useDropdownMenu({ open }: { open: Store<boolean> }) {
	const menuId = useId();

	return {
		trigger: {
			props: {
				"on:click": () => {
					open.set(!getImmediateValue(open));
				},
				type: "button",
				ariaHasPopup: "menu",
				ariaExpanded: useDerived((get) => (get(open) ? "true" : "false")),
			} as ElementProps<HTMLButtonElement>,
		},
		menu: {
			props: {
				role: "menu",
				id: menuId,
				tabIndex: -1,
				hidden: useDerived((get) => !get(open)),
			} as ElementProps<HTMLUListElement>,
		},
		menuItem: (disabled: SignalOrValue<boolean> = false) => ({
			props: {
				role: "menuitem",
				tabIndex: disabled ? -1 : 0,
				ariaDisabled: isSignal(disabled)
					? useDerived((get) => (get(disabled) ? "true" : "false"))
					: disabled
						? "true"
						: "false",
			} as ElementProps<HTMLLIElement>,
		}),
		close: {
			props: {
				"on:click": () => {
					open.set(false);
				},
				type: "button",
				ariaLabel: "Close menu",
			} as ElementProps<HTMLButtonElement>,
		},
	};
}

/**
 * Creates an accessible context menu component.
 *
 * This hook returns properties for a context menu component that appears on right-click (contextmenu)
 * and hides when the target is clicked. It provides a method to generate menu item properties.
 *
 * @example
 * const open = useState(false);
 * const contextMenu = useContextMenu({ open });
 *
 * // Attach to a target element
 * <div {...contextMenu.target.props}>Right-click here</div>
 * {open && (
 *   <ul {...contextMenu.menu.props}>
 *     <li {...contextMenu.menuItem().props}>Item 1</li>
 *   </ul>
 * )}
 * <button {...contextMenu.close.props}>Close Context Menu</button>
 *
 * @param {Object} params - Configuration object for the context menu.
 * @param {Store<boolean>} params.open - A boolean store that controls the visibility of the context menu.
 * @returns {Object} An object containing properties for the target element, menu list, dynamic menu items, and a close button.
 */
export function useContextMenu({ open }: { open: Store<boolean> }) {
	const menuId = useId();

	return {
		target: {
			props: {
				"on:contextmenu": (event: MouseEvent) => {
					event.preventDefault();
					open.set(true);
				},
				"on:click": () => {
					open.set(false);
				},
				tabIndex: 0,
			} as ElementProps<HTMLElement>,
		},
		menu: {
			props: {
				role: "menu",
				id: menuId,
				tabIndex: -1,
				hidden: useDerived((get) => !get(open)),
			} as ElementProps<HTMLUListElement>,
		},
		menuItem: (disabled: SignalOrValue<boolean> = false) => ({
			props: {
				role: "menuitem",
				tabIndex: disabled ? -1 : 0,
				ariaDisabled: isSignal(disabled)
					? useDerived((get) => (get(disabled) ? "true" : "false"))
					: disabled
						? "true"
						: "false",
			} as ElementProps<HTMLLIElement>,
		}),
		close: {
			props: {
				"on:click": () => {
					open.set(false);
				},
				type: "button",
				ariaLabel: "Close menu",
			} as ElementProps<HTMLButtonElement>,
		},
	};
}

/**
 * Creates an accessible alert dialog component.
 *
 * This hook returns configuration for an alert dialog, including a trigger, dialog container, title, description,
 * and action and cancel buttons. The alert dialog is used for urgent, interruptive messages that require user action.
 *
 * @example
 * const open = useState(false);
 * const alertDialog = useAlertDialog({ open });
 *
 * // Render the alert dialog
 * <button {...alertDialog.trigger.props}>Open Alert</button>
 * {open && (
 *   <div {...alertDialog.dialog.props}>
 *     <h1 {...alertDialog.title.props}>Alert Title</h1>
 *     <p {...alertDialog.description.props}>Alert description here.</p>
 *     <button {...alertDialog.action.props}>Confirm</button>
 *     <button {...alertDialog.cancel.props}>Cancel</button>
 *   </div>
 * )}
 *
 * @param {Object} params - Configuration object for the alert dialog.
 * @param {Store<boolean>} params.open - A boolean store that controls the visibility of the alert dialog.
 * @returns {Object} An object containing properties for the alert dialog trigger, dialog container, title, description, action button, and cancel button.
 */
export function useAlertDialog({ open }: { open: Store<boolean> }) {
	const dialogId = useId();
	const titleId = useId();
	const descriptionId = useId();

	return {
		trigger: {
			props: {
				"on:click": () => {
					open.set(true);
				},
				type: "button",
				ariaHasPopup: "dialog",
			} as ElementProps<HTMLButtonElement>,
		},
		dialog: {
			props: {
				role: "alertdialog",
				id: dialogId,
				tabIndex: -1,
				hidden: useDerived((get) => !get(open)),
			} as ElementProps<HTMLDivElement>,
		},
		title: {
			props: {
				id: titleId,
			} as ElementProps<HTMLHeadingElement>,
		},
		description: {
			props: {
				id: descriptionId,
			} as ElementProps<HTMLParagraphElement>,
		},
		action: {
			props: {
				"on:click": () => {
					open.set(false);
				},
				type: "button",
			} as ElementProps<HTMLButtonElement>,
		},
		cancel: {
			props: {
				"on:click": () => {
					open.set(false);
				},
				type: "button",
			} as ElementProps<HTMLButtonElement>,
		},
	};
}

/**
 * Creates an accessible hover card component.
 *
 * This hook returns properties for a hover card component that appears when the user hovers over a trigger element.
 * The hover card provides additional contextual information.
 *
 * @example
 * const open = useState(false);
 * const hoverCard = useHoverCard({ open });
 *
 * // Render the hover card and attach to a target element
 * <div {...hoverCard.trigger.props}>Hover over me</div>
 * {open && (
 *   <div {...hoverCard.card.props}>Additional info here.</div>
 * )}
 *
 * @param {Object} params - Configuration object for the hover card.
 * @param {Store<boolean>} params.open - A boolean store that controls the visibility of the hover card.
 * @returns {Object} An object containing properties for the hover card trigger and the hover card container.
 */
export function useHoverCard({ open }: { open: Store<boolean> }) {
	const cardId = useId();

	return {
		trigger: {
			props: {
				"on:mouseover": () => {
					open.set(true);
				},
				"on:mouseout": () => {
					open.set(false);
				},
				tabIndex: 0,
			} as ElementProps<HTMLElement>,
		},
		card: {
			props: {
				role: "dialog",
				id: cardId,
				tabIndex: -1,
				hidden: useDerived((get) => !get(open)),
			} as ElementProps<HTMLDivElement>,
		},
	};
}
