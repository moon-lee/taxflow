/** SQLite has no boolean type: reads come back as 1/0 while the dev mock
 * keeps real booleans. Normalize at the DAO boundary so every consumer can
 * rely on actual booleans in both environments. */
export function asBool(value: unknown): boolean {
  return value === true || value === 1;
}
