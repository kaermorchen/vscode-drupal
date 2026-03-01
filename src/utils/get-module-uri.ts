import { Uri } from 'vscode';

export function getModuleUri(uri: Uri): Uri | undefined {
  const result = uri.fsPath.match(/.*\/web\/modules\/custom\/\w+/);

  if (result) {
    return Uri.file(result[0]);
  }

  return;
}
