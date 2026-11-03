# Security review findings

Source: codebase review on branch `fix/external-git-hardening`.
Baseline: `npm run lint` clean, 89 tests pass, `npm audit --omit=dev` = 0 vulnerabilities.

Status: `[ ]` open, `[~]` in progress, `[x]` done.

## Code

| Status | ID | Severity | Finding | Location |
|---|---|---|---|---|
| [x] | S1 | Medium | Prototype pollution: YAML `kind: __proto__` + `metadata.name` writes to `Object.prototype` (confirmed). Use `Object.create(null)`/`Map`, or reject `__proto__`/`constructor`/`prototype`. | `src/collect-resources.ts:3` |
| [ ] | S2 | Medium | Credentials leak into debug logs: raw URIs, config and argv logged; `TL_DEBUG=true` writes `app.log` at trace level. `redact()` only applied to errors. | `src/external.ts:97,106`, `src/config.ts:32`, `src/lint.ts:56`, `src/rules.ts:50` |
| [ ] | S3 | Medium | External tasks shadow local tasks: cache files listed last, `Object.fromEntries` last-wins, so a cached task with same name replaces the local one and local findings vanish. | `src/runner.ts:39`, `src/rules.ts:28` |
| [ ] | S4 | Low-Med | Shared never-cleaned cache; `--refresh-cache` parsed but unused (`default: 'false'` is a truthy string); `${cache_dir}/**/*.yaml` loads all repos ever cloned; no ref/commit pinning. | `src/lint.ts:42`, `src/config.ts:46`, `src/external.ts:111` |
| [ ] | S5 | Low-Med | `git clone` has no `timeout`/`maxBuffer`; full `process.env` passed through. Consider `GIT_CONFIG_NOSYSTEM=1`, `GIT_CONFIG_GLOBAL=/dev/null`. | `src/external.ts:47` |
| [x] | S6 | Low | Crash on schema-incomplete input: Pipeline with no `spec` aborts run (`Cannot read properties of undefined (reading 'tasks')`, confirmed). Unguarded `pipeline.spec.tasks` in several rules. | `prefer-when-expression`, `no-pipeline-missing-task`, `no-undefined-param`, `no-missing-hashbang` |
| [ ] | S7 | Low | Possible regex backtracking (not benchmarked). | `src/utils.ts:6`, `src/rules/no-undefined-param.ts:5` |
| [ ] | S8 | Low | `custom` rules load arbitrary code via `import()`; `--config` defaults to cwd so a fork's config is auto-loaded. Consider explicit opt-in flag. (Documented in `SECURITY.md`.) | `src/rule-loader.ts:77` |

## CI and packaging

| Status | ID | Severity | Finding | Location |
|---|---|---|---|---|
| [ ] | C1 | Medium | "Diagnose npm config" step runs `cat ~/.npmrc` and greps for token; can print auth material into logs. Remove. | `.github/workflows/node.js.yml:17,45` |
| [ ] | C2 | Medium | Dockerfile: EOL `node:18`/`node:16`; tini via `ADD` URL with no checksum; `npm shrinkwrap` after `npm ci`; `ENTRYPOINT dist/main.js` but bin is `dist/lint.js` (image cannot work). Docker job publishes this to ghcr. | `Dockerfile`, `.github/workflows/node.js.yml:61` |
| [ ] | C3 | Low | No `permissions:` block in CI workflow (default token scope). | `.github/workflows/node.js.yml` |
| [ ] | C4 | Low | Actions pinned by tag, not commit SHA. | `.github/workflows/*.yml` |
| [ ] | C5 | Low | `NPM_TOKEN` fallback kept beside OIDC; drop once trusted publisher confirmed. | `.github/workflows/release.yml:69` |
| [ ] | C6 | Info | `.whitesource` sets `javaVersion: 17` on a Node project. | `.whitesource` |

## Suggested order

1. S1, S6 (+ T2 in the Tekton list): guards and tests.
2. S2, S3.
3. C1, C2, C3, C4.
4. S4, S5.
5. S8, S7, C5, C6.
