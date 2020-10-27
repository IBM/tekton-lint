import fs from 'fs';
import yaml from 'yaml';
import glob from 'fast-glob';
import { TektonDefinition } from './interfaces';

export interface Collectable {
  content: TektonDefinition,
  doc: yaml.Document.Parsed,
  path: string,
  raw: string,
}

const collector = async (paths: string[]): Promise<Collectable[]> => {
  const docs: Collectable[] = [];
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
