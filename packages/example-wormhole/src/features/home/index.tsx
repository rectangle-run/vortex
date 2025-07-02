import route from "@vortexjs/wormhole/route";

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
				<head>
					<title>Wormhole Example</title>
				</head>
				<body>{children}</body>
			</>
		);
	},
});

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
	},
	3,
);
