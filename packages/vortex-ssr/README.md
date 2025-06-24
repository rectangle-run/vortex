# Vortex SSR

A lightweight, streaming SSR renderer for Vortex.

## API Surface

Here's a brief overview of the API interface (certain internal types are elided for simplicity):

```typescript
type CodegenStream = {
	// ...elided internals
    getCode(): string;
}

// Create a codegen stream that will contain JavaScript
function createCodegenStream(): CodegenStream;

// The HTML printer is passed by default, you may ignore it
function printHTML(node: VNode, printer?: HTMLPrinter): string;

// The codegen stream passed will only contain JavaScript
function diffInto(from: VNode, to: VNode, codegen: CodegenStream): void;

// Create the SSR renderer
function ssr(): Renderer<VNode, undefined>;

// Create the main html node
function createHTMLRoot(): VElement;
``
