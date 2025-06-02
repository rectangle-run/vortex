import { getImmediateValue, render, useDerived, useState, when } from "@vortexjs/core";
import { html } from "@vortexjs/dom";

function App() {
	const counter = useState(0);

	setInterval(() => {
		counter.set(getImmediateValue(counter) + 1);
	}, 1000);

	return (
		<>
			<h1>Hello, multiverse!</h1>
			<p>Counter = {counter}</p>
			{when(useDerived(get => get(counter) % 2 === 0), () => <p>this number is {counter}</p>)}
		</>
	);
}

render(html(), document.body, <App />);
