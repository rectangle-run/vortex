import { resolve } from "node:path";

// Query packages with Turborepo
interface TurborepoPackages {
	packageManager: string;
	packages: {
		count: number;
		items: TurborepoPackage[];
	}
}
interface TurborepoPackage {
	name: string;
	path: string;
}
interface RichPackage {
	name: string;
	path: string;
	version: string;
	valid: boolean;
}
interface NpmPackage extends RichPackage {
	latestVersion: string | null;
}

if (Bun.env.NPM_TOKEN) {
	console.log("Signing in...");
	await Bun.$`npm set //registry.npmjs.org/:_authToken=${Bun.env.NPM_TOKEN}`;
}

console.log("Getting package info...");
const packages: TurborepoPackages = await Bun.$`turbo ls --output json`.json();

const richPackages = await Promise.all<RichPackage>(packages.packages.items.map(async (pkg) => {
	const packageJson = await Bun.file(`${pkg.path}/package.json`).json();
	return {
		...pkg,
		version: packageJson.version,
		valid: typeof packageJson.version === 'string' && !packageJson.private
	}
}));

console.log("Retrieving info from NPM");
const npmInfo = await Promise.all<NpmPackage>(richPackages.filter(x => x.valid).map(async (pkg) => {
	const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(pkg.name)}`);
	if (res.status === 404) {
		return {
			...pkg,
			latestVersion: null,
		}
	}
	const data = await res.json();
	return {
		...pkg,
		latestVersion: data['dist-tags'].latest,
	}
}));

console.log("Packages to publish:");
const toPublish = npmInfo.filter(pkg => !pkg.latestVersion || Bun.semver.order(pkg.version, pkg.latestVersion) === 1);

toPublish.forEach(pkg => {
	console.log(`- ${pkg.name} (${pkg.latestVersion ?? 'not published'} -> ${pkg.version})`);
});

console.log(`Publishing ${toPublish.length} packages...`);

await Promise.all(toPublish.map(async (pkg) => {
	console.log(`Publishing ${pkg.name}...`);
	const tarballPath = resolve(pkg.path, "tarball.tgz");
	await Bun.$.cwd(pkg.path)`bun pm pack --filename ${tarballPath}`;
	await Bun.$.cwd(pkg.path)`npm publish ${tarballPath} --access public`;
}));

export { }
