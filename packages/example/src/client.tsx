import {
	getImmediateValue,
	render,
	useDerived,
	useState,
	when,
} from "@vortexjs/core";
import { html } from "@vortexjs/dom";

function App() {
	const counter = useState(0);
	const name = useState("multiverse");

	return (
		<>
			<p>Counter = {counter}</p>
			<label>
				Name
				<input type="text" bind:value={name} />
			</label>
			<button
				on:click={() => {
					counter.set(getImmediateValue(counter) + 1);
				}}
				type="button"
			>
				Increment
			</button>

			{when(
				useDerived((get) => get(counter) % 2 === 0),
				() => (
					<p>{counter} is an even number</p>
				),
			)}
		</>
	);
}

render(html(), document.body, <App />);
