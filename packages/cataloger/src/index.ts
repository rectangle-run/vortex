#!/usr/bin/env bun

import { join } from "node:path/posix";
import process from "node:process";
import { confirm, select } from "@inquirer/prompts";
import { findTopLevelProject, unwrap } from "@vortexjs/common";

const confirmation = await confirm({
	message:
		"Are you sure you want to continue? Cataloger is in beta, so you should make sure you have backups of your data.",
});

if (!confirmation) {
	process.exit(0);
}

const root = await findTopLevelProject(process.cwd());

console.log(root);

const glob = new Bun.Glob("**/package.json");

const packageJsons: string[] = [];

for await (const pkg of glob.scan({ cwd: root, absolute: true })) {
	if (!pkg.includes("node_modules") && pkg !== join(root, "package.json")) {
		packageJsons.push(pkg);
	}
}

const collectedVersions: Record<string, string[]> = {};

type DependencySet = Record<string, string>;

type PackageJson = {
	dependencies?: DependencySet;
	devDependencies?: DependencySet;
	peerDependencies?: DependencySet;
	optionalDependencies?: DependencySet;
	workspaces?: {
		catalog?: Record<string, string>;
	};
};

async function collectVersions(pkgPath: string) {
	const pkg: PackageJson = await Bun.file(pkgPath).json();

	const deps: DependencySet[] = [
		pkg.dependencies,
		pkg.devDependencies,
		pkg.peerDependencies,
		pkg.optionalDependencies,
	].filter((x) => x !== undefined);

	const unifiedDeps: Record<string, string> = {};

	for (const dep of deps) {
		for (const [name, version] of Object.entries(dep)) {
			unifiedDeps[name] = version;
		}
	}

	for (const name in unifiedDeps) {
		if (!collectedVersions[name]) {
			collectedVersions[name] = [];
		}
		collectedVersions[name].push(unwrap(unifiedDeps[name]));
	}
}

await Promise.all(
	packageJsons.map((pkgPath) => {
		return collectVersions(pkgPath);
	}),
);

const resolvedVersions: Record<string, string> = {};

function isWorkspace(version: string): boolean {
	return version.startsWith("workspace:");
}

function isCatalog(version: string): boolean {
	return version.startsWith("catalog:");
}

for (const name in collectedVersions) {
	const uniqueVersions = new Set(
		unwrap(collectedVersions[name]).filter((x) => !isCatalog(x)),
	);

	if (uniqueVersions.size === 1) {
		const version = unwrap(uniqueVersions.values().next().value);

		if (!isWorkspace(version)) {
			resolvedVersions[name] = version;
		}
	} else if (uniqueVersions.size > 1) {
		const opts = [...uniqueVersions];

		const selected = await select({
			message: `Multiple different versions are used for ${name}, which one should be definitive`,
			choices: opts.map((version) => ({
				name: version,
				value: version,
			})),
		});

		if (!isWorkspace(selected)) {
			resolvedVersions[name] = selected;
		}
	}
}

const rootPkg: PackageJson = await Bun.file(join(root, "package.json")).json();

rootPkg.workspaces ??= {};

rootPkg.workspaces.catalog ??= {};
rootPkg.workspaces.catalog = {
	...rootPkg.workspaces.catalog,
	...resolvedVersions,
};

await Bun.write(
	join(root, "package.json"),
	JSON.stringify(rootPkg, null, "\t"),
);

async function upgradePackageJson(pkgPath: string) {
	const pkg: PackageJson = await Bun.file(pkgPath).json();

	const deps: DependencySet[] = [
		pkg.dependencies,
		pkg.devDependencies,
		pkg.peerDependencies,
		pkg.optionalDependencies,
	].filter((x) => x !== undefined);

	for (const dep of deps) {
		for (const name in dep) {
			if (resolvedVersions[name]) {
				dep[name] = "catalog:";
			}
		}
	}

	await Bun.write(pkgPath, JSON.stringify(pkg, null, "\t"));
}

await Promise.all(
	packageJsons.map((pkgPath) => {
		return upgradePackageJson(pkgPath);
	}),
);

console.log(
	"All package.json files have been updated with the resolved versions.",
);
