import route, { mutation } from "@vortexjs/wormhole/route";
import * as v from "valibot";

route("/", {
    page() {
        return (
            <>
                <h1 class="text-4xl font-bold">
                    Welcome to Wormhole, {Object.entries(globalThis).length}
                </h1>
                <p>
                    This is an example app, go to the{" "}
                    <a href="/docs/tada">docs</a>
                </p>
            </>
        );
    },
    layout({ children }) {
        return (
            <>
                <title>Wormhole Example</title>
                {children}
            </>
        );
    },
});

route("/docs/[page]", {
    page({ page }) {
        return (
            <>
                <h1>Documentation for {page}</h1>
                <p>This is the documentation page for {page}.</p>
            </>
        );
    },
});

export const hello = mutation("/api/hello", {
    schema: v.string(),
    impl(name) {
        console.log(`Hello, ${name}!`);
    }
})
