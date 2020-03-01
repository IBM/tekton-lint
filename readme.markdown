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
on the resulting document set. [More details on the pattern syntax.][pattern]

```sh
# exact file path
$ tekton-lint my-pipeline.yaml my-task.yaml

# globstar matching (note the quotes around the glob expression)
$ tekton-lint '**/*.yaml'

# multiple glob patterns
$ tekton-lint path/to/my/pipeline.yaml 'path/to/my/tasks/*.yaml'
```

[tekton]: https://tekton.dev
[node]: https://nodejs.org
[pattern]: https://github.com/mrmlnc/fast-glob#pattern-syntax
