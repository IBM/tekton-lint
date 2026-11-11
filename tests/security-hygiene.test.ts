import { lint } from '../src/rules.js';
import Reporter from '../src/reporter.js';
import { Config } from '../src/config.js';
import YAML from 'yaml';
import fs from 'node:fs';

const raw = fs.readFileSync('./regression-tests/general/security-hygiene.yaml', 'utf-8');

async function run(rules: Record<string, string>, source = raw) {
    const raw = source;
    const config = Config.getDefaultConfig();
    config.rulesConfig.rules = { ...config.rulesConfig.rules, ...rules } as any;
    const docs = YAML.parseAllDocuments(raw).map((doc) => ({
        content: doc.toJSON(),
        raw,
        doc,
        path: 'security-hygiene.yaml',
    }));
    return lint(
        docs.map((d) => d.content),
        new Reporter(docs as any),
        config.rulesConfig,
    );
}

const only = async (rule: string) => (await run({ [rule]: 'warning' })).filter((p) => p.rule === rule);

describe('security hygiene rules (T6)', () => {
    test('no-script-injection flags only steps that interpolate params into a script', async () => {
        const problems = await only('no-script-injection');
        expect(problems.map((p) => p.message.match(/Step '([^']+)'/)?.[1]).sort()).toEqual(['injectable', 's']);
    });

    test('no-insecure-security-context flags each unsafe setting once', async () => {
        const problems = await only('no-insecure-security-context');
        expect(problems).toHaveLength(4);
        expect(problems.every((p) => p.message.includes("Step 'privileged'"))).toBe(true);
    });

    test('no-hardcoded-secret flags only literal secret-like values', async () => {
        const problems = await only('no-hardcoded-secret');
        expect(problems).toHaveLength(1);
        expect(problems[0].message).toContain("'API_TOKEN'");
    });

    test('no-unpinned-remote is off by default', async () => {
        expect((await run({})).filter((p) => p.rule === 'no-unpinned-remote')).toEqual([]);
    });

    test('no-unpinned-remote flags unpinned git revisions and bundles when enabled', async () => {
        const problems = await only('no-unpinned-remote');
        expect(problems.map((p) => p.message.match(/task '([^']+)'/)?.[1]).sort()).toEqual([
            'bundle-unpinned',
            'git-unpinned-branch',
            'legacy-bundle',
        ]);
    });
});

describe('security hygiene rules, review follow-ups', () => {
    const level = (rule: string) => ({ [rule]: 'warning' });
    const problemsFor = async (rule: string, source: string) =>
        (await run(level(rule), source)).filter((p) => p.rule === rule);

    const taskWithStep = (step: string) => `apiVersion: tekton.dev/v1
kind: Task
metadata:
  name: t
spec:
  steps:
    - name: s
      image: alpine:3.20
${step}`;

    test('no-hardcoded-secret exempts only complete variable references', async () => {
        const source = taskWithStep(`      env:
        - name: PASSWORD
          value: pa$(ssword
        - name: API_TOKEN
          value: $(params.token)
        - name: DB_PASSWORD
          value: $(params['db-password'])
        - name: SECRET_KEY
          value: prefix-$(context.taskRun.name)
`);
        const problems = await problemsFor('no-hardcoded-secret', source);
        expect(problems.map((p) => p.message.match(/'([^']+)'/)?.[1])).toEqual(['PASSWORD']);
    });

    test('no-script-injection recognizes bracket and v1alpha1 parameter forms', async () => {
        const script = (ref: string) => `      script: echo ${ref}\n`;
        for (const ref of ["$(params['message'])", '$(params["message"])', '$(inputs.params.message)']) {
            const problems = await problemsFor('no-script-injection', taskWithStep(script(ref)));
            expect(problems).toHaveLength(1);
        }
        expect(await problemsFor('no-script-injection', taskWithStep(script('$(context.task.name)')))).toEqual([]);
    });

    test('no-insecure-security-context checks TaskRun and PipelineRun pod templates', async () => {
        const source = `apiVersion: tekton.dev/v1
kind: TaskRun
metadata:
  name: tr
spec:
  taskRef:
    name: t
  podTemplate:
    securityContext:
      runAsUser: 0
---
apiVersion: tekton.dev/v1
kind: PipelineRun
metadata:
  name: pr
spec:
  pipelineRef:
    name: p
  taskRunTemplate:
    podTemplate:
      securityContext:
        runAsNonRoot: false
  taskRunSpecs:
    - pipelineTaskName: a
      podTemplate:
        securityContext:
          runAsUser: 0
---
apiVersion: tekton.dev/v1
kind: TaskRun
metadata:
  name: safe
spec:
  taskRef:
    name: t
  podTemplate:
    securityContext:
      runAsNonRoot: true
      runAsUser: 1000
`;
        const problems = await problemsFor('no-insecure-security-context', source);
        expect(problems.map((p) => p.message)).toEqual([
            expect.stringContaining("TaskRun 'tr' pod template runs as root"),
            expect.stringContaining("PipelineRun 'pr' pod template sets runAsNonRoot to false"),
            expect.stringContaining("PipelineRun 'pr' pod template runs as root"),
        ]);
    });

    test('no-latest-image still checks images when a variable is only in the registry', async () => {
        const source = taskWithStep('').replace('image: alpine:3.20', 'image: $(params.registry)/alpine');
        const problems = await problemsFor('no-latest-image', source);
        expect(problems).toHaveLength(1);
        const tagVar = taskWithStep('').replace('image: alpine:3.20', 'image: $(params.image)');
        expect(await problemsFor('no-latest-image', tagVar)).toEqual([]);
    });

    test('no-unpinned-remote flags branch or tag revisions even when parameterized', async () => {
        const pipeline = (revision: string) => `apiVersion: tekton.dev/v1
kind: Pipeline
metadata:
  name: p
spec:
  tasks:
    - name: a
      taskRef:
        resolver: git
        params:
          - name: revision
            value: ${revision}
`;
        expect(await problemsFor('no-unpinned-remote', pipeline('refs/heads/$(params.branch)'))).toHaveLength(1);
        expect(await problemsFor('no-unpinned-remote', pipeline('tags/$(params.tag)'))).toHaveLength(1);
        expect(await problemsFor('no-unpinned-remote', pipeline('$(params.sha)'))).toEqual([]);
    });

    test('no-unpinned-remote inspects TriggerTemplate resourcetemplates', async () => {
        const source = `apiVersion: triggers.tekton.dev/v1beta1
kind: TriggerTemplate
metadata:
  name: tt
spec:
  resourcetemplates:
    - apiVersion: tekton.dev/v1
      kind: PipelineRun
      metadata:
        generateName: run-
      spec:
        pipelineSpec:
          tasks:
            - name: a
              taskRef:
                resolver: git
                params:
                  - name: revision
                    value: main
`;
        const problems = await problemsFor('no-unpinned-remote', source);
        expect(problems).toHaveLength(1);
        expect(problems[0].message).toContain("PipelineRun 'run-' task 'a'");
    });

    test('standalone TaskRun and generateName runs reach the rules', async () => {
        const taskRun = `apiVersion: tekton.dev/v1
kind: TaskRun
metadata:
  generateName: run-
spec:
  taskSpec:
    steps:
      - name: s
        image: alpine
        script: echo $(params.x)
`;
        expect(await problemsFor('no-latest-image', taskRun)).toHaveLength(1);
        expect(await problemsFor('no-script-injection', taskRun)).toHaveLength(1);

        const pipelineRun = `apiVersion: tekton.dev/v1
kind: PipelineRun
metadata:
  generateName: pr-
spec:
  pipelineSpec:
    tasks:
      - name: a
        taskSpec:
          steps:
            - name: s
              image: alpine
`;
        expect(await problemsFor('no-latest-image', pipelineRun)).toHaveLength(1);
    });
});
