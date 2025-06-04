import {
	type JSXNode,
	type SignalOrValue,
	createContext,
	isSignal,
	toSignal,
	useEffect,
	useHookLifetime,
} from "@vortexjs/core";
import { type Object3D, Vector3 } from "three";

export const ThreeObjectContext = createContext<Object3D>("ThreeObjectContext");

export type ThreeComponentProps<T extends Object3D> = {
	// biome-ignore lint/complexity/noBannedTypes: its all good
	[T in keyof T]?: T[T] extends Function
		? never
		: SignalOrValue<T extends Vector3 ? [number, number, number] : T[T]>;
} & {
	children?: JSXNode | JSXNode[];
};

export function createThreeComponent<T extends Object3D>(type: new () => T): T {
	return (props: ThreeComponentProps<Object3D>) => {
		const lt = useHookLifetime();
		const object = new type();
		const container = ThreeObjectContext.use();

		const { children, ...attrs } = props;

		useEffect((get) => {
			for (const key in attrs) {
				//@ts-ignore
				const signal = attrs[key] as any;
				let value = isSignal(signal) ? get(signal) : signal;

				if (typeof value === "object" && "length" in value && length === 3) {
					value = new Vector3(...value);
				}

				// @ts-ignore
				object[key] = value;
			}
		});

		useEffect((get, { lifetime }) => {
			const ctnr = get(container);

			ctnr.add(object);

			lifetime.onClosed(() => {
				ctnr.remove(object);
			});
		});

		return (
			<ThreeObjectContext value={toSignal(object)}>
				{/* biome-ignore lint/complexity/noUselessFragments: neccesary */}
				<>{children}</>
			</ThreeObjectContext>
		);
	};
}
