#!/usr/bin/env bun

import { Lifetime } from "@vortexjs/core";
import { statusBoard } from "~/cli/statusboard";
import { Project } from "~/state";
import { Build } from "./build/build";

const projectDir = process.cwd();

const lt = new Lifetime();

const state = new Project(projectDir, lt);

await state.init();

const build = new Build(state);

await build.run();

statusBoard(state);
