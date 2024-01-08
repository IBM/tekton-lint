# tekton-lint

A linter for Tekton resource definitions - **v1 beta now available!!**
<!-- TOC -->

- [tekton-lint](#tekton-lint)
    - [Quick Start](#quick-start)
    - [Usage - CLI](#usage---cli)
    - [What yaml files to include?](#what-yaml-files-to-include)
    - [Rules](#rules)
        - [Detecting errors](#detecting-errors)
        - [Best practices](#best-practices)
    - [Configuring tekton-lint](#configuring-tekton-lint)
    - [Issues?](#issues)

<!-- /TOC -->

## Quick Start

Make sure you've NodeJS v18 or later installed, and run....

```
npx @ibm/tekton-lint@latest <glob-pattern-to-yaml-files>
```

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

You can use the tool as a regular lint tool from the CLI or scripts; alternatively you can use it as a [library via it's API](./_docs/usage_api.md) or from an [IDE such as VScode](./_docs/usage_ide.md).


## Usage - CLI

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

## What yaml files to include?

Only the yaml files that are specified are linted; depdending on how your Tekton instance is configured sometimes you might be using task descriptions that aren't part of your project or repository. In this case you'll get linter errors that "Task XYZ can't be found" - the latest v1 version of tool has added the concept of 'external tasks'.

For example if you are using some of the OpenToolchain Tasks, you can add the following to the [configuration file](#configuring-tekton-lint)

```
---
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

This will clone the repos specified and extract the various directories to a local cache. When you lint your tools these external tasks and definitions will be included. This will prevent any errors about tasks missing; but also imnportantly ensure your use of the tasks is correct, eg no missed parameters.

Note that these cached files won't be linted themselves.


The cache is defined to be put to `~/.tektonlint`  If you wish to clear the cache, simply delete this directory - alternatively there is a cli option. 

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

## Configuring `tekton-lint`

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


## Issues?

Please raise an issue in the usual manner, please try and include a short sample Tekton file that shows the problem.

There is an internal logging system you can enable via setting and environment variable

```
TL_DEBUG=true tekton-lint <file.yaml>
```

This will write out a `app.log` file in [pino](https://github.com/pinojs/pino) json format - use [pino-pretty](https://github.com/pinojs/pino-pretty) to view