import { bunOnly } from "./bun-only";

const prefix = "s:";

export function smolify(data: string) {
	bunOnly();

	const compressed = prefix + Bun.gzipSync(data).toBase64();

	if (compressed.length < data.length || data.startsWith(prefix)) {
		return compressed;
	}

	return data;
}

export function unsmolify(data: string) {
	if (!data.startsWith(prefix)) {
		return data;
	}

	bunOnly();

	return Bun.gunzipSync(
		Buffer.from(data.slice(prefix.length), "base64"),
	).toString();
}
