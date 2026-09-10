# project-templater

A CLI for scaffolding projects from template folders. Assumes template files are utf-8 encoded text.

Written for Mac OS. Not tested on other platforms.

## Installation

```bash
bun install
bun link
```

## Usage

```bash
project-templater <template> [project-folder]
```

- `template`: Dot-delimited template name with each segment representing a level in the template hierarchy. This allows related templates to share common files and scripts via parent templates. For example, `temp1.temp2.temp3` has the parent template `temp1.temp2` which in turn has the parent template `temp1`.
- `project-folder`: Path to where the new project will be created. If omitted, the current directory is used. Project will not be created if the folder is non-empty.

Template folders live in a folder named `project-templates`. This folder must be located in the current directory or any of its parent directories. In addition to files that are copied directly into the project, template folders can include `pre.sh` and `post.sh` scripts to run before and after the file copying process, respectively.

Templates are applied in three phases:

1. All `pre.sh` scripts are run in parent -> child order
2. Files and folders are copied into the project from templates in parent -> child order. Existing files are overwritten, unless the template filename is prefixed with `[+]`, in which case its contents are appended to the existing file instead.
3. All `post.sh` scripts are run in child -> parent order after files are copied.

All `pre.sh`/`post.sh` require confirmation before they are executed.

## Enhancements

- [ ] Add test suite
- [x] support auto-discovering templates

🤖 Built w/ substantial help from GitHub Copilot
