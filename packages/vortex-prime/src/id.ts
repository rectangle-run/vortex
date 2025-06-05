export function useId() {
	let id = "prime-";

	const chars = "abcdefghijklmnopqrstuvwxyz0123456789";

	while (id.length < 16) {
		id += chars[Math.floor(Math.random() * chars.length)];
	}

	return id;
}
