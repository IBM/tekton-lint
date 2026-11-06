import { lint } from '../src/rules.js';
import Reporter from '../src/reporter.js';
import { Config } from '../src/config.js';
import YAML from 'yaml';

// A defect of each kind is placed in each location a pipeline task can appear.
// Every rule must report it in every location.

const companion = `---
apiVersion: tekton.dev/v1
kind: Task
metadata:
  name: needs-things
spec:
  params:
    - name: required
      type: string
    - name: other
      type: string
  workspaces:
    - name: ws
  results:
    - name: out
  steps:
    - name: s
      image: alpine:3.20
`;

async function run(yaml: string, rule: string) {
    const raw = yaml + companion;
    const config = Config.getDefaultConfig();
    config.rulesConfig.rules = Object.fromEntries(
        Object.keys(config.rulesConfig.rules).map((name) => [name, name === rule ? 'error' : 'off']),
    ) as any;
    const docs = YAML.parseAllDocuments(raw).map((doc) => ({ content: doc.toJSON(), raw, doc, path: 't.yaml' }));
    return (
        await lint(
            docs.map((d) => d.content),
            new Reporter(docs as any),
            config.rulesConfig,
        )
    ).filter((p) => p.rule === rule);
}

const indent = (text: string, n: number) =>
    text
        .split('\n')
        .map((l) => (l ? ' '.repeat(n) + l : l))
        .join('\n');

// A valid task that always sits in `tasks`, so a task in `finally` can consume its results.
const producer = `- name: producer
  taskRef:
    name: needs-things
  params:
    - name: required
      value: x
    - name: other
      value: y
  workspaces:
    - name: ws
      workspace: pw
`;

const pipelineBody = (entry: string, section: 'tasks' | 'finally', pad: number) =>
    indent(
        `params:\n  - name: pp\n    type: string\nworkspaces:\n  - name: pw\ntasks:\n${indent(producer, 2)}${
            section === 'tasks' ? indent(entry, 2) : ''
        }${section === 'finally' ? `finally:\n${indent(entry, 2)}` : ''}`,
        pad,
    );

type Location = { name: string; wrap: (entry: string) => string };

const locations: Location[] = [
    {
        name: 'Pipeline.spec.tasks',
        wrap: (e) =>
            `apiVersion: tekton.dev/v1\nkind: Pipeline\nmetadata:\n  name: p\nspec:\n${pipelineBody(e, 'tasks', 2)}`,
    },
    {
        name: 'Pipeline.spec.finally',
        wrap: (e) =>
            `apiVersion: tekton.dev/v1\nkind: Pipeline\nmetadata:\n  name: p\nspec:\n${pipelineBody(e, 'finally', 2)}`,
    },
    {
        name: 'PipelineRun.spec.pipelineSpec.tasks',
        wrap: (e) =>
            `apiVersion: tekton.dev/v1\nkind: PipelineRun\nmetadata:\n  name: p\nspec:\n  pipelineSpec:\n${pipelineBody(e, 'tasks', 4)}`,
    },
    {
        name: 'PipelineRun.spec.pipelineSpec.finally',
        wrap: (e) =>
            `apiVersion: tekton.dev/v1\nkind: PipelineRun\nmetadata:\n  name: p\nspec:\n  pipelineSpec:\n${pipelineBody(e, 'finally', 4)}`,
    },
];

const call = (extra: string) =>
    `- name: a\n  taskRef:\n    name: needs-things\n  params:\n    - name: required\n      value: x\n    - name: other\n      value: y\n${extra}`;

const cases: { rule: string; defect: string; entry: string }[] = [
    {
        rule: 'no-extra-param',
        defect: 'unknown param supplied',
        entry: call('    - name: bogus\n      value: y\n'),
    },
    {
        rule: 'no-missing-param',
        defect: 'required param not supplied',
        entry: `- name: a\n  taskRef:\n    name: needs-things\n  params:\n    - name: required\n      value: x\n`,
    },
    {
        rule: 'no-missing-workspace',
        defect: 'workspace not defined on the pipeline',
        entry: call('  workspaces:\n    - name: ws\n      workspace: does-not-exist\n'),
    },
    {
        rule: 'no-undefined-param',
        defect: 'undefined pipeline param',
        entry: `- name: a\n  taskRef:\n    name: needs-things\n  params:\n    - name: required\n      value: $(params.nope)\n    - name: other\n      value: y\n`,
    },
    {
        rule: 'no-invalid-param-type',
        defect: 'embedded taskSpec param with a non-string default',
        entry: `- name: a\n  taskSpec:\n    params:\n      - name: n\n        default: 5\n    steps: []\n`,
    },
    {
        rule: 'no-undefined-result',
        defect: 'result the producer does not declare',
        entry: `- name: a\n  taskRef:\n    name: needs-things\n  params:\n    - name: required\n      value: $(tasks.producer.results.nope)\n    - name: other\n      value: y\n`,
    },
    {
        rule: 'prefer-when-expression',
        defect: 'uses conditions',
        entry: call('  conditions:\n    - conditionRef: c\n'),
    },
    {
        rule: 'no-undefined-volume',
        defect: 'embedded taskSpec mounts a volume it does not declare',
        entry: `- name: a\n  taskSpec:\n    steps:\n      - name: s\n        image: alpine:3.20\n        volumeMounts:\n          - name: missing\n            mountPath: /x\n`,
    },
];

describe('embedded spec coverage (T7)', () => {
    describe.each(cases)('$rule: $defect', ({ rule, entry }) => {
        test.each(locations)('detected in $name', async ({ wrap }) => {
            const problems = await run(wrap(entry), rule);
            expect(problems.length).toBeGreaterThan(0);
        });
    });
});
