import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { basename, resolve } from "node:path";

function isEmptyDir(dir: string): boolean {
  return readdirSync(dir).length === 0;
}

/**
 * Resolves and prepares the target project directory, returning its path and name.
 */
export function resolveProjectDir(projectName: string | undefined): {
  dir: string;
  name: string;
} {
  if (projectName) {
    const dir = resolve(projectName);
    if (existsSync(dir)) {
      if (!isEmptyDir(dir)) {
        throw new Error(
          `Project folder "${dir}" already exists and is not empty`,
        );
      }
    } else {
      mkdirSync(dir, { recursive: true });
    }
    return { dir, name: basename(dir) };
  }

  const cwd = process.cwd();
  if (!isEmptyDir(cwd)) {
    throw new Error(
      `Current directory "${cwd}" is not empty; pass a project name to create a new folder`,
    );
  }
  return { dir: cwd, name: basename(cwd) };
}
