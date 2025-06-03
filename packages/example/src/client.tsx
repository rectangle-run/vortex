import {
	getImmediateValue,
	list,
	render,
	useDerived,
	useState,
	when,
} from "@vortexjs/core";
import { html } from "@vortexjs/dom";

function App() {
	const counter = useState(0);
	const name = useState("multiverse");

	const numbersToCounter = useDerived((get) => {
		const currentCounter = get(counter);
		return Array.from({ length: currentCounter }, (_, i) => i + 1);
	});

	return (
		<>
			<p>Counter = {counter}</p>
			<label>
				Name
				<input type="text" bind:value={name} />
			</label>
			<button
				on:click={() => {
					counter.set(getImmediateValue(counter) + 100);
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

			{list(numbersToCounter).show((number) => (
				<p>
					{number} is a number from 1 to {counter}
				</p>
			))}
		</>
	);
}

render(html(), document.body, <App />);
