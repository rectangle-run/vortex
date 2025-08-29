import type { Use } from "@vortexjs/core";
import { projectElementToBox } from "./projection";
import { type TickProps, useAnimation } from "./scheduler";
import { Spring, type SpringSettings } from "./spring";

function getOffsetOrigin(elm: HTMLElement): HTMLElement {
    const pos = elm.computedStyleMap().get("position");
    const overflowX = elm.computedStyleMap().get("overflow-x");
    const overflowY = elm.computedStyleMap().get("overflow-y");

    if (
        pos === "absolute" ||
        pos === "fixed" ||
        overflowX === "scroll" ||
        overflowX === "auto" ||
        overflowY === "scroll" ||
        overflowY === "auto"
    ) {
        return elm;
    }
    if (elm.parentElement) {
        return getOffsetOrigin(elm.parentElement);
    }
    return document.body;
}

export interface LayoutProps {
    id?: string;
    startsFrom?: string;
    spring?: SpringSettings;
}

interface LayoutNode {
    offsetOrigin: HTMLElement;
    previousOOX: number;
    previousOOY: number;

    top: Spring;
    left: Spring;
    width: Spring;
    height: Spring;
}

const layoutInformationTable = new Map<string, LayoutNode>();

async function nextTick() {
    const { promise, resolve } = Promise.withResolvers();

    (window.setImmediate ?? window.setTimeout)(() => {
        resolve();
    });

    await promise;
}

export function layout(props?: LayoutProps): Use<HTMLElement> {
    const id = props?.id ?? crypto.randomUUID();
    const springSettings = props?.spring;

    return async ({ ref, lt }) => {
        await nextTick();

        let info = layoutInformationTable.get(id);

        if (!info) {
            const offsetOrigin = getOffsetOrigin(ref);
            const box = ref.getBoundingClientRect();
            const ooBox = offsetOrigin.getBoundingClientRect();

            info = {
                offsetOrigin,
                previousOOX: ooBox.left,
                previousOOY: ooBox.top,

                top: new Spring(box.top, springSettings),
                left: new Spring(box.left, springSettings),
                width: new Spring(box.width, springSettings),
                height: new Spring(box.height, springSettings),
            };

            layoutInformationTable.set(id, info);
        }

        if (props?.startsFrom) {
            const startsFromInfo = layoutInformationTable.get(props.startsFrom);
            if (startsFromInfo) {
                info.top.value = startsFromInfo.top.value;
                info.left.value = startsFromInfo.left.value;
                info.width.value = startsFromInfo.width.value;
                info.height.value = startsFromInfo.height.value;
            }
        }

        const tick = (props: TickProps) => {
            if (!info) return;

            const { left, top, width, height } = info;

            const currentOO = getOffsetOrigin(ref);

            if (currentOO === info.offsetOrigin) {
                const ooBox = info.offsetOrigin.getBoundingClientRect();
                const deltaX = ooBox.left - info.previousOOX;
                const deltaY = ooBox.top - info.previousOOY;

                left.value += deltaX;
                top.value += deltaY;

                info.previousOOX = ooBox.left;
                info.previousOOY = ooBox.top;
            } else {
                info.offsetOrigin = currentOO;
                const ooBox = info.offsetOrigin.getBoundingClientRect();
                info.previousOOX = ooBox.left;
                info.previousOOY = ooBox.top;
            }

            ref.style.transform = "";
            const box = ref.getBoundingClientRect();

            left.target = box.left;
            top.target = box.top;
            width.target = box.width;
            height.target = box.height;

            left.update(props.dtSeconds);
            top.update(props.dtSeconds);
            width.update(props.dtSeconds);
            height.update(props.dtSeconds);

            projectElementToBox(ref, {
                left: left.value,
                top: top.value,
                width: width.value,
                height: height.value,
            });
        };

        useAnimation(
            {
                impl: tick,
            },
            lt,
        );
    };
}
