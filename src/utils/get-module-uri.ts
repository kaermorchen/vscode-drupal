import { Uri } from 'vscode';

export default async function getModuleUri(uri: Uri): Promise<Uri | undefined> {
  const result = uri.fsPath.match(/.*\/web\/modules\/custom\/\w+/);

  if (result) {
    return Uri.file(result[0]);
  }

  return;
}
