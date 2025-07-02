#!/usr/bin/env bun

import { Lifetime } from "@vortexjs/core";
import { informationBoard } from "./compile-time/infoboard";
import { developmentServer } from "./compile-time/server";
import { State } from "./state";

const projectDir = process.cwd();

const lt = new Lifetime();

informationBoard(lt);

const state = new State(projectDir, lt);

developmentServer(state);
