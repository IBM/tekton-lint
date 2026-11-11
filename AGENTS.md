# AGENTS.md

Rules for AI agents and automated tooling working in this repository.

## Commits must be signed

Every commit must carry **both**:

1. A cryptographic signature (`-S`), made with the committer's configured signing key.
2. A DCO sign-off trailer (`-s`), i.e. a `Signed-off-by: Name <email>` line.

Always commit with both flags:

```bash
git commit -s -S -m "type(scope): message"
```

Amend and rebase operations must keep both. Use `git commit --amend -s -S` and `git rebase --exec 'git commit --amend --no-edit -s -S' <base>` when a commit lacks either.

### Rules

- Never create, amend or cherry-pick a commit without `-s -S`.
- Never use `--no-gpg-sign`, `-c commit.gpgsign=false`, or `--no-verify` to get around signing or hooks.
- If signing fails (no key, agent locked, passphrase needed), stop and ask the user. Do not fall back to an unsigned commit.
- Do not change `user.name`, `user.email`, `user.signingkey` or `gpg.format` in git config.
- Rewriting history (rebase, amend) requires re-signing every rewritten commit.
- Push with `--force-with-lease`, never plain `--force`.

### Verify before pushing

Check that every commit on the branch is signed and signed off:

```bash
git log --format='%h %G? | %(trailers:key=Signed-off-by,valueonly) | %s' upstream/main..HEAD
```

- The `%G?` column must not be `N` (no signature) or `B`/`R`/`X`/`Y`/`E` (bad, revoked, expired or errored).
- `U` means the signature exists but the local machine has no allowed-signers entry; that is acceptable.
- The sign-off column must not be empty.

## Commit messages

Messages are checked by commitlint (see `commitlint.config.cjs`) through the `.husky/commit-msg` hook. Use conventional commits, for example `fix(rules): ...`.

## Before committing

The `.husky/pre-commit` hook runs `npm run lint && npm test`. Run both and make sure they pass first.

## Branches and remotes

- `upstream` is `IBM/tekton-lint`. Pull requests target `upstream/main`.
- `origin` is the contributor fork. Its `main` can be stale, so rebase onto `upstream/main`.
