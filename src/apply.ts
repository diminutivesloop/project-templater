import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, join } from "node:path";
import { confirmScripts, runScripts, type TemplateScript } from "./scripts.ts";

const APPEND_PREFIX = "[+]";

function copyTemplateFiles(templateDir: string, projectDir: string): void {
  const walk = (relDir: string) => {
    mkdirSync(join(projectDir, relDir), { recursive: true });
    const currentDir = join(templateDir, relDir);

    for (const entry of readdirSync(currentDir)) {
      const entryRelPath = join(relDir, entry);
      const srcPath = join(templateDir, entryRelPath);

      // pre.sh/post.sh are control scripts, not project files, only at the template root
      if (relDir === "" && (entry === "pre.sh" || entry === "post.sh")) {
        continue;
      }

      if (statSync(srcPath).isDirectory()) {
        walk(entryRelPath);
        continue;
      }

      const shouldAppend = entry.startsWith(APPEND_PREFIX);
      const destName = shouldAppend ? entry.slice(APPEND_PREFIX.length) : entry;
      const destRelPath = join(relDir, destName);
      const destPath = join(projectDir, destRelPath);

      const content = readFileSync(srcPath, "utf8");
      if (shouldAppend && existsSync(destPath)) {
        const existing = readFileSync(destPath, "utf8");
        const separator = existing.endsWith("\n") ? "" : "\n";
        writeFileSync(destPath, existing + separator + content);
      } else {
        writeFileSync(destPath, content);
      }
    }
  };
  walk("");
}

/**
 * Applies a template chain in three passes across all levels, in template order:
 * all pre.sh, then all file copies, then all post.sh. All scripts are approved
 * upfront with a single confirmation before anything runs.
 */
export async function applyTemplate(
  chain: string[],
  projectDir: string,
): Promise<void> {
  const toTemplateScript = (
    templateDir: string,
    phase: TemplateScript["phase"],
  ): TemplateScript => ({
    scriptPath: join(templateDir, `${phase}.sh`),
    templateName: basename(templateDir),
    phase,
  });

  const preScripts = chain
    .map((dir) => toTemplateScript(dir, "pre"))
    .filter((s) => existsSync(s.scriptPath));
  const postScripts = chain
    .reverse()
    .map((dir) => toTemplateScript(dir, "post"))
    .filter((s) => existsSync(s.scriptPath));
  const scriptsApproved = confirmScripts([...preScripts, ...postScripts]);
  console.log();

  if (scriptsApproved) {
    await runScripts(preScripts, projectDir);
  }

  for (const templateDir of chain) {
    copyTemplateFiles(templateDir, projectDir);
  }

  if (scriptsApproved) {
    await runScripts(postScripts, projectDir);
  }
}
