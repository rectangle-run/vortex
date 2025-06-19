import { type Store, getImmediateValue, useState } from "@vortexjs/core";

export interface Task {
	[Symbol.dispose]: () => void;
	name: string;
}

export const tasks: Store<Task[]> = useState([]);

export function addTask(props: Omit<Task, typeof Symbol.dispose>): Task {
	const task: Task = {
		...props,
		[Symbol.dispose]: () => {
			tasks.set(getImmediateValue(tasks).filter((t) => t !== task));
		},
	};

	tasks.set([...getImmediateValue(tasks), task]);

	return task;
}
