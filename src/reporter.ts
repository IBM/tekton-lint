import { YAMLMap, Node } from 'yaml/types';
import { Collectable } from './Collector';

function getLine(chars: string[], n: number) {
  let l = 1;
  for (let i = 0; i < n; i++) {
    if (chars[i] === '\n') l++;
  }
  return l;
}

function getCol(chars: string[], n: number) {
  let c = 1;
  for (let i = 0; i < n; i++) {
    if (chars[i] === '\n') c = 0;
    c++;
  }
  return c;
}

function getLocation(m: YAMLMap, node: Node, prop: any) {
  if (!m.has(node)) return {};
  const k = m.get(node);
  const chars = Array.from(k.doc.raw) as string[];
  let n = prop ? k.node.get(prop, true) : k.node;
  if (!n) n = k.node.items.find(pair => pair.key.value === prop).key;
  const [rangeStart, rangeEnd] = n.range;
  return {
    path: k.doc.path,
    loc: {
      range: n.range,
      startLine: getLine(chars, rangeStart),
      startColumn: getCol(chars, rangeStart),
      endLine: getLine(chars, rangeEnd),
      endColumn: getCol(chars, rangeEnd),
    },
  };
}

function walk(node: any, path: (string | number)[], visitor: Function) {
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

function instrument(docs: Collectable[]) {
  const m = new YAMLMap();
  for (const doc of docs) {
    walk(doc.content, [], (node: any, path: (string | number)[]) => {
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

type Level = 'error' | 'warning'

interface Location {
  range: any;
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}
export interface Problem {
  level: Level;
  message: string;
  rule: string;
  path?: any;
  loc?: Location;
}

/* eslint-disable-next-line no-unused-vars */
export type ReportFunction = (message: string, node: Node, prop, isError: boolean, rule?) => any

class Reporter {
  private map: YAMLMap;
  problems: Problem[];

  constructor(docs = []) {
    this.map = instrument(docs);
    this.problems = [];
  }

  error(message: string, node: Node, prop) {
    this.report(message, node, prop, true);
  }

  warning(message: string, node: Node, prop) {
    this.report(message, node, prop, false);
  }

  report(message: string, node: Node, prop, isError: boolean, rule?) {
    this.problems.push({
      message,
      rule,
      level: isError ? 'error' : 'warning',
      ...getLocation(this.map, node, prop),
    });
  }
}

export default Reporter;
