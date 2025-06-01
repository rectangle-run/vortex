import { render } from "@vortexjs/core/render";
import { html } from "@vortexjs/dom";
import { getImmediateValue, useState } from "../../vortex-core/src";

function App() {
	const counter = useState(0);

	setInterval(() => {
		counter.set(getImmediateValue(counter) + 1);
	});

	return (
		<>
			<h1>Hello, multiverse!</h1>
			<p>Counter = {counter}</p>
		</>
	);
}

render(html(), document.body, <App />);
