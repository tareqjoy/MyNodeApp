export function getApiPath(root: string, nextPath: string): string {
  const noSlashRoot = root.replace(/^\/|\/$/g, "");
  return `/${noSlashRoot}/${nextPath}`;
}

export function getInternalApiPath(root: string, nextPath: string): string {
  const noSlashRoot = root.replace(/^\/|\/$/g, "");

  return `/internal/${noSlashRoot}/${nextPath}`;
}

export function getInternalFullPath(publicPath: string): string {
  const url = new URL(publicPath);

  url.pathname = `/internal${url.pathname}`;
  return url.toString();
}
