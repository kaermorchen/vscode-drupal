import { readFileSync } from 'fs';
import { resolve } from 'path';
import { extensions } from 'vscode';

export default function getPackage() {
  const extension = extensions.getExtension('stanislav.vscode-drupal');
  console.log(extension?.packageJSON);

  return extension?.packageJSON;
  // const pack = readFileSync(resolve(__dirname, '../../package.json'), 'utf8');

  // return JSON.parse(pack);
}
