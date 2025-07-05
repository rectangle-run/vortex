import { expect, test } from "bun:test";
import { discoveryCompile } from "../src";

test("client output", async () => {
	expect(
		await discoveryCompile({
			fileName: "test.wormhole",
			source: `
			import route from "@vortexjs/wormhole/route";

route(
    "/",
    {
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
                    <head>
                        <title>Wormhole Example</title>
                    </head>
                    <body>{children}</body>
                </>
            );
        },
    },
);

route(
    "/docs/[page]",
    {
        page({ page }) {
            return (
                <>
                    <h1>Documentation for {page}</h1>
                    <p>This is the documentation page for {page}.</p>
                </>
            );
        },
    }
);
        `,
			jsx: true,
			typescript: true,
			target: "client",
		}),
	).toMatchInlineSnapshot(`
	  {
	    "discoveries": [
	      {
	        "exported": "$d_0",
	        "frameType": "page",
	        "path": "/",
	        "type": "route_frame",
	      },
	      {
	        "exported": "$d_1",
	        "frameType": "layout",
	        "path": "/",
	        "type": "route_frame",
	      },
	      {
	        "exported": "$d_2",
	        "frameType": "page",
	        "path": "/docs/[page]",
	        "type": "route_frame",
	      },
	    ],
	    "errors": [],
	    "source": 
	  "import route from "@vortexjs/wormhole/route";

	  export const $d_0 = function () {
	  	return <>
	                      <h1 class="text-4xl font-bold">
	                          Welcome to Wormhole, {Object.entries(globalThis).length}
	                      </h1>
	                      <p>
	                          This is an example app, go to the{" "}
	                          <a href="/docs/tada">docs</a>
	                      </p>
	                  </>;
	  };

	  export const $d_1 = function ({ children }) {
	  	return <>
	                      <head>
	                          <title>Wormhole Example</title>
	                      </head>
	                      <body>{children}</body>
	                  </>;
	  };

	  export const $d_2 = function ({ page }) {
	  	return <>
	                      <h1>Documentation for {page}</h1>
	                      <p>This is the documentation page for {page}.</p>
	                  </>;
	  };"
	  ,
	  }
	`);
});
