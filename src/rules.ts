import { RuleLoader } from './rule-loader.js';
import { normalizeDocs } from './normalize.js';

import { Tekton } from './interfaces/common.js';
import { logger } from './logger.js';

const createReporter = (rule, config, reporter) => {
    const isError = config.rules[rule] && config.rules[rule] === 'error';

    return (message, node, prop) => {
        reporter.report(message, node, prop, isError, rule);
    };
};

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

// Runs are normally created with `metadata.generateName` instead of `metadata.name`
const GENERATED_NAME_KINDS = new Set(['PipelineRun', 'TaskRun']);

const resourceName = (item): string | undefined =>
    item.metadata.name || (GENERATED_NAME_KINDS.has(item.kind) ? item.metadata.generateName : undefined);

const isNamedResource = (item): boolean =>
    !!(item && item.kind && item.metadata) &&
    !!resourceName(item) &&
    !DANGEROUS_KEYS.has(item.kind) &&
    !DANGEROUS_KEYS.has(resourceName(item) as string);

const parse = (docs: any[]): Tekton => {
    const safeDocs = (docs || []).filter(isNamedResource);

    const taskDocs = safeDocs.filter((item) => item.kind === 'Task' || item.kind === 'ClusterTask');

    const taskVersions: { [name: string]: { [version: string]: any } } = Object.create(null);
    for (const item of taskDocs) {
        const version = item.metadata?.labels?.['app.kubernetes.io/version'];
        if (version && !DANGEROUS_KEYS.has(version)) {
            const name = item.metadata.name;
            if (!taskVersions[name]) taskVersions[name] = Object.create(null);
            taskVersions[name][version] = item;
        }
    }

    const buildRecord = (items: any[]) => {
        const rec = Object.create(null);
        for (const item of items) {
            rec[resourceName(item) as string] = item;
        }
        return rec;
    };

    const tkn: Tekton = {
        tasks: buildRecord(taskDocs),
        taskVersions,
        pipelines: buildRecord(safeDocs.filter((item) => item.kind === 'Pipeline')),
        listeners: buildRecord(safeDocs.filter((item) => item.kind === 'EventListener')),
        triggerTemplates: buildRecord(safeDocs.filter((item) => item.kind === 'TriggerTemplate')),
        triggerBindings: buildRecord(safeDocs.filter((item) => item.kind === 'TriggerBinding')),
        conditions: buildRecord(safeDocs.filter((item) => item.kind === 'Condition')),
        pipelineRuns: buildRecord(safeDocs.filter((item) => item.kind === 'PipelineRun')),
        taskRuns: buildRecord(safeDocs.filter((item) => item.kind === 'TaskRun')),
    };

    logger.info(
        'Tekton definitions parsed: %d tasks, %d pipelines, %d listeners, %d triggerTemplates, %d triggerBindings, %d conditions, %d pipelineRuns',
        Object.keys(tkn.tasks || {}).length,
        Object.keys(tkn.pipelines || {}).length,
        Object.keys(tkn.listeners || {}).length,
        Object.keys(tkn.triggerTemplates || {}).length,
        Object.keys(tkn.triggerBindings || {}).length,
        Object.keys(tkn.conditions || {}).length,
        Object.keys(tkn.pipelineRuns || {}).length,
    );
    //fs.writeFileSync('tekton.json', JSON.stringify(tkn), 'utf-8');
    return tkn;
};

export async function lint(docs, reporter, config) {
    const rules = await RuleLoader.getRules(config);

    docs = (docs || []).filter(isNamedResource);
    normalizeDocs(docs);
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
