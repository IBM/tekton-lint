import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import url from 'node:url';
import collector from './Collector.js';
import Reporter from './reporter.js';
import { lint as doLint } from './rules.js';

interface Config {
    rules: {
        [rule: string]: 'off' | 'warning' | 'error';
    };
}

const getRulesConfig = (): Config => {
    const defaultRcFile = fs.readFileSync(
        path.resolve(path.dirname(new url.URL(import.meta.url).pathname), '..', '.tektonlintrc.yaml'),
        'utf8',
    );
    const defaultConfig = yaml.parse(defaultRcFile);

    if (fs.existsSync('./.tektonlintrc.yaml')) {
        const customRcFile = fs.readFileSync('./.tektonlintrc.yaml', 'utf8');
        const customConfig = yaml.parse(customRcFile);
        customConfig.rules = { ...defaultConfig.rules, ...customConfig.rules };

        return customConfig;
    }

    return defaultConfig;
};

export function lint(docs, reporter, config?: Config) {
    reporter = reporter || new Reporter();
    config = config ?? getRulesConfig();
    return doLint(docs, reporter, config);
}

export default async function runner(globs, config?: Config) {
    const docs = await collector(globs);
    const reporter = new Reporter(docs);
    return lint(
        docs.map((doc: any) => doc.content),
        reporter,
        config,
    );
}
