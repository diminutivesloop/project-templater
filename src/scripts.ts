import { readFileSync } from "node:fs";
export interface TemplateScript {
  scriptPath: string;
  templateName: string;
  phase: "pre" | "post";
}

/**
 * Prompts the user with a y/N question; empty input defaults to No.
 */
export function confirm(message: string): boolean {
  const answer = prompt(`${message} [y/N]`);
  return answer?.trim().toLowerCase() === "y";
}

/**
 * Previews all scripts grouped by when they run relative to file creation,
 * labeled by the template they come from, and asks for a single upfront approval.
 */
export function confirmScripts(scripts: TemplateScript[]): boolean {
  if (scripts.length === 0) {
    return true;
  }
  const preScripts = scripts.filter((s) => s.phase === "pre");
  const postScripts = scripts.filter((s) => s.phase === "post");

  const printGroup = (label: string, group: TemplateScript[]) => {
    if (group.length === 0) {
      return;
    }
    console.log(label);
    for (const { scriptPath, templateName } of group) {
      const preview = readFileSync(scriptPath, "utf8").trim();
      console.log(`Template: ${templateName}\n---\n${preview}\n---`);
    }
  };

  console.log()
  printGroup("Pre Scripts - Run before files are created:", preScripts);
  console.log()
  printGroup("Post Scripts - Run after files are created:", postScripts);
  console.log()

  return confirm(`Run the ${scripts.length} script(s) above?`);
}

/**
 * Runs a shell script with the given cwd, inheriting stdio.
 */
export async function runScript(scriptPath: string, cwd: string): Promise<number> {
  const proc = Bun.spawn(["sh", scriptPath], { cwd, stdio: ["inherit", "inherit", "inherit"] });
   return await proc.exited;
}export async function runScripts(scripts: TemplateScript[], projectDir: string): Promise<void> {
  for (const { scriptPath, templateName, phase } of scripts) {
    const code = await runScript(scriptPath, projectDir);
    if (code !== 0) {
      throw new Error(`${phase} script for template ${templateName} exited with code ${code}`);
    }
  }
}

