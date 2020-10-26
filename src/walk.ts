export function walk(
  node: any,
  path: (string | number)[],
  visitor: Function,
  parent?: any
) {
  if (typeof node === 'string' || typeof node === 'number') {
    visitor(node, path, parent);
  } else if (Array.isArray(node)) {
    for (const [index, child] of Object.entries(node)) {
      walk(child, [...path, +index], visitor, node);
    }
  } else {
    if (!node) return;
    for (const [key, value] of Object.entries(node)) {
      walk(value, [...path, key], visitor, node);
    }
  }
}

export function pathToString(path: (string | number)[]) {
  if (!path) {
    throw Error('Path should contain at least one subpath in it');
  }
  let str = '';
  for (const segment of path) {
    if (typeof segment == 'number') {
      if (!str) {
        str = '.';
      }
      str += `[${segment}]`;
    } else {
      str += `.${segment}`;
    }
  }
  return str;
}
