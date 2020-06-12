# tekton-lint

> A linter for [tekton] resource definitions

## Requirements

The only requirement is [node] (at least `12.0.0`).

## Install

Make sure that `npm` is configured to be able to fetch code from [TaaS Artifactory][taas].

Append the following configuration to your `~/.npmrc` to be able to fetch code from the `wcp-compliance-automation-team-npm-local` registry.

```
@cocoa:registry=https://na.artifactory.swg-devops.com/artifactory/api/npm/wcp-compliance-automation-team-npm-local/
//na.artifactory.swg-devops.com/artifactory/api/npm/wcp-compliance-automation-team-npm-local/:_password=<BASE64_PASSWORD>
//na.artifactory.swg-devops.com/artifactory/api/npm/wcp-compliance-automation-team-npm-local/:username=<USERNAME>
//na.artifactory.swg-devops.com/artifactory/api/npm/wcp-compliance-automation-team-npm-local/:email=<USERNAME>
//na.artifactory.swg-devops.com/artifactory/api/npm/wcp-compliance-automation-team-npm-local/:always-auth=true
```

`<BASE64_PASSWORD>` is your base64 encoded [API key][taas-api], `<USERNAME>` is your ibm email.

The same configuration snippet can be acquired with the following `curl` command:

```sh
$ curl -u <EMAIL> https://na.artifactory.swg-devops.com/artifactory/api/npm/wcp-compliance-automation-team-npm-local/auth/cocoa
```

In this case replace `<EMAIL>` with your IBM email address, and provide your [API key][taas-api] as password.

Install the package from [TaaS Artifactory][taas]:

```sh
$ npm install -g @cocoa/tekton-lint
```

### Install without artifactory

Make sure `node -v` indicates you are on at least 12.0.0

```sh
git clone <this repository>
cd <repository dir>
npm link
```

Verify that `tekton-lint` is available by running:
```sh
which tekton-lint
```

### Install with Docker

```sh
git clone <this repository>
docker build -t tekton-lint .
docker run -v /some/host/path:/some/guest/path --rm -it tekton-lint '/some/guest/path/*.yaml'
```

## Usage

### CLI

`tekton-lint` is parsing the passed files as yaml files, and checks the rules
on the resulting document set. [More details on the pattern syntax.][pattern]

Using `tekton-lint` in watch mode will monitor for any changes in the provided paths and automatically run the linter again. 

```sh
Options:
$ tekton-lint --watch   # Run tekton-lint in watch mode
$ tekton-lint --version # Show version number
$ tekton-lint --help    # Show help

# exact file path
$ tekton-lint my-pipeline.yaml my-task.yaml

# globstar matching (note the quotes around the glob expression)
$ tekton-lint '**/*.yaml'

# multiple glob patterns
$ tekton-lint path/to/my/pipeline.yaml 'path/to/my/tasks/*.yaml'

# Watch mode
$ tekton-lint --watch '**/*.yaml'
```

### IDE Integration

`tekton-lint` can be added as a [Task][vscode-task]:

```js
// .vscode/tasks.json

{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Run tekton-lint",
      "type": "shell",
      "command": "tekton-lint --watch 'path/to/your/definitions/*.yaml'",
      "isBackground": true,
      "group": "test",
      "problemMatcher": {
        "pattern": {
          "regexp": "^([^\\s].*)\\((\\d+,\\d+,\\d+,\\d+)\\):\\s+(error|warning|info):\\s*(.*)$",
          "file": 1,
          "location": 2,
          "severity": 3,
          "message": 4
        },
        "background": {
          "activeOnStart": true,
          "beginsPattern": "Linter",
          "endsPattern": "Tekton-lint finished running!"
        }
      }
    }
  ]
}
```

You can run this task from _Terminal_ > _Run Task..._ > _Run tekton-lint_:

![vscode-screenshot]

### API

#### `linter(globs: string[]): Promise<Problem[]>`

Runs the linter on the provided `globs`, and resolves to the list of found problems.
Each problem has a `level` and a `message` property. `path` is the path to the
original file, `loc` is an object which describes the location of the problem.

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
```

##### Example

```js
const linter = require('@cocoa/tekton-lint');

const problems = await linter(['path/to/defs/**/*.yaml']);

for (const problem of problems) {
  console.log(problem.level, problem.message)
}
```

#### `linter.lint(docs: any[]): Problem[]`

Runs the linter on the provided parsed documents. Returns the list of found problems.

##### Example

```js
const linter = require('@cocoa/tekton-lint');

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
- Missing `Pipeline` definitions
- Missing `TriggerTemplate` definitions
- Missing `TriggerBinding` definitions
- Missing parameter declarations within `Task`s
- Missing parameter declarations within `Pipeline`s
- Missing parameter declarations within `TriggerTemplate`s
- Missing volume definitions in `Task`s
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
- Invalid `Task`, `Pipeline`, `TriggerTemplate` parameter names (alpha-numeric characters, `-` and `_` and can only start with alpha characters and `_`)
- Invalid `Task`, `Pipeline`, `TriggerTemplate` parameter value types (must be `string`, `multiline string` or `array of strings`)
- Invalid `Task` parameter syntax (using `v1beta1` syntax in `v1alpha1` defintions, and vice versa)
- Invalid (undefined) `Workspace` references in `Task`s of `Pipeline`s

### Best practices

> If you violate these rules, the `Pipeline` is probably going to be just fine,
> these rules are more like a collection of best practices that we collected
> while we were working with tekton.

- Unused `Task` parameters
- Unused `Pipeline` parameters
- Unused `TriggerTemplate` parameters
- Unpinned images in `Task` steps
- _kebab-case_ naming violations
- `Task` & `Pipeline` definitions with `tekton.dev/v1alpha1` `apiVersion`
- Missing `TriggerBinding` parameter values

## Report a Bug / Request a Feature

We track our issues in [this github repository](https://github.ibm.com/cocoa/board).
Please use the following issue templates to:
- [Report a Bug](https://github.ibm.com/cocoa/board/issues/new?template=bug.md)
- [Request a Feature](https://github.ibm.com/cocoa/board/issues/new?template=feature.md)

## Contributing

Make sure that you pass the pre-commit checks (`npm run lint && npm test`). In case you
add/remove/change rules, or add/remove/change regression tests you have to update
the [`jest snapshot`](https://github.ibm.com/cocoa/tekton-lint/blob/master/regression-tests/__snapshots__/regresion.test.js.snap).

[tekton]: https://tekton.dev
[node]: https://nodejs.org
[pattern]: https://github.com/mrmlnc/fast-glob#pattern-syntax
[taas]: https://na.artifactory.swg-devops.com/artifactory/webapp/#/home
[taas-api]: https://na.artifactory.swg-devops.com/artifactory/webapp/#/profile
[vscode-task]: https://code.visualstudio.com/docs/editor/tasks
[vscode-screenshot]: vscode.png
