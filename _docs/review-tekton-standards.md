# Tekton standards and code quality findings

Source: codebase review on branch `fix/external-git-hardening`.
Tool is built around `v1alpha1`/`v1beta1` and has not caught up with `tekton.dev/v1`.

Status: `[ ]` open, `[~]` in progress, `[x]` done.

## Tekton standards adherence

| Status | ID | Severity | Finding | Location |
|---|---|---|---|---|
| [x] | T1 | High | False errors on v1 variable syntax. `$(params.arr[0])`, `$(params.obj.a)`, `$(params['arr'][*])` all reported as undefined (confirmed); object param flagged unused. Regex only strips trailing `[*]`. | `src/rules/no-undefined-param.ts:5`, `no-unused-param` |
| [x] | T2 | High | Crash on resolver refs: `taskRef: {resolver: git}` (no `name`) throws from the reporter in `no-missing-resource` (confirmed). Handle name-less refs everywhere (git, bundles, hub, cluster). | `src/rules/no-missing-resource.ts:94`, `src/reporter.ts:181` |
| [ ] | T3 | Medium | `prefer-beta` out of date: only knows alpha1/beta1; no v1beta1 -> v1 suggestion; no `ClusterTask` (deprecated/removed), `Condition`/`conditions:`, `PipelineResources` checks. `parse()` still treats `ClusterTask` as `Task`. | `src/rules/prefer-beta.ts`, `src/rules.ts:15` |
| [ ] | T4 | Medium | `no-latest-image` gaps: `localhost:5000/img` (registry port colon) treated as tagged; ignores `sidecars`, inline `taskSpec` in Pipeline/PipelineRun, `stepTemplate` outside Tasks; no digest-pinning check. | `src/rules/no-latest-image.ts:6` |
| [x] | T5 | Medium | `no-invalid-name` regex `^[a-zA-Z_][a-z0-9-()$.]*$` allows uppercase/underscore start, `(`, `)`, `$`; message claims DNS subdomain. Should be DNS-1123: `^[a-z0-9]([-a-z0-9.]*[a-z0-9])?$`, max 253 chars. | `src/rules/no-invalid-name.ts:2` |
| [ ] | T6 | Medium | No security-hygiene rules: script injection via `$(params.*)`/`$(tt.params.*)` in `script:` (use `env`), `securityContext.privileged`, `runAsUser: 0`, `allowPrivilegeEscalation`, unpinned remote bundles/resolvers, hard-coded secrets in `env`. | new rules |
| [ ] | T7 | Low-Med | Inconsistent coverage of `PipelineRun`/`TaskRun` embedded specs, `finally` tasks and `matrix` across `no-invalid-param-type`, `no-missing-workspace`, `no-undefined-volume`, `no-undefined-result`, `no-extra-param`, `prefer-when-expression`, `no-undefined-param`. | `src/rules/*` |

## Code quality and correctness

| Status | ID | Severity | Finding | Location |
|---|---|---|---|---|
| [ ] | Q1 | Medium | `--watch` dead/broken: `watch.ts` never imported, wrong `run(paths)` signature, imports `logProblems` from `utils`. README advertises it. Fix or remove. | `src/watch.ts` |
| [ ] | Q2 | Medium | JSON output polluted: pino-pretty errors go to stdout (`destination: 1`); breaks `--format json` consumers. Use fd 2. | `src/logger.ts:23,32` |
| [ ] | Q3 | Medium | Config bugs: empty `.tektonlintrc.yaml` -> `null` -> throws on `customConfig.rules`; nonexistent `--config` path throws from `lstatSync` before defaults branch; `getConfig` passes `json` fn as `format`, typo `quite`. | `src/config.ts:23,34,112` |
| [ ] | Q4 | Low-Med | Loose typing: `noImplicitAny: false`, rules take `any`; hid S6 crash. | `tsconfig.json`, `src/rules/*` |
| [x] | Q5 | Medium | Test gaps: nothing for crash inputs, v1 variable syntax, prototype pollution; fixtures only well-formed. | `tests/`, `regression-tests/` |
| [x] | Q6 | Low | `package.json` `files` ships repo-local `.tektonlintrc.yaml`; check intended. | `package.json:30` |

## Suggested order

1. T2, T1 (and S6 in the security list): crashes and false errors, with tests (Q5).
2. T5, T4, T3.
3. Q2, Q3, Q1.
4. T6, T7, Q4, Q6.
