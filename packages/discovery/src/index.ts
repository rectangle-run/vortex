import type { PippinPlugin } from "@vortexjs/pippin";
import type { DiscoveryPluginProps, DiscoveryTarget } from "./api";
import { discoveryCompile } from "./compiler";
import { eventSchema, nonConstantFastHash } from "@vortexjs/cache";
import { hash } from "@vortexjs/common";
import { checkForCues } from "./ques";

export * from "./api";
export { discoveryCompile } from "./compiler";

export function pippinPluginDiscovery(
    opts: DiscoveryPluginProps,
): PippinPlugin {
    return {
        name: "Discovery",
        description: "Compiler to power ergonomic framework APIs",
        transformers: [
            {
                async transform(props) {
                    if (props.format.type !== "ecma") {
                        return;
                    }

                    if (!checkForCues(props.source)) {
                        return;
                    }

                    const { source, errors } = await discoveryCompile({
                        ...props,
                        target: opts.target,
                        jsx: props.format.jsx,
                        typescript: props.format.typescript,
                        fileName: props.path,
                        cache: props.cache
                    });

                    for (const error of errors) {
                        await props.logError(error);
                    }

                    return {
                        source,
                        format: props.format,
                    };
                },
            },
        ],
    };
}

export * from "./ques";
