#!/usr/bin/env bun

import { cliMain } from "./cli/entry";

await cliMain(process.argv.slice(2));
