export function getApiPath(root: string, nextPath: string): string {
    return root.endsWith('/')? `${root}${nextPath}` : `${root}/${nextPath}`;
}