import {
	type Store,
	getImmediateValue,
	useDerived,
	useState,
} from "@vortexjs/core";
import type { ElementProps } from "@vortexjs/dom";
import { useId } from "./id";

/**
 * Creates an accessible progress bar component.
 *
 * This hook returns configuration for a progress bar element along with an optional label.
 * It calculates the progress percentage based on the provided value and maximum limit.
 *
 * @example
 * const value = useState(50);
 * const max = 100;
 * const progressApi = useProgress({ value, max, label: "Loading..." });
 *
 * // In your component:
 * <div {...progressApi.progress.props}>
 *   <div {...progressApi.bar.props} />
 *   {progressApi.label && <span {...progressApi.label.props} />}
 * </div>
 *
 * @param {Object} params - Configuration object for the progress bar.
 * @param {Store<number>} params.value - A store holding the current progress value.
 * @param {number} params.max - The maximum value representing 100% progress.
 * @param {string} [params.label] - An optional text label describing the progress.
 * @returns {Object} An object containing the properties for the progress container, progress bar, and optional label.
 */
export function useProgress({
	value,
	max,
	label,
}: {
	value: Store<number>;
	max: number;
	label?: string;
}) {
	const progressId = useId();
	const labelId = useId();

	return {
		progress: {
			props: {
				role: "progressbar",
				id: progressId,
				tabIndex: 0,
			} satisfies ElementProps<HTMLDivElement>,
		},
		bar: {
			props: {
				style: {
					width: useDerived((get) => `${(get(value) / max) * 100}%`),
					height: "100%",
				},
			} satisfies ElementProps<HTMLDivElement>,
		},
		label: label
			? {
					props: {
						id: labelId,
						children: label,
					} satisfies ElementProps<HTMLSpanElement>,
				}
			: undefined,
	};
}

/**
 * Creates an accessible toast notification component.
 *
 * This hook provides configurations for a toast that automatically dismisses itself after a given duration.
 * It supplies properties for the toast container, title, and close button, along with functions to
 * programmatically open or close the toast.
 *
 * @example
 * const open = useState(false);
 * const toastApi = useToast({ open, duration: 5000 });
 *
 * // In your component:
 * <div {...toastApi.toast.props}>
 *   <span {...toastApi.title.props}>Notification Title</span>
 *   <button {...toastApi.close.props}>Close</button>
 * </div>
 *
 * // To display the toast programmatically:
 * toastApi.open();
 *
 * @param {Object} params - Configuration object for the toast.
 * @param {Store<boolean>} params.open - A store controlling the visibility of the toast.
 * @param {number} [params.duration=5000] - Duration in milliseconds after which the toast will auto-dismiss.
 * @returns {Object} An object containing properties for the toast container, title, and close button,
 *                   as well as functions to open and close the toast.
 */
export function useToast({
	open,
	duration = 5000,
}: {
	open: Store<boolean>;
	duration?: number;
}) {
	const toastId = useId();
	const titleId = useId();

	// Auto-dismiss logic
	let timeout: ReturnType<typeof setTimeout> | null = null;
	const startTimer = () => {
		if (timeout) clearTimeout(timeout);
		timeout = setTimeout(() => {
			open.set(false);
		}, duration);
	};
	const stopTimer = () => {
		if (timeout) clearTimeout(timeout);
	};

	return {
		toast: {
			props: {
				role: "status",
				id: toastId,
				hidden: useDerived((get) => !get(open)),
				tabIndex: 0,
			} satisfies ElementProps<HTMLDivElement>,
		},
		title: {
			props: {
				id: titleId,
			} satisfies ElementProps<HTMLSpanElement>,
		},
		close: {
			props: {
				type: "button",
				"on:click": () => open.set(false),
			} satisfies ElementProps<HTMLButtonElement>,
		},
		open: () => {
			open.set(true);
			startTimer();
		},
		closeToast: () => {
			open.set(false);
			stopTimer();
		},
	};
}
