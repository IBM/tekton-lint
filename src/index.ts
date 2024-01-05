import { ToolConfig, toolConfig } from './config.js';
import json from './formatters/json.js';
import run from './runner.js';

const linter = async (cfg: ToolConfig, globs: string[]) => {
    cfg.globs = globs;
    const problems = await run(cfg);
    return problems;
};

const getDefaultConfig = () => {
    // create default cli-proxy

    const argv = {
        watch: false,
        color: true,
        format: json,
        quite: false,
        config: process.cwd(),
        'refresh-cache': false,
    };

    const config = toolConfig(argv);
    return config;
};

export { ToolConfig, getDefaultConfig, linter };
