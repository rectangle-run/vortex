import {
	Lifetime,
	type Store,
	getImmediateValue,
	useEffect,
	useState,
} from "@vortexjs/core";

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

export function taskBoard(lt: Lifetime) {
	using _hlt = Lifetime.changeHookLifetime(lt);

	useEffect((get) => {
		console.clear();

		const currentTasks = get(tasks);

		if (currentTasks.length === 0) {
			console.log("No tasks available.");
		} else {
			for (const task of currentTasks) {
				console.log(`- ${task.name}`);
			}
		}
	});
}
