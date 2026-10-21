// Repeated records for the same identity are safe; distinct IDs sharing a
// normalized display name must never silently choose the last entry.
export function unambiguousNameIndex<T extends { id: string; name: string }>(items: T[]) {
  const matches = new Map<string, T>();
  const ambiguous = new Set<string>();
  for (const item of items) {
    const key = item.name.trim().toLowerCase();
    const previous = matches.get(key);
    if (previous && previous.id !== item.id) ambiguous.add(key);
    else matches.set(key, item);
  }
  return { resolve: (name: string) => ambiguous.has(name.trim().toLowerCase()) ? undefined : matches.get(name.trim().toLowerCase()),
    isAmbiguous: (name: string) => ambiguous.has(name.trim().toLowerCase()) };
}
