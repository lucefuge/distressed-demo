/** Resolve public-directory assets against Vite's deployment base.
 * Keep this module independent of import.meta so it can also run in Node tests.
 */
export function assetUrl(path: string, base: string): string {
  if (!path || /^(?:[a-z][a-z\d+.-]*:|\/\/|#|\?)/i.test(path)) {
    return path;
  }

  const normalizedBase = `/${base.replace(/^\/+|\/+$/g, "")}/`.replace(
    /\/{2,}/g,
    "/",
  );
  const localPath = path.replace(/^(?:\.\/)+/, "").replace(/^\/+/, "");
  const rootedPath = `/${localPath}`;
  const baseRoot = normalizedBase.slice(0, -1);

  if (
    normalizedBase === "/" ||
    rootedPath === baseRoot ||
    rootedPath.startsWith(normalizedBase)
  ) {
    return rootedPath;
  }
  return normalizedBase + localPath;
}
