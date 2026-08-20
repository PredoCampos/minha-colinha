function normalizeBase(base: string): string {
  const segment = base.replace(/^\/+|\/+$/g, "");
  return segment.length === 0 ? "/" : `/${segment}/`;
}

export function publicPath(
  path: string,
  base: string = import.meta.env.BASE_URL,
): string {
  const relativePath = path.replace(/^\/+/, "");
  return `${normalizeBase(base)}${relativePath}`;
}
