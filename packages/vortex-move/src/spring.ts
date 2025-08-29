import {
    getImmediateValue,
    isSignal,
    type SignalOrValue,
    store,
} from "@vortexjs/core";
import { useAnimation } from "./scheduler";

export type SpringSettings = {
    weight?: number;
    speed?: number;
    instant?: boolean;
} | undefined;

export class Spring {
    target = 0;
    value = 0;
    velocity = 0;
    tension = 0;
    reboundFriction = 0;
    typicalFriction = 0;
    isInstant = false;

    signal = store(0);

    applyConfig(
        settings?: SpringSettings,
    ) {
        this.typicalFriction = 0;
        this.reboundFriction = 50 / (settings?.weight ?? 1);
        this.tension = 100 * (settings?.speed ?? 1);
        this.isInstant = settings?.instant ?? false;

        return this;
    }

    constructor(initialValue?: number, settings?: SpringSettings) {
        if (initialValue !== undefined) {
            this.value = initialValue;
            this.target = initialValue;
            this.signal.set(initialValue);
        }
        this.applyConfig(settings);
    }

    update(dt: number) {
        if (this.isInstant) {
            this.value = this.target;
            this.velocity = 0;
            this.signal.set(this.value);
            return;
        }

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
