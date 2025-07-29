#!/usr/bin/env bun

import { Lifetime } from "@vortexjs/core";
import { statusBoard } from "~/cli/statusboard";
import { developmentServer } from "~/dev/server";
import { State } from "~/state";

const projectDir = process.cwd();

const lt = new Lifetime();

const state = new State(projectDir, lt);

await state.init();

developmentServer(state);
statusBoard(state);
