import { useHookLifetime } from "@vortexjs/core";

export function useAnimationFrame(
	callback: (props: {
		timeMs: number;
		deltaTimeMs: number;
		deltaTimeSec: number;
	}) => void,
) {
	const lifetime = useHookLifetime();
	let lastTime = performance.now();
	let raf: number | null = null;

	function frame(time: number) {
		const deltaTimeMs = time - lastTime;
		const deltaTimeSec = deltaTimeMs / 1000;
		lastTime = time;

		callback({ timeMs: time, deltaTimeMs, deltaTimeSec });

		raf = window.requestAnimationFrame(frame);
	}

	raf = window.requestAnimationFrame(frame);
}
