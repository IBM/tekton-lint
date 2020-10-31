import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import collector from './Collector';
import Reporter from './reporter';
import { lint as doLint } from './rules';

interface Config {
  rules: {
    [rule: string]: 'off' | 'warning' | 'error';
  };
}

const getRulesConfig = (): Config => {
  const defaultRcFile = fs.readFileSync(path.resolve(__dirname, '..', '.tektonlintrc.yaml'), 'utf8');
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
};

export default async function runner(globs, config?: Config) {
  const docs = await collector(globs);
  const reporter = new Reporter(docs);
  return lint(docs.map(doc => doc.content), reporter, config);
};
