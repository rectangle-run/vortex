#!/usr/bin/env bun

import { cliApp, colors } from "@vortexjs/cli";
import { Frame, Text } from "@vortexjs/intrinsics";

cliApp(
	<Frame
		border={colors.emerald[700]}
		background={colors.emerald[950]}
		width="100%"
		height="100%"
		padding={15}
		direction="column"
		gap={2}
	>
		<Text>
			This is a{" "}
			<Text italic color={colors.rose[600]} weight="bold">
				*test*
			</Text>
		</Text>

		<Text>
			This is not a{" "}
			<Text italic color={colors.lime[600]} weight="bold">
				*test*
			</Text>
		</Text>
	</Frame>,
);

// const projectDir = process.cwd();

// const lt = new Lifetime();

// const state = new Project(projectDir, lt);

// await state.init();

// DevServer(state);

// StatusBoard(state);
