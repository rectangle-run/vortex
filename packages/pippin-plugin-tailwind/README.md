# @vortexjs/pippin-plugin-tailwind

A [Tailwind CSS](https://tailwindcss.com/) plugin for the [Pippin](https://github.com/vortexjs/vortex) build system.

This plugin enables seamless integration of Tailwind CSS into your Pippin-powered projects, providing automatic CSS generation, candidate scanning, and optional minification.

## Features

- Automatic Tailwind CSS compilation for `.css` files
- Fast incremental builds with dependency tracking
- Source map support (optional)
- CSS minification (optional, enabled by default in production)
- Compatible with the Pippin plugin API

## Installation

```sh
npm install @vortexjs/pippin-plugin-tailwind @tailwindcss/node @tailwindcss/oxide
```

> **Note:** You must also have `@vortexjs/pippin` installed in your project.

## Usage

Add the plugin to your Pippin configuration:

```ts
import { pippin } from '@vortexjs/pippin';
import tailwindcss from '@vortexjs/pippin-plugin-tailwind';

const build = pippin().add(
  tailwindcss({
    sourceMap: process.env.NODE_ENV !== 'production',
    minify: process.env.NODE_ENV === 'production',
  })
);

// Use `build` as your Bun plugin or in your build pipeline
```

## Options

| Option      | Type    | Default                | Description                                 |
|-------------|---------|------------------------|---------------------------------------------|
| `sourceMap` | boolean | `false`                | Enable CSS source maps                      |
| `minify`    | boolean | `true` in production   | Minify output CSS                           |

## How it works

- The plugin scans `.css` files for Tailwind directives and candidates.
- It compiles Tailwind CSS using the official Tailwind compiler.
- Dependencies are tracked for fast incremental builds.
- Output CSS is optionally minified and source maps can be generated.

## License

MIT

---

© VortexJS Contributors