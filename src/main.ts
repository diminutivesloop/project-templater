#!/usr/bin/env bun

import { applyTemplate } from "./apply.ts";
import { resolveProjectDir } from "./project.ts";
import { resolveTemplateChain } from "./templates.ts";

async function main() {
  const [templateName, projectName] = process.argv.slice(2);
  if (!templateName) {
    console.error("Usage: project-templater <template> [project-name]");
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
