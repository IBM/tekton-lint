# tekton-lint

A linter for Tekton resource definitions
<!-- TOC -->

- [tekton-lint](#tekton-lint)
    - [Quick Start](#quick-start)
    - [History](#history)
    - [Usage - CLI](#usage---cli)
    - [What yaml files to include?](#what-yaml-files-to-include)
    - [Rules](#rules)
        - [Detecting errors](#detecting-errors)
        - [Best practices](#best-practices)
    - [Configuring tekton-lint](#configuring-tekton-lint)
    - [Custom Rules](#custom-rules)
        - [Configuring](#configuring)
        - [Reporting](#reporting)
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

You can use the tool as a regular lint tool from the CLI or scripts; alternatively you can use it as a [library via it's API](./_docs/usage_api.md) or from an [IDE such as VScode](./_docs/usage_ide.md).  (please consider both the API and IDE use as experimental features.)

## History

When I first started using Tekton a few years ago, I found one of the harder things was keeping track of the dependencies between the YAML files. Comparing to say github actions, or travis, Tekton is a lot more verbose. The comparison isn't quite fair as the tools do work at slightly different levels. 

Nevertheless, I was pleased to find this TektonLint tool; it was able to spot a number of the 'gotchas' before pushing the pipelines for execution. 
After a brief hiatus, I was using Tekton again.  Bence Dányi the original author was no longer at IBM; as the tool had been useful for me I decided to take on the repo.

I've updated typescript versions, added in additional features such as custom rules, allowed for caching of standard components. Theres more still I'd like to do; but of a MVP it's at v1.


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

Only the yaml files that are specified are linted; these can be defined either on the command line, or via the `.tektonlintrc.yaml` file. 

```yaml
globs:
  - example*.yaml
```

If both command line and the configuration file have patterns specified, both are used but the command line options come first.

Depdending on how your Tekton instance is configured sometimes you might be using task descriptions that aren't part of your project or repository. In this case you'll get linter errors that "Task XYZ can't be found" - the latest v1 version of tool has added the concept of 'external tasks'.

For example if you are using some of the OpenToolchain Tasks, you can add the following to the [configuration file](#configuring-tekton-lint)


```yaml
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

This will clone the repos specified and extract the various directories to a local cache. When you lint your tools these external tasks and definitions will be included. This will prevent any errors about tasks missing; but also importantly ensure your use of the tasks is correct, eg no missed parameters.

Note that these cached files won't be linted themselves.


The cache is defined to be put to `~/.tektonlint`  If you wish to clear the cache, simply delete this directory - alternatively there is a cli option. 

## Rules

**Please note** that the tool assumes that the files are syntax correct YAML files, and they are following the established schema for Tekton. For example referring to a field with the wrong spelling or case will confuse the rules. 

If you see an error like ` Pipeline 'pipeline-test-perf-tag' references task 'undefined' but the referenced task cannot be found. ` referencing 'undefined' this more than likely means there is a syntax error in the yaml file.  This can be easily seen with casing, so using `Name: ..` rather than `name: .. `

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
- _kebab-case_ and OR _camelCase_ naming violations
- `Task` & `Pipeline` definitions with `tekton.dev/v1alpha1` `apiVersion`
- Missing `TriggerBinding` parameter values
- Usage of deprecated `Condition` instead of `WhenExpression`
- Usage of deprecated resources (resources marked with `tekton.dev/deprecated` label)
- Missing `hashbang` line from a `Step`s `script`

The default rule is for preferring _kebab-case_; _camelCase_ is equally popular and many of the official examples on the Tekton website are in camel case. To use the rule that accepts camel case as well swap the rules in the `.tektonrc.yaml` file

```yaml
---
rules: # error | warning | off
  prefer-kebab-case: off
  prefer-camel-kebab-case: warning
```



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

## Custom Rules
In additional the default set of rules, custom rules can provided as node modules; the mechanism is similar that used by tools such as eslint.

An example is provided in [`custom_rules`](./custom_rules), and will be used in the examples below. Notes on writing rules are also in the [README.md](./custom_rules/README.md)

### Configuring

In the `.tektonrc.yaml` file add an object with names of the rules and node module that provides it.
To load rules exported by the module `custom_rules`, and named under `my_rules` add the `custom` field to the yaml file.

```yaml
---
rules:
  ....
external:tasks:
  ...
custom: 
 my_rules: custom_rules 
 # For debug and test, refer directly to the js file
 # my_rules: ../customer_rules/my_rules.js
```

### Reporting

A module may report more than one rule. There is one rule in the example, and this flags up any task that starts with the work 'Task' (not meant to be serious rule, but an example!)

Running on the `example-task.yaml` file with the example configured adds a 4th report

```
./example-task.yaml
  10:14  warning  Invalid image: 'busybox'. Specify the image tag instead of using ':latest'          no-latest-image
   9:31  error    Undefined param 'contextDir' at .spec.steps[0].command[2] in 'Task-without-params'  no-undefined-param
  11:19  error    Undefined param 'contextDir' at .spec.steps[0].workingDir in 'Task-without-params'  no-undefined-param
   1:1   error    Tasks should not start with word 'Task'                                             my_rules#no-tasks-called-task

✖ 4 problems (3 errors, 1 warning)
```

Within the representation of the rule name here `my_rules#no-tasks-called-task`; if you want to turn off this rule, then you can adjust the list of rules in the `.tektonrc.yaml` as for another rule; Note that `#` in the name.

```
rules:
  ...
  my_rules#no-tasks-called-task: off
```




## Issues?

Please raise an issue in the usual manner, please try and include a short sample Tekton file that shows the problem.

There is an internal logging system you can enable via setting and environment variable

```
TL_DEBUG=true tekton-lint <file.yaml>
```

This will write out a `app.log` file in [pino](https://github.com/pinojs/pino) json format - use [pino-pretty](https://github.com/pinojs/pino-pretty) to view