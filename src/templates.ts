import { existsSync } from "node:fs";
import { join } from "node:path";

export const TEMPLATES_ROOT = join(import.meta.dir, "..", "templates");

/**
 * Resolves a dot-delimited template name into the ordered list of template
 * directories to apply, e.g. "js.bun" -> [".../templates/js", ".../templates/js.bun"].
 */
export function resolveTemplateChain(templateName: string): string[] {
  const parts = templateName.split(".");
  const chain: string[] = [];
  let cumulative = "";
  for (const part of parts) {
    cumulative = cumulative ? `${cumulative}.${part}` : part;
    const dir = join(TEMPLATES_ROOT, cumulative);
    if (!existsSync(dir)) {
      throw new Error(`Template "${cumulative}" not found (expected directory: ${dir})`);
    }
    chain.push(dir);
  }
  return chain;
}
