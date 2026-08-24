export function parseJson<T>(value: unknown): T {
  return JSON.parse(String(value)) as T;
}
