import { lint } from '../src/rules.js';
import Reporter from '../src/reporter.js';
import { Config } from '../src/config.js';
import YAML from 'yaml';

async function run(raw: string, rules: Record<string, string>) {
    const config = Config.getDefaultConfig();
    config.rulesConfig.rules = { ...config.rulesConfig.rules, ...rules } as any;
    const doc = YAML.parseDocument(raw);
    const docs = [{ content: doc.toJSON(), raw, doc, path: 'test.yaml' }];
    return lint(
        docs.map((d) => d.content),
        new Reporter(docs as any),
        config.rulesConfig,
    );
}

describe('prefer-v1 (T3)', () => {
    const raw = `apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: old
spec:
  steps: []
---
apiVersion: tekton.dev/v1
kind: Task
metadata:
  name: new
spec:
  steps: []
`;

    test('is off by default', async () => {
        const problems = await run(raw, {});
        expect(problems.filter((p) => p.rule === 'prefer-v1')).toEqual([]);
    });

    test('flags only v1beta1 resources when enabled', async () => {
        const problems = (await run(raw, { 'prefer-v1': 'warning' })).filter((p) => p.rule === 'prefer-v1');
        expect(problems).toHaveLength(1);
        expect(problems[0].message).toContain("Task 'old'");
    });
});

describe('no-deprecated-feature (T3)', () => {
    test('flags ClusterTask refs, Condition and PipelineResources', async () => {
        const raw = `apiVersion: tekton.dev/v1beta1
kind: Pipeline
metadata:
  name: p
spec:
  tasks:
    - name: a
      taskRef:
        name: x
        kind: ClusterTask
`;
        const problems = (await run(raw, {})).filter((p) => p.rule === 'no-deprecated-feature');
        expect(problems).toHaveLength(1);
        expect(problems[0].message).toContain("ClusterTask 'x'");
    });

    test('does not throw on malformed input', async () => {
        const raw = `apiVersion: tekton.dev/v1
kind: Pipeline
metadata:
  name: p
spec:
  tasks:
    - name: a
      taskRef: {resolver: git}
`;
        await expect(run(raw, {})).resolves.toBeDefined();
    });
});
