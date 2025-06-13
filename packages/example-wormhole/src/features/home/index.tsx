import type { JSXNode } from "@vortexjs/core";
import route from "@vortexjs/wormhole/route";

route("/", {
	page() {
		return (
			<>
				<h1>Welcome to Wormhole</h1>
				<p>This is an example app</p>
			</>
		);
	},
	layout({ children }: { children: JSXNode }) {},
});
