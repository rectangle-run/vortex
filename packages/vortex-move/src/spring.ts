import {
	getImmediateValue,
	isSignal,
	type SignalOrValue,
	store,
} from "@vortexjs/core";
import { useAnimation } from "./scheduler";

export class Spring {
	target = 0;
	value = 0;
	velocity = 0;

	// parameters (NOTE: not perfectly realistic)
	tension = 100;
	reboundFriction = 50;
	typicalFriction = 0;

	signal = store(0);

	update(dt: number) {
		// Break NaNs
		// (shouldn't happen, but just in case)
		if (Number.isNaN(this.value)) this.value = 0;
		if (Number.isNaN(this.velocity)) this.velocity = 0;
		if (Number.isNaN(this.target)) this.target = 0;

		// Move from velocity
		this.value += this.velocity * dt;

		// Calculate spring force
		const displacement = this.target - this.value;
		const springForce = displacement * this.tension;

		if (!Number.isNaN(springForce)) {
			this.velocity += springForce * dt;
		}

		// Apply friction
		const signToTarget = Math.sign(this.target - this.value);
		const signVelocity = Math.sign(this.velocity);
		const isRebounding = signToTarget !== signVelocity;
		const friction = isRebounding
			? this.reboundFriction
			: this.typicalFriction;

		// Apply friction in a way that's framerate independent, with framerate independent lerp!
		const frictionEffect = 1 / (1 + friction * dt);

		if (!Number.isNaN(frictionEffect)) {
			this.velocity *= frictionEffect;
		}

		this.signal.set(this.value);
	}
}

export function useSpring(
	target: SignalOrValue<number>,
	spring = new Spring(),
) {
	useAnimation({
		impl: ({ dtSeconds }) => {
			const targetValue = isSignal(target)
				? getImmediateValue(target)
				: target;

			spring.target = targetValue;
			spring.update(dtSeconds);
		},
	});

	return spring;
}
