import { getImmediateValue, render, useState } from "@vortexjs/core";
import { html } from "@vortexjs/dom";

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
