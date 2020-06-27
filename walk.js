const walk = function (node, path, visitor, parent) {
  if (typeof node === 'string' || typeof node === 'number') {
    visitor(node, path, parent);
  } else if (Array.isArray(node)) {
    for (const [index, child] of Object.entries(node)) {
      walk(child, path + `[${index}]`, visitor, node);
    }
  } else {
    if (!node) return;
    for (const [key, value] of Object.entries(node)) {
      walk(value, path + `.${key}`, visitor, node);
    }
  }
};

module.exports = walk;
