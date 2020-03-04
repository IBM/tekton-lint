# tekton-lint

> A linter for [tekton] resource defintions

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
[taas]: https://na.artifactory.swg-devops.com/artifactory/webapp/#/home
[taas-api]: https://na.artifactory.swg-devops.com/artifactory/webapp/#/profile
