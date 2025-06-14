#!/usr/bin/env bun

import { Lifetime } from "@vortexjs/core";
import { compileScript } from "@vortexjs/discovery";
import { getConfig } from "./dev/config";
import { createErrorCollector } from "./dev/markup";
import { developmentServer } from "./dev/server";
import { taskBoard } from "./dev/tasks";

const lt = new Lifetime();
const config = await getConfig(lt, process.cwd());

taskBoard(lt);
developmentServer(lt, config);

const errorCollector = createErrorCollector();

const { discoveries, source } = compileScript(`import test from "@vortexjs/wormhole/route";
	test("/", {
		page() {
			return (
				<>
					<h1>Welcome to Wormhole</h1>
					<p>This is an example app</p>
				</>
			);
		},
	});`, "text.tsx");

console.log({ discoveries, source });
