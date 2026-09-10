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

- `template`: Dot-delimited template name with each segment representing a level in the template hierarchy. This allows related templates to share a common structure. For example, `temp1.temp2.temp3` first applies the `temp1` and `temp1.temp2` templates before applying itself.
- `project-folder`: Path to where the new project will be created. If omitted, the current directory is used. Project will not be created if the folder is non-empty.

Templates live under `templates/<name>/` (flat, one folder per dotted name). For each template in the chain, in order:

1. Any `pre.sh` is queued to run before files are copied.
2. Files and folders are copied into the project. Existing files are overwritten, unless the template filename is prefixed with `[+]`, in which case its contents are appended to the existing file instead.
3. Any `post.sh` is queued to run after files are copied.

All `pre.sh`/`post.sh` require confirmation before they are executed.

## Enhancements

- [ ] Add test suite
- [ ] support auto-discovering templates

🤖 Built w/ substantial help from GitHub Copilot
