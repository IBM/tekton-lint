# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| latest  | :white_check_mark: |

## Reporting a Vulnerability

If you believe you have found a vulnerability please report it responsibly. IBM has documented the process for reporting vulnerabilities at https://www.ibm.com/trust/security-psirt.

## Vulnerabilities in dependencies

The SDK is regularly scanned for known CVEs in dependencies and updates to versions with remediations are applied and released as soon as possible.
Reporting known CVEs in dependencies in this repository is not necessary and will not lead to a faster resolution.

## Threat model and trust boundaries

`tekton-lint` is a linter that reads files you point it at. It does not execute the YAML it parses. The notes below describe what is and is not trusted, so you can decide how to run it in CI or on untrusted input.

### Trusted input

The configuration file is effectively code, because its `custom` section makes `tekton-lint` run arbitrary JavaScript. Only run `tekton-lint` with a configuration file you trust.

- **`.tektonlintrc.yaml`.** The file is read from the directory given by `--config`, which **defaults to the current working directory**. If you lint a repository you did not write (for example a pull request from a fork in CI), that repository's `.tektonlintrc.yaml` is picked up automatically. Run the tool from a trusted directory, or pass `--config` with a path you control.
- **The `custom` section.** Every value is passed to `import()` without validation. The module is not isolated and runs with the full privileges of the `tekton-lint` process. It loads when linting begins, after any `external-tasks` repositories have been cloned and the YAML files parsed, and before any rule runs. A value can be:
  - a path to a file or a package name, resolved relative to the `tekton-lint` installation rather than to the config file, or
  - an absolute path or `file:` URL, or
  - a `data:` URL, which carries the code inline in the config.

  `http:` and `https:` URLs are rejected by Node.js.
- **The `external-tasks` section.** The URLs and paths come from the config and are validated as described under [External tasks](#external-tasks-external-tasks), but the config decides which repositories are cloned. A trusted config is still needed to keep the clone list under your control.

Do not run `tekton-lint` with a configuration file that an attacker controls, and do not give the process secrets (tokens, cloud credentials) in CI jobs that lint untrusted contributions.

### Untrusted input: Tekton YAML

Files matched by the glob patterns, and files from `external-tasks` repositories, are treated as untrusted data.

- YAML is parsed with the [`yaml`](https://www.npmjs.com/package/yaml) package using `parseAllDocuments`. Language-specific tags such as `!!js/function` or `!!python/object/apply` are **not** executed. They are returned as plain strings (with a warning).
- The parser limits alias expansion, so a "billion laughs" style document is rejected with `Excessive alias count indicates a resource exhaustion attack` instead of exhausting memory.
- Syntax errors do not throw. They are recorded on the parsed document, and `tekton-lint` continues. As the README notes, rules assume schema-correct Tekton, so malformed input can produce confusing results rather than a crash.
- **Known limits.** Parsing is not sandboxed. A very large file, or a bug in the parser or in a rule, could still cause high CPU or memory use or a crash. Parser bugs in the `yaml` dependency are fixed by upgrading it (see "Vulnerabilities in dependencies"). Run the tool with normal resource limits (for example CI job timeouts and memory limits) if you lint content you do not control.
- Rules only read the parsed data. Values from the YAML (names, images, scripts) are compared and reported, never executed or passed to a shell.

### External tasks (`external-tasks`)

Each configured `uri` is cloned with `git` and the listed `path` directories are copied into the cache (`~/.tekton-lint` by default, or `TL_CACHE_DIR`). The cloned content is untrusted. The following protections apply to this step ([`src/external.ts`](./src/external.ts)):

- `git` is started directly (no shell) and the URL is passed after `--`, so it cannot be interpreted as a command or option.
- Only `https:` and `ssh:` URLs are accepted. `GIT_ALLOW_PROTOCOL=https:ssh` also blocks `ext::`, `file:` and other transports, including via redirects.
- A host or user name that starts with `-` is rejected, so `ssh` cannot treat it as an option.
- The clone is shallow, does not recurse into submodules, and never prompts for credentials.
- Symlinks in the cloned repository are not created (`core.symlinks=false`) and are not copied, so they cannot point the linter at files outside the cache.
- Each `path` must resolve inside the cloned repository and inside the cache directory. Values such as `../..` or absolute paths are rejected.
- The temporary clone is always deleted, including on failure.
- Credentials in a URL (`https://user:token@host/...`) are removed from error messages and logs. Prefer a credential helper or SSH key over embedding tokens in the config.

Files from the cache are linted for context only; their findings are not reported (`no_report`). They are still parsed, so the YAML notes above apply to them. Only add `external-tasks` repositories you trust to be available, and consider pinning to a reviewed catalog.

These checks are covered by regression tests in [`tests/external.test.ts`](./tests/external.test.ts). If you change `getExternal`, run `npm test`.
