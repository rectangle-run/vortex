import { bunOnly } from "./bun-only";

const prefix = `smol::`;

export function smolify(data: string) {
    bunOnly();

    return prefix + Bun.gzipSync(data).toBase64();
}

export function unsmolify(data: string) {
    if (!data.startsWith(prefix)) {
        return data;
    }

    return Bun.gunzipSync(Buffer.from(data.slice(prefix.length), "base64")).toString()
}
