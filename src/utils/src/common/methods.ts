export function fillString(template: string, values: Record<string, string | number>) {
    return template.replace(/\{(\w+)\}/g, (_, key) => values[key]?.toString() || '');
}