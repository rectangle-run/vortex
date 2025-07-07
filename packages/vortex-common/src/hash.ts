import { unwrap } from "./type-hints";

export function hash(
	data: string | Uint8Array | ArrayBuffer | null | undefined,
) {
	const binaryData =
		typeof data === "string"
			? new TextEncoder().encode(data)
			: data instanceof Uint8Array
				? new Uint8Array(data)
				: data instanceof ArrayBuffer
					? new Uint8Array(data)
					: new Uint8Array();

	// Goof around with the data
	let ptr = 0;

	for (let i = 0; i < binaryData.length * 32; i++) {
		binaryData[ptr] = unwrap(binaryData[ptr]) ^ (i % 256);
		ptr += unwrap(binaryData[ptr]) * (i + 1);
		ptr %= binaryData.length;
	}

	const smolBuffer = new Uint8Array(32);

	for (let i = 0; i < smolBuffer.length; i++) {
		smolBuffer[i] =
			unwrap(smolBuffer[i]) ^ unwrap(binaryData[i % binaryData.length]);
	}

	let result = 0;

	for (const byte of smolBuffer) {
		result *= 256;
		result += byte;
	}

	return result;
}
