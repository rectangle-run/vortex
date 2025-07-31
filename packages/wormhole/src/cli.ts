#!/usr/bin/env bun

import { Lifetime } from "@vortexjs/core";
import { statusBoard } from "~/cli/statusboard";
import { Project } from "~/state";

const projectDir = process.cwd();

const lt = new Lifetime();

const state = new Project(projectDir, lt);

await state.init();

statusBoard(state);
