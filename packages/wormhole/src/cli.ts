#!/usr/bin/env bun

import { Lifetime } from "@vortexjs/core";
import { informationBoard } from "./compile-time/infoboard";
import { developmentServer } from "./compile-time/server";

const projectDir = process.cwd();

const lt = new Lifetime();

informationBoard(lt);
developmentServer(lt, projectDir);
