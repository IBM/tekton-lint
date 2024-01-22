import rules from './rule-loader.js';

import { logger } from './logger.js';
import { Tekton } from './interfaces/common.js';

const createReporter = (rule, config, reporter) => {
    const isError = config.rules[rule] && config.rules[rule] === 'error';

    return (message, node, prop) => {
        reporter.report(message, node, prop, isError, rule);
    };
};

const parse = (docs): Tekton => {
    const tkn: Tekton = {
        tasks: Object.fromEntries(
            docs.filter((item) => item.kind === 'Task').map((item) => [item.metadata.name, item]),
        ),
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

export function lint(docs, reporter, config) {
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
