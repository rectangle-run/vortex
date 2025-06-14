import { compileScript } from "..";

console.log(
	compileScript(
		`import route from '@vortexjs/wormhole/route';
route("/", {
    page() {
        return <h1>test</h1>;
    }
});`,
		"test.tsx",
	),
);
