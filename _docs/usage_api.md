## API

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