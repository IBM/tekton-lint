import { ToolConfig, toolConfig } from './config.js';
import json from './formatters/json.js';
import run from './runner.js';
import { Problem, Location } from './interfaces/common.js';

const linter = async (cfg: ToolConfig, globs: string[]): Promise<Problem[]> => {
    cfg.globs = [...cfg.globs, ...globs];
    const problems = await run(cfg);
    return problems;
};

const getDefaultConfig = (): ToolConfig => {
    // create default cli-proxy

    const argv = {
        watch: false,
        color: true,
        format: json,
        quite: false,
        config: process.cwd(),
        'refresh-cache': false,
        _: [],
    };

    const config = toolConfig(argv);
    return config;
};

export { Problem, Location, ToolConfig, getDefaultConfig, linter };
