import os from 'node:os';
import path from 'node:path';
import env from 'env-var';
import fs from 'node:fs';
import yaml from 'yaml';
import defaultConfig from './default-rule-config.js';
import { logger } from './logger.js';
import { RulesConfig } from './interfaces/common.js';
import json from './formatters/json.js';
export class Config {
    private _rulesConfig: RulesConfig;

    private _cache_dir: string;
    private _max_warnings: number;
    private _globs: string[];
    private _refresh_cache: boolean;
    private _format: string;
    private _quiet: boolean;

    public constructor(cliConfig: any) {
        let user_tektonlintrc = path.resolve(cliConfig['config']);
        if (fs.lstatSync(user_tektonlintrc).isDirectory()) {
            user_tektonlintrc = path.join(user_tektonlintrc, '.tektonlintrc.yaml');
        }

        if (fs.existsSync(user_tektonlintrc)) {
            const customRcFile = fs.readFileSync(user_tektonlintrc, 'utf8');
            const customConfig = yaml.parse(customRcFile);
            this._rulesConfig = { ...defaultConfig.rules, ...customConfig.rules };

            logger.info('Using .tektonlintrc.yaml at %s', user_tektonlintrc);
            logger.info('customConfig %o', customConfig);
            this._rulesConfig = customConfig;
            this._globs = [...cliConfig['_'], ...(customConfig.globs ? customConfig.globs : [])];
        } else {
            logger.warn('Unable to find configuration - using defaults');
            this._rulesConfig = defaultConfig;
            this._globs = [...cliConfig['_']];
        }

        this._cache_dir = env.get('TL_CACHE_DIR').default(path.join(os.homedir(), '.tekton-lint')).asString();
        this._max_warnings = cliConfig['max-warnings'];
        this._refresh_cache = cliConfig['refresh-cache'];
        this._format = cliConfig['format'];
        this._quiet = cliConfig['quiet'];

        if (!fs.existsSync(this._cache_dir)) {
            fs.mkdirSync(this._cache_dir, { recursive: true });
        }
    }

    public get rulesConfig() {
        return this._rulesConfig;
    }

    public get cache_dir() {
        return this._cache_dir;
    }

    public get max_warnings() {
        return this._max_warnings;
    }

    public get globs() {
        return this._globs;
    }

    public set globs(globs: string[]) {
        this._globs = globs;
    }

    public get refreshCache() {
        return this._refresh_cache;
    }

    public set refreshCache(refresh: boolean) {
        this._refresh_cache = refresh;
    }

    public get format() {
        return this._format;
    }

    public set format(format: string) {
        this._format = format;
    }

    public get quiet() {
        return this._quiet;
    }

    public set quiet(quiet: boolean) {
        this._quiet = quiet;
    }

    public static getDefaultConfig(): Config {
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

        const config = new Config(argv);
        return config;
    }
}
