import { logger } from './logger.js';
import { Doc, Location, Problem } from './interfaces/common.js';
import { LineNode, IndexRange } from './perf/node.js';
import { BinarySearchTree, Node } from './perf/tree.js';

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

// essential function to create the values needed.
// We are using a character range eg 15-29 of each line as the key of the node
// the previous range 10-14 would be considered less, and 45-50 would be greater
// the value is the number of this range - no range crosses a line boundary
//
// when on searching the tree for a character at say position 20, it will be found to fall inbetween
// 15-29, so the key returns equal and hence the node.

function createLineRange(data) {
    const list: LineNode[] = [];
    const chars: string[] = Array.from(data);
    let l = 1; // line counts start at 1
    let linestart = 0; // starting character of the start of the line

    // the <= in the for loop and the check for the last iteration
    // are important to correctly handle the end of the files
    for (let i = 0; i <= chars.length; i++) {
        if (chars[i] === '\n' || i == chars.length) {
            const ir = new IndexRange(linestart, i);
            const node = new LineNode(ir, l);
            linestart = i + 1;
            list.push(node);

            l++;
        }
    }

    return list;
}

// Each node has a copy (or refernce) to the raw data, creating a new tree for the same raw data
// for each node, consumes vast amounts of memory
// hence cache the trees indexed on the the filenames, and use one tree per filename...
const treecollection = new Map();

function instrument(docs: Doc[]) {
    const m = new Map();
    for (const doc of docs) {
        walk(doc.content, [], (node, path) => {
            if (node != null && typeof node == 'object') {
                let tree = treecollection.get(doc.path);
                if (!tree) {
                    // create the tree, (if not already dome)
                    tree = new BinarySearchTree<IndexRange, number>();

                    // create nodes
                    const nodeList = createLineRange(doc.raw);
                    nodeList.forEach((n) => {
                        tree.avlInsert(n.indexRange, n.value);
                    });
                    treecollection.set(doc.path, tree);
                }

                m.set(node, {
                    node: path.length ? doc.doc.getIn(path, true) : doc.doc,
                    path,
                    doc,
                    tree,
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

        // kept the original code for educational purposes
        // unless this env is set, then do things the better way!
        const locations =
            process.env.DEV_ORIG === 'y'
                ? this._getLocation(this.m, node, prop)
                : this._getLocationAVL(this.m, node, prop);

        this.problems.push({
            message,
            rule,
            level: isError ? 'error' : 'warning',
            ...locations,
        } as Problem);
    }

    // Gets the line number of the character n
    _getLine(chars: string[], n: number): number {
        let l = 1;
        for (let i = 0; i < n; i++) {
            if (chars[i] === '\n') l++;
        }
        return l;
    }

    // gets the columnd of the character n
    _getCol(chars: string[], n: number): number {
        let c = 1;
        for (let i = 0; i < n; i++) {
            if (chars[i] === '\n') c = 0;
            c++;
        }
        return c;
    }

    // given a range i.e from character x to character y get the locations
    // in lines/columns of the range.
    _getLocation(m, node, prop): Location | {} {
        if (!m.has(node)) return {};
        const k = m.get(node);
        try {
            // node this is something that could be abstracted away, and does give a boost
            // but doesn't alter the time complexity
            const chars: string[] = Array.from(k.doc.raw);
            chars.length;
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

    // gets the location from the avl tree, very similar function to the existing
    // but finds the two tree nodes for the start and end ranges.
    // note that the columns can be easily calculated from the start point of the key
    _getLocationAVL(m, node, prop): Location | {} {
        if (!m.has(node)) return {};
        const k = m.get(node);
        try {
            let n = prop ? k.node.get(prop, true) : k.node;
            if (!n) n = k.node.items.find((pair) => pair.key.value === prop).key;

            // create the search node
            const start_sn = new IndexRange(n.range[0]);
            const end_sn = new IndexRange(n.range[1]);

            const start_node: Node<IndexRange, number> | undefined = k.tree.find(start_sn);
            let end_node: Node<IndexRange, number> | undefined = k.tree.find(end_sn);

            if (!start_node) {
                throw new Error('start_node not found');
            }
            // defensive in case of empty nodes
            if (!end_node) {
                logger.warn('End node is off the end.....');
                end_node = start_node;
            }

            return {
                path: k.doc.path,
                loc: {
                    range: n.range,
                    startLine: start_node?.value,
                    startColumn: n.range[0] - start_node.key.start + 1,
                    endLine: end_node?.value,
                    endColumn: n.range[1] - end_node.key.start + 1,
                },
            };
        } catch (e) {
            logger.error(e);
            return { path: k.doc.path, loc: {} };
        }
    }
}

export default Reporter;
