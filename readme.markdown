# tekton-lint

> A linter for [tekton] resource defintions

## Requirements

The only requirement is [node] (at least `12.0.0`).

## Install

Install the package directly from the repo (other distributions are coming):

```sh
$ npm install -g git+ssh://git@github.ibm.com:cocoa/tekton-lint.git
```

## Usage

`tekton-lint` is parsing the passed files as yaml files, and checks the rules
on the resulting document set.

```sh
$ tekton-lint my-pipeline.yaml my-task.yam

# take advantage of the shell expansion
$ tekton-lint path/to/my/defintions/*.yaml
```

[tekton]: https://tekton.dev
[node]: https://nodejs.org
