# tekton-lint

> A linter for [tekton] resource definitions

## Quick Start 

Using the latest v1 tekton-lint and Node 18 or later....

```
npx @ibm/tekton-lint@latest <glob-pattern-to-yaml-files>
```

> (v1 is currently in alpha)

To try a quick example, grab the `example-task.yaml` from this repo

```sh
> wget https://raw.githubusercontent.com/IBM/tekton-lint/main/example-task.yaml
> npx @ibm/tekton-lint@latest  example-task.yaml

example-task.yaml
   4:9   error    Invalid name for Task 'Task-without-params'. Names should be in lowercase, alphanumeric, kebab-case format  no-invalid-name
  10:14  warning  Invalid image: 'busybox'. Specify the image tag instead of using ':latest'                                  no-latest-image
   9:31  error    Undefined param 'contextDir' at .spec.steps[0].command[2] in 'Task-without-params'                          no-undefined-param
  11:19  error    Undefined param 'contextDir' at .spec.steps[0].workingDir in 'Task-without-params'                          no-undefined-param

✖ 4 problems (3 errors, 1 warning)

```

## Usage

### CLI

`tekton-lint` is parsing the passed files as yaml files, and checks the rules
on the resulting document set. [More details on the pattern syntax.][pattern]

Using `tekton-lint` in watch mode will monitor for any changes in the provided paths and automatically run the linter again.

Be mindful if you specify a glob pattern (eg `*.yaml`) that this might be expanded by your shell rather than the tool itself. It'll probably be fine for the vast majority of cases.  

```sh
tekton-lint [<options>]  <glob-pattern-to-yaml-files> ...

Options:
  --watch           Run tekton-lint in watch mode     [boolean] [default: false]
  --color          Forcefully enable/disable colored output
                                                       [boolean] [default: true]
  --format         Format output. Available formatters: vscode | stylish | json
            [string] [choices: "vscode", "stylish", "json"] [default: "stylish"]
  --quiet          Report errors only                 [boolean] [default: false]
  --max-warnings   Number of warnings to trigger nonzero exit code
                                                          [number] [default: -1]
  --config         location of the .tektonlintrc.yaml, defaults to cwd
                                             [string] [default: "/home/matthew"]
  --refresh-cache  If true will delete the cache directory for external tasks
                                                    [boolean] [default: "false"]
  --version        Show version number                                 [boolean]
  --help           Show help                                           [boolean]

Examples:
  tekton-lint "**/*.yaml"                   Globstar matching
  tekton-lint path/to/my/pipeline.yaml      Multiple glob patterns
  "path/to/my/tasks/*.yaml"
  tekton-lint --watch "**/*.yaml"           Watch mode
```

### IDE Integration

> note this is hasn't been extensively tested yet in alpha - focussing on the cli invocation

`tekton-lint` can be added as a [Task][vscode-task]:

```js
// .vscode/tasks.json

{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Run tekton-lint in the workspace",
      "type": "shell",
      "command": "tekton-lint",
      "args": [
        "--watch",
        "--format","vscode",
        "--config","${workspaceFolder}/.vscode/.tektonlintrc.yaml",  // if needed, otherwise remove this line
        "${workspaceFolder}/**/*.yaml" // Change this path to the path of your yaml files (this will watch for every yaml file in your currently open workspace)
      ],
      "problemMatcher": [
        {
          "fileLocation": "absolute",
          "pattern": [
            {
              "regexp": "^([^\\s].*):$",
              "file": 1
            },
            {
              "regexp": "^(error|warning|info)\\s+\\((\\d+,\\d+,\\d+,\\d+)\\):(.*)$",
              "severity": 1,
              "location": 2,
              "message": 3,
              "loop": true
            }
          ],
          "background": {
            "activeOnStart": true,
            "beginsPattern": "^File (.*) has been changed! Running Linter again!",
            "endsPattern": "^Tekton-lint finished running!"
          }
        }
      ]
    }
  ]
}
```

You can run this task from _Terminal_ > _Run Task..._ > _Run tekton-lint_:

![vscode-screenshot]

### API

> note this is hasn't been extensively tested yet in alpha - focussing on the cli invocation

#### `linter(globs: string[], config?: Config): Promise<Problem[]>`

Runs the linter on the provided `globs`, and resolves to the list of found problems.
Each problem has a `level` and a `message` property. `path` is the path to the
original file, `loc` is an object which describes the location of the problem.

An additional `config` object can be passed to fine-tune rules (see [Configuring `tekton-lint`](#configuring-tekton-lint)).

```ts
interface Problem {
  level: 'warning' | 'error';
  message: string;
  path?: string;
  loc?: {
    range: [number, number];
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  };
}

interface Config {
  rules: {
    [rule: string]: 'off' | 'warning' | 'error';
  };
}
```

##### Example

```js
const linter = require('tekton-lint');

const problems = await linter(['path/to/defs/**/*.yaml']);

for (const problem of problems) {
  console.log(problem.level, problem.message)
}
```

#### `linter.lint(docs: any[], config?: Config): Problem[]`

Runs the linter on the provided parsed documents. Returns the list of found problems.

##### Example

```js
const linter = require('tekton-lint');

const problems = linter.lint([{
  apiVersion: 'tekton.dev/v1beta1',
  kind: 'Task',
  metadata: {
    name: 'my-task',
  },
  spec: {
    steps: [],
  },
}]);

for (const problem of problems) {
  console.log(problem.level, problem.message)
}
```

## Rules

### Detecting errors

> These rules are straightforward, violations indicate that there's a good
> chance that you won't be able to run your `Pipeline`

- Missing `Task` definitions
- Missing `Condition` definitions
- Missing `Pipeline` definitions
- Missing `TriggerTemplate` definitions
- Missing `TriggerBinding` definitions
- Missing parameter declarations within `Task`s
- Missing parameter declarations within `Pipeline`s
- Missing parameter declarations within `TriggerTemplate`s
- Missing volume definitions in `Task`s
- Missing `Task` output `result`s
- Missing required `Pipeline` parameters in `TriggerTemplate`s
- Missing required `Task` parameters in `Pipeline`s
- Missing required workspaces of `Task`s referenced in `Pipeline`s
- Missing required workspaces of `Pipeline`s referenced in `TriggerTemplate`s
- Extra parameters passed to `Pipeline`s
- Extra parameters passed to `Task`s
- Invalid `runAfter` conditions
- Invalid `resourceVersion` key
- Duplicate resources (of all supported resource kinds)
- Duplicate parameters name in `Task`s
- Duplicate environment variables in `Step`s
- Duplicate `PipelineRun`'s parameters name in `TriggerTemplate`s
- Duplicate parameters name in `TriggerBinding`s
- Duplicate parameters name in `TriggerTemplate`s
- Duplicate parameters name in `Pipeline`s
- Missing `Task` parameter value in `Pipeline`s
- Invalid `Task`, `Pipeline`, `TriggerTemplate`, `Condition` parameter names (alpha-numeric characters, `-` and `_` and can only start with alpha characters and `_`)
- Invalid `Task`, `Pipeline`, `TriggerTemplate` parameter value types (must be `string`, `multiline string` or `array of strings`)
- Invalid `Task` parameter syntax (using `v1beta1` syntax in `v1alpha1` defintions, and vice versa)
- Invalid (undefined) `Workspace` references in `Task`s of `Pipeline`s
- Missing referenced `Task` in another `Task`'s parameter in `Pipeline`s
- Cycle detection in each pipelines task dependency graph (based on `runAfter`s, `results` and `resource -> inputs`)

### Best practices

> If you violate these rules, the `Pipeline` is probably going to be just fine,
> these rules are more like a collection of best practices that we collected
> while we were working with tekton.

- Unused `Task` parameters
- Unused `Condition` parameters
- Unused `Pipeline` parameters
- Unused `TriggerTemplate` parameters
- Unpinned images in `Task` steps
- _kebab-case_ naming violations
- `Task` & `Pipeline` definitions with `tekton.dev/v1alpha1` `apiVersion`
- Missing `TriggerBinding` parameter values
- Usage of deprecated `Condition` instead of `WhenExpression`
- Usage of deprecated resources (resources marked with `tekton.dev/deprecated` label)
- Missing `hashbang` line from a `Step`s `script`

### Configuring `tekton-lint`

You can configure `tekton-lint` with a configuration file ([`.tektonlintrc.yaml`](./.tektonlintrc.yaml)).  You can decide which rules are enabled and at what error level. In addition you can specify external tekton tasks defined in a git repository; for example [OpenToolChain](https://github.com/open-toolchain/tekton-catalog) provides a set of tasks that are helpful. But if you lint just your own tekton files there will be errors about not being able to find `git-clone-repo` for example. Not will any checks be made to see if your usage is correct.

Any task defined in the `external-tasks` section will be clone from git, into a local cache (defaults to `~/.tektonlint`).  Please make sure that you can `git clone` before running.

The configuration file should follow this format:
```yaml
---
rules:
  rule-name: error | warning | off
external-tasks:
  - name: <tasks name>
    uri: http://github.com/....
    path: <sub dir of repo>
```

Example `.tektonlintrc.yaml` file:

```yaml
---
rules:
  no-duplicate-param: error
  no-unused-param: warning
  no-deprecated-resource: off
external-tasks:
  - name: git-clone-repo
    uri: https://github.com/open-toolchain/tekton-catalog
    path: git
  - name: toolchain-extract-value
    uri: https://github.com/open-toolchain/tekton-catalog
    path: toolchain
  - name: doi-publish-build-record
    uri: https://github.com/open-toolchain/tekton-catalog
    path: devops-insights    
  - name: icr-publish
    uri: https://github.com/open-toolchain/tekton-catalog
    path: container-registry
  - name: iks-detch
    uri: https://github.com/open-toolchain/tekton-catalog
    path: kubernetes-service  

```

Search path for `.tektonlintrc.yaml`

- location specified on the command line with the `--config` option
- current working directory
- default values used if nothing else found


[tekton]: https://tekton.dev
[node]: https://nodejs.org
[pattern]: https://github.com/mrmlnc/fast-glob#pattern-syntax
[vscode-task]: https://code.visualstudio.com/docs/editor/tasks
[vscode-screenshot]: vscode.png
