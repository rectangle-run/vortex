#!/usr/bin/env bun

import { Lifetime } from "@vortexjs/core";
import { StatusBoard } from "~/cli/statusboard";
import { Project } from "~/state";
import { DevServer } from "./dev/dev-server";

const projectDir = process.cwd();

const lt = new Lifetime();

const state = new Project(projectDir, lt);

await state.init();

DevServer(state);

StatusBoard(state);
