const fs = require('fs');
const yaml = require('js-yaml');
const glob = require('fast-glob');

const collector = (paths) => {
  const docs = [];
  const files = glob.sync(paths);
  
  for (const file of files) {
    for (const doc of yaml.safeLoadAll(fs.readFileSync(file, 'utf-8'))) {
      docs.push({
        content: doc,
        path: file,
      });
    }
  }

  return docs;
};

module.exports = collector;
