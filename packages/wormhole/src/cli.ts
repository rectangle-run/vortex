#!/usr/bin/env bun

import { Lifetime } from "@vortexjs/core";
import { getConfig } from "./dev/config";
import { createErrorCollector } from "./dev/markup";
import { developmentServer } from "./dev/server";
import { taskBoard } from "./dev/tasks";
import { discovery_compile, discovery_debug, discovery_new } from "./discovery";

const lt = new Lifetime();
const config = await getConfig(lt, process.cwd());

taskBoard(lt);
developmentServer(lt, config);

const errorCollector = createErrorCollector();

const discovery = discovery_new({
	filename: "test",
	source: `import test from "@vortexjs/wormhole/route";
	test("/", {
		page() {
			return (
				<>
					<h1>Welcome to Wormhole</h1>
					<p>This is an example app</p>
				</>
			);
		},
	});`,
	errors: errorCollector,
});

await discovery_compile(discovery);

discovery_debug(discovery);
