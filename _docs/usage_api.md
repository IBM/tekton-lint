# API

**Important Notes**: 

- This has been updated since the v0.x releases; and works slightly differently
- This is an ESM module

## Usage

- install as any module `npm install --save @ibm/tekton-lint`
- it comes with typescript definitions
- it is an ESM module therefore add `"type":"module"` to your `package.json`

```js

import {Problem, Config, Linter} from '@ibm/tekton-linter'

const main = async () =>{

	const cfg = Config.getDefaultConfig()
    cfg.globs = ["./example-task.yaml"]
	
	const problems = await Linter.run(cfg)
	problems.forEach(element => {
		console.log(`${p.rule}:: ${p.message}`)
	});
}

await main()

```

This will produce the output

```
no-invalid-name:: Invalid name for Task 'Task-without-params'. Names should be in lowercase, alphanumeric, kebab-case format.
no-latest-image:: Invalid image: 'busybox'. Specify the image tag instead of using ':latest'
no-undefined-param:: Undefined param 'contextDir' at .spec.steps[0].command[2] in 'Task-without-params'
no-undefined-param:: Undefined param 'contextDir' at .spec.steps[0].workingDir in 'Task-without-params'
```

## API

The API is used as part of the regression testing, see [regression.test.ts](../regression-tests/regression.test.ts) for example use.

### ToolConfig

```ts
Config.getDefaultConfig(): Config
```
  

Structure is 

```ts
 interface Config {
    
    cache_dir: string;
    max_warnings: number;
    globs: string[];
    refresh_cache: string;
    format: string;
    quiet: boolean;
}
```

### Linter API

```ts
async Linter.run(cfg: ToolConfig): Promise<Problems[]>
```
 
An async API, taking a `Config` instance containing options including the array of glob patterns for YAML files. 


### Problems

The definition of a problem is 

```ts
export type Problem = {
    message: string;
    rule: string;
    level: 'error' | 'warning';
    path: string;
    loc: Location;
};

export type Location = {
    range: number[];
    starLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
};
```

