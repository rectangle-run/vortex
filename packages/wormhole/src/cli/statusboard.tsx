import {
	awaited,
	flatten,
	Lifetime,
	list,
	store,
	useDerived,
	useEffect,
	useInterval,
	useTimeout,
} from "@vortexjs/core";
import type { Project } from "~/state";
import { getImmediateValue, type Store, useState } from "@vortexjs/core";
import { cliApp } from "@vortexjs/cli";
import { Frame, Text } from "@vortexjs/intrinsics";
import { theme } from "./theme";

function Throbber() {
	let i = store(0);

	useInterval(100, () => {
		i.set(getImmediateValue(i) + 1);
	})

	const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

	const frame = useDerived((get) => {
		return frames[get(i) % frames.length];
	});

	return <Text color={theme.textMuted} weight="bold">
		{frame}
	</Text>
}

function TaskView({ task }: { task: Task }) {
	return <Text color={theme.text}>
		<Throbber /> {" "}
		{task.name}
	</Text>
}

export function StatusBoard(state: Project) {
	const lt = state.lt;
	using _hlt = Lifetime.changeHookLifetime(lt);

	const uptime = useState("uptime");
	let starting = Date.now();

	setInterval(() => {
		const uptimeMs = Date.now() - starting;
		let ms = uptimeMs;
		let seconds = Math.floor(ms / 1000);
		ms -= seconds * 1000;
		let minutes = Math.floor(seconds / 60);
		seconds -= minutes * 60;
		let hours = Math.floor(minutes / 60);
		minutes -= hours * 60;
		let days = Math.floor(hours / 24);
		hours -= days * 24;

		uptime.set(
			`${days}d ${hours}h ${minutes}m ${seconds}s`
		);
	}, 100);

	cliApp(<Frame width="100%" height="100%" direction="row" alignItems="stretch">
		<Frame grow={1} background={theme.background} padding={16} direction="column" gap={2}>
			<Text color={theme.text}>
				<Text color={theme.accent}>▐</Text>
				<Text background={theme.accent} color="black">
					•
				</Text>
				<Text color={theme.accent}>▌</Text> wormhole
			</Text>
			<Text color={theme.textMuted}>
				{uptime}
			</Text>
			<Frame width="100%" border={theme.border} padding={8} direction="column" gap={2}>
				<Frame padding={{ x: 2 }} position="absolute" left={2} top={-4} background={theme.background}>
					<Text color={theme.textMuted}>Tasks</Text>
				</Frame>

				{list(tasks).show((item) => (
					<TaskView task={item} />
				))}
			</Frame>
		</Frame>
		<Frame grow={1} background={theme.backgroundRaised} padding={16} direction="column" gap={2}>
			<Text color={theme.text}>Errors</Text>
		</Frame>
	</Frame>)
}

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
