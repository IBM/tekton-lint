import os from 'node:os';
import path from 'node:path';
import env from 'env-var';
import fs from 'node:fs';
import yaml from 'yaml';
// import url from 'node:url';
import defaultConfig from './default-rule-config.js';

import { logger } from './logger.js';

import { RulesConfig } from './interfaces/common.js';

export const getRulesConfig = (cfg: ToolConfig): RulesConfig => {
    // read the default file
    // const defaultRcFile = fs.readFileSync(
    //     path.resolve(path.dirname(new url.URL(import.meta.url).pathname), '..', '.tektonlintrc.yaml'),
    //     'utf8',
    // );
    // const defaultConfig = yaml.parse(defaultRcFile);

    let user_tektonlintrc = path.resolve(cfg.tektonlintrc);
    if (fs.lstatSync(user_tektonlintrc).isDirectory()) {
        user_tektonlintrc = path.join(user_tektonlintrc, '.tektonlintrc.yaml');
    }

    logger.info('Using .tektonlintrc.yaml at %s', user_tektonlintrc);

    if (fs.existsSync(user_tektonlintrc)) {
        const customRcFile = fs.readFileSync(user_tektonlintrc, 'utf8');
        const customConfig = yaml.parse(customRcFile);
        customConfig.rules = { ...defaultConfig.rules, ...customConfig.rules };

        logger.info('customConfig %o', customConfig);
        return customConfig;
    }

    logger.info(defaultConfig);
    return defaultConfig;
};

export interface ToolConfig {
    tektonlintrc: string;
    cache_dir: string;
    max_warnings: number;
    globs: string[];
    refresh_cache: string;
    format: string;
    quiet: boolean;
}

let CFG: ToolConfig;

export const toolConfig = (cliConfig: any): ToolConfig => {
    if (!CFG) {
        CFG = {
            tektonlintrc: cliConfig['config'],
            cache_dir: env.get('TL_CACHE_DIR').default(path.join(os.homedir(), '.tekton-lint')).asString(),
            max_warnings: cliConfig['max-warnings'],
            globs: cliConfig['_'],
            refresh_cache: cliConfig['refresh-cache'],
            format: cliConfig['format'],
            quiet: cliConfig['quiet'],
        };

        if (!fs.existsSync(CFG.cache_dir)) {
            fs.mkdirSync(CFG.cache_dir, { recursive: true });
        }
    }

    return CFG;
};
