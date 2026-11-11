import { lint } from '../src/rules.js';
import Reporter from '../src/reporter.js';
import { Config } from '../src/config.js';
import { RuleLoader } from '../src/rule-loader.js';
import YAML from 'yaml';

// Each snippet is schema-incomplete or malformed. No rule may throw on any of them.
// A well-formed Task is appended so that "no tekton definitions" is never the reason for a failure.
const companion = `---\napiVersion: tekton.dev/v1\nkind: Task\nmetadata:\n  name: companion\nspec:\n  steps: []\n`;
const base = (kind: string, spec: string) =>
    `apiVersion: tekton.dev/v1\nkind: ${kind}\nmetadata:\n  name: x\n${spec}${companion}`;

const malformed: Record<string, string> = {
    'pipeline without spec': base('Pipeline', ''),
    'pipeline with null spec': base('Pipeline', 'spec:\n'),
    'pipeline tasks null': base('Pipeline', 'spec:\n  tasks:\n'),
    'pipeline task entry null': base('Pipeline', 'spec:\n  tasks:\n    - null\n'),
    'pipeline task without name': base('Pipeline', 'spec:\n  tasks:\n    - taskRef:\n        name: y\n'),
    'pipeline taskRef resolver without name': base(
        'Pipeline',
        'spec:\n  tasks:\n    - name: a\n      taskRef:\n        resolver: git\n',
    ),
    'pipeline taskRef null': base('Pipeline', 'spec:\n  tasks:\n    - name: a\n      taskRef:\n'),
    'pipeline params not a list': base('Pipeline', 'spec:\n  params: nope\n  tasks: []\n'),
    'pipeline param entry null': base('Pipeline', 'spec:\n  params:\n    - null\n  tasks: []\n'),
    'pipeline finally null entry': base('Pipeline', 'spec:\n  tasks: []\n  finally:\n    - null\n'),
    'pipeline runAfter not a list': base(
        'Pipeline',
        'spec:\n  tasks:\n    - name: a\n      taskRef:\n        name: y\n      runAfter: b\n',
    ),
    'pipeline matrix null': base(
        'Pipeline',
        'spec:\n  tasks:\n    - name: a\n      taskRef:\n        name: y\n      matrix:\n',
    ),
    'pipeline workspaces null': base(
        'Pipeline',
        'spec:\n  workspaces:\n  tasks:\n    - name: a\n      taskRef:\n        name: y\n      workspaces:\n',
    ),
    'pipeline inline taskSpec with matrix params not a list': base(
        'Pipeline',
        'spec:\n  tasks:\n    - name: a\n      taskSpec:\n        params: []\n        steps: []\n      matrix:\n        params: nope\n',
    ),
    'pipeline matrix params entry null': base(
        'Pipeline',
        'spec:\n  tasks:\n    - name: a\n      taskRef:\n        name: companion\n      matrix:\n        params:\n          - null\n',
    ),
    'pipeline matrix include not a list': base(
        'Pipeline',
        'spec:\n  tasks:\n    - name: a\n      taskRef:\n        name: companion\n      matrix:\n        include: nope\n',
    ),
    'pipeline matrix include entry null': base(
        'Pipeline',
        'spec:\n  tasks:\n    - name: a\n      taskRef:\n        name: companion\n      matrix:\n        include:\n          - null\n',
    ),
    'pipeline matrix include params entry null': base(
        'Pipeline',
        'spec:\n  tasks:\n    - name: a\n      taskRef:\n        name: companion\n      matrix:\n        include:\n          - name: i\n            params:\n              - null\n',
    ),
    'task without spec': base('Task', ''),
    'task legacy inputs params entry null': base('Task', 'spec:\n  inputs:\n    params:\n      - null\n  steps: []\n'),
    'task legacy inputs params not a list': base('Task', 'spec:\n  inputs:\n    params: nope\n  steps: []\n'),
    'task null spec': base('Task', 'spec:\n'),
    'task steps null': base('Task', 'spec:\n  steps:\n'),
    'task step entry null': base('Task', 'spec:\n  steps:\n    - null\n'),
    'task step without name': base('Task', 'spec:\n  steps:\n    - image: alpine\n'),
    'task step script not a string': base('Task', 'spec:\n  steps:\n    - name: s\n      script: 1\n'),
    'task step image not a string': base('Task', 'spec:\n  steps:\n    - name: s\n      image: 1\n'),
    'task params not a list': base('Task', 'spec:\n  params: nope\n  steps: []\n'),
    'task param entry null': base('Task', 'spec:\n  params:\n    - null\n  steps: []\n'),
    'task results null': base('Task', 'spec:\n  results:\n  steps: []\n'),
    'task workspaces null': base('Task', 'spec:\n  workspaces:\n  steps: []\n'),
    'task volumes null': base('Task', 'spec:\n  volumes:\n  steps: []\n'),
    'task env null': base('Task', 'spec:\n  steps:\n    - name: s\n      env:\n'),
    'task env entry null': base('Task', 'spec:\n  steps:\n    - name: s\n      env:\n        - null\n'),
    'taskrun without spec': base('TaskRun', ''),
    'pipelinerun without spec': base('PipelineRun', ''),
    'pipelinerun null pipelineSpec': base('PipelineRun', 'spec:\n  pipelineSpec:\n'),
    'pipelinerun params null': base('PipelineRun', 'spec:\n  params:\n'),
    'triggertemplate without spec': base('TriggerTemplate', ''),
    'triggertemplate null resourcetemplates': base('TriggerTemplate', 'spec:\n  resourcetemplates:\n'),
    'triggertemplate null entry': base('TriggerTemplate', 'spec:\n  resourcetemplates:\n    - null\n'),
    'triggertemplate params null': base('TriggerTemplate', 'spec:\n  params:\n  resourcetemplates: []\n'),
    'eventlistener without spec': base('EventListener', ''),
    'eventlistener null triggers': base('EventListener', 'spec:\n  triggers:\n'),
    'eventlistener trigger null': base('EventListener', 'spec:\n  triggers:\n    - null\n'),
    'triggerbinding without spec': base('TriggerBinding', ''),
    'triggerbinding params null': base('TriggerBinding', 'spec:\n  params:\n'),
    'triggerbinding params not a list': base('TriggerBinding', 'spec:\n  params: nope\n'),
    'triggerbinding param entry null': base('TriggerBinding', 'spec:\n  params:\n    - null\n'),
    'condition without spec': base('Condition', ''),
    'cluster task without spec': base('ClusterTask', ''),
};

const rules = await RuleLoader.getRules({ rules: {} } as any);

async function run(raw: string, only?: string) {
    const config = Config.getDefaultConfig();
    config.rulesConfig.rules = Object.fromEntries(
        Object.keys(rules).map((name) => [name, only && name !== only ? 'off' : 'error']),
    ) as any;
    const docs = YAML.parseAllDocuments(raw).map((doc) => ({ content: doc.toJSON(), raw, doc, path: 'test.yaml' }));
    return lint(
        docs.map((d) => d.content),
        new Reporter(docs as any),
        config.rulesConfig,
    );
}

describe('malformed input never crashes a rule (Q5)', () => {
    describe.each(Object.entries(malformed))('%s', (_label, raw) => {
        test.each(Object.keys(rules))('%s', async (rule) => {
            await expect(run(raw, rule)).resolves.toBeDefined();
        });
    });
});
