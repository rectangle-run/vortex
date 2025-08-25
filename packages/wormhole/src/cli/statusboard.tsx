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
import { cliApp, colors } from "@vortexjs/cli";
import { Frame, Text } from "@vortexjs/intrinsics";
import { theme } from "./theme";
import type { HTTPMethod } from "~/shared/http-method";

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
    linearView.enabled = false;

    const lt = state.lt;
    using _hlt = Lifetime.changeHookLifetime(lt);

    cliApp(<Frame width="100%" height="100%" direction="row" alignItems="stretch">
        <LeftPanel />
        <LogPanel />
    </Frame>)
}

function Prefix({ text, color }: { text: string; color: string }) {
    const width = 6;

    return <Text color={color} weight="bold">
        {text.padEnd(width, " ")}
    </Text>
}

function getMethodColor(method: HTTPMethod): string {
    switch (method) {
        case "GET":
            return colors.blue[400];
        case "POST":
            return colors.emerald[400];
        case "DELETE":
            return colors.red[400];
        case "PATCH":
            return colors.yellow[400];
    }
}

function StatusCode({ code }: { code: number }) {
    let accent = colors.gray[400];

    if (code >= 400 && code < 500) {
        accent = colors.rose[400];
    }
    if (code >= 500) {
        accent = colors.red[400];
    }
    if (code >= 300 && code < 400) {
        accent = colors.emerald[400];
    }

    return <Text color={accent} weight="bold">
        {code.toString().padStart(3, "0")}
    </Text>
}

function NetworkTag({ tag }: { tag: RequestTag }) {
    let color: string;

    switch (tag) {
        case "api":
            color = colors.blue[400];
            break;
        case "static":
            color = colors.emerald[400];
            break;
        case "ssr":
            color = colors.yellow[400];
            break;
        case "query":
            color = colors.purple[400];
            break;
        case "mutation":
            color = colors.orange[400];
            break;
        default:
            color = colors.gray[400];
    }

    return <Text color={color}>
        {" "}({tag})
    </Text>;
}

function LogView({ log }: { log: Log }) {
    if (log.type === "raw") {
        return <Text color={log.color ?? theme.textMuted}>
            {log.message}
        </Text>;
    } else if (log.type === "request") {
        const urlLength = 25;

        return <Text color={theme.text}>
            <Prefix text={log.method} color={getMethodColor(log.method)} /> {log.url.padEnd(urlLength)} <StatusCode code={log.responseCode} />
            {list(log.tags).show(tag => <NetworkTag tag={tag} />)}
        </Text>;
    }
    return <></>;
}

function LogPanel() {
    enableConsoleLogShim();

    return <Frame grow={1} background={theme.backgroundRaised} padding={16} direction="column" gap={2}>
        <Text color={theme.text}>Logger</Text>
        <Frame width="100%" grow={1} clip>
            <Frame position="absolute" left={0} bottom={0} right={0} minHeight="100%" direction="column">
                {list(logs).show(log => <LogView log={log} />)}
            </Frame>
        </Frame>
    </Frame>
}

export interface Task {
    [Symbol.dispose]: () => void;
    name: string;
}

export type RequestTag = "api" | "static" | "ssr" | "query" | "mutation";

export type Log = {
    type: "raw";
    message: string;
    color?: string;
} | {
    type: "request";
    method: HTTPMethod;
    url: string;
    responseCode: number;
    tags: RequestTag[];
}

export const tasks: Store<Task[]> = useState([]);
export const logs: Store<Log[]> = useState([]);

export function addLog(log: Log) {
    logs.set([...getImmediateValue(logs), log]);
}

function enableConsoleLogShim() {
    const formatArgs = (args: any[]) => {
        return args.map(x => typeof x === "string" ? x : Bun.inspect(x)).join(" ")
    }

    console.log = (...args: any[]) => {
        const formatted = formatArgs(args);
        addLog({ type: "raw", message: formatted });
    }

    console.error = (...args: any[]) => {
        const formatted = formatArgs(args);
        addLog({ type: "raw", message: formatted, color: colors.red[400] });
    }

    console.warn = (...args: any[]) => {
        const formatted = formatArgs(args);
        addLog({ type: "raw", message: formatted, color: colors.yellow[400] });
    }
}

function LeftPanel() {
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

    return <Frame grow={1} background={theme.background} padding={16} direction="column" gap={2}>
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
    </Frame>;
}

const linearView = {
    enabled: true
}

export function addTask(props: Omit<Task, typeof Symbol.dispose>): Task {
    const task: Task = {
        ...props,
        [Symbol.dispose]: () => {
            tasks.set(getImmediateValue(tasks).filter((t) => t !== task));

            if (linearView.enabled) {
                console.log(`[${task.name}]: done`);
            }
        },
    };

    if (linearView.enabled) {
        console.log(`[${task.name}]: started`);
    }

    tasks.set([...getImmediateValue(tasks), task]);

    return task;
}
