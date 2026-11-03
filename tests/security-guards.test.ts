import collectResources from '../src/collect-resources.js';
import { lint } from '../src/rules.js';
import Reporter from '../src/reporter.js';
import { Config } from '../src/config.js';
import YAML from 'yaml';

describe('Security guards (S1, S6, T2)', () => {
    describe('S1: Prototype pollution prevention', () => {
        test('collectResources rejects __proto__, constructor, and prototype', () => {
            const maliciousDocs = [
                {
                    kind: '__proto__',
                    metadata: { name: 'polluted' },
                    spec: { foo: 'bar' },
                },
                {
                    kind: 'Task',
                    metadata: { name: '__proto__' },
                    spec: { steps: [] },
                },
                {
                    kind: 'Task',
                    metadata: { name: 'constructor' },
                    spec: { steps: [] },
                },
                {
                    kind: 'Task',
                    metadata: { name: 'prototype' },
                    spec: { steps: [] },
                },
            ];

            const result = collectResources(maliciousDocs);
            expect((result as any).polluted).toBeUndefined();
            expect((result as any).__proto__?.polluted).toBeUndefined();
            expect(({} as any).polluted).toBeUndefined();
        });

        test('lint does not pollute Object.prototype', async () => {
            const rawYaml = `
apiVersion: tekton.dev/v1beta1
kind: __proto__
metadata:
  name: polluted
spec:
  tasks: []
---
apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: valid-task
spec:
  steps:
    - name: step1
      image: alpine:3.18
      script: "#!/bin/sh\\necho hello"
`;
            const doc1 = YAML.parseDocument(`apiVersion: tekton.dev/v1beta1\nkind: __proto__\nmetadata:\n  name: polluted\nspec:\n  tasks: []`);
            const doc2 = YAML.parseDocument(`apiVersion: tekton.dev/v1beta1\nkind: Task\nmetadata:\n  name: valid-task\nspec:\n  steps:\n    - name: step1\n      image: alpine:3.18\n      script: "#!/bin/sh\\necho hello"`);

            const docs = [
                { content: doc1.toJSON(), raw: rawYaml, doc: doc1, path: 'test.yaml' },
                { content: doc2.toJSON(), raw: rawYaml, doc: doc2, path: 'test.yaml' },
            ];

            const reporter = new Reporter(docs as any);
            const config = Config.getDefaultConfig();

            const problems = await lint(docs.map((d) => d.content), reporter, config.rulesConfig);
            expect(problems).toBeDefined();
            expect(({} as any).polluted).toBeUndefined();
        });
    });

    describe('S6: Crash on schema-incomplete input', () => {
        test('Pipeline with missing spec does not crash the linter', async () => {
            const raw = `
apiVersion: tekton.dev/v1beta1
kind: Pipeline
metadata:
  name: pipeline-without-spec
---
apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: dummy-task
spec:
  steps:
    - name: step1
      image: alpine:3.18
      script: "#!/bin/sh\\necho hello"
`;
            const doc1 = YAML.parseDocument(`apiVersion: tekton.dev/v1beta1\nkind: Pipeline\nmetadata:\n  name: pipeline-without-spec`);
            const doc2 = YAML.parseDocument(`apiVersion: tekton.dev/v1beta1\nkind: Task\nmetadata:\n  name: dummy-task\nspec:\n  steps:\n    - name: step1\n      image: alpine:3.18\n      script: "#!/bin/sh\\necho hello"`);

            const docs = [
                { content: doc1.toJSON(), raw, doc: doc1, path: 'missing-spec.yaml' },
                { content: doc2.toJSON(), raw, doc: doc2, path: 'missing-spec.yaml' },
            ];

            const reporter = new Reporter(docs as any);
            const config = Config.getDefaultConfig();

            await expect(lint(docs.map((d) => d.content), reporter, config.rulesConfig)).resolves.not.toThrow();
        });

        test('Pipeline with empty spec does not crash the linter', async () => {
            const raw = `
apiVersion: tekton.dev/v1beta1
kind: Pipeline
metadata:
  name: pipeline-empty-spec
spec: {}
---
apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: dummy-task
spec:
  steps:
    - name: step1
      image: alpine:3.18
      script: "#!/bin/sh\\necho hello"
`;
            const doc1 = YAML.parseDocument(`apiVersion: tekton.dev/v1beta1\nkind: Pipeline\nmetadata:\n  name: pipeline-empty-spec\nspec: {}`);
            const doc2 = YAML.parseDocument(`apiVersion: tekton.dev/v1beta1\nkind: Task\nmetadata:\n  name: dummy-task\nspec:\n  steps:\n    - name: step1\n      image: alpine:3.18\n      script: "#!/bin/sh\\necho hello"`);

            const docs = [
                { content: doc1.toJSON(), raw, doc: doc1, path: 'empty-spec.yaml' },
                { content: doc2.toJSON(), raw, doc: doc2, path: 'empty-spec.yaml' },
            ];

            const reporter = new Reporter(docs as any);
            const config = Config.getDefaultConfig();

            await expect(lint(docs.map((d) => d.content), reporter, config.rulesConfig)).resolves.not.toThrow();
        });
    });

    describe('T2: Resolver refs without name', () => {
        test('Pipeline referencing resolver tasks without name does not crash', async () => {
            const raw = `
apiVersion: tekton.dev/v1beta1
kind: Pipeline
metadata:
  name: pipeline-with-resolver
spec:
  tasks:
    - name: git-resolved-task
      taskRef:
        resolver: git
        params:
          - name: url
            value: https://github.com/tektoncd/catalog.git
          - name: revision
            value: main
          - name: pathInRepo
            value: task/git-clone/0.4/git-clone.yaml
`;
            const doc1 = YAML.parseDocument(raw);
            const docs = [
                { content: doc1.toJSON(), raw, doc: doc1, path: 'resolver.yaml' },
            ];

            const reporter = new Reporter(docs as any);
            const config = Config.getDefaultConfig();

            await expect(lint(docs.map((d) => d.content), reporter, config.rulesConfig)).resolves.not.toThrow();
        });
    });
});
