# Vortex

A modern, reactive JavaScript framework with fine-grained reactivity and JSX support.

## Overview

Vortex is a lightweight reactive framework that provides:

- **Fine-grained reactivity** with signals and stores
- **JSX support** for declarative UI components
- **DOM rendering** with efficient updates
- **TypeScript-first** development experience
- **Bun-optimized** for fast development

## Architecture

Vortex is built as a monorepo with the following packages:

- **`@vortexjs/core`** - Core reactive primitives (signals, stores, effects)
- **`@vortexjs/dom`** - DOM renderer for web applications
- **`@vortexjs/bun-example`** - Example application demonstrating usage

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

## Development

This project uses:

- **Bun** as the package manager and runtime
- **Turbo** for monorepo task orchestration
- **Biome** for code formatting and linting
- **Changesets** for version management

### Commands

```bash
# Install dependencies
bun install

# Start development server
bun dev

# Format code
bun run fmt

# Build packages
turbo build

# Create a changeset
bun run change

# Release packages
bun run release
```

### Running the Example

```bash
cd packages/example
bun dev
```

## TypeScript Configuration

To use Vortex with TypeScript, configure your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@vortexjs/core"
  }
}
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Run `bun run fmt` to format code
6. Create a changeset with `bun run change`
7. Submit a pull request

## License

This project is open source. Check the repository for license details.

## Repository

https://github.com/andylovescode/vortex