import { getImmediateValue, useDerived, useState } from "@vortexjs/core";

const clientSidePathname = useState(window.location.href);

export function usePathname() {
	return useDerived((get) => {
		return new URL(get(clientSidePathname)).pathname;
	});
}

export function initializeClientSideRouting() {
	clientSidePathname.subscribe(
		(next) => {
			if (window.location.href !== next) {
				window.history.pushState({}, "", next);
			}
		},
		{ callInitially: false },
	);

	// hook into the popstate event to update the pathname
	window.addEventListener("popstate", () => {
		clientSidePathname.set(window.location.href);
	});

	// make link clicks update the pathname
	document.addEventListener("click", (event) => {
		const ancestry = event.composedPath();
		const link = ancestry.find((el) => el instanceof HTMLAnchorElement);

		if (link?.href) {
			const url = new URL(
				link.href,
				getImmediateValue(clientSidePathname),
			);

			if (url.origin !== window.location.origin) return; // ignore external links

			event.preventDefault();

			clientSidePathname.set(url.href);
		}
	});
}
