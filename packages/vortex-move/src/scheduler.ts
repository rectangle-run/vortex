import { useHookLifetime } from "@vortexjs/core";
import { isBrowser } from "./browser";

export interface SchedulerCallback {
	impl?(tick: TickProps): void;
}

export interface ClosableSchedulerCallback extends SchedulerCallback {
	close(): void;
}

export interface TickProps {
	dtSeconds: number;
}

const NONE_NUMBER = -1;

export class Scheduler {
	callbacks: ClosableSchedulerCallback[] = [];
	animationFrame = NONE_NUMBER;
	lastTime = 0;

	tick(time: number) {
		this.animationFrame = requestAnimationFrame((t) => this.tick(t));

		const timeSeconds = time / 1000;
		const maxDt = 1 / 10;
		const dt = Math.min(timeSeconds - this.lastTime, maxDt);

		this.lastTime = timeSeconds;

		if (Number.isNaN(dt)) return;

		for (const callback of this.callbacks) {
			callback.impl?.({ dtSeconds: dt });
		}
	}

	updatePrescence() {
		if (!isBrowser) return;

		const shouldExist = this.callbacks.length > 0;

		if (shouldExist && this.animationFrame === NONE_NUMBER) {
			this.animationFrame = requestAnimationFrame((time) => {
				this.tick(time);
			});
		} else if (!shouldExist && this.animationFrame !== NONE_NUMBER) {
			cancelAnimationFrame(this.animationFrame);
			this.animationFrame = NONE_NUMBER;
			this.lastTime = NONE_NUMBER;
		}
	}

	addCallback(callback: SchedulerCallback): ClosableSchedulerCallback {
		const closable: ClosableSchedulerCallback = {
			close: () => {
				const index = this.callbacks.indexOf(closable);
				if (index !== -1) {
					this.callbacks.splice(index, 1);
					this.updatePrescence();
				}
			},
			...callback,
		};

		this.callbacks.push(closable);
		this.updatePrescence();

		return closable;
	}
}

const sceduler = new Scheduler();

export function useAnimation(callback: SchedulerCallback) {
	const closable = sceduler.addCallback(callback);
	const lt = useHookLifetime();

	lt.onClosed(() => {
		closable.close();
	});

	return closable;
}
