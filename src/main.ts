#!/usr/bin/env bun

import { applyTemplate } from "./apply.ts";
import { resolveProjectDir } from "./project.ts";
import { findTemplatesRoot, resolveTemplateChain } from "./templates.ts";
import * as Bun from "bun";

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (command === "edit") {
    if (args.length > 0) {
      throw new Error('The "edit" subcommand does not accept arguments');
    }
    const templatesRoot = findTemplatesRoot();
    console.log(`Opening project templates at ${templatesRoot}...`);
    await openInEditor(templatesRoot);
    return;
  }

  const [templateName, projectName] = [command, ...args];
  if (!templateName) {
    console.error(
      "Usage: project-templater <template> [project-name]\n       project-templater edit",
    );
    process.exit(1);
  }

  const chain = resolveTemplateChain(templateName);
  const { dir, name } = resolveProjectDir(projectName);
  console.log(`Scaffolding "${name}" with template "${templateName}"...`);

  await applyTemplate(chain, dir);
  console.log(`Done. Project created at ${dir}`);
}

main().catch((err) => {
  console.error(`Error: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});

export async function openInEditor(directory: string): Promise<void> {
  const editor = process.env.VISUAL ?? process.env.EDITOR ?? "code";
  const proc = Bun.spawn(["sh", "-c", `${editor} "${directory}"`], {
    stdio: ["inherit", "inherit", "inherit"],
  });
  const code = await proc.exited;
  if (code !== 0) {
    throw new Error(`Editor exited with code ${code}`);
  }
}
