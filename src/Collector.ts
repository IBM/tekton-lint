import fs from 'fs';
import yaml from 'yaml';
import glob from 'fast-glob';

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
        raw: content,
      });
    }
  }

  return docs;
};

export default collector;
