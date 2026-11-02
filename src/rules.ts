import { RuleLoader } from './rule-loader.js';

import { Tekton } from './interfaces/common.js';
import { logger } from './logger.js';

const createReporter = (rule, config, reporter) => {
    const isError = config.rules[rule] && config.rules[rule] === 'error';

    return (message, node, prop) => {
        reporter.report(message, node, prop, isError, rule);
    };
};

const parse = (docs): Tekton => {
    const taskDocs = docs.filter((item) => item.kind === 'Task' || item.kind === 'ClusterTask');

    const taskVersions: { [name: string]: { [version: string]: any } } = {};
    for (const item of taskDocs) {
        const version = item.metadata?.labels?.['app.kubernetes.io/version'];
        if (version) {
            const name = item.metadata.name;
            if (!taskVersions[name]) taskVersions[name] = {};
            taskVersions[name][version] = item;
        }
    }

    const tkn: Tekton = {
        tasks: Object.fromEntries(taskDocs.map((item) => [item.metadata.name, item])),
        taskVersions,
        pipelines: Object.fromEntries(
            docs.filter((item) => item.kind === 'Pipeline').map((item) => [item.metadata.name, item]),
        ),
        listeners: Object.fromEntries(
            docs.filter((item) => item.kind === 'EventListener').map((item) => [item.metadata.name, item]),
        ),
        triggerTemplates: Object.fromEntries(
            docs.filter((item) => item.kind === 'TriggerTemplate').map((item) => [item.metadata.name, item]),
        ),
        triggerBindings: Object.fromEntries(
            docs.filter((item) => item.kind === 'TriggerBinding').map((item) => [item.metadata.name, item]),
        ),
        conditions: Object.fromEntries(
            docs.filter((item) => item.kind === 'Condition').map((item) => [item.metadata.name, item]),
        ),
        pipelineRuns: Object.fromEntries(
            docs.filter((item) => item.kind === 'PipelineRun').map((item) => [item.metadata.name, item]),
        ),
    };

    logger.info('Tekton: %o', tkn);
    //fs.writeFileSync('tekton.json', JSON.stringify(tkn), 'utf-8');
    return tkn;
};

export async function lint(docs, reporter, config) {
    const rules = await RuleLoader.getRules(config);

    docs = docs.filter((doc) => doc && doc.metadata && doc.metadata.name);
    const tekton = parse(docs);

    if (Object.values(tekton).every((definitionKind) => Object.keys(definitionKind).length === 0)) {
        throw Error('No tekton definitions can be found with the given paths');
    }

    for (const [name, rule] of Object.entries(rules)) {
        const skipped = config.rules[name] && config.rules[name] === 'off';
        if (skipped) {
            logger.info('skipping rule %s', name);
            continue;
        }

        logger.info('handling rule %s', name);
        const ruleReporter = createReporter(name, config, reporter);

        // call the rule here
        rule(docs, tekton, ruleReporter);
    }

    return reporter.problems;
}
