import { Doc, Location, Problem } from './interfaces/common.js';

function walk(node, path, visitor) {
    if (typeof node === 'string' || typeof node === 'number') {
        visitor(node, path);
    } else if (Array.isArray(node)) {
        visitor(node, path);
        for (const [index, child] of Object.entries(node)) {
            walk(child, [...path, index], visitor);
        }
    } else {
        visitor(node, path);
        if (!node) return;
        for (const [key, value] of Object.entries(node)) {
            walk(value, [...path, key], visitor);
        }
    }
}

function instrument(docs: Doc[]) {
    const m = new Map();
    for (const doc of docs) {
        walk(doc.content, [], (node, path) => {
            if (node != null && typeof node == 'object') {
                m.set(node, {
                    node: path.length ? doc.doc.getIn(path, true) : doc.doc,
                    path,
                    doc,
                });
            }
        });
    }
    return m;
}

class Reporter {
    private m: any;
    problems: Problem[];

    constructor(docs: Doc[] = []) {
        this.m = instrument(docs);
        this.problems = [];
    }

    error(message: string, node, prop): void {
        this.report(message, node, prop, true);
    }

    warning(message: string, node, prop): void {
        this.report(message, node, prop, false);
    }

    report(message: string, node, prop, isError: boolean, rule?: string): void {
        // if this is trying to report on something in the cache ignore
        if (this.m.has(node)) {
            const k = this.m.get(node);
            if (k.doc.no_report) return;
        }

        this.problems.push({
            message,
            rule,
            level: isError ? 'error' : 'warning',
            ...this._getLocation(this.m, node, prop),
        } as Problem);
    }

    _getLine(chars: string[], n: number): number {
        let l = 1;
        for (let i = 0; i < n; i++) {
            if (chars[i] === '\n') l++;
        }
        return l;
    }

    _getCol(chars: string[], n: number): number {
        let c = 1;
        for (let i = 0; i < n; i++) {
            if (chars[i] === '\n') c = 0;
            c++;
        }
        return c;
    }

    _getLocation(m, node, prop): Location | {} {
        if (!m.has(node)) return {};
        const k = m.get(node);
        try {
            const chars: string[] = Array.from(k.doc.raw);
            let n = prop ? k.node.get(prop, true) : k.node;
            if (!n) n = k.node.items.find((pair) => pair.key.value === prop).key;
            return {
                path: k.doc.path,
                loc: {
                    range: n.range,
                    startLine: this._getLine(chars, n.range[0]),
                    startColumn: this._getCol(chars, n.range[0]),
                    endLine: this._getLine(chars, n.range[1]),
                    endColumn: this._getCol(chars, n.range[1]),
                },
            };
        } catch (e) {
            return { path: k.doc.path, loc: {} };
        }
    }
}

export default Reporter;
