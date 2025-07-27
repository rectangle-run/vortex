export function bunOnly() {
    if (!globalThis.Bun) {
        throw new Error("Whatever you're trying to do only works in Bun!");
    }
}
