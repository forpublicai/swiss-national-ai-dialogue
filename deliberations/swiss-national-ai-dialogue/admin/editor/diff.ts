export type DiffEntry = {
  path: string;
  before: string | null;
  after: string | null;
};

function render(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function diffDefinitions(
  before: unknown,
  after: unknown,
  path = "",
  out: DiffEntry[] = [],
): DiffEntry[] {
  if (Object.is(before, after)) return out;
  const bothArrays = Array.isArray(before) && Array.isArray(after);
  const bothObjects = isPlainObject(before) && isPlainObject(after);
  if (!bothArrays && !bothObjects) {
    if (render(before) !== render(after)) {
      out.push({
        path: path || "(root)",
        before: before === undefined ? null : render(before),
        after: after === undefined ? null : render(after),
      });
    }
    return out;
  }
  const keys = bothArrays
    ? Array.from(
        { length: Math.max((before as unknown[]).length, (after as unknown[]).length) },
        (_, index) => String(index),
      )
    : [
        ...new Set([
          ...Object.keys(before as object),
          ...Object.keys(after as object),
        ]),
      ];
  keys.forEach((key) => {
    diffDefinitions(
      (before as Record<string, unknown>)[key],
      (after as Record<string, unknown>)[key],
      path ? `${path}.${key}` : key,
      out,
    );
  });
  return out;
}
