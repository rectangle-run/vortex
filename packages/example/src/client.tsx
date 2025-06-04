import {
	createContext,
	getImmediateValue,
	list,
	render,
	useDerived,
	useState,
	when,
} from "@vortexjs/core";
import { html } from "@vortexjs/dom";
import { Canvas, createThreeComponent } from "@vortexjs/three";
import * as THREE from "three";

const Mesh = createThreeComponent(THREE.Mesh);
const PointLight = createThreeComponent(THREE.PointLight);

const TestingContext = createContext<string>("TestingContext");

function TestingComponent() {
	const ctxData = TestingContext.use();

	return <p>This is a testing component. Context data: {ctxData}</p>;
}

function App() {
	const counter = useState(0);
	const name = useState("multiverse");

	const numbersToCounter = useDerived((get) => {
		const currentCounter = get(counter);
		return Array.from({ length: currentCounter }, (_, i) => i + 1);
	});

	const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);

	camera.position.z = 5;

	return (
		<>
			<TestingContext value="Hello from Testing Context!">
				<TestingComponent />
			</TestingContext>
			<p>
				Counter = {counter}, Name = {name}
			</p>
			<label>
				Name
				<input type="text" bind:value={name} />
			</label>
			<button
				on:click={() => {
					counter.set(getImmediateValue(counter) + 100);
				}}
				use={(element) => console.log("button element: ", element)}
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

			<div style={{ width: "100%", height: "400px" }}>
				<Canvas camera={camera}>
					<Mesh
						geometry={new THREE.BoxGeometry(1, 1, 1)}
						material={new THREE.MeshStandardMaterial({ color: 0x00ff00 })}
					></Mesh>
					<PointLight position={[10, 10, 10]} intensity={250} />
				</Canvas>
			</div>
		</>
	);
}

render(html(), document.body, <App />);
