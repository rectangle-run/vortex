# Vortex Core

> [!IMPORTANT]
> Vortex isn't very powerful on it's own, you need a renderer like `@vortexjs/dom`.

## Setup

```bash
bun add @vortexjs/core @vortexjs/dom
```

## Usage

```ts
import { getImmediateValue, render, useState } from "@vortexjs/core";
import { html } from "@vortexjs/dom";

function App() {
    const counter = useState(0);

    setInterval(() => {
        counter.set(getImmediateValue(counter) + 1);
    }, 1);

    return (
        <>
            <h1>Hello, multiverse!</h1>
            <p>Counter = {counter}</p>
        </>
    );
}

render(html(), document.body, <App />);
```
