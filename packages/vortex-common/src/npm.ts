import { join, parse, sep } from "node:path";

export async function findTopLevelProject(cwd: string): Promise<string> {
    // Find the first parent directory that contains a package.json file, preferring files closer to root, example: /home/user/project/package.json over /home/user/project/packages/abc/package.json
    const parts = cwd.split(sep);
    let currentPath = parse(cwd).root;

    for (const part of parts.slice(1)) {
        currentPath = join(currentPath, part);
        const packageJsonPath = join(currentPath, "package.json");

        if (await Bun.file(packageJsonPath).exists()) {
            return currentPath;
        }
    }

    throw new Error("No package.json found in any parent directory.");
}
