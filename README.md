# Vortex

A framework that cares about the details.

## Overview

Here's why Vortex is cool.

-  🕸️ **Fine-grained reactivity**: We create a graph of data where updates pulse through, minimizing compute.
-  ⚡ **Fast**: Vortex is designed for speed, with minimal overhead and efficient updates.
-  🧩 **Composable**: Build complex UIs from simple reactive primitives.
-  🌐 **Renderer agnostic**: Use Vortex with any renderer, DOM, SSR, or whatever you want to write support for.
-  🛠️ **Developer-friendly**: The API surface is simple and clear, and everything is safely typed.

## Packages

- Core
    - `@vortexjs/common` - A library used by all of Vortex, providing utilities
    - `@vortexjs/core` - The main reconciling engine of Vortex
    - `@vortexjs/dom` - A DOM renderer for Vortex Core
- Wormhole
    - `@vortexjs/cache` - An ultra-fast caching engine for reusing data between builds
    - `@vortexjs/ssr` - A renderer providing incremental diffing and initial HTML rendering
    - `@vortexjs/pippin` - A plugin stacker for Bun, because Bun's builtin plugin API is... Buns *buh-dum-tsk*
    - `@vortexjs/pippin-plugin-tailwind` - Tailwind support for Pippin
    - `@vortexjs/discovery` - A pippin plugin powering the simple APIs in Wormhole
    - `@vortexjs/wormhole` - The Vortex metaframework
- Utilities
    - `@vortexjs/locounter` - A quick and dirty line-counter
    - `@vortexjs/cataloger` - A quick and dirty way of switching to catalogs
- Ecosystem
    - `@vortexjs/prime` - A set of unstyled, accessible components
- Apps
    - `@vortexjs/example` - An example project with no metaframework goodies
    - `@vortexjs/example-wormhole` - An example project with Wormhole

## Quick Start

### Installation

```bash
bun add @vortexjs/core @vortexjs/dom
```

### Basic Usage

```tsx
import { getImmediateValue, render, useState } from "@vortexjs/core";
import { html } from "@vortexjs/dom";

function App() {
    const counter = useState(0);

    return (
        <>
            <h1>Counter: {counter}</h1>
            <button
                on:click={() => counter.set(getImmediateValue(counter) + 1)}
                type="button"
            >
                Increment
            </button>
        </>
    );
}

render(html(), document.body, <App />);
```

## Core Concepts

### Signals and Stores

Signals are reactive primitives that automatically update dependent computations:

```tsx
import { useState, useDerived } from "@vortexjs/core";

function Counter() {
    const count = useState(0);
    const doubled = useDerived((get) => get(count) * 2);

    return (
        <div>
            <p>Count: {count}</p>
            <p>Doubled: {doubled}</p>
        </div>
    );
}
```

### Effects

Effects run side effects when their dependencies change:

```tsx
import { useEffect, useState } from "@vortexjs/core";

function Timer() {
    const time = useState(new Date());

    useEffect((get, { lifetime }) => {
        const interval = setInterval(() => {
            time.set(new Date());
        }, 1000);

        lifetime.onClosed(() => clearInterval(interval));
    });

    return <p>Current time: {time}</p>;
}
```

### Conditional Rendering

```tsx
import { when, useDerived } from "@vortexjs/core";

function ConditionalExample() {
    const showMessage = useState(false);

    return (
        <>
            <button on:click={() => showMessage.set(!showMessage.get())}>
                Toggle
            </button>
            {when(showMessage, () => <p>Hello, World!</p>)}
        </>
    );
}
```

### Lists

```tsx
import { list, useState } from "@vortexjs/core";

function TodoList() {
    const todos = useState(['Learn Vortex', 'Build app']);

    return (
        <ul>
            {list(todos).show((todo, index) => (
                <li key={index}>{todo}</li>
            ))}
        </ul>
    );
}
```

### Two-way Data Binding

```tsx
function InputExample() {
    const name = useState("");

    return (
        <div>
            <input type="text" bind:value={name} />
            <p>Hello, {name}!</p>
        </div>
    );
}
```

### Element references with `use`

```tsx
function RefExample() {
    return (
       	<div use={el => el.innerText = "Just kidding, the text gets overwritten by me!"}> {/* note: this does not work with SSR! */}
            This says something cool!
        </div>
    );
}
```

## Setup

1. **Install dependencies**

    Use Bun to install the core and DOM renderer packages:

    ```bash
    bun add @vortexjs/core @vortexjs/dom
    ```

2. **Setup your `tsconfig.json`**

    To use Vortex with TypeScript, configure your `tsconfig.json`:

    ```json
    {
        "compilerOptions": {
            "jsx": "react-jsx",
            "jsxImportSource": "@vortexjs/core"
        }
    }
    ```

3. **Create your entry point**

    Create an entry point file (e.g., `index.tsx`) and import the necessary modules:

    ```tsx
    import { render, html } from "@vortexjs/dom";
    import { App } from "./App";

    render(html(), document.getElementById("root"), <App />);
    ```

4. *Profit.*

## Contributing

1. Fork the repository
2. Make your changes
3. Run `bun fmt` to format code
4. Create a changeset with `bun change`
5. Submit a pull request

## License

This project is open source. See the [LICENSE](LICENSE) file for details.
