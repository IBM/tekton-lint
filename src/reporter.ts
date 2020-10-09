function getLine(chars, n) {
  let l = 1;
  for (let i = 0; i < n; i++) {
    if (chars[i] === '\n') l++;
  }
  return l;
}

function getCol(chars, n) {
  let c = 1;
  for (let i = 0; i < n; i++) {
    if (chars[i] === '\n') c = 0;
    c++;
  }
  return c;
}

function getLocation(m, node, prop) {
  if (!m.has(node)) return {};
  const k = m.get(node);
  const chars = Array.from(k.doc.raw);
  let n = prop ? k.node.get(prop, true) : k.node;
  if (!n) n = k.node.items.find(pair => pair.key.value === prop).key;
  return {
    path: k.doc.path,
    loc: {
      range: n.range,
      startLine: getLine(chars, n.range[0]),
      startColumn: getCol(chars, n.range[0]),
      endLine: getLine(chars, n.range[1]),
      endColumn: getCol(chars, n.range[1]),
    },
  };
}

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

function instrument(docs) {
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
  problems: any[];

  constructor(docs = []) {
    this.m = instrument(docs);
    this.problems = [];
  }

  error(message, node, prop) {
    this.report(message, node, prop, true);
  }

  warning(message, node, prop) {
    this.report(message, node, prop, false);
  }

  report(message, node, prop, isError, rule?) {
    this.problems.push({
      message,
      rule,
      level: isError ? 'error' : 'warning',
      ...getLocation(this.m, node, prop),
    });
  }
}

export default Reporter;
