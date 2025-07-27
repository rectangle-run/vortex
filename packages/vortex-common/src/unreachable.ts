export function unreachable(
	value: never,
	message = "Unreachable state",
): never {
	throw new Error(`${message} ${JSON.stringify(value)}`);
}
