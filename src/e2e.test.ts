import { afterEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";

const CLI_PATH = resolve(import.meta.dir, "main.ts");
const temporaryWorkspaces: string[] = [];

afterEach(() => {
  for (const workspace of temporaryWorkspaces.splice(0)) {
    rmSync(workspace, { force: true, recursive: true });
  }
});

function createWorkspace(options: { createTemplatesDir?: boolean } = {}): {
  root: string;
  invocationDir: string;
  templatesDir: string;
} {
  const { createTemplatesDir = true } = options;
  const root = mkdtempSync(join(tmpdir(), "project-templater-e2e-"));
  temporaryWorkspaces.push(root);

  const templatesDir = join(root, "project-templates");
  const invocationDir = join(root, "workspace", "nested");
  if (createTemplatesDir) {
    mkdirSync(templatesDir, { recursive: true });
  }
  mkdirSync(invocationDir, { recursive: true });

  return { root, invocationDir, templatesDir };
}

function writeFixture(filePath: string, content: string): void {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, content);
}

async function runCli(
  cwd: string,
  args: string[],
  stdin?: string,
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const childProcess = Bun.spawn([process.execPath, CLI_PATH, ...args], {
    cwd,
    stderr: "pipe",
    stdout: "pipe",
    stdin: stdin === undefined ? "inherit" : "pipe",
  });

  if (stdin !== undefined) {
    const childStdin = childProcess.stdin;
    if (!childStdin) {
      throw new Error("CLI stdin was not opened as a pipe");
    }
    childStdin.write(stdin);
    childStdin.end();
  }

  const [exitCode, stdout, stderr] = await Promise.all([
    childProcess.exited,
    new Response(childProcess.stdout).text(),
    new Response(childProcess.stderr).text(),
  ]);

  return { exitCode, stderr, stdout };
}

describe("project-templater CLI", () => {
  test("scaffolds a project from a nested working directory", async () => {
    const { invocationDir, templatesDir } = createWorkspace();
    const templateDir = join(templatesDir, "base");
    writeFixture(join(templateDir, "README.md"), "# Generated project\n");
    writeFixture(join(templateDir, "src", "index.ts"), "export {};\n");

    const result = await runCli(invocationDir, ["base", "generated-app"]);
    const projectDir = join(realpathSync(invocationDir), "generated-app");

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain(
      'Scaffolding "generated-app" with template "base"...',
    );
    expect(result.stdout).toContain(`Done. Project created at ${projectDir}`);
    expect(readFileSync(join(projectDir, "README.md"), "utf8")).toBe(
      "# Generated project\n",
    );
    expect(readFileSync(join(projectDir, "src", "index.ts"), "utf8")).toBe(
      "export {};\n",
    );
  });

  test("uses an empty working directory when no project name is provided", async () => {
    const { invocationDir, templatesDir } = createWorkspace();
    const templateDir = join(templatesDir, "base");
    const subfolder = join(invocationDir, "subfolder");
    writeFixture(join(templateDir, "README.md"), "# Generated project\n");
    mkdirSync(subfolder);

    const result = await runCli(subfolder, ["base"]);
    const projectDir = realpathSync(subfolder);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain(
      `Scaffolding "${basename(projectDir)}" with template "base"...`,
    );
    expect(result.stdout).toContain(`Done. Project created at ${projectDir}`);
    expect(readFileSync(join(projectDir, "README.md"), "utf8")).toBe(
      "# Generated project\n",
    );
  });

  test("runs approved pre and post scripts", async () => {
    const { invocationDir, templatesDir } = createWorkspace();
    const parentDir = join(templatesDir, "base");
    const childDir = join(templatesDir, "base.child");
    writeFixture(
      join(parentDir, "pre.sh"),
      "printf 'pre parent\\n' >> script-order.txt\n",
    );
    writeFixture(
      join(parentDir, "post.sh"),
      "printf 'post parent\\n' >> script-order.txt\n",
    );
    writeFixture(
      join(childDir, "pre.sh"),
      "printf 'pre child\\n' >> script-order.txt\n",
    );
    writeFixture(
      join(childDir, "post.sh"),
      "printf 'post child\\n' >> script-order.txt\n",
    );

    const result = await runCli(
      invocationDir,
      ["base.child", "generated-app"],
      "y\n",
    );
    const projectDir = join(invocationDir, "generated-app");

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(readFileSync(join(projectDir, "script-order.txt"), "utf8")).toBe(
      "pre parent\npre child\npost child\npost parent\n",
    );
  });

  test("applies a template chain with overwrite and append behavior", async () => {
    const { invocationDir, templatesDir } = createWorkspace();
    const parentDir = join(templatesDir, "base");
    const childDir = join(templatesDir, "base.child");
    writeFixture(join(parentDir, "README.md"), "parent\n");
    writeFixture(join(parentDir, "config.txt"), "parent config\n");
    writeFixture(join(childDir, "README.md"), "child\n");
    writeFixture(join(childDir, "[+]config.txt"), "child config\n");

    const result = await runCli(invocationDir, ["base.child", "generated-app"]);
    const projectDir = join(invocationDir, "generated-app");

    expect(result.exitCode).toBe(0);
    expect(readFileSync(join(projectDir, "README.md"), "utf8")).toBe("child\n");
    expect(readFileSync(join(projectDir, "config.txt"), "utf8")).toBe(
      "parent config\nchild config\n",
    );
  });

  test("reports an error when the target directory is not empty", async () => {
    const { invocationDir, templatesDir } = createWorkspace();
    const templateDir = join(templatesDir, "base");
    const projectDir = join(invocationDir, "existing-app");
    writeFixture(join(templateDir, "README.md"), "content\n");
    writeFixture(join(projectDir, "already-there.txt"), "keep me\n");

    const result = await runCli(invocationDir, ["base", "existing-app"]);

    expect(result.exitCode).not.toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toMatch(
      /Project folder ".*existing-app" already exists and is not empty/,
    );
    expect(existsSync(join(projectDir, "README.md"))).toBe(false);
  });

  test("reports an error on missing template", async () => {
    const { invocationDir } = createWorkspace();
    const projectDir = join(invocationDir, "generated-app");

    const result = await runCli(invocationDir, ["missing", "generated-app"]);

    expect(result.exitCode).not.toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toMatch(/Template "missing" not found/);
    expect(existsSync(projectDir)).toBe(false);
  });

  test("reports an error when the project-templates directory is missing", async () => {
    const { invocationDir } = createWorkspace({ createTemplatesDir: false });
    const projectDir = join(invocationDir, "generated-app");

    const result = await runCli(invocationDir, ["base", "generated-app"]);

    expect(result.exitCode).not.toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toMatch(
      /Could not find a "project-templates" directory/,
    );
    expect(existsSync(projectDir)).toBe(false);
  });
});
