import { $ } from "bun";
import inquirer from 'inquirer';
import { readdir, readFile } from "node:fs/promises";

type Version = [number, number, number];
type Scale = "major" | "minor" | "patch";

function updateVersion(
	version: Version,
	scale: Scale,
) {
	switch (scale) {
		case "major":
			return [version[0] + 1, 0, 0] as Version;
		case "minor":
			return [version[0], version[1] + 1, 0] as Version;
		case "patch":
			return [version[0], version[1], version[2] + 1] as Version;
		default:
			throw new Error(`Unknown scale: ${scale}`);
	}
}

interface Change {
	version: Version;
	title: string;
	scale: Scale;
}

interface VersionFile {
	changes: Change[];
}

const versions = JSON.parse(
	await readFile("./versions.json", "utf-8"),
) as VersionFile;

const { title, git, scale } = await inquirer.prompt([
	{
		type: "input",
		name: "title",
		message: "Enter the title of the change:",
	},
	{
		type: "list",
		name: "scale",
		message: "Select the scale of the change:",
		choices: ["major", "minor", "patch"],
	},
	{
		type: "confirm",
		name: "git",
		message: "Should I commit the changes to git?",
	}
]);

const currentVersion = versions.changes.length > 0
	? versions.changes[versions.changes.length - 1].version
	: [0, 0, 0] as Version;

const newVersion = updateVersion(currentVersion, scale);

const change: Change = {
	version: newVersion,
	title,
	scale,
};

versions.changes.push(change);

await Bun.write("./versions.json", JSON.stringify(versions, null, 2));

const scaleTag = {
	major: "breaking",
	minor: "feat",
	patch: "fix",
}[scale];

if (git) {
	await $`git add .`;
	await $`git commit -m "${scaleTag}(${change.version.join('.')}) - ${title}"`;
	await $`git tag v${change.version.join('.')}`;
	await $`git push`;
}

// Publish to npm
const packages = await readdir("./packages");

for (const packageName of packages) {
	const packagePath = `./packages/${packageName}`;
	const packageJsonPath = `${packagePath}/package.json`;

	const packageJson = JSON.parse(
		await readFile(packageJsonPath, "utf-8"),
	);

	packageJson.version = newVersion.join('.');

	await Bun.write(packageJsonPath, JSON.stringify(packageJson, null, 2));

	await $.cwd(packagePath)`npm publish --access public`;
}
