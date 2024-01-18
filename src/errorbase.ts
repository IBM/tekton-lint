export type ErrorNames = 'RULE_PARSE_ERROR';

export class ErrorBase extends Error {
    name: string;
    message: string;
    cause: any;

    constructor(name: string, msg: string, cause?: any) {
        super();
        this.name = name;
        this.message = msg;
        this.cause = cause;
    }
}

export class RuleError extends ErrorBase {
    constructor(msg: string, rulename: string, data: string, cause?: any) {
        super('RuleError', `${rulename} - ${msg}  ${data}`, cause);
    }
}
