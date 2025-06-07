import {
	type Store,
	getImmediateValue,
	useDerived,
	useState,
} from "@vortexjs/core";
import type { ElementProps } from "@vortexjs/dom";
import { useId } from "./id";

/**
 * Creates an accessible tabs component.
 *
 * This hook generates the necessary properties and event handlers for a tabs interface,
 * including a tab list, individual tabs, and corresponding tab panels. Each tab is assigned
 * a unique identifier for proper ARIA association. It supports navigation through mouse clicks
 * and basic keyboard interactions (Enter and Space keys) for accessibility.
 *
 * @example
 * const tabs = ["Tab 1", "Tab 2", "Tab 3"];
 * const selected = useState(tabs[0]);
 * const tabApi = useTabs({ tabs, selected });
 *
 * // Render the tab list:
 * <div {...tabApi.tabList.props}>
 *   {tabApi.tabs.map(tab => (
 *     <button {...tab.props}>{tab.label}</button>
 *   ))}
 * </div>
 *
 * // Render the tab panels:
 * {tabApi.tabPanels.map((panel, i) => (
 *   <div {...panel.props}>Panel content for {tabs[i]}</div>
 * ))}
 *
 * @template T - The type of tab identifier (typically string).
 * @param {Object} params - Configuration object for the tabs component.
 * @param {T[]} params.tabs - An array of tab identifiers representing each tab.
 * @param {Store<T>} params.selected - A store managing the currently selected tab.
 * @returns {Object} An object containing:
 *   - tabList: Properties for the container element of the tabs.
 *   - tabs: An array of objects, each with properties for a tab button and its label.
 *   - tabPanels: An array of objects with properties for corresponding tab panel elements.
 */
export function useTabs<T extends string>({
	tabs,
	selected,
}: {
	tabs: T[];
	selected: Store<T>;
}) {
	const tabListId = useId();
	const tabIds = tabs.map(() => useId());

	return {
		tabList: {
			props: {
				role: "tablist",
				id: tabListId,
			} satisfies ElementProps<HTMLDivElement>,
		},
		tabs: tabs.map((tab, i) => ({
			props: {
				role: "tab",
				id: tabIds[i],
				tabIndex: useDerived((get) => (get(selected) === tab ? 0 : -1)),
				type: "button",
				"on:click": () => {
					selected.set(tab);
				},
				"on:keypress": (event: KeyboardEvent) => {
					if (event.key === "Enter" || event.key === " ") {
						event.preventDefault();
						selected.set(tab);
					}
				},
			} satisfies ElementProps<HTMLButtonElement>,
			label: tab,
		})),
		tabPanels: tabs.map((tab, i) => ({
			props: {
				role: "tabpanel",
				id: `${tabIds[i]}-panel`,
				hidden: useDerived((get) => get(selected) !== tab),
				tabIndex: 0,
			} satisfies ElementProps<HTMLDivElement>,
		})),
	};
}
