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
        </>
    );
}

render(html(), document.body, <App />);
