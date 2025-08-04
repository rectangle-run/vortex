import { unwrap } from "@vortexjs/common";
import {
	useAwait,
	ContextScope,
	flatten,
	type JSXNode,
	Lifetime,
	render,
	type Renderer,
	useDerived,
	useState,
	useStreaming,
} from "@vortexjs/core";
import { matchPath, type RoutePath } from "~/build/router";
import { initializeClientSideRouting, usePathname } from "~/runtime/csr";

export interface EntrypointImport {
	index: number;
}

export interface EntrypointRoute {
	matcher: RoutePath;
	frames: EntrypointImport[];
}

export interface EntrypointProps {
	routes: EntrypointRoute[];
}

function App({
	pathname: pathnameToUse,
	props,
	loaders
}: {
	pathname?: string,
	props: EntrypointProps
	loaders: (() => Promise<any>)[],
}) {
	if ("location" in globalThis) {
		initializeClientSideRouting();
	}

	useStreaming();

	const awaited = useAwait();

	const pathname = pathnameToUse ? useState(pathnameToUse) : usePathname();
	const route = useDerived((get) => {
		const path = get(pathname);
		return props.routes.find((r) => matchPath(r.matcher, path));
	});
	const framesPromise = useDerived(async (get) => {
		const rot = unwrap(get(route));
		const frames = [];

		for (const frame of rot.frames) {
			frames.push(await unwrap(loaders[frame.index])());
		}

		return frames;
	});
	const frames = flatten(useDerived((get) => {
		return awaited(get(framesPromise))
	}));
	const hierarchy = useDerived((get) => {
		let node = <></>;

		const framesResolved = get(frames);

		if (!framesResolved) {
			return <h1>loading</h1>
		}

		for (const Frame of framesResolved.toReversed()) {
			node = <Frame>
				{node}
			</Frame>
		}

		return node;
	})

	return <html>
		<head>
			<link rel="stylesheet" href="/styles.css" />
			<script src="/entrypoint-client.js" type="module"></script>
		</head>
		<body>
			{hierarchy}
		</body>
	</html>;
}

export function INTERNAL_entrypoint<Root>({
	props,
	loaders,
	renderer,
	root,
	pathname,
	lifetime = new Lifetime(),
	context
}: {
	props: EntrypointProps, loaders: (() => Promise<any>)[], renderer: Renderer<Root, any>, root: Root, pathname?: string,
	lifetime?: Lifetime, context: ContextScope
}) {
	render({
		context,
		renderer,
		root,
		component: <App pathname={pathname} props={props} loaders={loaders} />
	}).cascadesFrom(lifetime);
}
