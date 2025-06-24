# Vortex DOM

Vortex DOM is a DOM renderer for Vortex, supporting hydration!

The API surface is very simple, just like Vortex itself (internal types elided):

```typescript
function useAnimationFrame(callback: (props: {
    timeMs: number;
    deltaTimeMs: number;
    deltaTimeSec: number;
}) => void): void; // as requestAnimationFrame is not available in Node.js, this is considered DOM-specific

function html(): Renderer<Node, HTMLHydrationContext>;
```
