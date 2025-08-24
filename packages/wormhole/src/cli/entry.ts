import chalk from "chalk";
import { createPrinter } from "./printer";
import { colors } from "@vortexjs/cli";
import { version } from "../../package.json" assert { type: "json" };
import { command, parseArgs, optional, positional } from "@vortexjs/args";
import { Project } from "~/state";
import { Lifetime } from "@vortexjs/core";
import { DevServer } from "~/dev/dev-server";
import { StatusBoard } from "./statusboard";
import { Build } from "~/build/build";
import { VercelAdapter } from "~/build/adapters/vercel";

function showHelp() {
    const printer = createPrinter();

    {
        using _head = printer.group("Meta");

        printer.log(`This is the Wormhole CLI. Wormhole is a metaframework for Vortex, designed to make development easier.`);
        printer.log(`Wormhole is beta software, so please keep that in the back of your mind.`);

        printer.gap();
        printer.log(`Version: ${version}`);
        printer.log(`Bun version: ${Bun.version}`);
    }

    {
        using _head = printer.group("Usage");

        const commands = [
            ["wh help", "Show this help command"],
            ["wh dev", "Start the development server"],
            ["wh build vercel", "Build for Vercel deployment"]
        ];

        const firstColumnWidth = Math.max(...commands.map(c => c[0]!.length)) + 2;

        for (const [command, description] of commands) {
            printer.log(
                `${chalk.hex(Bun.color(colors.emerald[400], "hex")!)(command!.padEnd(firstColumnWidth))} ${description}`,
            );
        }
    }
    printer.show();

    process.exit(1);
}

const commands = [
    command(async () => {
        const lt = new Lifetime();
        const state = new Project(process.cwd(), lt);

        await state.init();

        DevServer(state);
        StatusBoard(state);
    }, "dev"),
    command(async ({ platform }: { platform?: string }) => {
        const lt = new Lifetime();
        const state = new Project(process.cwd(), lt);

        await state.init();

        let adapter;
        switch (platform) {
            case "vercel":
                adapter = VercelAdapter();
                break;
            default:
                console.error(`Unknown platform: ${platform}. Supported platforms: vercel`);
                process.exit(1);
        }

        const build = new Build(state, adapter);
        const result = await build.run();

        console.log(`Build completed successfully!`);
        console.log(`Output directory: ${result.outputDir}`);
        console.log(`Static directory: ${result.staticDir}`);
        console.log(`Functions directory: ${result.functionsDir}`);
        console.log(`Config file: ${result.configFile}`);
    }, "build", optional(positional("platform")))
]

export async function cliMain(args: string[]) {
    await parseArgs({
        commands,
        args,
        showHelp
    });
}
