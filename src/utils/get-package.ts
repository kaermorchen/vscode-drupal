import { extensions } from 'vscode';

export function getPackage() {
  const extension = extensions.getExtension('stanislav.vscode-drupal');
  const packageJSON = extension?.packageJSON;

  if (!packageJSON) {
    throw new Error('Extension package.json not found');
  }

  return packageJSON;
}
