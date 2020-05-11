const fs = require('fs');
const yaml = require('yaml');
const glob = require('fast-glob');

const collector = async (paths) => {
  const docs = [];
  const files = await glob(paths);

  for (const file of files) {
    const content = await fs.promises.readFile(file, 'utf8');
    for (const doc of yaml.parseAllDocuments(content)) {
      docs.push({
        content: doc.toJSON(),
        doc,
        path: file,
      });
    }
  }

  return docs;
};

module.exports = collector;
