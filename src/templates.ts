import { existsSync, statSync } from "node:fs";
import { dirname, join, parse } from "node:path";

const TEMPLATES_DIR_NAME = "project-templates";

/**
 * Walks up from the current directory looking for a
 * templates directory, returning its path.
 */
export function findTemplatesRoot(): string {
  let dir = process.cwd();
  do {
    const candidate = join(dir, TEMPLATES_DIR_NAME);
    if (existsSync(candidate) && statSync(candidate).isDirectory()) {
      return candidate;
    }
    dir = dirname(dir);
  } while (dir !== parse(dir).root);
  throw new Error(
    `Could not find a "${TEMPLATES_DIR_NAME}" directory in current directory or any parent directory`,
  );
}

/**
 * Resolves a dot-delimited template name into the ordered list of template
 * directories to apply, e.g. "js.bun" -> [".../templates/js", ".../templates/js.bun"].
 */
export function resolveTemplateChain(templateName: string): string[] {
  const templatesRoot = findTemplatesRoot();
  const parts = templateName.split(".");
  const chain: string[] = [];
  let cumulative = "";
  for (const part of parts) {
    cumulative = cumulative ? `${cumulative}.${part}` : part;
    const dir = join(templatesRoot, cumulative);
    if (!existsSync(dir)) {
      throw new Error(
        `Template "${cumulative}" not found (expected directory: ${dir})`,
      );
    }
    chain.push(dir);
  }
  return chain;
}
